import { v4 as uuidv4 } from 'uuid';

/* ── Indian name pools ─────────────────────────────────────── */
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Priya', 'Riya', 'Isha', 'Kavya',
  'Neha', 'Pooja', 'Shreya', 'Tanvi', 'Rahul', 'Amit', 'Suresh', 'Deepak',
  'Rajesh', 'Meera', 'Sunita', 'Nisha', 'Sanjay', 'Vikram'
];
const LAST_NAMES = [
  'Sharma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Reddy', 'Iyer', 'Nair',
  'Joshi', 'Mehta', 'Shah', 'Desai', 'Rao', 'Verma', 'Chopra', 'Malhotra',
  'Agarwal', 'Banerjee', 'Das', 'Mishra'
];
const COMPANY_NAMES = [
  'TechVista Solutions', 'GreenLeaf Exports', 'Pinnacle Infra Ltd', 'BlueOcean Logistics',
  'SkyHigh Aviation Pvt Ltd', 'Quantum Analytics', 'NovaTech Systems', 'PrimeEdge Manufacturing',
  'Horizon Digital Media', 'Atlas Trading Co', 'Zenith Pharma', 'CrystalClear Optics'
];
const MERCHANT_IDS = [
  'merch_razorpay_001', 'merch_razorpay_002', 'merch_razorpay_003',
  'merch_razorpay_004', 'merch_razorpay_005'
];

/* ── Helpers ───────────────────────────────────────────────── */
const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
const randBetween = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randAmount  = (lo, hi) => +(Math.random() * (hi - lo) + lo).toFixed(2);
const indianPhone = () => `+91${randBetween(70000, 99999)}${randBetween(10000, 99999)}`;
const fmtDate = d => d.toISOString().replace('T', ' ').slice(0, 19);

function pastDate(maxDaysAgo = 30) {
  const d = new Date();
  d.setDate(d.getDate() - randBetween(1, maxDaysAgo));
  d.setHours(randBetween(0, 23), randBetween(0, 59), randBetween(0, 59));
  return d;
}

/* ── Payment failure scenarios ────────────────────────────── */
const PAYMENT_FAILURE_SCENARIOS = [
  {
    reason: 'Insufficient Funds',
    code: 'BAD_REQUEST_ERROR',
    category: 'insufficient_funds',
    method: 'card',
    log: (name) => `[GATEWAY] Card auth declined for ${name}. Response: {"error":{"code":"BAD_REQUEST_ERROR","description":"Your payment didn't go through as it was declined by the bank. Try another payment method or contact your bank.","source":"bank","step":"payment_authorization","reason":"insufficient_funds"},"acquirer_data":{"auth_code":"","rrn":""}}`
  },
  {
    reason: 'Card Expired',
    code: 'BAD_REQUEST_ERROR',
    category: 'card_expired',
    method: 'card',
    log: (name) => `[GATEWAY] Card validation failed for ${name}. Response: {"error":{"code":"BAD_REQUEST_ERROR","description":"The card is expired. Please use a different card.","source":"issuer","step":"payment_authorization","reason":"card_expired"},"card":{"last4":"${randBetween(1000,9999)}","network":"Visa","type":"credit","expiry_month":"${randBetween(1,12)}","expiry_year":"2023"}}`
  },
  {
    reason: '3DS Authentication Failed',
    code: 'BAD_REQUEST_ERROR',
    category: '3ds_failure',
    method: 'card',
    log: (name) => `[GATEWAY] 3D Secure challenge failed for ${name}. Response: {"error":{"code":"BAD_REQUEST_ERROR","description":"Payment failed because cardholder could not be authenticated.","source":"customer","step":"payment_authentication","reason":"3ds_auth_failed"},"3ds":{"version":"2.0","status":"N","eci":"07"}}`
  },
  {
    reason: 'Bank Server Down',
    code: 'GATEWAY_ERROR',
    category: 'bank_downtime',
    method: 'netbanking',
    log: (name) => `[GATEWAY] Netbanking request timed out for ${name}. Response: {"error":{"code":"GATEWAY_ERROR","description":"The bank servers are currently experiencing issues. Please retry after some time.","source":"bank","step":"payment_processing","reason":"bank_server_down"},"bank_code":"${pick(['HDFC','ICICI','SBI','AXIS','KOTAK'])}","timeout_ms":30000}`
  },
  {
    reason: 'UPI Transaction Timeout',
    code: 'GATEWAY_ERROR',
    category: 'network_timeout',
    method: 'UPI',
    log: (name) => `[GATEWAY] UPI collect request expired for ${name}. Response: {"error":{"code":"GATEWAY_ERROR","description":"UPI transaction timed out. Customer did not authorize within the allowed window.","source":"customer","step":"payment_authorization","reason":"upi_timeout"},"upi":{"vpa":"${name.toLowerCase().replace(' ','')}@${pick(['okaxis','ybl','paytm','ibl'])}","expiry_minutes":5}}`
  },
  {
    reason: 'UPI Pin Incorrect',
    code: 'BAD_REQUEST_ERROR',
    category: 'insufficient_funds',
    method: 'UPI',
    log: (name) => `[GATEWAY] UPI PIN validation failed for ${name}. Response: {"error":{"code":"BAD_REQUEST_ERROR","description":"Incorrect UPI PIN entered by customer.","source":"customer","step":"payment_authorization","reason":"incorrect_pin"},"upi":{"vpa":"${name.toLowerCase().replace(' ','')}@ybl","attempts":3}}`
  },
  {
    reason: 'Wallet Balance Insufficient',
    code: 'BAD_REQUEST_ERROR',
    category: 'insufficient_funds',
    method: 'wallet',
    log: (name) => `[GATEWAY] Wallet debit failed for ${name}. Response: {"error":{"code":"BAD_REQUEST_ERROR","description":"Wallet balance is insufficient for this transaction.","source":"wallet_provider","step":"payment_debit","reason":"low_balance"},"wallet":"${pick(['paytm','phonepe','amazonpay','freecharge'])}","balance":${randBetween(10,200)}}`
  },
  {
    reason: 'Suspected Fraud - Velocity Check',
    code: 'BAD_REQUEST_ERROR',
    category: 'fraud_suspected',
    method: 'card',
    log: (name) => `[RISK_ENGINE] Transaction blocked by fraud detection for ${name}. Response: {"error":{"code":"BAD_REQUEST_ERROR","description":"Transaction declined due to suspected fraud.","source":"risk_engine","step":"risk_assessment","reason":"velocity_check_failed"},"risk":{"score":92,"flags":["multiple_cards_same_ip","high_value_new_customer","geo_mismatch"],"ip":"${randBetween(1,255)}.${randBetween(1,255)}.${randBetween(1,255)}.${randBetween(1,255)}"}}`
  },
  {
    reason: 'Network Connectivity Error',
    code: 'SERVER_ERROR',
    category: 'network_timeout',
    method: pick(['card', 'UPI', 'netbanking']),
    log: (name) => `[GATEWAY] Connection reset during payment for ${name}. Response: {"error":{"code":"SERVER_ERROR","description":"An internal error occurred while processing the payment. Please retry.","source":"internal","step":"payment_processing","reason":"connection_reset"},"trace_id":"${uuidv4().slice(0,8)}","retry_after_ms":${randBetween(1000,5000)}}`
  },
  {
    reason: 'International Card Blocked',
    code: 'BAD_REQUEST_ERROR',
    category: '3ds_failure',
    method: 'card',
    log: (name) => `[GATEWAY] International transaction blocked for ${name}. Response: {"error":{"code":"BAD_REQUEST_ERROR","description":"International transactions are not enabled on this card.","source":"issuer","step":"payment_authorization","reason":"intl_not_allowed"},"card":{"last4":"${randBetween(1000,9999)}","network":"Mastercard","issuer_country":"IN","merchant_country":"US"}}`
  }
];

/* ── Checkout dropout scenarios ───────────────────────────── */
const CHECKOUT_DROPOUT_SCENARIOS = [
  {
    reason: 'Cart Abandoned at Payment Step',
    code: 'CHECKOUT_TIMEOUT',
    category: 'network_timeout',
    method: pick(['card', 'UPI']),
    log: (name) => `[CHECKOUT] Session expired for ${name}. Event: {"event":"checkout_abandoned","stage":"payment_method_selection","session_duration_ms":${randBetween(30000,180000)},"items_in_cart":${randBetween(1,5)},"cart_value":${randAmount(499,15000)},"device":"${pick(['mobile_android','mobile_ios','desktop_chrome','desktop_firefox'])}","exit_url":"${pick(['/cart','/checkout/payment','/checkout/review'])}"}`,
  },
  {
    reason: 'OTP Timeout During 3DS',
    code: 'CHECKOUT_3DS_TIMEOUT',
    category: '3ds_failure',
    method: 'card',
    log: (name) => `[CHECKOUT] 3DS OTP window timed out for ${name}. Event: {"event":"3ds_otp_timeout","session_id":"sess_${uuidv4().slice(0,8)}","otp_window_seconds":120,"card_type":"debit","bank":"${pick(['HDFC','ICICI','SBI','AXIS'])}","device":"mobile_android"}`,
  },
  {
    reason: 'Page Crash on Payment Redirect',
    code: 'CHECKOUT_ERROR',
    category: 'network_timeout',
    method: 'netbanking',
    log: (name) => `[CHECKOUT] Redirect failure for ${name}. Event: {"event":"redirect_error","stage":"bank_redirect","error":"ERR_CONNECTION_REFUSED","bank":"${pick(['HDFC','SBI','PNB'])}","user_agent":"Mozilla/5.0","retry_count":0}`,
  }
];

/* ── Subscription failure scenarios ───────────────────────── */
const SUBSCRIPTION_FAILURE_SCENARIOS = [
  {
    reason: 'Mandate Debit Failed - Insufficient Balance',
    code: 'MANDATE_DEBIT_FAILED',
    category: 'insufficient_funds',
    method: 'mandate',
    log: (name, subId, mandateId) => `[SUBSCRIPTION] Mandate debit failed for ${name}. Response: {"event":"subscription.charged","payload":{"subscription":{"id":"${subId}","status":"halted","current_start":"${fmtDate(pastDate(2))}"},"mandate":{"id":"${mandateId}","status":"active","max_amount":10000},"payment":{"error_code":"BAD_REQUEST_ERROR","error_description":"Mandate execution failed due to insufficient funds in customer account","method":"emandate","bank":"${pick(['HDFC','ICICI','SBI'])}"}}}`,
  },
  {
    reason: 'Card Auto-Renewal Expired',
    code: 'SUBSCRIPTION_CARD_EXPIRED',
    category: 'card_expired',
    method: 'card',
    log: (name, subId) => `[SUBSCRIPTION] Auto-renewal failed for ${name}. Response: {"event":"subscription.charged","payload":{"subscription":{"id":"${subId}","status":"halted","plan_id":"plan_${uuidv4().slice(0,8)}","total_count":12,"paid_count":${randBetween(2,8)}},"payment":{"error_code":"BAD_REQUEST_ERROR","error_description":"Card used for subscription has expired. Customer needs to update payment method.","card_last4":"${randBetween(1000,9999)}","card_expiry":"01/2024"}}}`,
  },
  {
    reason: 'UPI Mandate Revoked by Customer',
    code: 'MANDATE_REVOKED',
    category: 'mandate_revoked',
    method: 'UPI',
    log: (name, subId, mandateId) => `[SUBSCRIPTION] UPI AutoPay mandate revoked for ${name}. Response: {"event":"subscription.cancelled","payload":{"subscription":{"id":"${subId}","status":"cancelled","cancel_reason":"mandate_revoked"},"mandate":{"id":"${mandateId}","status":"revoked","revoked_at":"${fmtDate(pastDate(5))}","upi_app":"${pick(['gpay','phonepe','paytm'])}"}}}`,
  },
  {
    reason: 'Bank Rejected Mandate Execution',
    code: 'MANDATE_EXECUTION_FAILED',
    category: 'bank_downtime',
    method: 'mandate',
    log: (name, subId, mandateId) => `[SUBSCRIPTION] Bank rejected mandate execution for ${name}. Response: {"event":"subscription.charged","payload":{"subscription":{"id":"${subId}","status":"halted"},"mandate":{"id":"${mandateId}","bank_error":"BANK_TECHNICAL_ERROR","bank":"${pick(['AXIS','KOTAK','BOB'])}"},"payment":{"error_code":"GATEWAY_ERROR","error_description":"Bank system is currently unavailable for mandate processing"}}}`,
  }
];

/* ── B2B Invoice scenarios ────────────────────────────────── */
function generateInvoiceScenarios() {
  const scenarios = [];
  const terms = ['NET-30', 'NET-45', 'NET-60', 'NET-90'];
  const statuses = [
    { reason: 'Invoice Overdue - No Response', daysOverdue: () => randBetween(5, 30) },
    { reason: 'Invoice Overdue - Payment Promised', daysOverdue: () => randBetween(10, 45) },
    { reason: 'Partial Payment Received', daysOverdue: () => randBetween(15, 60) },
    { reason: 'Invoice Disputed', daysOverdue: () => randBetween(1, 20) },
    { reason: 'Invoice Overdue - Final Notice Sent', daysOverdue: () => randBetween(60, 120) }
  ];

  for (let i = 0; i < 12; i++) {
    const s = statuses[i % statuses.length];
    const daysOverdue = s.daysOverdue();
    const company = pick(COMPANY_NAMES);
    const term = pick(terms);
    const invDate = new Date();
    invDate.setDate(invDate.getDate() - daysOverdue - parseInt(term.split('-')[1]));

    scenarios.push({
      reason: s.reason,
      company,
      term,
      daysOverdue,
      amount: randAmount(50000, 2500000),
      invoiceDate: fmtDate(invDate),
      dueDate: fmtDate(new Date(invDate.getTime() + parseInt(term.split('-')[1]) * 86400000)),
      partialPaid: s.reason === 'Partial Payment Received' ? randAmount(10000, 200000) : 0,
      promiseDate: s.reason === 'Invoice Overdue - Payment Promised'
        ? fmtDate(new Date(Date.now() + randBetween(3, 14) * 86400000))
        : null,
    });
  }
  return scenarios;
}

/* ── Main generator ───────────────────────────────────────── */
export function generateMockDataset(batchId) {
  const transactions = [];

  // ── 22 Payment Failures ──
  for (let i = 0; i < 22; i++) {
    const scenario = PAYMENT_FAILURE_SCENARIOS[i % PAYMENT_FAILURE_SCENARIOS.length];
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const id = `txn_${uuidv4().slice(0, 12)}`;

    transactions.push({
      id,
      type: 'payment_failure',
      merchant_id: pick(MERCHANT_IDS),
      customer_id: `cust_${uuidv4().slice(0, 8)}`,
      customer_name: name,
      customer_phone: indianPhone(),
      customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${pick(['gmail.com','yahoo.in','outlook.com','hotmail.com'])}`,
      amount: randAmount(499, 75000),
      currency: 'INR',
      failure_reason: scenario.reason,
      raw_log: scenario.log(name),
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
      created_at: fmtDate(pastDate(7)),
      updated_at: fmtDate(new Date()),
      resolved_at: null,
    });
  }

  // ── 12 Checkout Drop-offs ──
  for (let i = 0; i < 12; i++) {
    const scenario = CHECKOUT_DROPOUT_SCENARIOS[i % CHECKOUT_DROPOUT_SCENARIOS.length];
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;

    transactions.push({
      id: `txn_${uuidv4().slice(0, 12)}`,
      type: 'checkout_dropout',
      merchant_id: pick(MERCHANT_IDS),
      customer_id: `cust_${uuidv4().slice(0, 8)}`,
      customer_name: name,
      customer_phone: indianPhone(),
      customer_email: `${firstName.toLowerCase()}${randBetween(1,99)}@${pick(['gmail.com','yahoo.in'])}`,
      amount: randAmount(999, 25000),
      currency: 'INR',
      failure_reason: scenario.reason,
      raw_log: scenario.log(name),
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
      created_at: fmtDate(pastDate(3)),
      updated_at: fmtDate(new Date()),
      resolved_at: null,
    });
  }

  // ── 12 Subscription Failures ──
  for (let i = 0; i < 12; i++) {
    const scenario = SUBSCRIPTION_FAILURE_SCENARIOS[i % SUBSCRIPTION_FAILURE_SCENARIOS.length];
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const subId = `sub_${uuidv4().slice(0, 10)}`;
    const mandateId = `mand_${uuidv4().slice(0, 10)}`;

    transactions.push({
      id: `txn_${uuidv4().slice(0, 12)}`,
      type: 'subscription_failure',
      merchant_id: pick(MERCHANT_IDS),
      customer_id: `cust_${uuidv4().slice(0, 8)}`,
      customer_name: name,
      customer_phone: indianPhone(),
      customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${pick(['gmail.com','protonmail.com','company.in'])}`,
      amount: randAmount(199, 4999),
      currency: 'INR',
      failure_reason: scenario.reason,
      raw_log: scenario.log(name, subId, mandateId),
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
      created_at: fmtDate(pastDate(10)),
      updated_at: fmtDate(new Date()),
      resolved_at: null,
    });
  }

  // ── 12 B2B Overdue Invoices ──
  const invoiceScenarios = generateInvoiceScenarios();
  for (const inv of invoiceScenarios) {
    const contactFirst = pick(FIRST_NAMES);
    const contactLast = pick(LAST_NAMES);

    transactions.push({
      id: `txn_${uuidv4().slice(0, 12)}`,
      type: 'overdue_invoice',
      merchant_id: pick(MERCHANT_IDS),
      customer_id: `corp_${uuidv4().slice(0, 8)}`,
      customer_name: inv.company,
      customer_phone: indianPhone(),
      customer_email: `accounts@${inv.company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '')}.com`,
      amount: inv.amount,
      currency: 'INR',
      failure_reason: inv.reason,
      raw_log: `[INVOICING] Invoice overdue for ${inv.company}. Details: {"invoice_id":"INV-${randBetween(10000,99999)}","term":"${inv.term}","issued_date":"${inv.invoiceDate}","due_date":"${inv.dueDate}","days_overdue":${inv.daysOverdue},"amount":${inv.amount},"partial_paid":${inv.partialPaid},"contact_person":"${contactFirst} ${contactLast}","contact_email":"${contactFirst.toLowerCase()}@${inv.company.toLowerCase().replace(/\s+/g,'').replace(/[^a-z]/g,'')}.com","reminder_count":${randBetween(0,3)}}`,
      gateway_response_code: null,
      payment_method: 'bank_transfer',
      invoice_id: `INV-${randBetween(10000, 99999)}`,
      invoice_due_date: inv.dueDate,
      subscription_id: null,
      mandate_id: null,
      status: 'detected',
      ai_diagnosis: null,
      ai_diagnosis_category: null,
      recovery_method: null,
      recovery_attempts: 0,
      max_retries: 3,
      amount_recovered: inv.partialPaid,
      promise_to_pay_date: inv.promiseDate,
      promise_to_pay_status: inv.promiseDate ? 'pending' : null,
      stopping_rule_triggered: null,
      is_paused: 0,
      batch_id: batchId,
      created_at: inv.invoiceDate,
      updated_at: fmtDate(new Date()),
      resolved_at: null,
    });
  }

  return transactions;
}
