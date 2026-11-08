import { describe, expect, it } from "vitest";
import { allocatePayment, cardsTotal, inventory, partyBalance, txnViews, WHOLESALE_PRICES } from "./finance";
import type { Payment, Txn } from "./types";

const txn = (id: string, date: string, required: number, createdAt = 0): Txn => ({
  id,
  partyType: "client",
  partyId: "c1",
  date,
  description: id,
  required,
  createdAt,
});

describe("wholesale card prices", () => {
  it("uses the fixed wholesale price per card", () => {
    expect(WHOLESALE_PRICES).toEqual({ 5: 4, 10: 9, 20: 18, 50: 47, 100: 95 });
  });

  it("totals a mixed supply at wholesale prices", () => {
    // 10×4 + 2×9 + 1×18 + 1×47 + 1×95 = 218
    expect(cardsTotal({ 5: 10, 10: 2, 20: 1, 50: 1, 100: 1 })).toBe(218);
  });
});

describe("partial payment distribution", () => {
  it("pays the oldest operation first, then the next", () => {
    const views = txnViews([txn("new", "2026-03-01", 200), txn("old", "2026-01-01", 100)], []);
    const r = allocatePayment(views, 150);
    expect(r.allocations).toEqual([
      { txnId: "old", amount: 100 },
      { txnId: "new", amount: 50 },
    ]);
    expect(r.leftover).toBe(0);
  });

  it("skips operations that are already fully paid", () => {
    const payments: Payment[] = [
      { id: "p", partyType: "client", partyId: "c1", date: "2026-01-02", amount: 100, method: "نقدي", allocations: [{ txnId: "old", amount: 100 }], createdAt: 1 },
    ];
    const views = txnViews([txn("old", "2026-01-01", 100), txn("new", "2026-02-01", 80)], payments);
    expect(allocatePayment(views, 30).allocations).toEqual([{ txnId: "new", amount: 30 }]);
  });

  it("returns any amount beyond the outstanding total as leftover", () => {
    const views = txnViews([txn("a", "2026-01-01", 100)], []);
    expect(allocatePayment(views, 130).leftover).toBe(30);
  });
});

describe("balances and stock", () => {
  it("computes required, paid, remaining and overdue for a client", () => {
    const t = { ...txn("a", "2026-01-01", 300), dueDate: "2026-01-10" };
    const payments: Payment[] = [
      { id: "p", partyType: "client", partyId: "c1", date: "2026-01-02", amount: 120, method: "نقدي", allocations: [{ txnId: "a", amount: 120 }], createdAt: 1 },
    ];
    const b = partyBalance({ txns: [t], payments }, "client", "c1", "2026-01-15");
    expect(b).toMatchObject({ required: 300, paid: 120, remaining: 180, overdue: true });
  });

  it("subtracts supplied cards from incoming stock", () => {
    const rows = inventory({
      stockIns: [{ id: "s", date: "2026-01-01", denom: 10, quantity: 50, createdAt: 0 }],
      txns: [{ ...txn("t", "2026-01-02", 90), partyType: "agent", cards: { 10: 10 } }],
    });
    expect(rows.find((r) => r.denom === 10)).toEqual({ denom: 10, incoming: 50, outgoing: 10, remaining: 40 });
  });
});
