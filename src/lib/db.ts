// PaddyTrace Unified Data Layer
// Implements append-only transactions, serializable concurrency control per centre,
// and file-backed persistence for seamless development and testing.

import fs from "fs";
import path from "path";
import {
  Centre,
  User,
  Farmer,
  MspRate,
  DeductionRule,
  Transaction,
  Payment,
  Escalation,
  Dispute,
  DisputeComment,
} from "./types";
import { MOCK_FARMERS } from "./services/fruits";
import { GENESIS_HASH } from "./crypto/hash-chain";

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedByUserId?: string;
  metadataJson?: string;
  createdAt: string;
}

export interface DatabaseState {
  centres: Centre[];
  users: User[];
  farmers: Farmer[];
  mspRates: MspRate[];
  deductionRules: DeductionRule[];
  transactions: Transaction[];
  payments: Payment[];
  escalations: Escalation[];
  disputes: Dispute[];
  disputeComments: DisputeComment[];
  auditLogs: AuditLogEntry[];
}

const DB_FILE_PATH = path.join(process.cwd(), "data", "paddytrace-store.json");

// Default initial seed data for Karnataka procurement centres
const INITIAL_CENTRES: Centre[] = [
  {
    id: "centre-raichur-01",
    code: "KA-RCH-01",
    nameEn: "Sindhanur APMC Procurement Centre",
    nameKn: "ಸಿಂಧನೂರು ಎಪಿಎಂಸಿ ಖರೀದಿ ಕೇಂದ್ರ",
    district: "Raichur",
    taluk: "Sindhanur",
    address: "APMC Yard, Near Bus Stand, Sindhanur",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "centre-mandya-01",
    code: "KA-MDY-01",
    nameEn: "Maddur Primary Agricultural Cooperative",
    nameKn: "ಮದ್ದೂರು ಪ್ರಾಥಮಿಕ ಕೃಷಿ ಪತ್ತಿನ ಸಹಕಾರ ಸಂಘ",
    district: "Mandya",
    taluk: "Maddur",
    address: "Koppa Main Road, Maddur",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "centre-shimoga-01",
    code: "KA-SMG-01",
    nameEn: "Bhadravati RMC Paddy Depot",
    nameKn: "ಭದ್ರಾವತಿ ಆರ್‌ಎಂಸಿ ಭತ್ತದ ಗೋದಾಮು",
    district: "Shimoga",
    taluk: "Bhadravati",
    address: "Industrial Area Road, Bhadravati",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

// Initial MSP Rates for Karnataka (in paise per quintal: ₹2,300.00 and ₹2,320.00)
const INITIAL_MSP_RATES: MspRate[] = [
  {
    id: "msp-paddy-common-2026",
    variety: "PADDY_COMMON",
    nameEn: "Paddy (Common / ಸಾಮಾನ್ಯ ಭತ್ತ)",
    nameKn: "ಸಾಮಾನ್ಯ ಭತ್ತ",
    ratePerQuintalPaise: 230000, // ₹2,300 per quintal
    effectiveFrom: "2025-10-01T00:00:00.000Z",
    isActive: true,
  },
  {
    id: "msp-paddy-grade-a-2026",
    variety: "PADDY_GRADE_A",
    nameEn: "Paddy (Grade A / ಗ್ರೇಡ್ 'ಎ' ಭತ್ತ)",
    nameKn: "ಗ್ರೇಡ್ 'ಎ' ಭತ್ತ",
    ratePerQuintalPaise: 232000, // ₹2,320 per quintal
    effectiveFrom: "2025-10-01T00:00:00.000Z",
    isActive: true,
  },
];

// Deduction rules: Base allowable moisture is 17%.
const INITIAL_DEDUCTION_RULES: DeductionRule[] = [
  {
    id: "rule-moisture-standard",
    name: "Standard Karnataka Moisture Deduction",
    minMoisture: 17.0,
    maxMoisture: 20.0,
    deductionPercent: 1.0, // 1% deduction per 1% excess moisture
    description: "Up to 17% zero deduction; 1% per 1% excess up to 20%",
    isActive: true,
  },
];

// Initial Seed Users for RBAC
const INITIAL_USERS: User[] = [
  {
    id: "usr-officer-01",
    username: "officer_sindhanur",
    name: "K. Suresh (Procurement Officer)",
    role: "OFFICER",
    centreId: "centre-raichur-01",
    isActive: true,
  },
  {
    id: "usr-rsk-01",
    username: "rsk_raichur",
    name: "Dr. Anupama H (RSK Agricultural Officer)",
    role: "RSK_STAFF",
    centreId: "centre-raichur-01",
    isActive: true,
  },
  {
    id: "usr-admin-01",
    username: "admin_karnataka",
    name: "State Procurement Admin",
    role: "ADMIN",
    isActive: true,
  },
];

class MemoryDatabase {
  private state: DatabaseState;
  private centreLocks: Map<string, Promise<void>> = new Map();

  constructor() {
    this.state = this.loadFromFile();
  }

  private loadFromFile(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, "utf8");
        return JSON.parse(raw);
      }
    } catch {
      // Fallback to fresh seed
    }

    return {
      centres: INITIAL_CENTRES,
      users: INITIAL_USERS,
      farmers: MOCK_FARMERS,
      mspRates: INITIAL_MSP_RATES,
      deductionRules: INITIAL_DEDUCTION_RULES,
      transactions: [],
      payments: [],
      escalations: [],
      disputes: [],
      disputeComments: [],
      auditLogs: [],
    };
  }

  private persist() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), "utf8");
    } catch {
      // Ignore write errors in restricted environments
    }
  }

  // Mutex lock for centre chain concurrency
  async acquireCentreLock<T>(centreId: string, fn: () => Promise<T>): Promise<T> {
    const currentLock = this.centreLocks.get(centreId) || Promise.resolve();
    let releaseLock: () => void = () => {};
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.centreLocks.set(centreId, nextLock);
    await currentLock;

    try {
      return await fn();
    } finally {
      releaseLock();
      if (this.centreLocks.get(centreId) === nextLock) {
        this.centreLocks.delete(centreId);
      }
    }
  }

  // Centres
  centres = {
    findMany: async () => [...this.state.centres],
    findUnique: async (query: { where: { id?: string; code?: string } }) => {
      return (
        this.state.centres.find(
          (c) =>
            (query.where.id && c.id === query.where.id) ||
            (query.where.code && c.code === query.where.code)
        ) || null
      );
    },
  };

  // Farmers
  farmers = {
    findMany: async () => [...this.state.farmers],
    findUnique: async (query: { where: { id?: string; fruitsId?: string } }) => {
      return (
        this.state.farmers.find(
          (f) =>
            (query.where.id && f.id === query.where.id) ||
            (query.where.fruitsId && f.fruitsId === query.where.fruitsId)
        ) || null
      );
    },
    create: async (data: Farmer) => {
      this.state.farmers.push(data);
      this.persist();
      return data;
    },
  };

  // MSP Rates
  mspRates = {
    findMany: async () => [...this.state.mspRates],
    findFirst: async (query?: { where?: { variety?: string; isActive?: boolean } }) => {
      return (
        this.state.mspRates.find(
          (r) =>
            (!query?.where?.variety || r.variety === query.where.variety) &&
            (query?.where?.isActive === undefined || r.isActive === query.where.isActive)
        ) || this.state.mspRates[0]
      );
    },
  };

  // Deduction Rules
  deductionRules = {
    findMany: async () => [...this.state.deductionRules],
    findFirst: async () => this.state.deductionRules[0] || null,
  };

  // Users
  users = {
    findMany: async () => [...this.state.users],
    findUnique: async (query: { where: { id?: string; username?: string } }) => {
      const u = this.state.users.find(
        (usr) =>
          (query.where.id && usr.id === query.where.id) ||
          (query.where.username && usr.username === query.where.username)
      );
      if (!u) return null;
      const centre = u.centreId
        ? this.state.centres.find((c) => c.id === u.centreId)
        : undefined;
      return { ...u, centre };
    },
  };

  // Transactions
  transactions = {
    findMany: async (filter?: { centreId?: string; farmerId?: string }) => {
      let list = [...this.state.transactions];
      if (filter?.centreId) list = list.filter((t) => t.centreId === filter.centreId);
      if (filter?.farmerId) list = list.filter((t) => t.farmerId === filter.farmerId);
      return list.map((t) => this.hydrateTransaction(t));
    },
    findUnique: async (query: { where: { id?: string; clientLocalId?: string } }) => {
      const t = this.state.transactions.find(
        (item) =>
          (query.where.id && item.id === query.where.id) ||
          (query.where.clientLocalId && item.clientLocalId === query.where.clientLocalId)
      );
      if (!t) return null;
      return this.hydrateTransaction(t);
    },
    getLastInCentre: async (centreId: string): Promise<Transaction | null> => {
      const centreTxs = this.state.transactions
        .filter((t) => t.centreId === centreId)
        .sort((a, b) => b.sequenceNumber - a.sequenceNumber);
      return centreTxs[0] || null;
    },
    create: async (data: Transaction) => {
      this.state.transactions.push(data);
      this.persist();
      return this.hydrateTransaction(data);
    },
  };

  private hydrateTransaction(t: Transaction): Transaction {
    const centre = this.state.centres.find((c) => c.id === t.centreId);
    const farmer = this.state.farmers.find((f) => f.id === t.farmerId);
    const payment = this.state.payments.find((p) => p.transactionId === t.id);
    return {
      ...t,
      centre,
      farmer,
      payment,
    };
  }

  // Payments
  payments = {
    findMany: async (filter?: { status?: string }) => {
      let list = [...this.state.payments];
      if (filter?.status) list = list.filter((p) => p.status === filter.status);
      return list;
    },
    findUnique: async (query: { where: { id?: string; transactionId?: string } }) => {
      return (
        this.state.payments.find(
          (p) =>
            (query.where.id && p.id === query.where.id) ||
            (query.where.transactionId && p.transactionId === query.where.transactionId)
        ) || null
      );
    },
    create: async (data: Payment) => {
      this.state.payments.push(data);
      this.persist();
      return data;
    },
    update: async (id: string, updates: Partial<Payment>) => {
      const idx = this.state.payments.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Payment not found");
      this.state.payments[idx] = { ...this.state.payments[idx], ...updates, updatedAt: new Date().toISOString() };
      this.persist();
      return this.state.payments[idx];
    },
  };

  // Escalations
  escalations = {
    findMany: async () => [...this.state.escalations],
    create: async (data: Escalation) => {
      this.state.escalations.push(data);
      this.persist();
      return data;
    },
    update: async (id: string, updates: Partial<Escalation>) => {
      const idx = this.state.escalations.findIndex((e) => e.id === id);
      if (idx === -1) throw new Error("Escalation not found");
      this.state.escalations[idx] = { ...this.state.escalations[idx], ...updates };
      this.persist();
      return this.state.escalations[idx];
    },
  };

  // Disputes
  disputes = {
    findMany: async () => {
      return this.state.disputes.map((d) => {
        const tx = this.state.transactions.find((t) => t.id === d.transactionId);
        const farmer = this.state.farmers.find((f) => f.fruitsId === d.farmerFruitsId);
        const comments = this.state.disputeComments.filter((c) => c.disputeId === d.id);
        return {
          ...d,
          transaction: tx ? this.hydrateTransaction(tx) : undefined,
          farmer,
          comments,
        };
      });
    },
    findUnique: async (query: { where: { id?: string; disputeRef?: string } }) => {
      const d = this.state.disputes.find(
        (item) =>
          (query.where.id && item.id === query.where.id) ||
          (query.where.disputeRef && item.disputeRef === query.where.disputeRef)
      );
      if (!d) return null;
      const tx = this.state.transactions.find((t) => t.id === d.transactionId);
      const farmer = this.state.farmers.find((f) => f.fruitsId === d.farmerFruitsId);
      const comments = this.state.disputeComments.filter((c) => c.disputeId === d.id);
      return {
        ...d,
        transaction: tx ? this.hydrateTransaction(tx) : undefined,
        farmer,
        comments,
      };
    },
    create: async (data: Dispute) => {
      this.state.disputes.push(data);
      this.persist();
      return data;
    },
    update: async (id: string, updates: Partial<Dispute>) => {
      const idx = this.state.disputes.findIndex((d) => d.id === id);
      if (idx === -1) throw new Error("Dispute not found");
      this.state.disputes[idx] = { ...this.state.disputes[idx], ...updates };
      this.persist();
      return this.state.disputes[idx];
    },
  };

  // Dispute Comments
  disputeComments = {
    create: async (data: DisputeComment) => {
      this.state.disputeComments.push(data);
      this.persist();
      return data;
    },
  };

  // Audit Logs
  auditLogs = {
    findMany: async () => [...this.state.auditLogs],
    create: async (data: Omit<AuditLogEntry, "id" | "createdAt">) => {
      const log: AuditLogEntry = {
        ...data,
        id: "log-" + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
      };
      this.state.auditLogs.unshift(log);
      this.persist();
      return log;
    },
  };
}

export const db = new MemoryDatabase();

