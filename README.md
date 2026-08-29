# FinRecede: Autonomous Intelligent Revenue Recovery Agent

![FinRecede Hero](https://img.shields.io/badge/FinRecede-v1.0.0-gold?style=for-the-badge)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)

**FinRecede** is a production-grade, interactive full-stack web application and autonomous AI agent system engineered for fintech revenue recovery across:
1. **Payment Degradation & Failures** (UPI timeouts, card declines, bank downtime)
2. **Checkout Drop-offs** (Cart abandonment, 3DS challenge drop-outs)
3. **Subscription Failures** (UPI AutoPay revocations, eMandate debit failures, card renewals)
4. **B2B Overdue Invoices** (NET-30/60 receivables, promise-to-pay tracking)

---

## 🌟 Key Features

- **Closed-Loop Autonomous Pipeline:** Detect $\rightarrow$ Diagnose $\rightarrow$ Intervene $\rightarrow$ Recover.
- **AI Diagnostic Engine:** Pattern-matching & LLM log parser that extracts root cause categories and confidence scores from raw payment gateway logs.
- **Bounded Action Workflows:**
  - Dynamic Gateway Auto-retries (with exponential backoff & bank downtime delays)
  - Culturally-tuned Hinglish SMS & IVR voice scripts with direct payment deep-links
  - Alternate Payment Rail recommendations (UPI, Wallets, Netbanking)
  - 3-Stage B2B Invoice Chaser Cadence (Gentle $\rightarrow$ Urgent $\rightarrow$ Executive Notice) with Promise-to-Pay tracking
- **Strict Stopping Rules & Compliance Guardrails:**
  - 🛑 Instant hard-stop for suspected fraud (0 retries, immediate escalation ticket)
  - 🛑 Max retry ceiling enforcement
  - 🛑 Opt-out compliance for cancelled mandates
- **Interactive Command Dashboards (Plotly.js):**
  - Real-time KPI Cards (Revenue at Risk, Money Recovered, Success Rate, Latency)
  - Interactive Plotly Sankey Recovery Funnel diagram
  - Grouped bar charts (At Risk vs Recovered per failure category)
  - Category breakdown donut chart
  - Real-time SSE Batch Processing Controller (simulate 50+ transactions live)
  - Interactive Diagnostics Viewer with merchant manual overrides (Pause / Resume / Escalate)
  - Immutable Compliance & Audit Trail Ledger

---

## 🏗️ Architecture & Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Vanilla CSS (Glassmorphism & Dark Mode Tokens), Lucide Icons
- **Visualizations:** Plotly.js (`react-plotly.js`)
- **Backend & APIs:** Next.js API Routes, Server-Sent Events (SSE) for real-time live streaming
- **Data Layer:** Zero-dependency ACID relational JSON database with prepared statement emulation
- **Agent Core:** State machine workflow orchestrator managing detection, diagnosis, decision matrix, and recovery execution

---

## 📁 Directory Structure

```
FinRecede/
├── package.json                   # Next.js 15, React 19, Plotly.js, Lucide
├── next.config.mjs                # Next.js configuration
├── jsconfig.json                  # Path aliases (@/ -> src/)
├── data/
│   └── finrecede.json             # Persistent relational JSON database
├── src/
│   ├── app/
│   │   ├── globals.css            # Dark glassmorphic design system
│   │   ├── layout.js              # Shell layout with Sidebar navigation
│   │   ├── page.js                # Executive Recovery Command (Dashboard)
│   │   ├── diagnostics/
│   │   │   └── page.js            # Root Cause Diagnostics & Log Parser
│   │   ├── audit/
│   │   │   └── page.js            # Immutable Compliance Ledger & Audit Log
│   │   ├── receivables/
│   │   │   └── page.js            # B2B Invoicing & Promise-to-Pay Tracker
│   │   └── api/
│   │       ├── dashboard/route.js     # KPI aggregations & Sankey stats
│   │       ├── batch/route.js         # Batch trigger & history
│   │       ├── batch/[id]/route.js    # Batch transaction breakdown
│   │       ├── batch/stream/route.js  # Real-time SSE streaming endpoint
│   │       ├── transactions/route.js  # Filterable transaction list
│   │       ├── transactions/[id]/route.js # Merchant pause/resume/escalate
│   │       └── audit/route.js         # Searchable audit ledger & stats
│   ├── components/
│   │   ├── Sidebar.js             # Navigation sidebar
│   │   ├── KPICard.js             # Metric cards
│   │   ├── BatchController.js     # SSE trigger with live progress & logs
│   │   ├── RecoveryFunnel.js      # Plotly Sankey flow diagram
│   │   ├── PlotlyChart.js         # SSR-safe Plotly wrapper
│   │   ├── TransactionTable.js    # Filterable table with overrides
│   │   └── AuditTable.js          # Compliance log with badges
│   └── lib/
│       ├── db.js                  # Pure-JS ACID relational store
│       ├── mockDataEngine.js      # 58 synthetic multi-channel transactions
│       ├── diagnosticEngine.js    # AI log parser with confidence scoring
│       ├── actionModule.js        # Hinglish SMS/Voice, retries, emails
│       └── agentCore.js           # State machine orchestrator & stopping rules
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the dashboard.

### 3. Build for Production
```bash
npm run build
npm run start
```

---

## 🛡️ License

MIT License. Designed & Developed for the FinTech Buildathon.