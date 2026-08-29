export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface NotificationPayload {
  userId?: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: unknown;
}

export class NotificationHelper {
  /**
   * Stub notifikasi. Pada produksi, kirim ke queue/webhook (WhatsApp, email, SSE).
   * Saat ini hanya mencatat ke log untuk verifikasi alur.
   */
  static async send(payload: NotificationPayload): Promise<void> {
    const suffix = payload.data ? ` | data=${JSON.stringify(payload.data)}` : '';
    console.log(`[NOTIFICATION:${payload.type}] ${payload.title} — ${payload.body}${suffix}`);
  }
}
