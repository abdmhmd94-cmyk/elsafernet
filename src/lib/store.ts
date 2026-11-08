import { useSyncExternalStore } from "react";
import { allocatePayment, cardsCount, cardsTotal, inventory, txnViews } from "./finance";
import { todayISO, uid } from "./format";
import { buildDemoData } from "./seed";
import {
  DENOMS,
  type Agent,
  type CardQty,
  type Client,
  type DataState,
  type Denom,
  type PartyType,
  type Payment,
  type Role,
  type Settings,
  type Txn,
} from "./types";

const DATA_KEY = "safir-data-v1";
const SESSION_KEY = "safir-session";
const THEME_KEY = "safir-theme";

export const DEFAULT_PASSWORDS: Record<Role, string> = { admin: "admin123", cards: "cards123" };

export function emptyData(): DataState {
  return {
    version: 1,
    clients: [],
    agents: [],
    txns: [],
    payments: [],
    stockIns: [],
    settings: { companyName: "شبكة السفير", passwords: { ...DEFAULT_PASSWORDS } },
  };
}

interface AppState {
  hydrated: boolean;
  data: DataState;
  role: Role | null;
  theme: "light" | "dark";
}

const SERVER_STATE: AppState = { hydrated: false, data: emptyData(), role: null, theme: "light" };
let state: AppState = SERVER_STATE;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function hydrateStore() {
  if (state.hydrated || typeof window === "undefined") return;
  let data: DataState;
  try {
    const raw = localStorage.getItem(DATA_KEY);
    data = raw ? normalize(JSON.parse(raw)) : buildDemoData(emptyData());
    if (!raw) localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    data = emptyData();
  }
  const role = localStorage.getItem(SESSION_KEY) as Role | null;
  const storedTheme = localStorage.getItem(THEME_KEY);
  const theme: "light" | "dark" =
    storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  applyTheme(theme);
  state = {
    hydrated: true,
    data,
    role: role === "admin" || role === "cards" ? role : null,
    theme,
  };
  emit();
}

function setData(updater: (d: DataState) => DataState) {
  const data = updater(state.data);
  state = { ...state, data };
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  emit();
}

function normalize(input: unknown): DataState {
  const base = emptyData();
  if (!input || typeof input !== "object") throw new Error("ملف غير صالح");
  const o = input as Partial<DataState>;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    version: 1,
    clients: arr<Client>(o.clients),
    agents: arr<Agent>(o.agents),
    txns: arr<Txn>(o.txns),
    payments: arr<Payment>(o.payments).map((p) => ({ ...p, allocations: arr(p.allocations) })),
    stockIns: arr(o.stockIns),
    settings: {
      companyName: o.settings?.companyName || base.settings.companyName,
      passwords: { ...base.settings.passwords, ...(o.settings?.passwords ?? {}) },
    },
  };
}

/* ------------------------------ session ------------------------------ */

export function login(role: Role, password: string) {
  if (state.data.settings.passwords[role] !== password) throw new Error("كلمة المرور غير صحيحة");
  localStorage.setItem(SESSION_KEY, role);
  state = { ...state, role };
  emit();
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  state = { ...state, role: null };
  emit();
}

export function toggleTheme() {
  const theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  state = { ...state, theme };
  emit();
}

/* ------------------------------ parties ------------------------------ */

function nextCode(prefix: string, existing: string[]) {
  const max = existing.reduce((m, c) => {
    const n = Number(c.replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export function suggestCode(type: PartyType) {
  return type === "client"
    ? nextCode("C", state.data.clients.map((c) => c.code))
    : nextCode("A", state.data.agents.map((a) => a.code));
}

export type ClientInput = Omit<Client, "id" | "createdAt">;
export type AgentInput = Omit<Agent, "id" | "createdAt">;

function assertCodeFree(type: PartyType, code: string, exceptId?: string) {
  const list = type === "client" ? state.data.clients : state.data.agents;
  if (list.some((p) => p.code.trim() === code.trim() && p.id !== exceptId))
    throw new Error("هذا الكود مستخدم بالفعل");
}

export function saveClient(input: ClientInput, id?: string): Client {
  if (!input.name.trim()) throw new Error("اسم العميل مطلوب");
  const code = input.code.trim() || suggestCode("client");
  assertCodeFree("client", code, id);
  let saved!: Client;
  setData((d) => {
    if (id) {
      return {
        ...d,
        clients: d.clients.map((c) => (c.id === id ? (saved = { ...c, ...input, code }) : c)),
      };
    }
    saved = { ...input, code, id: uid(), createdAt: Date.now() };
    return { ...d, clients: [...d.clients, saved] };
  });
  return saved;
}

export function saveAgent(input: AgentInput, id?: string): Agent {
  if (!input.name.trim()) throw new Error("الاسم مطلوب");
  const code = input.code.trim() || suggestCode("agent");
  assertCodeFree("agent", code, id);
  let saved!: Agent;
  setData((d) => {
    if (id) {
      return {
        ...d,
        agents: d.agents.map((a) => (a.id === id ? (saved = { ...a, ...input, code }) : a)),
      };
    }
    saved = { ...input, code, id: uid(), createdAt: Date.now() };
    return { ...d, agents: [...d.agents, saved] };
  });
  return saved;
}

export function deleteParty(type: PartyType, id: string) {
  setData((d) => ({
    ...d,
    clients: type === "client" ? d.clients.filter((c) => c.id !== id) : d.clients,
    agents: type === "agent" ? d.agents.filter((a) => a.id !== id) : d.agents,
    txns: d.txns.filter((t) => !(t.partyType === type && t.partyId === id)),
    payments: d.payments.filter((p) => !(p.partyType === type && p.partyId === id)),
  }));
}

/* ---------------------------- operations ----------------------------- */

export interface TxnInput {
  partyType: PartyType;
  partyId: string;
  date: string;
  description: string;
  required: number;
  cards?: CardQty | undefined;
  dueDate?: string | undefined;
  initialPaid: number;
  method: string;
}

export function addTxn(input: TxnInput) {
  const cards = input.cards ? cleanCards(input.cards) : undefined;
  const required = cards && cardsCount(cards) > 0 ? cardsTotal(cards) : input.required;
  if (!(required > 0)) throw new Error("أدخل مبلغاً مطلوباً أكبر من صفر");
  if (input.initialPaid < 0) throw new Error("المبلغ المدفوع غير صالح");
  if (input.initialPaid > required) throw new Error("المدفوع أكبر من المطلوب");
  if (cards) {
    const stock = inventory(state.data);
    for (const d of DENOMS) {
      const want = cards[d] ?? 0;
      const row = stock.find((s) => s.denom === d)!;
      if (want > row.remaining)
        throw new Error(`رصيد كروت فئة ${d} غير كافٍ (المتاح ${row.remaining})`);
    }
  }
  const txn: Txn = {
    id: uid(),
    partyType: input.partyType,
    partyId: input.partyId,
    date: input.date || todayISO(),
    description:
      input.description.trim() ||
      (cards && cardsCount(cards) > 0 ? `توريد ${cardsCount(cards)} كارت` : "عملية جديدة"),
    cards: cards && cardsCount(cards) > 0 ? cards : undefined,
    required,
    dueDate: input.dueDate || undefined,
    createdAt: Date.now(),
  };
  const payments: Payment[] = [];
  if (input.initialPaid > 0) {
    payments.push({
      id: uid(),
      partyType: input.partyType,
      partyId: input.partyId,
      date: txn.date,
      amount: input.initialPaid,
      method: input.method,
      note: `دفعة مقدمة — ${txn.description}`,
      allocations: [{ txnId: txn.id, amount: input.initialPaid }],
      createdAt: Date.now() + 1,
    });
  }
  setData((d) => ({ ...d, txns: [...d.txns, txn], payments: [...d.payments, ...payments] }));
  return txn;
}

function cleanCards(cards: CardQty): CardQty {
  const out: CardQty = {};
  for (const d of DENOMS) {
    const q = Math.floor(Number(cards[d] ?? 0));
    if (q < 0) throw new Error("الكمية لا يمكن أن تكون سالبة");
    if (q > 0) out[d] = q;
  }
  return out;
}

export function deleteTxn(id: string) {
  setData((d) => ({
    ...d,
    txns: d.txns.filter((t) => t.id !== id),
    payments: d.payments
      .map((p) => {
        const removed = p.allocations.filter((a) => a.txnId === id).reduce((s, a) => s + a.amount, 0);
        if (!removed) return p;
        return {
          ...p,
          amount: Math.round((p.amount - removed) * 100) / 100,
          allocations: p.allocations.filter((a) => a.txnId !== id),
        };
      })
      .filter((p) => p.amount > 0),
  }));
}

export interface PaymentInput {
  partyType: PartyType;
  partyId: string;
  amount: number;
  date: string;
  method: string;
  note?: string | undefined;
}

export function openTxns(type: PartyType, id: string) {
  return txnViews(
    state.data.txns.filter((t) => t.partyType === type && t.partyId === id),
    state.data.payments,
  ).filter((t) => t.remaining > 0);
}

export function addPayment(input: PaymentInput): Payment {
  if (!(input.amount > 0)) throw new Error("أدخل مبلغاً أكبر من صفر");
  const open = openTxns(input.partyType, input.partyId);
  const { allocations, leftover } = allocatePayment(open, input.amount);
  if (!allocations.length) throw new Error("لا توجد مديونيات مفتوحة لهذا الحساب");
  if (leftover > 0) throw new Error("المبلغ أكبر من إجمالي المتبقي على الحساب");
  const payment: Payment = {
    id: uid(),
    ...input,
    date: input.date || todayISO(),
    allocations,
    createdAt: Date.now(),
  };
  setData((d) => ({ ...d, payments: [...d.payments, payment] }));
  return payment;
}

export function deletePayment(id: string) {
  setData((d) => ({ ...d, payments: d.payments.filter((p) => p.id !== id) }));
}

/* ------------------------------ stock ------------------------------- */

export function addStockIn(input: { date: string; denom: Denom; quantity: number; note?: string | undefined }) {
  const q = Math.floor(input.quantity);
  if (!(q > 0)) throw new Error("أدخل كمية صحيحة");
  setData((d) => ({
    ...d,
    stockIns: [...d.stockIns, { id: uid(), ...input, quantity: q, createdAt: Date.now() }],
  }));
}

export function deleteStockIn(id: string) {
  const rec = state.data.stockIns.find((s) => s.id === id);
  if (!rec) return;
  const row = inventory(state.data).find((r) => r.denom === rec.denom)!;
  if (row.remaining - rec.quantity < 0)
    throw new Error("لا يمكن الحذف: الكروت الصادرة ستتجاوز الوارد");
  setData((d) => ({ ...d, stockIns: d.stockIns.filter((s) => s.id !== id) }));
}

/* ----------------------------- settings ----------------------------- */

export function updateSettings(patch: Partial<Settings>) {
  setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
}

export function exportJSON(): string {
  return JSON.stringify(state.data, null, 2);
}

export function importJSON(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("الملف ليس JSON صالحاً");
  }
  const data = normalize(parsed);
  setData(() => data);
  return data;
}

export function resetAll(withDemo: boolean) {
  const keepSettings = state.data.settings;
  setData(() => {
    const base = { ...emptyData(), settings: keepSettings };
    return withDemo ? buildDemoData(base) : base;
  });
}
