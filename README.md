# ERP-1: Intelligent AI Voice Enterprise Resource Planning (ERP) System

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-teal)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8)](https://tailwindcss.com/)

A complete, production-ready, AI-powered Enterprise Resource Planning (ERP) platform unifying Finance, HRMS, Manufacturing, Supply Chain, Procurement, Sales & CRM, Inventory, Project Management, Customer Support, and Business Analytics into one centralized platform.

The platform combines dashboard-based enterprise workflows with a natural-language **AI Voice Assistant supporting Hindi, English, and Hinglish** with strict role-based access control (RBAC) and high-impact action confirmation guardrails.

---

## 🌟 Core Pillars

### 1. Connected Business Departments
- **Finance & Accounting**: Chart of Accounts, General Ledger, Double-Entry Journal Entries, Invoices, Expenses, Budget vs. Actual tracking.
- **Sales & CRM**: Leads pipeline, quotations, sales orders, automated customer invoicing, and credit control.
- **Inventory & Warehouses**: Multi-warehouse stock tracking, batch numbers, bin locations, reorder thresholds, and movement ledgers.
- **Procurement & Vendors**: Approved supplier catalog, purchase requisitions, PO approval workflows, and 3-way matching Goods Receipt Notes (GRN).
- **Manufacturing & Production**: Bill of Materials (BOM) specs, 4-stage shop floor assembly routing, work orders, and automatic raw material consumption.
- **HRMS & Payroll**: Employee directory, daily biometric attendance tracking, leave requests, monthly payroll calculation, and payslips.
- **Projects & Support**: Engineering milestones, tasks, billable hours, and customer support ticketing.
- **Unified Approvals & Audits**: Multi-tier approval inbox and immutable audit logs with JSON payload diff inspection.

### 2. Single Source of Truth
- Authoritative **PostgreSQL** relational database managed via **Prisma ORM**.
- Multi-company and multi-branch data isolation (Mumbai Corporate HQ, Delhi Manufacturing Facility, Bengaluru Tech Hub).
- Zero duplicate data entry: All operations update shared, validated records in real time.

### 3. Business Workflow Automation
- **Order-to-Cash (O2C)**: Confirming an order checks stock availability, auto-reserves inventory, generates an invoice, and posts receivables to the General Ledger.
- **Procure-to-Pay (P2P)**: Low-stock PO creation, executive approval, and goods receipt that auto-increments warehouse inventory and updates trade payables.
- **Plan-to-Produce**: BOM material explosion, raw material deduction, finished goods increment, and manufacturing cost postings.
- **Hire-to-Retire**: Attendance-driven payroll calculation and one-click financial disbursement.

### 4. Real-Time Analytics & BI
- Executive dashboard with live Revenue, Net Margin, Liquid Cash & Bank Position, Inventory Valuation, and Workforce Attendance.
- Interactive **Recharts** charts for Monthly P&L Trend, Asset Breakdown, and Departmental Budget utilization.
- Autonomous AI Executive Briefing synthesizing transactional database figures into actionable C-Suite insights.
- Controlled CSV and Excel export on all data tables.

### 5. Multilingual AI Voice Assistant
- Supports **Hindi, English, and Hinglish** (e.g., *"Aaj company ki total sales kitni hain?"*, *"Show products with low stock"*, *"Create a draft purchase order for 100 units of product X"*).
- Web Speech API Speech-to-Text (STT) with audio waveform visualizer and natural Text-to-Speech (TTS) audio feedback.
- Safety Confirmation Preview Cards for high-impact actions before database writes.
- Instant persona switcher to test RBAC across 10 roles (CEO, CFO, HR Head, Plant Head, etc.).

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally or cloud connection string)

### 1. Clone & Install
```bash
git clone https://github.com/paviontechnologies/ERP-1.git
cd ERP-1
npm install
```

### 2. Configure Environment
Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Update `DATABASE_URL` with your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://username:password@127.0.0.1:5432/erp_db?schema=public"
NEXT_PUBLIC_APP_NAME="Apex AI Voice ERP"
PORT=3000
NODE_ENV=development
```

### 3. Setup Database & Seed Data
```bash
# Push Prisma schema to PostgreSQL
npx prisma db push

# Seed realistic enterprise data (10 roles, products, BOMs, orders, accounts, payroll)
npm run seed
```

### 4. Run Automated Workflows & AI Test Suite
```bash
npm run test:workflows
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎙️ Sample AI Voice Commands

| Spoken Query | Language | Action Executed |
| :--- | :--- | :--- |
| *"Aaj company ki total sales kitni hain?"* | Hinglish | Returns today's sales revenue & confirmed orders card |
| *"Show me this month's revenue and expenses"* | English | Queries Chart of Accounts for P&L breakdown and net margin |
| *"Kam stock wale products dikhao"* | Hinglish | Displays products with stock below reorder threshold |
| *"Create a draft purchase order for 100 units of product X"* | English | Renders confirmation preview card $\rightarrow$ writes PO upon confirmation |
| *"How many employees are present today?"* | English | Returns workforce attendance rate and presence breakdown |
| *"Which department exceeded its budget?"* | English | Scans department budgets against committed expenditures |
| *"Show me sales orders that cannot be fulfilled because of low stock"* | English | Cross-joins open orders with stock shortages |
| *"Find unpaid invoices for orders that have already been delivered"* | English | Matches fulfilled shipments with open balance invoices |

---

## 📦 Project Structure

```
├── prisma/
│   ├── schema.prisma           # Authoritative ERP data schema
│   └── seed.ts                 # Enterprise seed script
├── scripts/
│   └── test-workflows.ts       # 33+ end-to-end automated tests
├── src/
│   ├── app/                    # Next.js App Router (Pages & REST APIs)
│   │   ├── api/                # Backend API endpoints (voice, sales, inventory, etc.)
│   │   ├── sales/              # Sales & CRM module
│   │   ├── inventory/          # Inventory & Warehouses module
│   │   ├── procurement/        # Procurement & SCM module
│   │   ├── manufacturing/      # Manufacturing & BOM module
│   │   ├── finance/            # Finance & General Ledger module
│   │   ├── hrms/               # HRMS & Payroll module
│   │   ├── projects/           # Projects & Support module
│   │   ├── approvals/          # Unified Approval Inbox
│   │   ├── audit/              # Compliance Audit Trail
│   │   └── page.tsx            # Executive BI Dashboard
│   ├── components/
│   │   ├── layout/             # Shell, Sidebar, Navbar, Role Switcher
│   │   └── voice/              # Multilingual Voice Assistant Modal
│   ├── context/
│   │   └── AuthContext.tsx     # RBAC user state & persona switcher
│   ├── lib/
│   │   ├── prisma.ts           # Singleton Prisma client
│   │   ├── auth.ts             # 10 Enterprise roles & granular permissions
│   │   ├── audit.ts            # Centralized mutation logger
│   │   └── voice-ai/           # NLP intent parser & action executor
│   └── services/               # Transactional business logic services
```

---

## 📄 License
MIT License. Developed by Pavion Technologies.
