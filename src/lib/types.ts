// PaddyTrace Core Domain Types

export type Role = "OFFICER" | "RSK_STAFF" | "ADMIN";

export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "ESCALATED" | "DISPUTED";

export type EscalationStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export type DisputeCategory =
  | "WEIGHT_MISMATCH"
  | "MOISTURE_DEDUCTION"
  | "QUALITY_DISAGREEMENT"
  | "MSP_PRICE_DISAGREEMENT"
  | "PAYMENT_NOT_RECEIVED"
  | "OTHER";

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export interface Centre {
  id: string;
  code: string;
  nameEn: string;
  nameKn: string;
  district: string;
  taluk: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  centreId?: string;
  centre?: Centre;
  isActive: boolean;
}

export interface Farmer {
  id: string;
  fruitsId: string; // 10 digits
  nameEn: string;
  nameKn: string;
  phone: string;
  village: string;
  taluk: string;
  district: string;
  bankAccountMasked: string;
  ifsc: string;
  landAreaAcres?: number;
}

export interface MspRate {
  id: string;
  variety: string;
  nameEn: string;
  nameKn: string;
  ratePerQuintalPaise: number; // e.g., 232000 paise = ₹2,320.00
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface DeductionRule {
  id: string;
  name: string;
  minMoisture: number; // e.g. 17.0
  maxMoisture: number; // e.g. 20.0
  deductionPercent: number; // e.g. 1.0% per excess 1%
  description?: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  clientLocalId?: string;
  centreId: string;
  centre?: Centre;
  sequenceNumber: number;
  farmerId: string;
  farmer?: Farmer;
  paddyVariety: string;
  grossWeight: number; // kg
  tareWeight: number; // kg
  netWeight: number; // kg
  moisturePercent: number; // %
  deductionKg: number; // kg
  payableWeight: number; // kg
  mspRatePaise: number; // paise / quintal
  grossPayablePaise: number | bigint;
  deductionAmountPaise: number | bigint;
  finalPayablePaise: number | bigint;
  scalePhotoUrl?: string;
  scalePhotoSha256: string;
  gpsLat?: number;
  gpsLng?: number;
  deviceTimestamp: string;
  previousHash: string;
  hash: string;
  createdAt: string;
  payment?: Payment;
}

export interface Payment {
  id: string;
  transactionId: string;
  amountPaise: number | bigint;
  dueDate: string; // created + 15 days
  paidDate?: string;
  status: PaymentStatus;
  paymentMode?: string;
  reference?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Escalation {
  id: string;
  paymentId: string;
  payment?: Payment;
  escalatedAt: string;
  status: EscalationStatus;
  assignedToRsk?: string;
  notes?: string;
  resolvedAt?: string;
}

export interface Dispute {
  id: string;
  disputeRef: string;
  transactionId: string;
  transaction?: Transaction;
  farmerFruitsId: string;
  farmer?: Farmer;
  category: DisputeCategory;
  description: string;
  evidencePhotoUrl?: string;
  status: DisputeStatus;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  comments?: DisputeComment[];
}

export interface DisputeComment {
  id: string;
  disputeId: string;
  authorId: string;
  authorName?: string;
  authorRole?: string;
  comment: string;
  createdAt: string;
}

export interface CanonicalTransactionPayload {
  centreId: string;
  deductionAmountPaise: number;
  deductionKg: number;
  farmerFruitsId: string;
  finalPayablePaise: number;
  gpsLatitude: number;
  gpsLongitude: number;
  grossPayablePaise: number;
  grossWeightKg: number;
  moisturePercentage: number;
  mspRatePerQuintalPaise: number;
  netWeightKg: number;
  paddyVariety: string;
  payableWeightKg: number;
  previousHash: string;
  scalePhotoSha256: string;
  sequenceNumber: number;
  tareWeightKg: number;
  timestampIso: string;
  transactionId: string;
}

