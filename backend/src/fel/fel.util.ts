export function toFelDate(date: Date): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const tzMin = -date.getTimezoneOffset();
  const sign = tzMin >= 0 ? '+' : '-';
  const tzAbs = Math.abs(tzMin);
  const tzH = pad(Math.floor(tzAbs / 60));
  const tzM = pad(tzAbs % 60);
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}${sign}${tzH}:${tzM}`;
}

export function decimal(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function decodeJwtExp(token: string): number {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(json).exp as number;
  } catch {
    return 0;
  }
}