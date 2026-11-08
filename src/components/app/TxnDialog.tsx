import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cardsTotal, inventory, WHOLESALE_PRICES } from "@/lib/finance";
import { addDaysISO, money, num, todayISO } from "@/lib/format";
import { addTxn, useApp } from "@/lib/store";
import { DENOMS, type CardQty, type PartyType } from "@/lib/types";
import { Field, MethodSelect } from "./Field";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: PartyType;
  id: string;
}

export function TxnDialog({ open, onOpenChange, type, id }: Props) {
  const { data } = useApp();
  const party = type === "client" ? data.clients.find((c) => c.id === id) : data.agents.find((a) => a.id === id);
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState("");
  const [paid, setPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState("نقدي");
  const [cards, setCards] = useState<CardQty>({});

  useEffect(() => {
    if (!open) return;
    const t = todayISO();
    setDate(t);
    setDescription(type === "client" ? "اشتراك شهري" : "توريد كروت");
    setRequired("");
    setPaid("");
    setDueDate(addDaysISO(t, type === "client" ? 30 : 7));
    setMethod(type === "client" && party && "paymentMethod" in party ? party.paymentMethod || "نقدي" : "نقدي");
    setCards({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type, id]);

  const stock = useMemo(() => inventory(data), [data]);
  const total = type === "agent" ? cardsTotal(cards) : Number(required) || 0;
  const paidN = Number(paid) || 0;
  const remaining = Math.max(0, total - paidN);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      addTxn({
        partyType: type,
        partyId: id,
        date,
        description,
        required: total,
        cards: type === "agent" ? cards : undefined,
        dueDate: remaining > 0 ? dueDate : undefined,
        initialPaid: paidN,
        method,
      });
      toast.success("تم تسجيل العملية وتحديث الحساب");
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
            <Icon name={type === "client" ? "file-invoice-dollar" : "boxes-stacked"} className="text-primary" />
            {type === "client" ? "عملية جديدة للعميل" : "عملية توريد كروت"}
            {party && <span className="text-muted-foreground">— {party.name}</span>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="البيان">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="تاريخ العملية">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
          </div>

          {type === "agent" ? (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2 text-start">الفئة</th>
                    <th className="p-2 text-start">سعر الجملة</th>
                    <th className="p-2 text-start">المتاح</th>
                    <th className="p-2 text-start">الكمية</th>
                    <th className="p-2 text-start">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {DENOMS.map((d) => {
                    const avail = stock.find((s) => s.denom === d)!.remaining;
                    const q = cards[d] ?? 0;
                    return (
                      <tr key={d} className="border-t">
                        <td className="p-2 font-bold">كارت {d}</td>
                        <td className="num p-2">{money(WHOLESALE_PRICES[d])}</td>
                        <td className={`num p-2 ${q > avail ? "text-destructive font-bold" : "text-muted-foreground"}`}>{num(avail)}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={q || ""}
                            onChange={(e) => setCards((c) => ({ ...c, [d]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
                            className="h-8 w-24"
                            placeholder="0"
                          />
                        </td>
                        <td className="num p-2 font-semibold">{money(q * WHOLESALE_PRICES[d])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Field label="المبلغ المطلوب *">
              <Input type="number" min={0} step="0.01" value={required} onChange={(e) => setRequired(e.target.value)} required />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="المدفوع الآن">
              <Input type="number" min={0} step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
            </Field>
            <Field label="طريقة الدفع">
              <MethodSelect value={method} onChange={setMethod} />
            </Field>
            <Field label="ميعاد سداد المتبقي">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={remaining <= 0} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">المطلوب</div>
              <div className="num text-lg font-extrabold">{money(total)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">المدفوع</div>
              <div className="num text-lg font-extrabold text-success">{money(paidN)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">المتبقي</div>
              <div className={`num text-lg font-extrabold ${paidN > total ? "text-destructive" : "text-warning-foreground dark:text-warning"}`}>
                {paidN > total ? "المدفوع أكبر!" : money(remaining)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">
              <Icon name="check" /> تسجيل العملية
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
