export class SequenceHelper {
  static next(prefix: string, lastSequence = 0, width = 4): string {
    const year = new Date().getFullYear();
    const seq = (lastSequence ?? 0) + 1;
    return `${prefix}-${year}-${String(seq).padStart(width, '0')}`;
  }

  static parseLastSequence(lastCode: string | null | undefined): number {
    if (!lastCode) return 0;
    const parts = lastCode.split('-');
    const seq = parts[parts.length - 1];
    const parsed = Number.parseInt(seq, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
