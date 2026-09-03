<div align="center">

#  FinRecede


### Autonomous AI Revenue Recovery Agent

*Detect the leak. Diagnose the cause. Recover the revenue. Prove it happened.*

[![Built with Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Status](https://img.shields.io/badge/state%20machine-v2.4-orange)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

## Access the website: https://finrecede.vercel.app/
<img width="1224" height="864" alt="Arch" src="https://github.com/user-attachments/assets/7e9dc9cc-5165-415e-b83b-33832d77d7c0" />

## Preview:
<img width="959" height="412" alt="image" src="https://github.com/user-attachments/assets/516e7417-b408-4cc2-82a3-edcdd94928b5" />



[Overview](#overview) • [Architecture](#architecture) • [Screens](#screens) • [Getting Started](#getting-started) • [API](#api-reference) • [Compliance Engine](#compliance--stopping-rules) • [Results](#measured-results)

</div>

---

## Overview

Revenue rarely disappears in one clean step. A payment degrades mid-authorization, a customer abandons checkout at the OTP screen, a subscription mandate silently expires, an enterprise invoice ages past its terms — and by the time a human notices, the money is gone.

**FinRecede** is a closed-loop autonomous agent that sits on top of a payments stack and runs every at-risk rupee through the same disciplined pipeline:

```
DETECT  →  DIAGNOSE  →  INTERVENE  →  RESOLVE
```

It doesn't just flag problems — it takes bounded, policy-compliant recovery actions (retries, Hinglish outreach, alternate-rail switching, invoice chasing), logs every decision it makes with its reasoning, and stops itself the moment a stopping rule or compliance boundary is hit. Nothing runs unbounded, and nothing runs untracked.

Built end-to-end for the **-AI Revenue Recovery** track.

---

## Why this exists

| Failure mode | Where it happens | What FinRecede does about it |
|---|---|---|
| **Payment degradation** | Bank downtime, 3DS drop-off, network timeouts | Root-cause classification + bounded exponential retry across alternate rails |
| **Checkout drop-off** | OTP timeout, payment-method abandonment | Recovery nudge with a direct deep-link back to checkout |
| **Subscription failure** | Card expiry, mandate revocation, insufficient funds | Hinglish SMS/voice cadence, capped outreach, no silent auto-retry on revoked mandates |
| **B2B receivables** | NET-30/45/60/90 invoices aging past terms | 3-stage chasing cadence with promise-to-pay capture and legal pre-escalation |

 **Every action is bounded, reasoned about, and logged before it's taken.**

---

## Architecture

FinRecede is a single Next.js application with a stateful agent core, a JSON-backed persistence layer, and a real-time streaming API — no external services required to run it end-to-end.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER (Next.js 15)                  │
│                                                                         │
│   Executive Command    │   Diagnostics & Logs   │   Compliance Ledger   │
│   • Sankey recovery    │   • Root-cause matrix  │   • Immutable audit   │
│     funnel (Plotly)    │   • Manual override    │     trail             │
│   • 4 live KPIs        │     (pause / resume)   │   • Stopping-rule &   │
│   • SSE batch control  │                        │     fraud-flag log    │
└────────────────────────────── ┬─────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  API ROUTING & REAL-TIME STREAMING                       │
│                                                                          │
│   GET  /api/dashboard        GET  /api/transactions    GET /api/audit    │
│   POST /api/batch            PATCH /api/transactions                     │
│   GET  /api/batch/stream  ── Server-Sent Events (live batch telemetry)   │
└────────────────────────────── ┬──────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 AGENT CORE — STATE MACHINE LIFECYCLE                   │
│                                                                        │
│   1. DETECT  ──►  2. DIAGNOSE  ──►  3. INTERVENE  ──►  4. RESOLVE      │
│   multi-channel    AI log parser    bounded recovery    recovered      │
│   ingestion         + confidence     action loops        escalated     │
└────────────────────────────── ┬────────────────────────────────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
┌──────────────────────────────── ┐  ┌────────────────────────────────────┐
│   ACTION & WORKFLOW EXECUTORS   │  │      PERSISTENT LEDGER (JSON)      │
│                                 │  │                                    │
│  • Auto-retry gateway sequencer │  │  transactions   — one row per      │
│  • Hinglish SMS / IVR engine    │  │                   at-risk event    │
│  • Alternate-rail switcher      │  │  agent_actions  — immutable audit  │
│  • B2B invoice chaser (3-stage) │  │                   log, FK'd to txn │
│  • Promise-to-pay tracker       │  │  batch_runs     — run telemetry    │
└──────────────────────────────── ┘  └────────────────────────────────────┘
```

### The closed loop, one event at a time

```
[ Revenue risk event ]
        │
        ▼
 DETECT     — flags the transaction, locks metadata, prices the amount at risk
        │
        ▼
 DIAGNOSE   — parses raw gateway logs & error codes, classifies root cause
        │            with a confidence score
        ▼
 INTERVENE  — runs the recovery strategy matrix for that root cause,
        │            inside a hard-bounded retry/outreach ceiling
        ▼
 RESOLVE    —  salvaged & reconciled, or  compliant escalation to a human
```

Worked example — a ₹4,999 subscription charge that fails on insufficient funds:

```
1. INGESTION     Event captured as payment_failure → status: "detected"
                 Audit: "Revenue risk detected: ₹4,999 at risk from Vivaan Gupta"

2. DIAGNOSIS     Raw log parsed: {"reason":"insufficient_funds","step":"authorization"}
                 Root cause: insufficient_funds (confidence 92%)
                 Strategy selected: Hinglish SMS → Hinglish voice → escalate
                 State: detected → diagnosed

3. INTERVENTION  Action: send_sms — Hinglish template with retry deep-link
                 Customer tops up balance, clicks link, payment captures

4. RESOLUTION    status: "recovered" · amount_recovered: ₹4,999
                 Audit: "💰 Recovery successful — ₹4,999 recovered via send_sms"
                 Dashboard KPI: Total Recovered +₹4,999
```

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Server + client components in one tree, native API routes for the agent backend |
| Charts | **Plotly.js** | Sankey funnel, category bars, channel donuts — needs real interactivity, not static SVGs |
| Streaming | **Server-Sent Events** | One-directional, no need for full WebSocket overhead for batch telemetry |
| Styling | CSS custom properties + `backdrop-filter` glassmorphism | Consistent theming across 4 distinct dashboard views without a CSS framework |
| Persistence | Zero-dependency JSON ledger (`data/finrecede.json`) | ACID-enough for a bounded demo dataset, zero setup friction, fully inspectable by judges |
| Agent logic | Deterministic diagnosis + strategy matrix, LLM-shaped reasoning strings | Every decision is explainable and reproducible — no black-box calls in the critical path |

---

## Folder Structure

```
finrecede/
├── src/
│   ├── app/
│   │   ├── page.js                    # Executive Recovery Command (home)
│   │   │   ├── KPICards.js            # 4 live metrics: at risk, recovered, rate, latency
│   │   │   ├── RecoveryFunnel.js      # Plotly Sankey — detected → diagnosed → recovered
│   │   │   ├── PlotlyCharts.js        # Category bar chart + channel donut chart
│   │   │   ├── BatchController.js     # SSE trigger + live activity terminal feed
│   │   │   └── TransactionTable.js    # Searchable, filterable transaction overview
│   │   │
│   │   ├── diagnostics/
│   │   │   └── page.js                # Root-Cause Diagnostics & Log Parser
│   │   │       ├── CategoryFrequency.js
│   │   │       ├── PolicyCards.js     # Explanatory strategy-rule cards
│   │   │       └── TransactionTable.js # Pause / resume / escalate controls
│   │   │
│   │   ├── audit/
│   │   │   └── page.js                # Compliance Ledger
│   │   │       ├── StatsOverview.js   # Total actions, stopping rules, fraud flags
│   │   │       └── AuditTable.js      # Immutable log with AI reasoning strings
│   │   │
│   │   ├── receivables/
│   │   │   └── page.js                # B2B Receivables Chaser
│   │   │       ├── AgingBuckets.js    # Current / 30d / 60d / 90d+ buckets
│   │   │       ├── AgingBarChart.js   # Plotly receivables distribution
│   │   │       └── InvoiceTable.js    # Chasing stage & promise-to-pay tracking
│   │   │
│   │   └── api/
│   │       ├── dashboard/route.js     # GET  — aggregated KPI summary
│   │       ├── transactions/route.js  # GET  — list/filter · PATCH — manual override
│   │       ├── audit/route.js         # GET  — full compliance ledger
│   │       └── batch/
│   │           ├── route.js           # POST — trigger a synchronous batch run
│   │           └── stream/route.js    # GET  — SSE live batch telemetry
│   │
│   └── lib/
│       ├── mockDataEngine.js          # Synthetic event generator (58 scenarios, 4 categories)
│       ├── diagnosticEngine.js        # Root-cause classifier + confidence scoring
│       ├── actionModule.js            # Recovery strategy executors (retry / SMS / voice / chase)
│       ├── agentCore.js               # State machine + compliance & stopping-rule matrix
│       └── db.js                      # JSON-backed ACID-ish persistence layer
│
├── data/
│   └── finrecede.json                 # Transaction & audit ledger (generated at runtime)
│
├── public/
│   └── ...                            # Static assets
│
├── package.json
├── next.config.js
└── README.md
```

---

## Data Model

```
┌─────────────────────────────────────────── ─┐
│                TRANSACTIONS                 │
├─────────────────────────────────────────────┤
│ id                            PK            │
│ type          payment_failure │ checkout │  │
│               subscription │ invoice        │
│ amount, currency                            │
│ status        detected → diagnosed →        │
│               in_recovery → recovered /     │
│               escalated                     │
│ ai_diagnosis, ai_diagnosis_category         │
│ recovery_method, recovery_attempts          │
│ amount_recovered                            │
│ stopping_rule_triggered                     │
│ promise_to_pay_date, promise_to_pay_status  │
└───────────────────┬─────────────────────────┘
                    │ 1 : N
                    ▼
┌──────────────────────────────────────────────┐
│                AGENT_ACTIONS                 │
├──────────────────────────────────────────────┤
│ id                             PK            │
│ transaction_id                 FK            │
│ action_type     detect · diagnose · retry ·  │
│                 send_sms · escalate · …      │
│ action_detail                                │
│ decision_reasoning            (AI rationale) │
│ previous_state → new_state                   │
│ financial_impact              (₹ recovered)  │
│ compliance_flag  stopping_rule · fraud_flag ·│
│                  escalated                   │
│ created_at                                   │
└──────────────────────────────────────────────┘
```

Every row in `agent_actions` is append-only. Nothing is ever mutated or deleted — that's what makes the audit view a genuine compliance ledger rather than a log viewer.

---

## Compliance & Stopping Rules

This is the part that's meant to survive a judge (or a risk officer) asking *"what stops this agent from spamming a customer forever?"*

| Root cause | Bounded recovery sequence | Stopping rule | Why |
|---|---|---|---|
| Bank downtime | `retry → retry → retry → escalate` | Max 3 retries | Prevents hammering an already-degraded bank switch |
| 3DS auth drop | `alternate_method → send_sms → escalate` | Max 2 attempts | Avoids repeated 3DS lockouts |
| Insufficient funds | `hinglish_sms → hinglish_sms → hinglish_voice → escalate` | Max 3 touches | Polite collection etiquette — no spam |
| **Fraud suspected** | `escalate` | **0 retries — instant hard stop** | Zero automated action; record locked for human risk review |
| Mandate revoked | `hinglish_sms → escalate` | Max 1 outreach | Respects the customer's own opt-out signal |
| Overdue invoice | `gentle → firm → promise-to-pay → final notice → escalate` | 3-stage cadence ceiling | Structured, defensible commercial escalation |

High-value cases that exhaust their retry budget are **escalated to a human**, not silently dropped — the agent is bounded, not blind.

---

## Screens

<table>
<tr>
<td width="50%">

**Executive Recovery Command**
Live KPIs (revenue at risk, recovered, success rate, latency), a Sankey recovery funnel, and a one-click synthetic batch trigger with an SSE-powered live feed.
 
</td>
<td width="50%">

**Root-Cause Diagnostics**
Failure-category frequency chart, per-category strategy explainer cards, and a searchable transaction table with manual pause/resume/escalate controls.

</td>
</tr>
<tr>
<td width="50%">

**Compliance Ledger**
Immutable, timestamped audit trail — every state transition paired with the agent's decision reasoning, financial impact, and compliance flag.

</td>
<td width="50%">

**B2B Receivables Chaser**
Aging-bucket distribution (0–30 / 31–60 / 61–90 / 90+), active invoice list with chasing stage, and promise-to-pay commitment tracking.

</td>
</tr>
</table>

> Add screenshots to `docs/screenshots/` and reference them here, e.g.
> `![Executive Overview](docs/screenshots/executive-overview.png)`

---

## Getting Started

```bash
# 1. Clone and install
git clone https://github.com/<your-username>/finrecede.git
cd finrecede
npm install

# 2. Run the dev server
npm run dev

# 3. Open the dashboard
open http://localhost:3000
```

No database, no API keys, and no external services are required to run the full demo — `mockDataEngine.js` seeds a fresh synthetic dataset on first run, and everything else runs in-process.

To reset the ledger and generate a fresh batch of synthetic events:

```bash
curl -X POST http://localhost:3000/api/batch
```

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated KPI summary — revenue at risk, recovered, recovery rate, latency |
| `GET` | `/api/transactions` | List/filter transactions by type, status, or root cause |
| `PATCH` | `/api/transactions` | Manual merchant override — pause, resume, or force-escalate a case |
| `GET` | `/api/audit` | Full immutable compliance ledger |
| `POST` | `/api/batch` | Trigger a synchronous batch recovery run |
| `GET` | `/api/batch/stream` | Server-Sent Events stream of live batch telemetry (`batch_started`, `transaction_processed`, `batch_completed`) |

---

## Measured Results

End-to-end test run across synthetic multi-channel events:

| Metric | Value |
|---|---|
| Total revenue at risk | **₹1.46+ Crore** |
| Total money recovered | **₹21.68+ Lakh** |
| Batch recovery success rate | **56.9%** |
| Average recovery latency | **0.9s / transaction** |
| Compliance actions logged | **280** immutable ledger records |
| Stopping rules enforced | **10** |
| Fraud hard-stops | **2** |
| Compliant escalations | **13** |

These numbers come from the in-app synthetic batch simulator (`Run Synthetic Batch`) — not live production data — and are reproducible on every fresh run of `mockDataEngine.js`.

---

## Roadmap

- [ ] Swap the JSON ledger for Postgres once volume outgrows a single-file store
- [ ] Real gateway webhook ingestion (currently synthetic-event driven)
- [ ] Actual IVR voice call integration for the Hinglish outreach engine
- [ ] Configurable stopping-rule matrix from the dashboard instead of hardcoded thresholds
- [ ] Multi-merchant tenancy

---

## Built for

**Razorpay Buildathon 2026 — AI Revenue Recovery track**

*"Don't just identify the problem. Show measured money recovered across a batch, with compliant escalation, stopping rules, and an audit trail."*

---

<div align="center">

Built solo. Every decision the agent makes, it can explain — and prove it made.

</div>
