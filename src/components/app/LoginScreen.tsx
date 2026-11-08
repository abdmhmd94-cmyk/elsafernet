import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_PASSWORDS, login, toggleTheme, useApp } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Field } from "./Field";
import { Icon } from "./Icon";

const ROLES: { role: Role; label: string; desc: string; icon: string }[] = [
  { role: "admin", label: "مدير النظام", desc: "صلاحيات كاملة", icon: "user-shield" },
  { role: "cards", label: "مسؤول مناديب الكروت", desc: "المناديب والمخزن", icon: "id-card-clip" },
];

export function LoginScreen() {
  const { data, theme } = useApp();
  const [role, setRole] = useState<Role>("admin");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      login(role, password);
      toast.success(`مرحباً بك — ${ROLES.find((r) => r.role === role)!.label}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const usingDefault = data.settings.passwords[role] === DEFAULT_PASSWORDS[role];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-hero pattern-dots p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold-gradient text-xl text-gold-foreground shadow-lift">
            <Icon name="tower-broadcast" />
          </span>
          <span className="text-2xl font-extrabold">{data.settings.companyName}</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-5xl font-black leading-tight">
            إدارة الشبكة <span className="text-gold">بدقة</span> ووضوح
          </h1>
          <p className="mt-4 text-lg opacity-80">
            العملاء، المناديب، مخزن الكروت، التحصيل والسداد الجزئي — كل الحسابات في مكان واحد.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { i: "users", t: "العملاء" },
            { i: "boxes-stacked", t: "مخزن الكروت" },
            { i: "chart-line", t: "تحليلات فورية" },
          ].map((x) => (
            <div key={x.t} className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur">
              <Icon name={x.i} className="text-gold" /> <span className="ms-1 font-semibold">{x.t}</span>
            </div>
          ))}
        </div>
        <Icon name="wifi" className="pointer-events-none absolute -bottom-16 -left-10 text-[22rem] opacity-[0.06]" />
      </div>

      <div className="relative flex items-center justify-center p-6">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="absolute left-4 top-4" aria-label="تبديل الوضع">
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </Button>
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-lift">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-hero text-2xl text-primary-foreground lg:hidden">
              <Icon name="tower-broadcast" />
            </span>
            <h2 className="text-2xl font-extrabold">تسجيل الدخول</h2>
            <p className="text-sm text-muted-foreground">اختر الصلاحية وأدخل كلمة المرور</p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => setRole(r.role)}
                className={cn(
                  "rounded-2xl border-2 p-4 text-start transition",
                  role === r.role ? "border-primary bg-accent" : "border-border hover:bg-muted",
                )}
              >
                <Icon name={r.icon} className={cn("text-xl", role === r.role ? "text-primary" : "text-muted-foreground")} />
                <div className="mt-2 text-sm font-extrabold leading-tight">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </button>
            ))}
          </div>

          <Field
            label="كلمة المرور"
            hint={usingDefault ? `كلمة المرور الافتراضية: ${DEFAULT_PASSWORDS[role]} — غيّرها من الإعدادات` : undefined}
          >
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pe-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="إظهار كلمة المرور"
              >
                <Icon name={show ? "eye-slash" : "eye"} />
              </button>
            </div>
          </Field>

          <Button type="submit" size="xl" className="mt-6 w-full">
            <Icon name="right-to-bracket" /> دخول
          </Button>
        </form>
      </div>
    </div>
  );
}
