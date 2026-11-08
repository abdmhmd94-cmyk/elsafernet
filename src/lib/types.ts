export type PartyType = "client" | "agent";
export type Role = "admin" | "cards";

export const DENOMS = [5, 10, 20, 50, 100] as const;
export type Denom = (typeof DENOMS)[number];
export type CardQty = Partial<Record<Denom, number>>;

export interface Client {
  id: string;
  code: string;
  name: string;
  phone: string;
  package: string;
  paymentMethod: string;
  employee: string;
  notes?: string | undefined;
  createdAt: number;
}

export interface Agent {
  id: string;
  code: string;
  name: string;
  phone: string;
  kind: "agent" | "shop";
  address?: string | undefined;
  notes?: string | undefined;
  createdAt: number;
}

/** A debit operation (subscription, debt, card supply). Paid is derived from payment allocations. */
export interface Txn {
  id: string;
  partyType: PartyType;
  partyId: string;
  date: string; // yyyy-mm-dd
  description: string;
  cards?: CardQty | undefined;
  required: number;
  dueDate?: string | undefined; // yyyy-mm-dd
  createdAt: number;
}

export interface Allocation {
  txnId: string;
  amount: number;
}

export interface Payment {
  id: string;
  partyType: PartyType;
  partyId: string;
  date: string;
  amount: number;
  method: string;
  note?: string | undefined;
  allocations: Allocation[];
  createdAt: number;
}

export interface StockIn {
  id: string;
  date: string;
  denom: Denom;
  quantity: number;
  note?: string | undefined;
  createdAt: number;
}

export interface Settings {
  companyName: string;
  passwords: Record<Role, string>;
}

export interface DataState {
  version: 1;
  clients: Client[];
  agents: Agent[];
  txns: Txn[];
  payments: Payment[];
  stockIns: StockIn[];
  settings: Settings;
}

export type PeriodMode = "day" | "month" | "year" | "all";
export interface Period {
  mode: PeriodMode;
  value: string; // yyyy-mm-dd | yyyy-mm | yyyy | ""
}
