# PaddyTrace — Paddy Procurement Transparency & Digital Transaction Record System

> **A Farmer-Centric, Tamper-Evident Agricultural Procurement Platform for Karnataka, India.**

Built with **Next.js 16 App Router**, **React 19**, **Tailwind CSS v4**, **TypeScript 5.8+**, and **Prisma ORM**.

---

## 🌾 Core Axiom
*Every farmer should independently verify what they sold, how it was weighed, how deductions were calculated, how much they are entitled to receive, and whether payment was completed.*

---

## 🚀 Key Features

1. **Farmer FRUITS ID Integration:** Digital farmer verification with Karnataka's 10-digit FRUITS ID registry.
2. **Mobile-First Weighbridge Stepper Wizard:**
   - Real-time gross, tare, and net weight computation with input guardrails.
   - Scale photo evidence capture with client-side Web Crypto SHA-256 calculation.
   - GPS coordinate stamping and device timestamp preservation.
   - Karnataka statutory moisture threshold (17.0% base) with automatic excess deduction assessment.
3. **Cryptographic Tamper-Evident Hash Chain:**
   - Isolated, linear, append-only SHA-256 block chain per procurement centre starting from a 64-zero genesis block.
   - Concurrency locking with serializable transaction semantics.
   - Mathematical tamper detection that spots retroactively altered weights, deductions, or prices.
4. **Public QR Verification (Zero-Barrier Access):**
   - No login or app download required for farmers.
   - Clear visual status: **Green Shield** (intact record) or **Red Banner** (tamper detected).
   - Strict privacy safeguards: farmer name masked (`R***** P***l`), phone numbers and bank account masked.
5. **Digital Transaction Passport (PDF):**
   - Official downloadable digital passport with Government of Karnataka emblem, verification QR, weighbridge statistics, and cryptographic proof block.
6. **15-Day Statutory Payment Accountability:**
   - Direct Benefit Transfer (DBT/PFMS) simulation.
   - Automated 15-day SLA countdown. Overdue payments automatically escalate to Raitha Samparka Kendra (RSK) staff.
7. **Farmer Dispute Management & RSK Resolution Desk:**
   - Categorized grievance filing (`WEIGHT_MISMATCH`, `MOISTURE_DEDUCTION`, `QUALITY_DISAGREEMENT`, `PAYMENT_NOT_RECEIVED`).
   - Audit trail and official decision notes.
8. **Bilingual Support (ಕನ್ನಡ & English):**
   - Complete localized dictionaries (`src/messages/kn.json` and `src/messages/en.json`) powered by `next-intl`.
9. **Offline-First PWA Architecture:**
   - Dexie.js (IndexedDB) stores local transaction drafts and evidence blobs during network dropouts, synchronizing idempotently with `clientLocalId`.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16.4+ (App Router, Turbopack, `src/proxy.ts` request interception)
- **Library:** React 19.3+
- **Language:** TypeScript 5.8+ (Strict Mode)
- **Styling:** Tailwind CSS v4 (`@theme` variables, accessible agricultural palette)
- **Database / ORM:** Prisma ORM (v6+) with PostgreSQL schema and integer paise currency precision
- **Offline Storage:** Dexie.js (IndexedDB)
- **Cryptography & Security:** SHA-256 canonical hashing, `jose` JWT signed tokens, `bcryptjs`
- **Testing:** Vitest (15/15 unit and E2E workflow tests passing)

---

## 🏃 Getting Started

### 1. Prerequisites
- Node.js 22+ LTS (Node.js 26 recommended)
- npm or pnpm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/<your-username>/paddytrace.git
cd paddytrace

# Install dependencies
npm install --legacy-peer-deps
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Automated Tests
```bash
npm test
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## 👥 Demo Accounts

| Role | Username | Password |
| :--- | :--- | :--- |
| **Procurement Officer** | `officer_sindhanur` | `Karnataka@2026` |
| **RSK Staff Officer** | `rsk_raichur` | `Karnataka@2026` |
| **State Administrator** | `admin_karnataka` | `Karnataka@2026` |
| **Paddy Farmer** | *No login needed* | *Direct QR verification* |

---

## 📜 License
Government utility platform engineered for Karnataka Paddy Procurement Transparency.

