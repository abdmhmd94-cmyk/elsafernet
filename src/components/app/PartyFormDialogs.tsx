import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveAgent, saveClient, suggestCode, useApp, type AgentInput, type ClientInput } from "@/lib/store";
import { Field, MethodSelect } from "./Field";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  id?: string | undefined;
  onSaved?: (id: string) => void;
}

const emptyClient = (): ClientInput => ({
  code: suggestCode("client"),
  name: "",
  phone: "",
  package: "",
  paymentMethod: "نقدي",
  employee: "",
  notes: "",
});

export function ClientFormDialog({ open, onOpenChange, id, onSaved }: Props) {
  const { data } = useApp();
  const [f, setF] = useState<ClientInput>(emptyClient);

  useEffect(() => {
    if (!open) return;
    const c = id ? data.clients.find((x) => x.id === id) : undefined;
    setF(c ? { ...c } : emptyClient());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);

  const set = <K extends keyof ClientInput>(k: K, v: ClientInput[K]) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const saved = saveClient(f, id);
      toast.success(id ? "تم تعديل بيانات العميل" : "تمت إضافة العميل بنجاح");
      onOpenChange(false);
      onSaved?.(saved.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="user-plus" className="text-primary" />
            {id ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الكود">
              <Input value={f.code} onChange={(e) => set("code", e.target.value)} dir="ltr" />
            </Field>
            <Field label="الاسم *">
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus required />
            </Field>
            <Field label="الهاتف">
              <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" inputMode="tel" />
            </Field>
            <Field label="الباقة">
              <Input value={f.package} onChange={(e) => set("package", e.target.value)} placeholder="مثال: باقة 40 ميجا" />
            </Field>
            <Field label="طريقة الدفع">
              <MethodSelect value={f.paymentMethod} onChange={(v) => set("paymentMethod", v)} />
            </Field>
            <Field label="الموظف المسؤول">
              <Input value={f.employee} onChange={(e) => set("employee", e.target.value)} />
            </Field>
          </div>
          <Field label="ملاحظات">
            <Textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </Field>
          <DialogFooter>
            <Button type="submit">
              <Icon name="floppy-disk" /> حفظ
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

const emptyAgent = (): AgentInput => ({
  code: suggestCode("agent"),
  name: "",
  phone: "",
  kind: "agent",
  address: "",
  notes: "",
});

export function AgentFormDialog({ open, onOpenChange, id, onSaved }: Props) {
  const { data } = useApp();
  const [f, setF] = useState<AgentInput>(emptyAgent);

  useEffect(() => {
    if (!open) return;
    const a = id ? data.agents.find((x) => x.id === id) : undefined;
    setF(a ? { ...a } : emptyAgent());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);

  const set = <K extends keyof AgentInput>(k: K, v: AgentInput[K]) => setF((s) => ({ ...s, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const saved = saveAgent(f, id);
      toast.success(id ? "تم تعديل البيانات" : "تمت إضافة الحساب بنجاح");
      onOpenChange(false);
      onSaved?.(saved.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="store" className="text-primary" />
            {id ? "تعديل حساب مندوب / محل" : "إضافة مندوب أو محل"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            {(["agent", "shop"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("kind", k)}
                className={`rounded-lg py-2 text-sm font-bold transition ${f.kind === k ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}
              >
                <Icon name={k === "agent" ? "person-walking-luggage" : "shop"} className="ms-1" />{" "}
                {k === "agent" ? "مندوب" : "محل"}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الكود">
              <Input value={f.code} onChange={(e) => set("code", e.target.value)} dir="ltr" />
            </Field>
            <Field label="الاسم *">
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus required />
            </Field>
            <Field label="الهاتف">
              <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" inputMode="tel" />
            </Field>
            <Field label="العنوان">
              <Input value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </div>
          <Field label="ملاحظات">
            <Textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </Field>
          <DialogFooter>
            <Button type="submit">
              <Icon name="floppy-disk" /> حفظ
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
