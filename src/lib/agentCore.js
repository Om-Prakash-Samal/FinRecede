/**
 * AgentCore — State machine orchestrator for the revenue recovery pipeline.
 *
 * Manages the full lifecycle: Detect → Diagnose → Intervene → Recover
 * with bounded retries, stopping rules, and complete audit logging.
 */

import { v4 as uuidv4 } from 'uuid';
import { diagnoseTransaction } from './diagnosticEngine.js';
import {
  executeAutoRetry,
  executeSendSMS,
  executeSendVoice,
  executeSendEmail,
  executeAlternateMethod,
  executePromiseToPay,
  executeEscalation,
} from './actionModule.js';
import getDb from './db.js';

/* ── Helpers ───────────────────────────────────────────────── */
const delay = ms => new Promise(r => setTimeout(r, ms));
const now   = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function logAction(db, action) {
  db.prepare(`
    INSERT INTO agent_actions (id, transaction_id, batch_id, action_type, action_detail,
      decision_reasoning, previous_state, new_state, financial_impact, compliance_flag, success, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    action.id || uuidv4(),
    action.transaction_id,
    action.batch_id || null,
    action.action_type,
    action.action_detail,
    action.decision_reasoning,
    action.previous_state,
    action.new_state,
    action.financial_impact || 0,
    action.compliance_flag || null,
    action.success ? 1 : 0,
    now(),
  );
}

function updateTransaction(db, id, updates) {
  const setClauses = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    setClauses.push(`${key} = ?`);
    values.push(val);
  }
  setClauses.push('updated_at = ?');
  values.push(now());
  values.push(id);
  db.prepare(`UPDATE transactions SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
}

/* ── Recovery strategy matrix ─────────────────────────────── */
const RECOVERY_STRATEGIES = {
  bank_downtime:      ['auto_retry', 'auto_retry', 'auto_retry', 'escalate'],
  network_timeout:    ['auto_retry', 'auto_retry', 'send_sms', 'escalate'],
  '3ds_failure':      ['alternate_method', 'send_sms', 'escalate'],
  insufficient_funds: ['send_sms', 'send_sms', 'send_voice', 'escalate'],
  card_expired:       ['send_email', 'send_sms', 'escalate'],
  fraud_suspected:    ['escalate'],
  mandate_revoked:    ['send_sms', 'escalate'],
  overdue_invoice:    ['send_email_gentle', 'send_email_firm', 'promise_to_pay', 'send_email_final', 'escalate'],
  unknown:            ['escalate'],
};

/* ── Core pipeline steps ──────────────────────────────────── */

async function stepDetect(db, txn) {
  const previousState = txn.status;
  updateTransaction(db, txn.id, { status: 'detected' });
  logAction(db, {
    transaction_id: txn.id,
    batch_id: txn.batch_id,
    action_type: 'detect',
    action_detail: `Revenue risk detected: ${txn.type} — ₹${txn.amount?.toLocaleString('en-IN')} at risk from ${txn.customer_name}. Failure: ${txn.failure_reason}.`,
    decision_reasoning: `Transaction ${txn.id} flagged as revenue risk event. Type: ${txn.type}. Amount: ₹${txn.amount}. Payment method: ${txn.payment_method}.`,
    previous_state: previousState,
    new_state: 'detected',
    success: true,
  });
  await delay(100);
  return { ...txn, status: 'detected' };
}

async function stepDiagnose(db, txn) {
  const diagnosis = diagnoseTransaction(txn);
  await delay(150);

  updateTransaction(db, txn.id, {
    status: 'diagnosed',
    ai_diagnosis: diagnosis.diagnosis,
    ai_diagnosis_category: diagnosis.category,
    recovery_method: diagnosis.recoveryMethod,
  });

  logAction(db, {
    transaction_id: txn.id,
    batch_id: txn.batch_id,
    action_type: 'diagnose',
    action_detail: `Root cause identified: ${diagnosis.category} (confidence: ${(diagnosis.confidence * 100).toFixed(0)}%). Diagnosis: ${diagnosis.diagnosis}`,
    decision_reasoning: diagnosis.reasoning,
    previous_state: 'detected',
    new_state: 'diagnosed',
    success: true,
  });

  return {
    ...txn,
    status: 'diagnosed',
    ai_diagnosis: diagnosis.diagnosis,
    ai_diagnosis_category: diagnosis.category,
    recovery_method: diagnosis.recoveryMethod,
    _diagnosis: diagnosis,
  };
}

async function stepRecover(db, txn) {
  const category = txn.ai_diagnosis_category || 'unknown';
  const strategy = RECOVERY_STRATEGIES[category] || RECOVERY_STRATEGIES.unknown;

  // Check if paused
  if (txn.is_paused) {
    logAction(db, {
      transaction_id: txn.id,
      batch_id: txn.batch_id,
      action_type: 'pause',
      action_detail: 'Recovery paused by merchant. Skipping automated actions.',
      decision_reasoning: 'Merchant has manually paused recovery for this transaction.',
      previous_state: txn.status,
      new_state: 'paused',
      success: true,
    });
    updateTransaction(db, txn.id, { status: 'paused' });
    return { ...txn, status: 'paused' };
  }

  // Immediate escalation for fraud
  if (category === 'fraud_suspected') {
    const result = await executeEscalation(txn, 'Fraud Risk Flagged');
    updateTransaction(db, txn.id, {
      status: 'escalated',
      stopping_rule_triggered: 'fraud_risk',
      resolved_at: now(),
    });
    logAction(db, {
      transaction_id: txn.id,
      batch_id: txn.batch_id,
      action_type: result.action_type,
      action_detail: result.action_detail,
      decision_reasoning: result.decision_reasoning,
      previous_state: 'diagnosed',
      new_state: 'escalated',
      financial_impact: 0,
      compliance_flag: 'fraud_flagged',
      success: true,
    });
    return { ...txn, status: 'escalated', stopping_rule_triggered: 'fraud_risk' };
  }

  // Execute recovery strategy steps
  updateTransaction(db, txn.id, { status: 'in_recovery' });
  let currentTxn = { ...txn, status: 'in_recovery' };
  let attemptIndex = currentTxn.recovery_attempts || 0;

  // Execute up to the remaining steps in the strategy
  while (attemptIndex < strategy.length) {
    const step = strategy[attemptIndex];

    // Check stopping rules
    if (currentTxn.recovery_attempts >= currentTxn.max_retries && step !== 'escalate') {
      // Max retries exceeded — skip to escalation
      const escResult = await executeEscalation(currentTxn, 'Max Retries Exceeded');
      updateTransaction(db, currentTxn.id, {
        status: 'escalated',
        stopping_rule_triggered: 'max_retries',
        resolved_at: now(),
      });
      logAction(db, {
        transaction_id: currentTxn.id,
        batch_id: currentTxn.batch_id,
        action_type: escResult.action_type,
        action_detail: escResult.action_detail,
        decision_reasoning: escResult.decision_reasoning,
        previous_state: 'in_recovery',
        new_state: 'escalated',
        compliance_flag: 'stopping_rule_triggered',
        success: true,
      });
      return { ...currentTxn, status: 'escalated', stopping_rule_triggered: 'max_retries' };
    }

    let result;
    switch (step) {
      case 'auto_retry':
        result = await executeAutoRetry(currentTxn);
        break;
      case 'send_sms':
        result = await executeSendSMS(currentTxn);
        break;
      case 'send_voice':
        result = await executeSendVoice(currentTxn);
        break;
      case 'send_email':
      case 'send_email_gentle':
        result = await executeSendEmail(currentTxn, 'gentle_reminder');
        break;
      case 'send_email_firm':
        result = await executeSendEmail(currentTxn, 'firm_followup');
        break;
      case 'send_email_final':
        result = await executeSendEmail(currentTxn, 'final_notice');
        break;
      case 'alternate_method':
        result = await executeAlternateMethod(currentTxn);
        break;
      case 'promise_to_pay':
        result = await executePromiseToPay(currentTxn);
        if (result.promise_date) {
          updateTransaction(db, currentTxn.id, {
            promise_to_pay_date: result.promise_date,
            promise_to_pay_status: 'pending',
          });
        }
        break;
      case 'escalate':
        result = await executeEscalation(currentTxn, 'All recovery steps exhausted');
        updateTransaction(db, currentTxn.id, {
          status: 'escalated',
          stopping_rule_triggered: 'max_retries',
          resolved_at: now(),
        });
        logAction(db, {
          transaction_id: currentTxn.id,
          batch_id: currentTxn.batch_id,
          action_type: result.action_type,
          action_detail: result.action_detail,
          decision_reasoning: result.decision_reasoning,
          previous_state: 'in_recovery',
          new_state: 'escalated',
          compliance_flag: 'escalated_to_human',
          success: true,
        });
        return { ...currentTxn, status: 'escalated', stopping_rule_triggered: 'max_retries' };
      default:
        break;
    }

    if (result) {
      attemptIndex++;
      const newAttempts = currentTxn.recovery_attempts + 1;
      updateTransaction(db, currentTxn.id, { recovery_attempts: newAttempts });
      currentTxn = { ...currentTxn, recovery_attempts: newAttempts };

      logAction(db, {
        transaction_id: currentTxn.id,
        batch_id: currentTxn.batch_id,
        action_type: result.action_type,
        action_detail: result.action_detail,
        decision_reasoning: result.decision_reasoning,
        previous_state: 'in_recovery',
        new_state: result.success ? 'recovered' : 'in_recovery',
        financial_impact: result.financial_impact || 0,
        compliance_flag: result.compliance_flag || null,
        success: result.success,
      });

      if (result.success && result.financial_impact > 0) {
        // Recovery successful!
        updateTransaction(db, currentTxn.id, {
          status: 'recovered',
          amount_recovered: result.financial_impact,
          resolved_at: now(),
        });

        logAction(db, {
          transaction_id: currentTxn.id,
          batch_id: currentTxn.batch_id,
          action_type: 'recover',
          action_detail: `💰 RECOVERY SUCCESSFUL! ₹${result.financial_impact.toLocaleString('en-IN')} recovered via ${result.action_type}. Transaction closed.`,
          decision_reasoning: `Recovery action "${result.action_type}" succeeded. Revenue recovered: ₹${result.financial_impact}. Total attempts: ${newAttempts}.`,
          previous_state: 'in_recovery',
          new_state: 'recovered',
          financial_impact: result.financial_impact,
          success: true,
        });

        return {
          ...currentTxn,
          status: 'recovered',
          amount_recovered: result.financial_impact,
        };
      }
    }

    await delay(100);
  }

  // If we exhausted the strategy without recovery
  const escResult = await executeEscalation(currentTxn, 'All recovery steps exhausted');
  updateTransaction(db, currentTxn.id, {
    status: 'escalated',
    stopping_rule_triggered: 'max_retries',
    resolved_at: now(),
  });
  logAction(db, {
    transaction_id: currentTxn.id,
    batch_id: currentTxn.batch_id,
    action_type: escResult.action_type,
    action_detail: escResult.action_detail,
    decision_reasoning: escResult.decision_reasoning,
    previous_state: 'in_recovery',
    new_state: 'escalated',
    compliance_flag: 'escalated_to_human',
    success: true,
  });
  return { ...currentTxn, status: 'escalated', stopping_rule_triggered: 'max_retries' };
}

/* ── Main orchestrator ────────────────────────────────────── */

/**
 * Process a single transaction through the full pipeline.
 * Returns the final state.
 */
export async function processTransaction(transactionId) {
  const db = getDb();
  let txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
  if (!txn) throw new Error(`Transaction ${transactionId} not found`);

  // Step 1: Detect
  txn = await stepDetect(db, txn);

  // Step 2: Diagnose
  txn = await stepDiagnose(db, txn);

  // Step 3: Recover (includes intervention loop)
  txn = await stepRecover(db, txn);

  return txn;
}

/**
 * Run a full batch: generate mock data, insert, process all, update batch stats.
 * Yields progress events for SSE streaming.
 */
export async function* runBatch(batchId, transactions) {
  const db = getDb();
  const startTime = Date.now();

  // Insert all transactions
  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, type, merchant_id, customer_id, customer_name, customer_phone,
      customer_email, amount, currency, failure_reason, raw_log, gateway_response_code,
      payment_method, invoice_id, invoice_due_date, subscription_id, mandate_id, status,
      ai_diagnosis_category, max_retries, amount_recovered, promise_to_pay_date,
      promise_to_pay_status, batch_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((txns) => {
    for (const t of txns) {
      insertStmt.run(
        t.id, t.type, t.merchant_id, t.customer_id, t.customer_name, t.customer_phone,
        t.customer_email, t.amount, t.currency, t.failure_reason, t.raw_log,
        t.gateway_response_code, t.payment_method, t.invoice_id, t.invoice_due_date,
        t.subscription_id, t.mandate_id, t.status, t.ai_diagnosis_category, t.max_retries,
        t.amount_recovered, t.promise_to_pay_date, t.promise_to_pay_status, t.batch_id,
        t.created_at, t.updated_at,
      );
    }
  });
  insertMany(transactions);

  // Create batch run record
  const totalAtRisk = transactions.reduce((s, t) => s + t.amount, 0);
  db.prepare(`
    INSERT INTO batch_runs (id, status, total_transactions, total_revenue_at_risk, started_at)
    VALUES (?, 'running', ?, ?, ?)
  `).run(batchId, transactions.length, totalAtRisk, now());

  yield {
    type: 'batch_started',
    batchId,
    totalTransactions: transactions.length,
    totalRevenueAtRisk: totalAtRisk,
  };

  // Process each transaction
  let processed = 0;
  let recovered = 0;
  let escalated = 0;
  let totalRecovered = 0;

  for (const txn of transactions) {
    try {
      const result = await processTransaction(txn.id);
      processed++;

      if (result.status === 'recovered') {
        recovered++;
        totalRecovered += result.amount_recovered || 0;
      } else if (result.status === 'escalated') {
        escalated++;
      }

      yield {
        type: 'transaction_processed',
        batchId,
        transactionId: txn.id,
        transactionType: txn.type,
        customerName: txn.customer_name,
        amount: txn.amount,
        status: result.status,
        amountRecovered: result.amount_recovered || 0,
        stoppingRule: result.stopping_rule_triggered,
        processed,
        recovered,
        escalated,
        totalRecovered,
        totalTransactions: transactions.length,
        totalRevenueAtRisk: totalAtRisk,
        recoveryRate: processed > 0 ? (recovered / processed * 100) : 0,
      };
    } catch (err) {
      processed++;
      yield {
        type: 'transaction_error',
        batchId,
        transactionId: txn.id,
        error: err.message,
        processed,
        totalTransactions: transactions.length,
      };
    }
  }

  // Update batch stats
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const avgRecoveryTime = processed > 0 ? elapsedSeconds / processed : 0;
  const recoveryRate = processed > 0 ? (recovered / processed * 100) : 0;

  db.prepare(`
    UPDATE batch_runs SET
      status = 'completed',
      total_recovered = ?,
      recovery_rate = ?,
      avg_recovery_time_seconds = ?,
      completed_at = ?
    WHERE id = ?
  `).run(totalRecovered, recoveryRate, avgRecoveryTime, now(), batchId);

  yield {
    type: 'batch_completed',
    batchId,
    totalTransactions: transactions.length,
    totalRevenueAtRisk: totalAtRisk,
    totalRecovered,
    recovered,
    escalated,
    failed: processed - recovered - escalated,
    recoveryRate,
    avgRecoveryTimeSeconds: avgRecoveryTime,
    elapsedSeconds,
  };
}
