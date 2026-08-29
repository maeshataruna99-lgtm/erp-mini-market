export class DateHelper {
  static now(): Date {
    return new Date();
  }

  static toISO(date: Date | string): string {
    return new Date(date).toISOString();
  }

  static addDays(date: Date | string, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  static daysUntil(date: Date | string): number {
    const target = new Date(date);
    return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
  }

  static isExpiringSoon(date: Date | string, thresholdDays = 30): boolean {
    const days = this.daysUntil(date);
    return days >= 0 && days <= thresholdDays;
  }

  static formatDate(date: Date | string, locale = 'id-ID', options?: Intl.DateTimeFormatOptions): string {
    return new Date(date).toLocaleDateString(locale, options ?? {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
