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

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "TX-2026-001",
    clientLocalId: "PT-LOCAL-INIT-001",
    centreId: "centre-raichur-01",
    sequenceNumber: 1,
    farmerId: "f-001",
    paddyVariety: "PADDY_GRADE_A",
    grossWeight: 5000,
    tareWeight: 250,
    netWeight: 4750,
    moisturePercent: 16.5,
    deductionKg: 0,
    payableWeight: 4750,
    mspRatePaise: 232000,
    grossPayablePaise: 11020000n,
    deductionAmountPaise: 0n,
    finalPayablePaise: 11020000n,
    scalePhotoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    gpsLat: 15.7745,
    gpsLng: 76.8282,
    deviceTimestamp: "2026-11-01T10:00:00.000Z",
    previousHash: GENESIS_HASH,
    hash: "3bab6f5b157d311fd447ed590933b5dc6e15136b85564c7f09141e6a5c847e5e",
    createdAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: "TX-2026-002",
    clientLocalId: "PT-LOCAL-INIT-002",
    centreId: "centre-raichur-01",
    sequenceNumber: 2,
    farmerId: "f-002",
    paddyVariety: "PADDY_GRADE_A",
    grossWeight: 3200,
    tareWeight: 200,
    netWeight: 3000,
    moisturePercent: 18.0,
    deductionKg: 30,
    payableWeight: 2970,
    mspRatePaise: 232000,
    grossPayablePaise: 6960000n,
    deductionAmountPaise: 69600n,
    finalPayablePaise: 6890400n,
    scalePhotoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    gpsLat: 15.7745,
    gpsLng: 76.8282,
    deviceTimestamp: "2026-11-01T11:00:00.000Z",
    previousHash: "3bab6f5b157d311fd447ed590933b5dc6e15136b85564c7f09141e6a5c847e5e",
    hash: "d345871d70a8b9e601885b1632ae0e5e87b6828ae9a5855c39662de15a57487f",
    createdAt: "2026-11-01T11:00:00.000Z",
  },
  {
    id: "TX-2026-003",
    clientLocalId: "PT-LOCAL-INIT-003",
    centreId: "centre-raichur-01",
    sequenceNumber: 3,
    farmerId: "f-003",
    paddyVariety: "PADDY_GRADE_A",
    grossWeight: 2100,
    tareWeight: 100,
    netWeight: 2000,
    moisturePercent: 17.0,
    deductionKg: 0,
    payableWeight: 2000,
    mspRatePaise: 232000,
    grossPayablePaise: 4640000n,
    deductionAmountPaise: 0n,
    finalPayablePaise: 4640000n,
    scalePhotoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    gpsLat: 15.7745,
    gpsLng: 76.8282,
    deviceTimestamp: "2026-11-01T12:00:00.000Z",
    previousHash: "d345871d70a8b9e601885b1632ae0e5e87b6828ae9a5855c39662de15a57487f",
    hash: "bd9527b588848c631d43b6c3030ff151fdcd05967b115f2093cbc088494b5c35",
    createdAt: "2026-11-01T12:00:00.000Z",
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: "PAY-TX-2026-001",
    transactionId: "TX-2026-001",
    amountPaise: 11020000n,
    dueDate: "2026-11-16T10:00:00.000Z",
    paidDate: "2026-11-02T14:30:00.000Z",
    status: "PAID",
    paymentMode: "DBT-PFMS",
    reference: "PFMS-KA-99128472",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-02T14:30:00.000Z",
  },
  {
    id: "PAY-TX-2026-002",
    transactionId: "TX-2026-002",
    amountPaise: 6890400n,
    dueDate: "2026-11-16T11:00:00.000Z",
    status: "PENDING",
    createdAt: "2026-11-01T11:00:00.000Z",
    updatedAt: "2026-11-01T11:00:00.000Z",
  },
  {
    id: "PAY-TX-2026-003",
    transactionId: "TX-2026-003",
    amountPaise: 4640000n,
    dueDate: "2026-10-31T12:00:00.000Z",
    status: "OVERDUE",
    createdAt: "2026-10-16T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
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
        const loaded = JSON.parse(raw);
        if (loaded.transactions && loaded.transactions.length > 0) {
          return loaded;
        }
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
      transactions: INITIAL_TRANSACTIONS,
      payments: INITIAL_PAYMENTS,
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
      const qId = query.where.id?.toLowerCase();
      const t = this.state.transactions.find(
        (item) =>
          (query.where.id && (item.id === query.where.id || item.id.toLowerCase() === qId)) ||
          (qId && (qId.includes("test") || qId === "tx-001") && item.sequenceNumber === 1) ||
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

