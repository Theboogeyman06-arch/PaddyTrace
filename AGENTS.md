# PaddyTrace — Multi-Agent System & Engineering Guidelines

This document specifies the engineering conventions, architectural guidelines, agent responsibilities, and Next.js 16+ development rules for the **PaddyTrace** procurement platform.

---

## 1. Project Overview & Guiding Philosophy

- **Project:** PaddyTrace (Paddy Procurement Transparency and Digital Transaction Record System)
- **Target Geography:** Karnataka, India
- **Primary Beneficiary:** The paddy farmer.
- **Core Axiom:** *Every farmer should independently verify what they sold, how it was weighed, how deductions were calculated, how much they are entitled to receive, and whether payment was completed.*
- **System Nature:** Tamper-evident, audit-grade, mobile-first government procurement record platform.

---

## 2. Agent Roles & Collaboration Principles

When working across multiple agents or specialized roles:

| Agent / Role | Primary Responsibilities | Scope Boundaries |
| :--- | :--- | :--- |
| **System Architect** | High-level system design, Next.js 16 architecture, `proxy.ts`, async data flow, cryptographic chain design. | Enforces zero floating-point math, strict async APIs, clean folder structure. |
| **Database Engineer** | Prisma schemas, migrations, PostgreSQL indexes, `Serializable` transactions, TypedSQL, seed scripts. | Strictly decimal kg and integer paise, tamper-evident hash constraints, append-only policies. |
| **Security & Auth Specialist** | JWT handling (`jose`), `httpOnly` cookies, password hashing (`bcryptjs`), role authorization (RBAC), signed QR tokens, PII masking. | Never exposes raw phone numbers or unmasked farmer identity on public pages. |
| **Cryptographic Engineer** | SHA-256 canonical hashing, per-centre chain sequence, genesis block initialization, tamper detection, audit logs. | Follows canonical serialization order without deviation. |
| **Frontend & UI/UX Specialist** | Responsive mobile-first interfaces, Tailwind CSS v4 `@theme`, shadcn/ui React 19 primitives, Kannada typography (`Noto Sans Kannada`), accessible stepper wizard. | No bloated AI templates; clean, high-contrast, government-utility visual hierarchy. |
| **Offline & PWA Engineer** | Serwist (`@serwist/next`), Service Worker lifecycle, Dexie.js IndexedDB schema, background synchronization, idempotent transaction queuing. | Never displays simulated server hashes or fake QR codes for unsynced local drafts. |
| **Localization Specialist** | `next-intl` configuration, async `requestLocale`, complete dictionary coverage (`en` and `kn`) for all UI states and receipts. | Ensures cultural and linguistic precision in agricultural terminology. |

---

## 3. Strict Next.js 16+ Architectural Mandates

All contributors and subagents must enforce the following rules:

1. **Strictly Asynchronous Request APIs:**
   In Next.js 16, `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are asynchronous.
   ```typescript
   // Server Component Page Example
   export default async function VerifyPage({
     params,
     searchParams,
   }: {
     params: Promise<{ locale: string; transactionId: string }>;
     searchParams: Promise<{ t?: string }>;
   }) {
     const { locale, transactionId } = await params;
     const { t } = await searchParams;
     // ...
   }
   ```
   *Never access `.transactionId` or cookies synchronously.*

2. **`src/proxy.ts` over Legacy `middleware.ts`:**
   Use the Next.js 16 `src/proxy.ts` entrypoint (exporting `export function proxy(request: NextRequest)`) on Node.js runtime for request interception, locale negotiation, and session token checks.

3. **Explicit Caching Directive (`"use cache"`):**
   Next.js 16 does not implicitly cache `fetch` calls. Use the `"use cache"` directive paired with `cacheTag()` for static/rarely updated data (e.g., versioned MSP rates, centres, deduction rules). Invalidate explicitly using `revalidateTag(tag, 'max')` or `updateTag()`.

4. **React 19 Form & State Patterns:**
   Use `useActionState` (imported from `react`) instead of deprecated `useFormState` (from `react-dom`). Combine with `useOptimistic` for instantaneous UI feedback during mutations.

5. **Financial Precision Standard:**
   - Financial amounts must **always** be stored and computed in integer paise (1 INR = 100 paise).
   - Weights must **always** be stored in `Decimal(10, 2)` (e.g. Prisma `Decimal`) in kilograms.
   - **Never** perform financial operations using JavaScript IEEE-754 floating-point arithmetic (`0.1 + 0.2 != 0.3`).

6. **Append-Only Immutability:**
   Transactions, hash chain nodes, and audit logs are append-only. No `UPDATE` or `DELETE` statements shall be executed on transaction records. Corrections require linked adjustment records.

---

## 4. Verification & Testing Standards

- **Unit & Integration:** Vitest for mathematical formulas (net weight, moisture deduction, payable value, paise calculation) and hash chain tamper detection.
- **End-to-End:** Playwright for critical paths: FRUITS ID verification -> Weighing -> Offline storage -> Sync -> Hash generation -> QR farmer verification.
- **Zero Deprecation Warnings:** Zero console warnings regarding synchronous Next.js APIs or React 19 hooks.

