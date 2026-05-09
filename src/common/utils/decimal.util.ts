import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value: any): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  return new Decimal(value.toString());
}

export function addDecimal(...values: any[]): Decimal {
  return values.reduce((acc, val) => toDecimal(acc).plus(toDecimal(val)), new Decimal(0));
}

export function subtractDecimal(a: any, b: any): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function multiplyDecimal(a: any, b: any): Decimal {
  return toDecimal(a).times(toDecimal(b));
}

export function divideDecimal(a: any, b: any): Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) return new Decimal(0);
  return toDecimal(a).dividedBy(divisor);
}

export function maxDecimal(a: any, b: any): Decimal {
  const da = toDecimal(a);
  const db = toDecimal(b);
  return da.greaterThan(db) ? da : db;
}

export function toNumber(value: any): number {
  return toDecimal(value).toNumber();
}

export function formatMoney(value: any): string {
  return toDecimal(value).toFixed(2);
}

export function calcWeightedAvgCost(
  currentStock: any,
  currentAvgCost: any,
  newQty: any,
  newUnitCost: any,
): Decimal {
  const oldTotal = multiplyDecimal(currentStock, currentAvgCost);
  const newTotal = multiplyDecimal(newQty, newUnitCost);
  const totalQty = addDecimal(currentStock, newQty);
  if (toDecimal(totalQty).isZero()) return new Decimal(0);
  return divideDecimal(addDecimal(oldTotal, newTotal), totalQty);
}
