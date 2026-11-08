import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/app/ConfirmButton";
import { Field } from "@/components/app/Field";
import { PageHeader } from "@/components/app/bits";
import { Icon } from "@/components/app/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayISO } from "@/lib/format";
import { exportJSON, importJSON, resetAll, updateSettings, useApp } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "البيانات والإعدادات — شبكة السفير" },
      { name: "description", content: "تصدير واستيراد بيانات شبكة السفير بصيغة JSON وإدارة كلمات المرور." },
      { property: "og:title", content: "البيانات والإعدادات — شبكة السفير" },
      { property: "og:description", content: "تصدير واستيراد البيانات وإدارة كلمات المرور." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState(data.settings.companyName);
  const [pw, setPw] = useState<Record<Role, string>>({ admin: "", cards: "" });

  function doExport() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safir-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير نسخة احتياطية من البيانات");
  }

  async function doImport(file: File) {
    try {
      const d = importJSON(await file.text());
      setCompany(d.settings.companyName);
      toast.success(`تم الاستيراد: ${d.clients.length} عميل، ${d.agents.length} مندوب، ${d.txns.length} عملية`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function savePasswords(role: Role) {
    if (pw[role].length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    updateSettings({ passwords: { ...data.settings.passwords, [role]: pw[role] } });
    setPw((p) => ({ ...p, [role]: "" }));
    toast.success("تم تحديث كلمة المرور");
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="البيانات والإعدادات" subtitle="نسخ احتياطي، استيراد، وكلمات المرور" icon="gear" />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-1 flex items-center gap-2 font-extrabold">
            <Icon name="database" className="text-primary" /> إدارة البيانات (JSON)
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">البيانات محفوظة على هذا الجهاز. صدّر نسخة احتياطية بانتظام.</p>
          <div className="grid gap-2">
            <Button onClick={doExport}>
              <Icon name="file-export" /> تصدير البيانات
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Icon name="file-import" /> استيراد من ملف JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void doImport(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="mt-5 grid gap-2 border-t pt-4">
            <ConfirmButton
              title="تحميل بيانات تجريبية؟"
              description="سيتم استبدال كل البيانات الحالية ببيانات تجريبية."
              confirmLabel="تحميل"
              onConfirm={() => {
                resetAll(true);
                toast.success("تم تحميل البيانات التجريبية");
              }}
            >
              <Button variant="soft">
                <Icon name="flask" /> تحميل بيانات تجريبية
              </Button>
            </ConfirmButton>
            <ConfirmButton
              title="مسح كل البيانات؟"
              description="سيتم حذف كل العملاء والمناديب والعمليات والمخزن نهائياً. صدّر نسخة احتياطية أولاً."
              confirmLabel="مسح الكل"
              onConfirm={() => {
                resetAll(false);
                toast.success("تم مسح جميع البيانات");
              }}
            >
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Icon name="trash" /> مسح كل البيانات
              </Button>
            </ConfirmButton>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 font-extrabold">
            <Icon name="building" className="text-primary" /> بيانات الشركة
          </h2>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!company.trim()) {
                toast.error("أدخل اسم الشركة");
                return;
              }
              updateSettings({ companyName: company.trim() });
              toast.success("تم حفظ اسم الشركة");
            }}
          >
            <Field label="اسم الشركة (يظهر في الكشوفات المطبوعة)">
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </Field>
            <Button type="submit" variant="outline">
              <Icon name="floppy-disk" /> حفظ
            </Button>
          </form>

          <h2 className="mb-4 mt-6 flex items-center gap-2 border-t pt-4 font-extrabold">
            <Icon name="key" className="text-gold" /> كلمات المرور
          </h2>
          {(
            [
              ["admin", "مدير النظام"],
              ["cards", "مسؤول مناديب الكروت"],
            ] as const
          ).map(([role, label]) => (
            <form
              key={role}
              className="mb-3 flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                savePasswords(role);
              }}
            >
              <Field label={label} className="flex-1">
                <Input type="password" placeholder="كلمة مرور جديدة" value={pw[role]} onChange={(e) => setPw((p) => ({ ...p, [role]: e.target.value }))} />
              </Field>
              <Button type="submit" variant="outline">
                تحديث
              </Button>
            </form>
          ))}
        </section>
      </div>
    </div>
  );
}
