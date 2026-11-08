import {
  DENOMS,
  type Allocation,
  type CardQty,
  type DataState,
  type Denom,
  type PartyType,
  type Payment,
  type Period,
  type Txn,
} from "./types";

/** Fixed wholesale prices for internet cards (face value → wholesale EGP). */
export const WHOLESALE_PRICES: Record<Denom, number> = {
  5: 4,
  10: 9,
  20: 18,
  50: 47,
  100: 95,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function cardsTotal(cards: CardQty | undefined): number {
  if (!cards) return 0;
  return round2(DENOMS.reduce((s, d) => s + (cards[d] ?? 0) * WHOLESALE_PRICES[d], 0));
}

export function cardsCount(cards: CardQty | undefined): number {
  if (!cards) return 0;
  return DENOMS.reduce((s, d) => s + (cards[d] ?? 0), 0);
}

/** Amount paid on each txn, summed from every payment allocation. */
export function paidByTxn(payments: Payment[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of payments) {
    for (const a of p.allocations) {
      map.set(a.txnId, round2((map.get(a.txnId) ?? 0) + a.amount));
    }
  }
  return map;
}

export interface TxnView extends Txn {
  paid: number;
  remaining: number;
}

export function txnViews(txns: Txn[], payments: Payment[]): TxnView[] {
  const paid = paidByTxn(payments);
  return txns.map((t) => {
    const p = paid.get(t.id) ?? 0;
    return { ...t, paid: p, remaining: round2(Math.max(0, t.required - p)) };
  });
}

/** Oldest-first ordering used for distributing payments. */
export function sortOldestFirst<T extends { date: string; createdAt: number }>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1,
  );
}

export interface AllocationResult {
  allocations: Allocation[];
  leftover: number;
}

/**
 * Split a payment across a party's open operations, oldest first.
 * Any amount beyond the total outstanding is returned as `leftover`.
 */
export function allocatePayment(open: TxnView[], amount: number): AllocationResult {
  let left = round2(amount);
  const allocations: Allocation[] = [];
  for (const t of sortOldestFirst(open)) {
    if (left <= 0) break;
    if (t.remaining <= 0) continue;
    const take = round2(Math.min(left, t.remaining));
    allocations.push({ txnId: t.id, amount: take });
    left = round2(left - take);
  }
  return { allocations, leftover: left };
}

export interface PartyBalance {
  required: number;
  paid: number;
  remaining: number;
  nextDue?: string | undefined;
  overdue: boolean;
  openCount: number;
}

export function partyBalance(
  data: Pick<DataState, "txns" | "payments">,
  partyType: PartyType,
  partyId: string,
  today: string,
): PartyBalance {
  const views = txnViews(
    data.txns.filter((t) => t.partyType === partyType && t.partyId === partyId),
    data.payments,
  );
  const required = round2(views.reduce((s, t) => s + t.required, 0));
  const paid = round2(views.reduce((s, t) => s + t.paid, 0));
  const open = views.filter((t) => t.remaining > 0);
  const dues = open
    .map((t) => t.dueDate)
    .filter(Boolean)
    .sort() as string[];
  return {
    required,
    paid,
    remaining: round2(required - paid),
    nextDue: dues[0],
    overdue: dues.some((d) => d < today),
    openCount: open.length,
  };
}

export interface StockRow {
  denom: Denom;
  incoming: number;
  outgoing: number;
  remaining: number;
}

export function inventory(data: Pick<DataState, "txns" | "stockIns">): StockRow[] {
  return DENOMS.map((denom) => {
    const incoming = data.stockIns
      .filter((s) => s.denom === denom)
      .reduce((s, x) => s + x.quantity, 0);
    const outgoing = data.txns.reduce((s, t) => s + (t.cards?.[denom] ?? 0), 0);
    return { denom, incoming, outgoing, remaining: incoming - outgoing };
  });
}

export function inPeriod(date: string, period: Period): boolean {
  if (period.mode === "all" || !period.value) return true;
  if (period.mode === "day") return date === period.value;
  if (period.mode === "month") return date.slice(0, 7) === period.value;
  return date.slice(0, 4) === period.value;
}

export interface StatementRow {
  id: string;
  kind: "txn" | "payment";
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export function statement(
  data: Pick<DataState, "txns" | "payments">,
  partyType: PartyType,
  partyId: string,
): StatementRow[] {
  const items: (Omit<StatementRow, "balance"> & { createdAt: number })[] = [];
  for (const t of data.txns) {
    if (t.partyType !== partyType || t.partyId !== partyId) continue;
    items.push({
      id: t.id,
      kind: "txn",
      date: t.date,
      description: t.description,
      debit: t.required,
      credit: 0,
      createdAt: t.createdAt,
    });
  }
  for (const p of data.payments) {
    if (p.partyType !== partyType || p.partyId !== partyId) continue;
    items.push({
      id: p.id,
      kind: "payment",
      date: p.date,
      description: p.note ? `سداد — ${p.note}` : `سداد (${p.method})`,
      debit: 0,
      credit: p.amount,
      createdAt: p.createdAt,
    });
  }
  let balance = 0;
  return sortOldestFirst(items).map(({ createdAt: _c, ...r }) => {
    balance = round2(balance + r.debit - r.credit);
    return { ...r, balance };
  });
}
