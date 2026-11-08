import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useDialogs } from "@/components/app/dialog-context";
import { EmptyState, PageHeader, PartyCard, StatCard } from "@/components/app/bits";
import { Icon } from "@/components/app/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { partyBalance } from "@/lib/finance";
import { money, num, todayISO } from "@/lib/format";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "العملاء — شبكة السفير" },
      { name: "description", content: "قائمة عملاء الإنترنت مع الباقات والمطلوب والمدفوع والمتبقي ومواعيد السداد." },
      { property: "og:title", content: "العملاء — شبكة السفير" },
      { property: "og:description", content: "قائمة عملاء الإنترنت وحساباتهم ومواعيد السداد." },
    ],
  }),
  component: ClientsPage,
});

type Filter = "all" | "debt" | "overdue" | "clear";
const FILTERS: { f: Filter; l: string }[] = [
  { f: "all", l: "الكل" },
  { f: "debt", l: "عليهم مديونية" },
  { f: "overdue", l: "متأخرون" },
  { f: "clear", l: "خالصون" },
];

function ClientsPage() {
  const { data } = useApp();
  const dialogs = useDialogs();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const today = todayISO();

  const rows = useMemo(
    () => data.clients.map((c) => ({ c, bal: partyBalance(data, "client", c.id, today) })),
    [data, today],
  );
  const shown = rows.filter(({ c, bal }) => {
    const s = q.trim();
    if (s && ![c.name, c.code, c.phone, c.package, c.employee].some((v) => v?.includes(s))) return false;
    if (filter === "debt") return bal.remaining > 0;
    if (filter === "overdue") return bal.overdue;
    if (filter === "clear") return bal.remaining <= 0;
    return true;
  });
  const totalRemaining = rows.reduce((a, r) => a + r.bal.remaining, 0);

  return (
    <div>
      <PageHeader
        title="قائمة العملاء"
        subtitle={`${num(data.clients.length)} عميل مسجل`}
        icon="users"
        actions={
          <Button onClick={() => dialogs.open({ kind: "client" })}>
            <Icon name="user-plus" /> عميل جديد
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي المتبقي على العملاء" value={money(totalRemaining)} icon="scale-unbalanced" tone="warning" />
        <StatCard label="عملاء عليهم مديونية" value={num(rows.filter((r) => r.bal.remaining > 0).length)} icon="user-clock" tone="gold" />
        <StatCard label="عملاء متأخرون" value={num(rows.filter((r) => r.bal.overdue).length)} icon="triangle-exclamation" tone="danger" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Icon name="magnifying-glass" className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم، الكود، الهاتف، الباقة، الموظف" className="h-10 ps-9" />
        </div>
        <div className="flex gap-1 rounded-xl border bg-card p-1">
          {FILTERS.map(({ f, l }) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-bold transition",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon="users-slash"
          text={data.clients.length ? "لا يوجد عملاء مطابقون للبحث" : "لم تتم إضافة عملاء بعد"}
          action={
            !data.clients.length && (
              <Button onClick={() => dialogs.open({ kind: "client" })}>
                <Icon name="user-plus" /> أضف أول عميل
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map(({ c, bal }) => (
            <PartyCard
              key={c.id}
              title={c.name}
              code={c.code}
              bal={bal}
              onOpen={() => dialogs.openProfile("client", c.id)}
              lines={[
                { icon: "phone", text: c.phone || "—" },
                { icon: "wifi", text: c.package || "بدون باقة" },
                { icon: "credit-card", text: c.paymentMethod || "—" },
                { icon: "user-tie", text: c.employee ? `الموظف: ${c.employee}` : "بدون موظف مسؤول" },
              ]}
              actions={
                <>
                  <Button size="sm" variant="soft" className="flex-1" onClick={() => dialogs.open({ kind: "txn", type: "client", id: c.id })}>
                    <Icon name="plus" /> عملية
                  </Button>
                  <Button
                    size="sm"
                    variant="gold"
                    className="flex-1"
                    disabled={bal.remaining <= 0}
                    onClick={() => dialogs.open({ kind: "pay", type: "client", id: c.id })}
                  >
                    <Icon name="hand-holding-dollar" /> سداد
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dialogs.openProfile("client", c.id)} aria-label="الملف">
                    <Icon name="folder-open" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
