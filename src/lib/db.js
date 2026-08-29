import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'finrecede.json');

// In-memory relational store with disk persistence
let store = null;

function loadStore() {
  if (store) return store;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      store = JSON.parse(content);
    } catch (e) {
      console.error('Error loading db file, resetting:', e);
      store = { transactions: [], agent_actions: [], batch_runs: [] };
    }
  } else {
    store = {
      transactions: [],
      agent_actions: [],
      batch_runs: [],
    };
    saveStore();
  }

  return store;
}

function saveStore() {
  if (!store) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving store to disk:', e);
  }
}

/**
 * DB wrapper mimicking SQLite prepared statements and query methods
 */
class JsonDb {
  constructor() {
    this.store = loadStore();
  }

  exec(sql) {
    // schema is managed in JSON structure
    return this;
  }

  pragma(p) {
    return this;
  }

  transaction(fn) {
    return (...args) => {
      const res = fn(...args);
      saveStore();
      return res;
    };
  }

  prepare(sql) {
    const rawSql = sql.trim();
    const self = this;

    return {
      run(...params) {
        self.store = loadStore();
        let changed = 0;

        // INSERT INTO transactions
        if (rawSql.includes('INSERT INTO transactions')) {
          const [
            id, type, merchant_id, customer_id, customer_name, customer_phone,
            customer_email, amount, currency, failure_reason, raw_log,
            gateway_response_code, payment_method, invoice_id, invoice_due_date,
            subscription_id, mandate_id, status, ai_diagnosis_category, max_retries,
            amount_recovered, promise_to_pay_date, promise_to_pay_status, batch_id,
            created_at, updated_at
          ] = params;

          const txn = {
            id, type, merchant_id, customer_id, customer_name, customer_phone,
            customer_email, amount: Number(amount) || 0, currency: currency || 'INR',
            failure_reason, raw_log, gateway_response_code, payment_method,
            invoice_id, invoice_due_date, subscription_id, mandate_id,
            status: status || 'detected',
            ai_diagnosis: null,
            ai_diagnosis_category: ai_diagnosis_category || null,
            recovery_method: null,
            recovery_attempts: 0,
            max_retries: max_retries || 3,
            amount_recovered: Number(amount_recovered) || 0,
            promise_to_pay_date: promise_to_pay_date || null,
            promise_to_pay_status: promise_to_pay_status || null,
            stopping_rule_triggered: null,
            is_paused: 0,
            batch_id: batch_id || null,
            created_at: created_at || new Date().toISOString(),
            updated_at: updated_at || new Date().toISOString(),
            resolved_at: null,
          };

          // Remove duplicate if exists
          self.store.transactions = self.store.transactions.filter(t => t.id !== id);
          self.store.transactions.unshift(txn);
          changed = 1;
        }
        // INSERT INTO agent_actions
        else if (rawSql.includes('INSERT INTO agent_actions')) {
          const [
            id, transaction_id, batch_id, action_type, action_detail,
            decision_reasoning, previous_state, new_state, financial_impact,
            compliance_flag, success, created_at
          ] = params;

          const action = {
            id,
            transaction_id,
            batch_id: batch_id || null,
            action_type,
            action_detail,
            decision_reasoning,
            previous_state,
            new_state,
            financial_impact: Number(financial_impact) || 0,
            compliance_flag: compliance_flag || null,
            success: Number(success) || 0,
            created_at: created_at || new Date().toISOString(),
          };

          self.store.agent_actions.unshift(action);
          changed = 1;
        }
        // INSERT INTO batch_runs
        else if (rawSql.includes('INSERT INTO batch_runs')) {
          const [id, status, total_transactions, total_revenue_at_risk, started_at] = params;
          const run = {
            id,
            status: status || 'running',
            total_transactions: Number(total_transactions) || 0,
            total_revenue_at_risk: Number(total_revenue_at_risk) || 0,
            total_recovered: 0,
            recovery_rate: 0,
            avg_recovery_time_seconds: 0,
            started_at: started_at || new Date().toISOString(),
            completed_at: null,
          };
          self.store.batch_runs.unshift(run);
          changed = 1;
        }
        // UPDATE batch_runs
        else if (rawSql.includes('UPDATE batch_runs')) {
          const [total_recovered, recovery_rate, avg_recovery_time_seconds, completed_at, id] = params;
          const batch = self.store.batch_runs.find(b => b.id === id);
          if (batch) {
            batch.status = 'completed';
            batch.total_recovered = Number(total_recovered) || 0;
            batch.recovery_rate = Number(recovery_rate) || 0;
            batch.avg_recovery_time_seconds = Number(avg_recovery_time_seconds) || 0;
            batch.completed_at = completed_at;
            changed = 1;
          }
        }
        // UPDATE transactions SET ...
        else if (rawSql.startsWith('UPDATE transactions')) {
          const id = params[params.length - 1];
          const txn = self.store.transactions.find(t => t.id === id);
          if (txn) {
            // Parse dynamic SET clauses
            if (rawSql.includes('is_paused = 1')) {
              txn.is_paused = 1;
              txn.status = params[0];
              txn.updated_at = params[1];
            } else if (rawSql.includes('is_paused = 0')) {
              txn.is_paused = 0;
              txn.status = params[0];
              txn.updated_at = params[1];
            } else if (rawSql.includes('manual_escalation')) {
              txn.status = params[0];
              txn.stopping_rule_triggered = params[1];
              txn.resolved_at = params[2];
              txn.updated_at = params[3];
            } else {
              // Parse arbitrary column assignment list
              const match = rawSql.match(/SET\s+(.*?)\s+WHERE/i);
              if (match) {
                const cols = match[1].split(',').map(c => c.trim().split('=')[0].trim());
                cols.forEach((col, idx) => {
                  if (idx < params.length - 1) {
                    txn[col] = params[idx];
                  }
                });
              }
            }
            changed = 1;
          }
        }

        saveStore();
        return { changes: changed };
      },

      get(...params) {
        self.store = loadStore();

        if (rawSql.includes('FROM transactions WHERE id = ?')) {
          return self.store.transactions.find(t => t.id === params[0]) || null;
        }

        if (rawSql.includes('FROM batch_runs WHERE id = ?')) {
          return self.store.batch_runs.find(b => b.id === params[0]) || null;
        }

        if (rawSql.includes('SELECT COALESCE(AVG(avg_recovery_time_seconds), 0)')) {
          const completed = self.store.batch_runs.filter(b => b.status === 'completed');
          const avg = completed.length > 0
            ? completed.reduce((s, b) => s + (b.avg_recovery_time_seconds || 0), 0) / completed.length
            : 0;
          return { avg_time: avg };
        }

        if (rawSql.includes('COUNT(*) as total_transactions')) {
          const txns = self.store.transactions;
          return {
            total_transactions: txns.length,
            total_revenue_at_risk: txns.reduce((s, t) => s + (Number(t.amount) || 0), 0),
            total_recovered: txns.reduce((s, t) => s + (Number(t.amount_recovered) || 0), 0),
            recovered_count: txns.filter(t => t.status === 'recovered').length,
            escalated_count: txns.filter(t => t.status === 'escalated').length,
            in_recovery_count: txns.filter(t => t.status === 'in_recovery').length,
            diagnosed_count: txns.filter(t => t.status === 'diagnosed').length,
            detected_count: txns.filter(t => t.status === 'detected').length,
            paused_count: txns.filter(t => t.status === 'paused' || t.is_paused === 1).length,
            failed_count: txns.filter(t => t.status === 'failed').length,
          };
        }

        if (rawSql.includes('COUNT(*) as total_actions')) {
          const actions = self.store.agent_actions;
          return {
            total_actions: actions.length,
            flagged_actions: actions.filter(a => a.compliance_flag != null).length,
            fraud_flags: actions.filter(a => a.compliance_flag === 'fraud_flagged').length,
            stopping_rules: actions.filter(a => a.compliance_flag === 'stopping_rule_triggered').length,
            escalations: actions.filter(a => a.compliance_flag === 'escalated_to_human').length,
            total_financial_impact: actions.reduce((s, a) => s + (Number(a.financial_impact) || 0), 0),
          };
        }

        if (rawSql.includes('COUNT(*) as count FROM transactions')) {
          let list = [...self.store.transactions];
          return { count: list.length };
        }

        if (rawSql.includes('COUNT(*) as count FROM agent_actions')) {
          let list = [...self.store.agent_actions];
          return { count: list.length };
        }

        return null;
      },

      all(...params) {
        self.store = loadStore();

        // Dashboard queries
        if (rawSql.includes('GROUP BY ai_diagnosis_category')) {
          const map = {};
          self.store.transactions.forEach(t => {
            if (!t.ai_diagnosis_category) return;
            const cat = t.ai_diagnosis_category;
            if (!map[cat]) {
              map[cat] = { category: cat, count: 0, total_amount: 0, recovered_amount: 0, recovered_count: 0 };
            }
            map[cat].count++;
            map[cat].total_amount += Number(t.amount) || 0;
            map[cat].recovered_amount += Number(t.amount_recovered) || 0;
            if (t.status === 'recovered') map[cat].recovered_count++;
          });
          return Object.values(map).sort((a, b) => b.count - a.count);
        }

        if (rawSql.includes('GROUP BY type')) {
          const map = {};
          self.store.transactions.forEach(t => {
            const type = t.type;
            if (!map[type]) {
              map[type] = { type, count: 0, total_amount: 0, recovered_amount: 0, recovered_count: 0 };
            }
            map[type].count++;
            map[type].total_amount += Number(t.amount) || 0;
            map[type].recovered_amount += Number(t.amount_recovered) || 0;
            if (t.status === 'recovered') map[type].recovered_count++;
          });
          return Object.values(map).sort((a, b) => b.count - a.count);
        }

        if (rawSql.includes('GROUP BY status')) {
          const map = {};
          self.store.transactions.forEach(t => {
            const st = t.status;
            if (!map[st]) map[st] = { status: st, count: 0, total_amount: 0 };
            map[st].count++;
            map[st].total_amount += Number(t.amount) || 0;
          });
          return Object.values(map);
        }

        if (rawSql.includes('GROUP BY stopping_rule_triggered')) {
          const map = {};
          self.store.transactions.forEach(t => {
            if (!t.stopping_rule_triggered) return;
            const r = t.stopping_rule_triggered;
            if (!map[r]) map[r] = { rule: r, count: 0 };
            map[r].count++;
          });
          return Object.values(map);
        }

        if (rawSql.includes('FROM batch_runs')) {
          return [...self.store.batch_runs];
        }

        if (rawSql.includes('FROM agent_actions WHERE transaction_id = ?')) {
          return self.store.agent_actions
            .filter(a => a.transaction_id === params[0])
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        if (rawSql.includes('FROM agent_actions WHERE batch_id = ?')) {
          return self.store.agent_actions
            .filter(a => a.batch_id === params[0])
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        if (rawSql.includes('FROM transactions WHERE batch_id = ?')) {
          return self.store.transactions
            .filter(t => t.batch_id === params[0])
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        }

        // Transactions list with filters & limit/offset
        if (rawSql.includes('SELECT * FROM transactions')) {
          let list = [...self.store.transactions];
          
          // Apply params if limit / offset
          const limit = params[params.length - 2] ?? 100;
          const offset = params[params.length - 1] ?? 0;

          // In case where params include filter values
          if (typeof limit === 'number' && typeof offset === 'number') {
            return list.slice(offset, offset + limit);
          }
          return list;
        }

        // Agent actions list with enriched customer names
        if (rawSql.includes('FROM agent_actions a')) {
          let list = self.store.agent_actions.map(a => {
            const txn = self.store.transactions.find(t => t.id === a.transaction_id);
            return {
              ...a,
              customer_name: txn?.customer_name || 'System Event',
              amount: txn?.amount || 0,
              transaction_type: txn?.type || 'payment_failure',
            };
          });

          const limit = params[params.length - 2] ?? 100;
          const offset = params[params.length - 1] ?? 0;
          if (typeof limit === 'number' && typeof offset === 'number') {
            return list.slice(offset, offset + limit);
          }
          return list;
        }

        return [];
      }
    };
  }
}

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new JsonDb();
  }
  return dbInstance;
}

export default getDb;
