// Payment SLA & Direct Benefit Transfer (DBT) Service
import { Payment, PaymentStatus } from "../types";

export const PAYMENT_SLA_DAYS = 15;

/**
 * Calculates statutory payment due date (15 calendar days from transaction creation)
 */
export function calculatePaymentDueDate(createdAt: Date = new Date()): Date {
  const due = new Date(createdAt);
  due.setDate(due.getDate() + PAYMENT_SLA_DAYS);
  return due;
}

/**
 * Calculates remaining days in payment SLA window
 */
export function getDaysRemaining(dueDateStr: string): {
  daysRemaining: number;
  isOverdue: boolean;
  statusLabel: string;
} {
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffTime = due.getTime() - now.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      daysRemaining: Math.abs(days),
      isOverdue: true,
      statusLabel: `${Math.abs(days)} days overdue`,
    };
  }

  return {
    daysRemaining: days,
    isOverdue: false,
    statusLabel: `${days} days left of 15-day SLA`,
  };
}

export interface IPaymentService {
  createPaymentRecord(
    transactionId: string,
    amountPaise: bigint | number,
    createdAt?: Date
  ): Payment;
  disburseDbtPayment(paymentId: string, utrReference: string): Promise<Payment>;
  markDisputed(paymentId: string): Promise<Payment>;
}

class MockPaymentService implements IPaymentService {
  createPaymentRecord(
    transactionId: string,
    amountPaise: bigint | number,
    createdAt: Date = new Date()
  ): Payment {
    const due = calculatePaymentDueDate(createdAt);
    return {
      id: "pay-" + Math.random().toString(36).substring(2, 9),
      transactionId,
      amountPaise,
      dueDate: due.toISOString(),
      status: "PENDING",
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    };
  }

  async disburseDbtPayment(paymentId: string, utrReference: string): Promise<Payment> {
    await new Promise((res) => setTimeout(res, 100));
    return {
      id: paymentId,
      transactionId: "tx-mock",
      amountPaise: 0n,
      dueDate: new Date().toISOString(),
      paidDate: new Date().toISOString(),
      status: "PAID",
      paymentMode: "DBT-PFMS",
      reference: utrReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async markDisputed(paymentId: string): Promise<Payment> {
    await new Promise((res) => setTimeout(res, 50));
    return {
      id: paymentId,
      transactionId: "tx-mock",
      amountPaise: 0n,
      dueDate: new Date().toISOString(),
      status: "DISPUTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const paymentService: IPaymentService = new MockPaymentService();

