import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { fmtDate, money } from "@/lib/format";
import type { PartyBalance } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-hero text-xl text-primary-foreground shadow-lift">
          <Icon name={icon} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  primary: "bg-primary/12 text-primary",
  gold: "bg-gold/20 text-gold-foreground dark:text-gold",
  success: "bg-success/15 text-success",
  danger: "bg-destructive/12 text-destructive",
  warning: "bg-warning/20 text-warning-foreground dark:text-warning",
} as const;

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  sub,
}: {
  label: string;
  value: ReactNode;
  icon: string;
  tone?: keyof typeof TONES;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-muted-foreground">{label}</div>
          <div className="num mt-1 truncate text-2xl font-extrabold">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-lg", TONES[tone])}>
          <Icon name={icon} />
        </span>
      </div>
    </div>
  );
}

export function BalanceBadge({ bal }: { bal: PartyBalance }) {
  if (bal.remaining <= 0) return <Badge variant="success">خالص</Badge>;
  if (bal.overdue) return <Badge variant="danger">متأخر</Badge>;
  return <Badge variant="warning">عليه مديونية</Badge>;
}

export function PartyCard({
  title,
  code,
  lines,
  bal,
  onOpen,
  actions,
}: {
  title: string;
  code: string;
  lines: { icon: string; text: string }[];
  bal: PartyBalance;
  onOpen: () => void;
  actions: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift",
        bal.overdue && "border-destructive/40",
      )}
    >
      <button type="button" onClick={onOpen} className="flex-1 p-4 text-start">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold group-hover:text-primary">{title}</div>
            <div className="text-xs font-semibold text-muted-foreground">{code}</div>
          </div>
          <BalanceBadge bal={bal} />
        </div>
        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
          {lines.map((l) => (
            <div key={l.icon + l.text} className="flex items-center gap-2 truncate">
              <Icon name={l.icon} className="w-4 text-center text-xs" /> {l.text}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted p-2 text-center">
          <div>
            <div className="text-[11px] text-muted-foreground">المطلوب</div>
            <div className="num text-sm font-bold">{money(bal.required)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">المدفوع</div>
            <div className="num text-sm font-bold text-success">{money(bal.paid)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">المتبقي</div>
            <div className={cn("num text-sm font-bold", bal.remaining > 0 && "text-destructive")}>{money(bal.remaining)}</div>
          </div>
        </div>
        {bal.remaining > 0 && (
          <div className={cn("mt-2 flex items-center gap-1 text-xs", bal.overdue ? "font-bold text-destructive" : "text-muted-foreground")}>
            <Icon name="calendar-day" /> ميعاد السداد: {fmtDate(bal.nextDue)}
          </div>
        )}
      </button>
      <div className="flex gap-1 border-t p-2">{actions}</div>
    </div>
  );
}

export function EmptyState({ icon, text, action }: { icon: string; text: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
      <Icon name={icon} className="text-4xl opacity-40" />
      <p>{text}</p>
      {action}
    </div>
  );
}
