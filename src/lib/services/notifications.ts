// Notification Service (Bilingual SMS and WhatsApp delivery)
import { formatPaiseToInr, formatWeight } from "../math/procurement";

export interface NotificationLog {
  id: string;
  type: "SMS" | "WHATSAPP";
  recipientPhone: string;
  farmerName: string;
  content: string;
  language: "en" | "kn";
  status: "SENT" | "FAILED";
  timestamp: string;
}

export interface INotificationService {
  sendProcurementReceipt(params: {
    recipientPhone: string;
    farmerNameEn: string;
    farmerNameKn: string;
    centreName: string;
    transactionId: string;
    netWeightKg: number;
    finalPayablePaise: bigint | number;
    dueDateIso: string;
    verificationUrl: string;
    language?: "en" | "kn";
  }): Promise<NotificationLog>;
  getLogs(): NotificationLog[];
}

class MockNotificationService implements INotificationService {
  private logs: NotificationLog[] = [];

  async sendProcurementReceipt({
    recipientPhone,
    farmerNameEn,
    farmerNameKn,
    centreName,
    transactionId,
    netWeightKg,
    finalPayablePaise,
    dueDateIso,
    verificationUrl,
    language = "kn",
  }: {
    recipientPhone: string;
    farmerNameEn: string;
    farmerNameKn: string;
    centreName: string;
    transactionId: string;
    netWeightKg: number;
    finalPayablePaise: bigint | number;
    dueDateIso: string;
    verificationUrl: string;
    language?: "en" | "kn";
  }): Promise<NotificationLog> {
    const formattedAmount = formatPaiseToInr(finalPayablePaise);
    const formattedWeight = formatWeight(netWeightKg);
    const dueDate = new Date(dueDateIso).toLocaleDateString("en-IN");

    let content = "";
    if (language === "kn") {
      content = `ಕರ್ನಾಟಕ ಸರ್ಕಾರ - PaddyTrace: ${farmerNameKn} ಅವರಿಗೆ ${centreName} ನಲ್ಲಿ ${formattedWeight} ಭತ್ತ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ನಿವ್ವಳ ಮೌಲ್ಯ: ${formattedAmount}. ಪಾವತಿ ಗಡುವು: ${dueDate}. ಡಿಜಿಟಲ್ ರಶೀದಿ ಪರಿಶೀಲಿಸಿ: ${verificationUrl} (TxID: ${transactionId})`;
    } else {
      content = `Govt of Karnataka - PaddyTrace: Received ${formattedWeight} paddy from ${farmerNameEn} at ${centreName}. Final Value: ${formattedAmount}. Payment Due: ${dueDate}. Verify receipt: ${verificationUrl} (TxID: ${transactionId})`;
    }

    const log: NotificationLog = {
      id: "notif-" + Date.now(),
      type: "SMS",
      recipientPhone,
      farmerName: language === "kn" ? farmerNameKn : farmerNameEn,
      content,
      language,
      status: "SENT",
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(log);
    // Keep last 100 logs
    if (this.logs.length > 100) this.logs.pop();

    return log;
  }

  getLogs(): NotificationLog[] {
    return [...this.logs];
  }
}

export const notificationService: INotificationService = new MockNotificationService();

