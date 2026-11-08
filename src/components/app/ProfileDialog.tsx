import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cardsCount, partyBalance, sortOldestFirst, statement, txnViews } from "@/lib/finance";
import { fmtDate, money, todayISO } from "@/lib/format";
import { printStatement } from "@/lib/print";
import { deleteParty, deletePayment, deleteTxn, useApp } from "@/lib/store";
import { DENOMS, type PartyType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "./ConfirmButton";
import { useDialogs } from "./dialog-context";
import { Icon } from "./Icon";

interface Props {
  type: PartyType;
  id: string;
  onClose: () => void;
}

export function ProfileDialog({ type, id, onClose }: Props) {
  const { data } = useApp();
  const dialogs = useDialogs();
  const party = type === "client" ? data.clients.find((c) => c.id === id) : data.agents.find((a) => a.id === id);
  const today = todayISO();
  const bal = useMemo(() => partyBalance(data, type, id, today), [data, type, id, today]);
  const rows = useMemo(() => statement(data, type, id), [data, type, id]);
  const txns = useMemo(
    () => sortOldestFirst(txnViews(data.txns.filter((t) => t.partyType === type && t.partyId === id), data.payments)).reverse(),
    [data, type, id],
  );
  const payments = useMemo(
    () => sortOldestFirst(data.payments.filter((p) => p.partyType === type && p.partyId === id)).reverse(),
    [data, type, id],
  );

  if (!party) return null;
  const txnName = (tid: string) => data.txns.find((t) => t.id === tid)?.description ?? "عملية محذوفة";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0">
        <div className="bg-hero pattern-dots rounded-t-2xl p-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3 text-2xl">
              <span className="grid size-12 place-items-center rounded-2xl bg-gold-gradient text-xl text-gold-foreground">
                <Icon name={type === "client" ? "user" : "store"} />
              </span>
              <span>
                {party.name}
                <span className="mt-1 block text-sm font-medium opacity-80">
                  {party.code} · {party.phone || "بدون هاتف"}
                  {"package" in party && party.package ? ` · ${party.package}` : ""}
                  {"kind" in party ? ` · ${party.kind === "shop" ? "محل" : "مندوب"}` : ""}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "المطلوب", v: money(bal.required) },
              { l: "المدفوع", v: money(bal.paid) },
              { l: "المتبقي", v: money(bal.remaining) },
              { l: "ميعاد السداد", v: fmtDate(bal.nextDue) },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur">
                <div className="text-xs opacity-75">{s.l}</div>
                <div className="num text-lg font-extrabold">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-6 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" disabled={bal.remaining <= 0} onClick={() => dialogs.open({ kind: "pay", type, id })}>
              <Icon name="hand-holding-dollar" /> سداد جزئي
            </Button>
            <Button onClick={() => dialogs.open({ kind: "txn", type, id })}>
              <Icon name="plus" /> {type === "client" ? "عملية جديدة" : "توريد كروت"}
            </Button>
            <Button variant="outline" onClick={() => printStatement(data, type, id)}>
              <Icon name="print" /> طباعة كشف الحساب
            </Button>
            <Button variant="outline" onClick={() => dialogs.open({ kind: type, id })}>
              <Icon name="pen" /> تعديل
            </Button>
            <ConfirmButton
              title={`حذف ${party.name}؟`}
              description="سيتم حذف الحساب وكل عملياته وسداداته نهائياً."
              onConfirm={() => {
                deleteParty(type, id);
                toast.success("تم حذف الحساب");
                onClose();
              }}
            >
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Icon name="trash" /> حذف
              </Button>
            </ConfirmButton>
          </div>

          <Tabs defaultValue="statement" dir="rtl">
            <TabsList>
              <TabsTrigger value="statement">كشف الحساب</TabsTrigger>
              <TabsTrigger value="txns">العمليات ({txns.length})</TabsTrigger>
              <TabsTrigger value="payments">السدادات ({payments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="statement">
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="p-2 text-start">التاريخ</th>
                      <th className="p-2 text-start">البيان</th>
                      <th className="p-2 text-start">مدين</th>
                      <th className="p-2 text-start">دائن</th>
                      <th className="p-2 text-start">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد حركات بعد</td>
                      </tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.kind + r.id} className="border-t">
                        <td className="num p-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="p-2">{r.description}</td>
                        <td className="num p-2">{r.debit ? money(r.debit) : "—"}</td>
                        <td className="num p-2 text-success">{r.credit ? money(r.credit) : "—"}</td>
                        <td className="num p-2 font-bold">{money(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="txns" className="grid gap-2">
              {txns.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد عمليات</p>}
              {txns.map((t) => {
                const late = t.remaining > 0 && t.dueDate && t.dueDate < today;
                return (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-bold">
                        {t.description}
                        {t.remaining <= 0 ? (
                          <Badge variant="success">مسددة</Badge>
                        ) : late ? (
                          <Badge variant="danger">متأخرة</Badge>
                        ) : (
                          <Badge variant="warning">مفتوحة</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDate(t.date)}
                        {t.dueDate && t.remaining > 0 ? ` · الاستحقاق ${fmtDate(t.dueDate)}` : ""}
                        {t.cards && cardsCount(t.cards) > 0
                          ? " · " + DENOMS.filter((d) => t.cards?.[d]).map((d) => `${t.cards![d]}×${d}`).join(" ، ")
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="num">مطلوب <b>{money(t.required)}</b></span>
                      <span className="num text-success">مدفوع <b>{money(t.paid)}</b></span>
                      <span className={cn("num", t.remaining > 0 && "text-destructive")}>متبقي <b>{money(t.remaining)}</b></span>
                      <ConfirmButton
                        title="حذف العملية؟"
                        description="سيتم إلغاء أي سداد موزّع على هذه العملية."
                        onConfirm={() => {
                          deleteTxn(t.id);
                          toast.success("تم حذف العملية");
                        }}
                      >
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label="حذف">
                          <Icon name="trash-can" />
                        </Button>
                      </ConfirmButton>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="payments" className="grid gap-2">
              {payments.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد سدادات</p>}
              {payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3">
                  <div>
                    <div className="num font-extrabold text-success">{money(p.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(p.date)} · {p.method}
                      {p.note ? ` · ${p.note}` : ""}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.allocations.map((a) => (
                        <span key={a.txnId} className="num rounded-md bg-muted px-2 py-0.5 text-xs">
                          {txnName(a.txnId)}: {money(a.amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ConfirmButton
                    title="حذف السداد؟"
                    description="سيعود المبلغ كمديونية على العمليات المرتبطة."
                    onConfirm={() => {
                      deletePayment(p.id);
                      toast.success("تم حذف السداد");
                    }}
                  >
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label="حذف">
                      <Icon name="trash-can" />
                    </Button>
                  </ConfirmButton>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
