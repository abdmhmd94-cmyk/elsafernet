import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { allocatePayment, partyBalance, txnViews } from "@/lib/finance";
import { fmtDate, money, todayISO } from "@/lib/format";
import { addPayment, useApp } from "@/lib/store";
import type { PartyType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Field, MethodSelect } from "./Field";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When omitted, the dialog runs in "quick collect" mode with a party picker. */
  party?: { type: PartyType; id: string } | undefined;
}

export function PaymentDialog({ open, onOpenChange, party }: Props) {
  const { data, role } = useApp();
  const quick = !party;
  const [type, setType] = useState<PartyType>(role === "cards" ? "agent" : "client");
  const [partyId, setPartyId] = useState("");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("نقدي");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setType(party?.type ?? (role === "cards" ? "agent" : "client"));
    setPartyId(party?.id ?? "");
    setSearch("");
    setAmount("");
    setDate(todayISO());
    setMethod("نقدي");
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, party?.type, party?.id]);

  const today = todayISO();
  const candidates = useMemo(() => {
    const list = type === "client" ? data.clients : data.agents;
    const q = search.trim();
    return list
      .map((p) => ({ p, bal: partyBalance(data, type, p.id, today) }))
      .filter(({ p, bal }) => bal.remaining > 0 && (!q || p.name.includes(q) || p.code.includes(q) || p.phone.includes(q)));
  }, [data, type, search, today]);

  const selected = partyId
    ? (type === "client" ? data.clients : data.agents).find((p) => p.id === partyId)
    : undefined;

  const open_ = useMemo(
    () =>
      partyId
        ? txnViews(data.txns.filter((t) => t.partyType === type && t.partyId === partyId), data.payments).filter((t) => t.remaining > 0)
        : [],
    [data, type, partyId],
  );
  const totalDue = open_.reduce((s, t) => s + t.remaining, 0);
  const amountN = Number(amount) || 0;
  const preview = useMemo(() => allocatePayment(open_, amountN), [open_, amountN]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!partyId) {
      toast.error("اختر الحساب أولاً");
      return;
    }
    try {
      const p = addPayment({ partyType: type, partyId, amount: amountN, date, method, note: note.trim() || undefined });
      toast.success(`تم تسجيل سداد ${money(p.amount)} وتوزيعه على ${p.allocations.length} عملية`);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name={quick ? "bolt" : "hand-holding-dollar"} className="text-gold" />
            {quick ? "التحصيل السريع" : "سداد جزئي"}
            {!quick && selected && <span className="text-muted-foreground">— {selected.name}</span>}
          </DialogTitle>
          <DialogDescription>يوزَّع المبلغ تلقائياً على المديونيات المفتوحة من الأقدم إلى الأحدث.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          {quick && (
            <div className="grid gap-3">
              {role === "admin" && (
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                  {(["client", "agent"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setType(k);
                        setPartyId("");
                      }}
                      className={cn(
                        "rounded-lg py-2 text-sm font-bold transition",
                        type === k ? "bg-card text-primary shadow-soft" : "text-muted-foreground",
                      )}
                    >
                      <Icon name={k === "client" ? "users" : "store"} className="ms-1" /> {k === "client" ? "عميل" : "مندوب / محل"}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <Icon name="magnifying-glass" className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الهاتف" className="ps-9" />
              </div>
              <div className="max-h-44 overflow-y-auto rounded-xl border">
                {candidates.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">لا توجد حسابات عليها مديونيات</p>
                )}
                {candidates.map(({ p, bal }) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPartyId(p.id)}
                    className={cn(
                      "flex w-full items-center justify-between border-b px-3 py-2 text-start text-sm last:border-b-0 transition",
                      partyId === p.id ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                    )}
                  >
                    <span>
                      <b>{p.name}</b> <span className="text-xs text-muted-foreground">{p.code}</span>
                    </span>
                    <span className={cn("num font-bold", bal.overdue ? "text-destructive" : "text-foreground")}>{money(bal.remaining)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {partyId && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="المبلغ المراد سداده *" className="sm:col-span-1">
                  <div className="flex gap-2">
                    <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
                    <Button type="button" variant="soft" size="sm" className="h-9" onClick={() => setAmount(String(totalDue))}>
                      الكل
                    </Button>
                  </div>
                </Field>
                <Field label="التاريخ">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="طريقة الدفع">
                  <MethodSelect value={method} onChange={setMethod} />
                </Field>
              </div>
              <Field label="ملاحظة">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
              </Field>

              <div className="rounded-xl border">
                <div className="flex items-center justify-between border-b bg-muted px-3 py-2 text-xs font-bold text-muted-foreground">
                  <span>توزيع السداد على العمليات</span>
                  <span>
                    إجمالي المتبقي: <b className="num text-foreground">{money(totalDue)}</b>
                  </span>
                </div>
                <div className="divide-y">
                  {open_
                    .slice()
                    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
                    .map((t) => {
                      const got = preview.allocations.find((a) => a.txnId === t.id)?.amount ?? 0;
                      const after = t.remaining - got;
                      return (
                        <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <div>
                            <div className="font-semibold">{t.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {fmtDate(t.date)} · متبقي {money(t.remaining)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {got > 0 && <span className="num rounded-md bg-success/15 px-2 py-0.5 font-bold text-success">+{money(got)}</span>}
                            <span className={cn("num text-xs", after <= 0 ? "text-success font-bold" : "text-muted-foreground")}>
                              {after <= 0 ? "تم السداد" : `يتبقى ${money(after)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
                {preview.leftover > 0 && (
                  <p className="border-t bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">
                    المبلغ يزيد عن المتبقي بمقدار {money(preview.leftover)}
                  </p>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" variant="gold" disabled={!partyId || amountN <= 0 || preview.leftover > 0}>
              <Icon name="check-double" /> تأكيد السداد
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
