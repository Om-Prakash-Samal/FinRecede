/**
 * ActionModule — Executes bounded recovery workflows.
 *
 * Each action is simulated (no real SMS / gateway calls) but produces
 * realistic audit-worthy output to demonstrate the production architecture.
 */

import { v4 as uuidv4 } from 'uuid';

/* ── Hinglish message templates ───────────────────────────── */
const HINGLISH_SMS_TEMPLATES = {
  insufficient_funds: [
    'Namaste {name} ji! 🙏 Aapka ₹{amount} ka payment fail ho gaya hai. Kripya apne account mein balance check karein aur yahan retry karein 👉 {link}',
    'Hi {name}, aapke account mein balance kam hai isliye ₹{amount} ka payment nahi hua. Balance add karke dubara try karein: {link}',
    '{name} ji, aapki payment ₹{amount} process nahi ho payi. Insufficient funds. Retry link: {link} 🔄',
  ],
  card_expired: [
    'Hi {name}! Aapka card expire ho gaya hai. ₹{amount} ki payment ke liye naya card add karein: {link} 💳',
    '{name} ji, aapke card ki validity khatam ho gayi hai. Kripya card update karein: {link}',
  ],
  mandate_revoked: [
    'Namaste {name} ji! Aapka AutoPay mandate cancel ho gaya hai. ₹{amount}/month subscription jari rakhne ke liye naya mandate set karein: {link} 🙏',
    'Hi {name}, aapka UPI AutoPay band ho gaya hai. Subscription continue karne ke liye yahan click karein: {link}',
  ],
  general: [
    'Hi {name}! Aapki ₹{amount} ki payment fail ho gayi. Dubara try karne ke liye yahan click karein: {link} 🔄',
    '{name} ji, aapke payment mein issue aaya hai. Kripya retry karein: {link}',
  ],
};

const HINGLISH_VOICE_SCRIPTS = {
  insufficient_funds: 'Namaste {name} ji. Yeh Razorpay se automated call hai. Aapke {merchant} pe ₹{amount} ka payment insufficient funds ki wajah se fail ho gaya. Kripya apne bank account ya wallet mein balance add karein aur payment retry karein. Aapko abhi ek SMS bhi bheja gaya hai jismein retry link hai. Dhanyavaad.',
  mandate_revoked: 'Namaste {name} ji. Yeh ek important call hai {merchant} ki taraf se. Aapka AutoPay mandate cancel ho gaya hai. Aapki ₹{amount} ki monthly subscription rok di gayi hai. Agar aap continue karna chahte hain toh kripya apne UPI app mein jaake naya mandate set karein. Ek link aapko SMS pe bheja gaya hai. Dhanyavaad aur shubh din.',
  general: 'Namaste {name} ji. Yeh {merchant} se automated call hai regarding aapki ₹{amount} ki failed payment. Kripya apne registered mobile pe aaye SMS mein diye gaye link se payment complete karein. Agar koi sawal hai toh hamari support team se contact karein. Dhanyavaad.',
};

/* ── Email templates ──────────────────────────────────────── */
const EMAIL_TEMPLATES = {
  gentle_reminder: {
    subject: 'Friendly Reminder: Invoice {invoice_id} - Payment Due',
    body: `Dear {name},

This is a gentle reminder that Invoice {invoice_id} for ₹{amount} was due on {due_date}. As of today, it is {days_overdue} days past due.

We understand that oversights happen. Could you please arrange for the payment at your earliest convenience?

Payment can be made via bank transfer to our account or through our payment portal: {link}

Best regards,
Accounts Receivable Team`,
  },
  firm_followup: {
    subject: 'URGENT: Invoice {invoice_id} - Payment Overdue ({days_overdue} days)',
    body: `Dear {name},

We are writing to follow up on Invoice {invoice_id} for ₹{amount}, which is now {days_overdue} days overdue.

Despite our previous reminder, we have not received payment. Please treat this as urgent and arrange immediate payment.

If you have already made the payment, please share the transaction reference so we can reconcile.

If there are any disputes or issues, please contact us immediately at finance@merchant.com.

Regards,
Finance Department`,
  },
  final_notice: {
    subject: '⚠️ FINAL NOTICE: Invoice {invoice_id} - Immediate Action Required',
    body: `Dear {name},

This is our final notice regarding Invoice {invoice_id} for ₹{amount}, which is now {days_overdue} days overdue.

If payment is not received within 7 business days, we will be compelled to:
1. Suspend all active services
2. Apply late payment charges as per our agreement
3. Escalate to our collections team

Please make immediate payment via: {link}

This is an automated notice. For queries, contact finance@merchant.com.

Regards,
Chief Financial Officer`,
  },
};

/* ── Helpers ───────────────────────────────────────────────── */
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const delay = ms => new Promise(r => setTimeout(r, ms));

function fillTemplate(template, vars) {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return result;
}

/* ── Action executors ─────────────────────────────────────── */

export async function executeAutoRetry(transaction) {
  const retryDelay = transaction.ai_diagnosis_category === 'bank_downtime' ? 600 : 200;
  await delay(retryDelay);

  // Probabilistic success
  const successRate = {
    bank_downtime: 0.65,
    network_timeout: 0.75,
    '3ds_failure': 0.30,
    insufficient_funds: 0.15,
  };
  const rate = successRate[transaction.ai_diagnosis_category] || 0.40;
  const success = Math.random() < rate;

  return {
    success,
    action_type: 'retry',
    action_detail: success
      ? `Auto-retry #${transaction.recovery_attempts + 1} SUCCEEDED. Payment of ₹${transaction.amount} processed via ${transaction.payment_method}.`
      : `Auto-retry #${transaction.recovery_attempts + 1} FAILED. Gateway returned same error. Will ${transaction.recovery_attempts + 1 >= transaction.max_retries ? 'escalate' : 'retry again'}.`,
    decision_reasoning: `Agent decided to auto-retry based on diagnosis "${transaction.ai_diagnosis_category}". Historical success rate for this category: ${(rate * 100).toFixed(0)}%. Attempt ${transaction.recovery_attempts + 1}/${transaction.max_retries}.`,
    financial_impact: success ? transaction.amount : 0,
    simulated_response: success
      ? { status: 'captured', payment_id: `pay_${uuidv4().slice(0, 12)}`, method: transaction.payment_method }
      : { status: 'failed', error: transaction.failure_reason },
  };
}

export async function executeSendSMS(transaction) {
  await delay(150);
  const category = transaction.ai_diagnosis_category || 'general';
  const templates = HINGLISH_SMS_TEMPLATES[category] || HINGLISH_SMS_TEMPLATES.general;
  const message = fillTemplate(pick(templates), {
    name: transaction.customer_name?.split(' ')[0] || 'Customer',
    amount: transaction.amount?.toLocaleString('en-IN'),
    link: `https://rzp.io/r/${uuidv4().slice(0, 8)}`,
    merchant: transaction.merchant_id,
  });

  // SMS-driven recovery: ~25% conversion rate
  const success = Math.random() < 0.25;

  return {
    success,
    action_type: 'send_sms',
    action_detail: `Hinglish SMS sent to ${transaction.customer_phone}: "${message.slice(0, 80)}..."`,
    decision_reasoning: `Sending culturally-appropriate Hinglish SMS for "${category}" failure. SMS recovery typically converts at 20-30% for Indian market.`,
    financial_impact: success ? transaction.amount : 0,
    message_content: message,
    simulated_delivery: { status: 'delivered', provider: 'MSG91', message_id: `msg_${uuidv4().slice(0, 8)}` },
  };
}

export async function executeSendVoice(transaction) {
  await delay(300);
  const category = transaction.ai_diagnosis_category || 'general';
  const script = HINGLISH_VOICE_SCRIPTS[category] || HINGLISH_VOICE_SCRIPTS.general;
  const filledScript = fillTemplate(script, {
    name: transaction.customer_name?.split(' ')[0] || 'Customer',
    amount: transaction.amount?.toLocaleString('en-IN'),
    merchant: transaction.merchant_id,
  });

  // Voice call recovery: ~15% conversion
  const success = Math.random() < 0.15;

  return {
    success,
    action_type: 'send_voice',
    action_detail: `Hinglish IVR call placed to ${transaction.customer_phone}. Script: "${filledScript.slice(0, 60)}..."`,
    decision_reasoning: `SMS did not convert. Escalating to Hinglish voice call. Voice recovery converts at ~15% but is higher-touch intervention.`,
    financial_impact: success ? transaction.amount : 0,
    voice_script: filledScript,
    simulated_delivery: { status: 'completed', duration_seconds: 45, provider: 'Exotel', call_id: `call_${uuidv4().slice(0, 8)}` },
  };
}

export async function executeSendEmail(transaction, stage = 'gentle_reminder') {
  await delay(100);
  const template = EMAIL_TEMPLATES[stage] || EMAIL_TEMPLATES.gentle_reminder;
  const daysOverdue = transaction.invoice_due_date
    ? Math.max(0, Math.floor((Date.now() - new Date(transaction.invoice_due_date).getTime()) / 86400000))
    : 0;

  const subject = fillTemplate(template.subject, {
    invoice_id: transaction.invoice_id || 'N/A',
    amount: transaction.amount?.toLocaleString('en-IN'),
    due_date: transaction.invoice_due_date || 'N/A',
    days_overdue: daysOverdue,
    name: transaction.customer_name,
    link: `https://pay.merchant.com/${uuidv4().slice(0, 8)}`,
  });

  // Email recovery: ~20% for gentle, ~10% for firm, ~5% for final
  const rates = { gentle_reminder: 0.20, firm_followup: 0.10, final_notice: 0.05 };
  const success = Math.random() < (rates[stage] || 0.10);

  return {
    success,
    action_type: 'send_email',
    action_detail: `${stage.replace('_', ' ').toUpperCase()} email sent to ${transaction.customer_email}. Subject: "${subject}"`,
    decision_reasoning: `B2B receivables workflow stage: ${stage}. Invoice is ${daysOverdue} days overdue. Expected conversion rate: ${((rates[stage] || 0.10) * 100).toFixed(0)}%.`,
    financial_impact: success ? (transaction.amount - (transaction.amount_recovered || 0)) : 0,
    email_subject: subject,
    stage,
  };
}

export async function executeAlternateMethod(transaction) {
  await delay(200);
  const altMethods = ['UPI', 'wallet', 'netbanking', 'card'].filter(m => m !== transaction.payment_method);
  const suggested = pick(altMethods);

  // Alternate method success: ~35%
  const success = Math.random() < 0.35;

  return {
    success,
    action_type: 'alternate_method',
    action_detail: success
      ? `Customer switched to ${suggested} and payment of ₹${transaction.amount} completed successfully.`
      : `Suggested ${suggested} as alternate payment method via SMS. Awaiting customer action.`,
    decision_reasoning: `Original method "${transaction.payment_method}" failed due to "${transaction.ai_diagnosis_category}". Recommending ${suggested} which bypasses the failure point.`,
    financial_impact: success ? transaction.amount : 0,
    suggested_method: suggested,
  };
}

export async function executePromiseToPay(transaction) {
  await delay(100);
  const promiseDays = Math.floor(Math.random() * 14) + 3;
  const promiseDate = new Date();
  promiseDate.setDate(promiseDate.getDate() + promiseDays);

  return {
    success: true, // Promise is always "successful" — tracking follows
    action_type: 'promise_to_pay',
    action_detail: `Promise-to-pay commitment captured from ${transaction.customer_name}. Promised date: ${promiseDate.toISOString().slice(0, 10)}. Amount: ₹${transaction.amount?.toLocaleString('en-IN')}.`,
    decision_reasoning: `B2B client responded to outreach with payment commitment. Scheduling follow-up for ${promiseDate.toISOString().slice(0, 10)}. If broken, will escalate to final notice.`,
    financial_impact: 0, // No money yet
    promise_date: promiseDate.toISOString().slice(0, 10),
  };
}

export async function executeEscalation(transaction, reason) {
  await delay(100);

  return {
    success: true,
    action_type: 'escalate',
    action_detail: `Transaction ESCALATED to manual review. Reason: ${reason}. All automated recovery stopped.`,
    decision_reasoning: `Stopping rule triggered: "${reason}". Agent has exhausted all bounded automated recovery options. Escalating to human review team per compliance policy.`,
    financial_impact: 0,
    escalation_reason: reason,
    compliance_flag: reason === 'fraud_suspected' ? 'fraud_flagged' : 'escalated_to_human',
  };
}
