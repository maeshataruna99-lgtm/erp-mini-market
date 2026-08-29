const NS = 'minierp_seq';

function loadCounter(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(NS) ?? '{}');
  } catch {
    return {};
  }
}

function saveCounter(map: Record<string, number>): void {
  localStorage.setItem(NS, JSON.stringify(map));
}

export function nextCode(prefix: string, width = 4): string {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const map = loadCounter();
  const seq = (map[key] ?? 0) + 1;
  map[key] = seq;
  saveCounter(map);
  return `${prefix}-${year}-${String(seq).padStart(width, '0')}`;
}

export function resetSequences(): void {
  localStorage.removeItem(NS);
}
