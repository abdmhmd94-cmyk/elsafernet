import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { todayISO } from "@/lib/format";
import { addStockIn } from "@/lib/store";
import { DENOMS, type Denom } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Field } from "./Field";
import { Icon } from "./Icon";

export function StockInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [denom, setDenom] = useState<Denom>(10);
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setQuantity("");
      setDate(todayISO());
      setNote("");
    }
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      addStockIn({ denom, quantity: Number(quantity), date, note: note.trim() || undefined });
      toast.success(`تمت إضافة ${quantity} كارت فئة ${denom} للمخزن`);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="truck-ramp-box" className="text-primary" /> وارد كروت للمخزن
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="الفئة">
            <div className="grid grid-cols-5 gap-2">
              {DENOMS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDenom(d)}
                  className={cn(
                    "rounded-xl border py-3 text-lg font-extrabold transition",
                    denom === d ? "border-primary bg-primary text-primary-foreground shadow-soft" : "hover:bg-muted",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الكمية *">
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required autoFocus />
            </Field>
            <Field label="التاريخ">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="ملاحظة / المورد">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="submit">
              <Icon name="plus" /> إضافة للمخزن
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
