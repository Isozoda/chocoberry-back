import dayjs from 'dayjs';

export function startOfDay(date: Date | string): Date {
  return dayjs(date).startOf('day').toDate();
}

export function endOfDay(date: Date | string): Date {
  return dayjs(date).endOf('day').toDate();
}

export function startOfMonth(year: number, month: number): Date {
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
}

export function endOfMonth(year: number, month: number): Date {
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').toDate();
}

export function formatDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function parseMonth(month: string): { year: number; month: number } {
  const [year, m] = month.split('-').map(Number);
  return { year, month: m };
}

export function toDateOnly(date: Date | string): Date {
  return new Date(dayjs(date).format('YYYY-MM-DD'));
}

export function today(): Date {
  return toDateOnly(new Date());
}
