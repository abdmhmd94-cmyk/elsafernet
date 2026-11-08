import { createContext, useContext } from "react";
import type { PartyType } from "@/lib/types";

export type ActionDialog =
  | { kind: "quick" }
  | { kind: "pay"; type: PartyType; id: string }
  | { kind: "txn"; type: PartyType; id: string }
  | { kind: "client"; id?: string }
  | { kind: "agent"; id?: string }
  | { kind: "stock" };

export interface DialogApi {
  open: (d: ActionDialog) => void;
  openProfile: (type: PartyType, id: string) => void;
}

export const DialogCtx = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error("useDialogs must be used inside AppShell");
  return ctx;
}
