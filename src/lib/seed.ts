import { addDaysISO, todayISO } from "./format";
import type { DataState, Payment, Txn } from "./types";

/** Small illustrative dataset so a first visit isn't empty. All names are invented. */
export function buildDemoData(base: DataState): DataState {
  const t = todayISO();
  const d = (n: number) => addDaysISO(t, n);
  let c = 1;
  const ts = () => Date.now() - 1_000_000 + c++ * 1000;

  const clients = [
    { id: "c1", code: "C-0001", name: "محمد عبد الله", phone: "01001234567", package: "باقة 40 ميجا", paymentMethod: "نقدي", employee: "أحمد" },
    { id: "c2", code: "C-0002", name: "سارة إبراهيم", phone: "01112345678", package: "باقة 20 ميجا", paymentMethod: "فودافون كاش", employee: "محمود" },
    { id: "c3", code: "C-0003", name: "خالد حسن", phone: "01223456789", package: "باقة 100 ميجا", paymentMethod: "نقدي", employee: "أحمد" },
  ].map((x) => ({ ...x, createdAt: ts() }));

  const agents = [
    { id: "a1", code: "A-0001", name: "محل النور للاتصالات", phone: "01098765432", kind: "shop" as const, address: "شارع الجمهورية" },
    { id: "a2", code: "A-0002", name: "مندوب — كريم سعيد", phone: "01187654321", kind: "agent" as const, address: "" },
  ].map((x) => ({ ...x, createdAt: ts() }));

  const stockIns = [
    { id: "s1", date: d(-20), denom: 5 as const, quantity: 300 },
    { id: "s2", date: d(-20), denom: 10 as const, quantity: 300 },
    { id: "s3", date: d(-20), denom: 20 as const, quantity: 150 },
    { id: "s4", date: d(-20), denom: 50 as const, quantity: 60 },
    { id: "s5", date: d(-20), denom: 100 as const, quantity: 30 },
  ].map((x) => ({ ...x, note: "وارد افتتاحي", createdAt: ts() }));

  const txns: Txn[] = [
    { id: "t1", partyType: "client", partyId: "c1", date: d(-40), description: "اشتراك شهري", required: 250, dueDate: d(-10), createdAt: ts() },
    { id: "t2", partyType: "client", partyId: "c1", date: d(-10), description: "اشتراك شهري", required: 250, dueDate: d(20), createdAt: ts() },
    { id: "t3", partyType: "client", partyId: "c2", date: d(-5), description: "اشتراك شهري", required: 180, dueDate: d(25), createdAt: ts() },
    { id: "t4", partyType: "client", partyId: "c3", date: d(-3), description: "تركيب راوتر + اشتراك", required: 900, dueDate: d(-1), createdAt: ts() },
    { id: "t5", partyType: "agent", partyId: "a1", date: d(-15), description: "توريد كروت", cards: { 5: 100, 10: 50 }, required: 850, dueDate: d(-2), createdAt: ts() },
    { id: "t6", partyType: "agent", partyId: "a2", date: d(-2), description: "توريد كروت", cards: { 20: 30, 50: 10 }, required: 1010, dueDate: d(12), createdAt: ts() },
  ];

  const payments: Payment[] = [
    { id: "p1", partyType: "client", partyId: "c1", date: d(-38), amount: 250, method: "نقدي", allocations: [{ txnId: "t1", amount: 250 }], createdAt: ts() },
    { id: "p2", partyType: "client", partyId: "c2", date: d(-5), amount: 180, method: "فودافون كاش", allocations: [{ txnId: "t3", amount: 180 }], createdAt: ts() },
    { id: "p3", partyType: "client", partyId: "c3", date: d(-3), amount: 400, method: "نقدي", allocations: [{ txnId: "t4", amount: 400 }], createdAt: ts() },
    { id: "p4", partyType: "agent", partyId: "a1", date: d(-8), amount: 500, method: "نقدي", allocations: [{ txnId: "t5", amount: 500 }], createdAt: ts() },
    { id: "p5", partyType: "agent", partyId: "a2", date: d(-2), amount: 300, method: "نقدي", allocations: [{ txnId: "t6", amount: 300 }], createdAt: ts() },
  ];

  return { ...base, clients, agents, stockIns, txns, payments };
}
