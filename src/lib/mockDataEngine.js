import { v4 as uuidv4 } from 'uuid';

/* ── Rich Indian name pools ─────────────────────────────────── */
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Priya', 'Riya', 'Isha', 'Kavya',
  'Neha', 'Pooja', 'Shreya', 'Tanvi', 'Rahul', 'Amit', 'Suresh', 'Deepak',
  'Rajesh', 'Meera', 'Sunita', 'Nisha', 'Sanjay', 'Vikram', 'Rohan', 'Kunal',
  'Sneha', 'Simran', 'Akash', 'Gaurav', 'Manish', 'Harsh', 'Varun', 'Alok',
  'Divya', 'Swati', 'Preeti', 'Kiran', 'Pallavi', 'Rashmi', 'Naveen', 'Pranav'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Reddy', 'Iyer', 'Nair',
  'Joshi', 'Mehta', 'Shah', 'Desai', 'Rao', 'Verma', 'Chopra', 'Malhotra',
  'Agarwal', 'Banerjee', 'Das', 'Mishra', 'Bhatia', 'Saxena', 'Kapoor',
  'Trivedi', 'Pandey', 'Goswami', 'Chauhan', 'Singhal', 'Sen', 'Dutta'
];

const COMPANY_NAMES = [
  'TechVista Solutions', 'GreenLeaf Exports', 'Pinnacle Infra Ltd', 'BlueOcean Logistics',
  'SkyHigh Aviation Pvt Ltd', 'Quantum Analytics', 'NovaTech Systems', 'PrimeEdge Manufacturing',
  'Horizon Digital Media', 'Atlas Trading Co', 'Zenith Pharma', 'CrystalClear Optics',
  'Bharat Heavy Dynamics', 'Indus Cloud Services', 'Kaveri Agro Tech', 'Vertex Fintech Labs',
  'Apex Global Logistics', 'Ekam Health Technologies', 'Zeta Robotics', 'Vistara Enterprises'
];

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'IndusInd Bank', 'Yes Bank', 'Punjab National Bank', 'Bank of Baroda'];
const UPI_HANDLES = ['okhdfcbank', 'okaxis', 'oksbi', 'okicici', 'paytm', 'ybl', 'ibl', 'apl', 'fam'];
const CARD_NETWORKS = ['RuPay', 'Visa', 'Mastercard', 'American Express', 'Diners Club'];

/* ── Helpers ───────────────────────────────────────────────── */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randBetween = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randAmount = (lo, hi) => +(Math.random() * (hi - lo) + lo).toFixed(2);
const indianPhone = () => `+91${randBetween(70000, 99999)}${randBetween(10000, 99999)}`;
const fmtDate = d => d.toISOString().replace('T', ' ').slice(0, 19);

function recentTimestamp(secondsAgoMax = 1800) {
  const d = new Date(Date.now() - randBetween(10, secondsAgoMax) * 1000);
  return fmtDate(d);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── Dynamic Scenario Generators ──────────────────────────── */

function getPaymentFailureScenario(name) {
  const bank = pick(BANKS);
  const upiApp = pick(['GPay', 'PhonePe', 'Paytm', 'CRED', 'BHIM']);
  const network = pick(CARD_NETWORKS);
  const last4 = randBetween(1000, 9999);

  const scenarios = [
    {
      reason: `Insufficient Balance in ${bank} Account`,
      code: 'BAD_REQUEST_ERROR',
      category: 'insufficient_funds',
      method: pick(['card', 'UPI', 'netbanking']),
      log: `[GATEWAY] Auth declined for ${name} by ${bank}. Error: {"code":"BAD_REQUEST_ERROR","source":"bank","reason":"insufficient_funds","bank":"${bank}","acquirer_data":{"rrn":"${randBetween(100000000000, 999999999999)}"}}`,
      amount: randAmount(499, 45000),
    },
    {
      reason: `${network} Card Expired (${randBetween(1, 12)}/2023)`,
      code: 'BAD_REQUEST_ERROR',
      category: 'card_expired',
      method: 'card',
      log: `[GATEWAY] Card verification failed for ${name}. Error: {"code":"BAD_REQUEST_ERROR","source":"issuer","reason":"card_expired","card":{"network":"${network}","last4":"${last4}"}}`,
      amount: randAmount(899, 65000),
    },
    {
      reason: `3DS OTP Verification Timeout via ${bank}`,
      code: 'BAD_REQUEST_ERROR',
      category: '3ds_failure',
      method: 'card',
      log: `[GATEWAY] 3DS challenge timeout for ${name}. Error: {"code":"BAD_REQUEST_ERROR","source":"customer","reason":"3ds_auth_failed","step":"otp_submission","bank":"${bank}"}`,
      amount: randAmount(1200, 35000),
    },
    {
      reason: `${bank} CBS Core Banking Server Downtime`,
      code: 'GATEWAY_ERROR',
      category: 'bank_downtime',
      method: pick(['netbanking', 'UPI', 'card']),
      log: `[GATEWAY] ${bank} node unreachable during transaction for ${name}. Error: {"code":"GATEWAY_ERROR","source":"bank","reason":"bank_server_down","timeout_ms":30000,"trace_id":"${uuidv4().slice(0, 8)}"}`,
      amount: randAmount(999, 85000),
    },
    {
      reason: `NPCI UPI Switch Latency Timeout (${upiApp})`,
      code: 'GATEWAY_ERROR',
      category: 'network_timeout',
      method: 'UPI',
      log: `[NPCI_UPI] Collect request expired for ${name} on ${upiApp}. Error: {"code":"GATEWAY_ERROR","source":"npci","reason":"upi_timeout","vpa":"${name.toLowerCase().replace(/\s+/g, '')}@${pick(UPI_HANDLES)}"}`,
      amount: randAmount(299, 25000),
    },
    {
      reason: `Incorrect UPI MPIN Entered on ${upiApp}`,
      code: 'BAD_REQUEST_ERROR',
      category: 'insufficient_funds',
      method: 'UPI',
      log: `[NPCI_UPI] MPIN auth rejected for ${name}. Error: {"code":"BAD_REQUEST_ERROR","source":"customer","reason":"incorrect_pin","attempts_exceeded":false}`,
      amount: randAmount(450, 18000),
    },
    {
      reason: `Risk Velocity Filter Triggered (Fraud Risk Score: ${randBetween(88, 99)}/100)`,
      code: 'BAD_REQUEST_ERROR',
      category: 'fraud_suspected',
      method: 'card',
      log: `[RISK_ENGINE] Blocked by shield policy for ${name}. RiskPayload: {"code":"BAD_REQUEST_ERROR","source":"risk_engine","score":${randBetween(88, 99)},"flags":["ip_geo_velocity","disposable_email","card_testing_pattern"]}`,
      amount: randAmount(15000, 95000),
    },
    {
      reason: 'International E-Commerce Transaction Disabled on Card',
      code: 'BAD_REQUEST_ERROR',
      category: '3ds_failure',
      method: 'card',
      log: `[GATEWAY] RBI mandate block: International Txn not active on ${network} card ending in ${last4} for ${name}.`,
      amount: randAmount(2500, 48000),
    },
  ];

  return pick(scenarios);
}

function getCheckoutDropoutScenario(name) {
  const scenarios = [
    {
      reason: 'Abandoned Cart at Payment Selection Step',
      code: 'CHECKOUT_TIMEOUT',
      category: 'network_timeout',
      method: pick(['UPI', 'card', 'wallet']),
      log: `[CHECKOUT] Session idle timeout for ${name}. Event: {"event":"checkout_abandoned","idle_seconds":180,"cart_items":${randBetween(1, 4)},"device":"${pick(['Android', 'iOS', 'Desktop Chrome'])}"}`,
      amount: randAmount(799, 19999),
    },
    {
      reason: 'Biometric 3DS Challenge Dismissed by User',
      code: 'CHECKOUT_3DS_TIMEOUT',
      category: '3ds_failure',
      method: 'card',
      log: `[CHECKOUT] User cancelled 3DS modal for ${name}. Event: {"event":"3ds_modal_dismissed","bank":"${pick(BANKS)}"}`,
      amount: randAmount(1500, 28000),
    },
    {
      reason: 'Payment Gateway Redirection Failure',
      code: 'CHECKOUT_ERROR',
      category: 'network_timeout',
      method: 'netbanking',
      log: `[CHECKOUT] Bank redirection failed for ${name}. Event: {"event":"redirect_error","bank":"${pick(BANKS)}","network_err":"ERR_NETWORK_CHANGED"}`,
      amount: randAmount(1100, 32000),
    },
  ];

  return pick(scenarios);
}

function getSubscriptionFailureScenario(name, subId, mandateId) {
  const bank = pick(BANKS);
  const scenarios = [
    {
      reason: `UPI AutoPay Mandate Debit Failed (Low Balance in ${bank})`,
      code: 'MANDATE_DEBIT_FAILED',
      category: 'insufficient_funds',
      method: 'mandate',
      log: `[SUBSCRIPTION] Auto-debit failed for ${name}. SubId: ${subId}. Mandate: ${mandateId}. Reason: Insufficient balance in ${bank}.`,
      amount: randAmount(299, 4999),
    },
    {
      reason: 'Recurring Subscription Card Expired on File',
      code: 'SUBSCRIPTION_CARD_EXPIRED',
      category: 'card_expired',
      method: 'card',
      log: `[SUBSCRIPTION] Renewal billing failed for ${name}. SubId: ${subId}. Saved card token is expired.`,
      amount: randAmount(499, 9999),
    },
    {
      reason: `Customer Revoked AutoPay Authorization on ${pick(['GPay', 'PhonePe', 'Paytm'])}`,
      code: 'MANDATE_REVOKED',
      category: 'mandate_revoked',
      method: 'UPI',
      log: `[SUBSCRIPTION] AutoPay mandate ${mandateId} was explicitly revoked by customer ${name} from UPI App.`,
      amount: randAmount(199, 2999),
    },
    {
      reason: `${bank} Batch Mandate Processing Failure`,
      code: 'MANDATE_EXECUTION_FAILED',
      category: 'bank_downtime',
      method: 'mandate',
      log: `[SUBSCRIPTION] Bank clearing house batch rejected mandate for ${name} at ${bank}.`,
      amount: randAmount(699, 7999),
    },
  ];

  return pick(scenarios);
}

function getInvoiceScenario(company) {
  const contactFirst = pick(FIRST_NAMES);
  const contactLast = pick(LAST_NAMES);
  const term = pick(['NET-30', 'NET-45', 'NET-60', 'NET-90']);
  const daysOverdue = randBetween(5, 75);
  const amount = randAmount(45000, 2200000);
  const invNum = randBetween(10000, 99999);
  const hasPromise = Math.random() < 0.45;
  const promiseDate = hasPromise
    ? fmtDate(new Date(Date.now() + randBetween(3, 14) * 86400000)).slice(0, 10)
    : null;

  return {
    reason: hasPromise ? `Invoice Overdue (${daysOverdue}d) - Client Payment Promised` : `Invoice Overdue (${daysOverdue}d) - Awaiting Clearance`,
    company,
    contactName: `${contactFirst} ${contactLast}`,
    contactEmail: `${contactFirst.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '')}.com`,
    amount,
    invoiceId: `INV-${invNum}`,
    dueDate: fmtDate(new Date(Date.now() - daysOverdue * 86400000)),
    promiseDate,
    rawLog: `[INVOICING] B2B Account Overdue for ${company}. Invoice: INV-${invNum}, Due: ${daysOverdue} days ago. Total: ₹${amount}. Contact: ${contactFirst} ${contactLast}.`,
  };
}

/* ── Main 50+ Synthetic Batch Generator ─────────────────────── */
export function generateMockDataset(batchId) {
  const transactions = [];
  const createdAt = recentTimestamp(300);

  // 1. Payment Failures (22 varied items)
  for (let i = 0; i < 22; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const scenario = getPaymentFailureScenario(name);
    const id = `txn_${uuidv4().slice(0, 12)}`;

    transactions.push({
      id,
      type: 'payment_failure',
      merchant_id: `merch_rzp_${randBetween(101, 109)}`,
      customer_id: `cust_${uuidv4().slice(0, 8)}`,
      customer_name: name,
      customer_phone: indianPhone(),
      customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${pick(['gmail.com', 'outlook.com', 'yahoo.in', 'icloud.com'])}`,
      amount: scenario.amount,
      currency: 'INR',
      failure_reason: scenario.reason,
      raw_log: scenario.log,
      gateway_response_code: scenario.code,
      payment_method: scenario.method,
      invoice_id: null,
      invoice_due_date: null,
      subscription_id: null,
      mandate_id: null,
      status: 'detected',
      ai_diagnosis: null,
      ai_diagnosis_category: scenario.category,
      recovery_method: null,
      recovery_attempts: 0,
      max_retries: scenario.category === 'fraud_suspected' ? 0 : 3,
      amount_recovered: 0,
      promise_to_pay_date: null,
      promise_to_pay_status: null,
      stopping_rule_triggered: null,
      is_paused: 0,
      batch_id: batchId,
      created_at: createdAt,
      updated_at: createdAt,
      resolved_at: null,
    });
  }

  // 2. Checkout Drop-offs (12 varied items)
  for (let i = 0; i < 12; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const scenario = getCheckoutDropoutScenario(name);
    const id = `txn_${uuidv4().slice(0, 12)}`;

    transactions.push({
      id,
      type: 'checkout_dropout',
      merchant_id: `merch_rzp_${randBetween(101, 109)}`,
      customer_id: `cust_${uuidv4().slice(0, 8)}`,
      customer_name: name,
      customer_phone: indianPhone(),
      customer_email: `${firstName.toLowerCase()}${randBetween(10, 99)}@${pick(['gmail.com', 'yahoo.in'])}`,
      amount: scenario.amount,
      currency: 'INR',
      failure_reason: scenario.reason,
      raw_log: scenario.log,
      gateway_response_code: scenario.code,
      payment_method: scenario.method,
      invoice_id: null,
      invoice_due_date: null,
      subscription_id: null,
      mandate_id: null,
      status: 'detected',
      ai_diagnosis: null,
      ai_diagnosis_category: scenario.category,
      recovery_method: null,
      recovery_attempts: 0,
      max_retries: 3,
      amount_recovered: 0,
      promise_to_pay_date: null,
      promise_to_pay_status: null,
      stopping_rule_triggered: null,
      is_paused: 0,
      batch_id: batchId,
      created_at: createdAt,
      updated_at: createdAt,
      resolved_at: null,
    });
  }

  // 3. Subscription Failures (12 varied items)
  for (let i = 0; i < 12; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const subId = `sub_${uuidv4().slice(0, 8)}`;
    const mandateId = `mand_${uuidv4().slice(0, 8)}`;
    const scenario = getSubscriptionFailureScenario(name, subId, mandateId);
    const id = `txn_${uuidv4().slice(0, 12)}`;

    transactions.push({
      id,
      type: 'subscription_failure',
      merchant_id: `merch_rzp_${randBetween(101, 109)}`,
      customer_id: `cust_${uuidv4().slice(0, 8)}`,
      customer_name: name,
      customer_phone: indianPhone(),
      customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${pick(['gmail.com', 'proton.me', 'company.in'])}`,
      amount: scenario.amount,
      currency: 'INR',
      failure_reason: scenario.reason,
      raw_log: scenario.log,
      gateway_response_code: scenario.code,
      payment_method: scenario.method,
      invoice_id: null,
      invoice_due_date: null,
      subscription_id: subId,
      mandate_id: mandateId,
      status: 'detected',
      ai_diagnosis: null,
      ai_diagnosis_category: scenario.category,
      recovery_method: null,
      recovery_attempts: 0,
      max_retries: scenario.category === 'mandate_revoked' ? 1 : 3,
      amount_recovered: 0,
      promise_to_pay_date: null,
      promise_to_pay_status: null,
      stopping_rule_triggered: null,
      is_paused: 0,
      batch_id: batchId,
      created_at: createdAt,
      updated_at: createdAt,
      resolved_at: null,
    });
  }

  // 4. B2B Overdue Invoices (12 varied items)
  const shuffledCompanies = shuffle(COMPANY_NAMES);
  for (let i = 0; i < 12; i++) {
    const company = shuffledCompanies[i % shuffledCompanies.length];
    const inv = getInvoiceScenario(company);
    const id = `txn_${uuidv4().slice(0, 12)}`;

    transactions.push({
      id,
      type: 'overdue_invoice',
      merchant_id: `merch_rzp_${randBetween(101, 109)}`,
      customer_id: `corp_${uuidv4().slice(0, 8)}`,
      customer_name: inv.company,
      customer_phone: indianPhone(),
      customer_email: inv.contactEmail,
      amount: inv.amount,
      currency: 'INR',
      failure_reason: inv.reason,
      raw_log: inv.rawLog,
      gateway_response_code: null,
      payment_method: 'bank_transfer',
      invoice_id: inv.invoiceId,
      invoice_due_date: inv.dueDate,
      subscription_id: null,
      mandate_id: null,
      status: 'detected',
      ai_diagnosis: null,
      ai_diagnosis_category: null,
      recovery_method: null,
      recovery_attempts: 0,
      max_retries: 3,
      amount_recovered: 0,
      promise_to_pay_date: inv.promiseDate,
      promise_to_pay_status: inv.promiseDate ? 'pending' : null,
      stopping_rule_triggered: null,
      is_paused: 0,
      batch_id: batchId,
      created_at: createdAt,
      updated_at: createdAt,
      resolved_at: null,
    });
  }

  // Shuffle the final list so types appear interleaved in real-time
  return shuffle(transactions);
}
