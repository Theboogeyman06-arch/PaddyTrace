import Dexie, { type Table } from "dexie";
import { Farmer } from "../types";

export interface OfflineTransactionDraft {
  clientLocalId: string; // PT-LOCAL-1730553600000-xxxx
  centreId: string;
  farmerFruitsId: string;
  farmerName: string;
  paddyVariety: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  moisturePercent: number;
  deductionKg: number;
  payableWeight: number;
  mspRatePaise: number;
  finalPayablePaise: number;
  scalePhotoBase64?: string;
  scalePhotoSha256: string;
  gpsLat?: number;
  gpsLng?: number;
  deviceTimestamp: string;
  syncStatus: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  serverTransactionId?: string;
  errorMessage?: string;
  createdAt: number;
}

export interface CachedFarmer extends Farmer {
  cachedAt: number;
}

export class PaddyTraceDexie extends Dexie {
  offlineTransactions!: Table<OfflineTransactionDraft, string>;
  cachedFarmers!: Table<CachedFarmer, string>;

  constructor() {
    super("PaddyTraceOfflineDB");
    this.version(1).stores({
      offlineTransactions: "clientLocalId, syncStatus, centreId, farmerFruitsId, createdAt",
      cachedFarmers: "fruitsId, phone, nameEn",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new PaddyTraceDexie() : (null as unknown as PaddyTraceDexie);

