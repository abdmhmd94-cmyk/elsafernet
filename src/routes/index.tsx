import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDialogs } from "@/components/app/dialog-context";
import { EmptyState, PageHeader, StatCard } from "@/components/app/bits";
import { Icon } from "@/components/app/Icon";
import { Input } from "@/components/ui/input";
import { cardsCount, inPeriod, inventory, sortOldestFirst, txnViews } from "@/lib/finance";
import { fmtDate, money, num, todayISO } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { Period, PeriodMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "لوحة التحليلات — شبكة السفير" },
      { name: "description", content: "إحصائيات فورية للعملاء والإيرادات والديون المتأخرة في شبكة السفير." },
      { property: "og:title", content: "لوحة التحليلات — شبكة السفير" },
      { property: "og:description", content: "إحصائيات فورية للعملاء والإيرادات والديون المتأخرة." },
    ],
  }),
  component: Dashboard,
});

const MODES: { m: PeriodMode; l: string }[] = [
  { m: "day", l: "يوم" },
  { m: "month", l: "شهر" },
  { m: "year", l: "سنة" },
  { m: "all", l: "الكل" },
];

function defaultValue(m: PeriodMode) {
  const t = todayISO();
  return m === "day" ? t : m === "month" ? t.slice(0, 7) : m === "year" ? t.slice(0, 4) : "";
}

function Dashboard() {
  const { data } = useApp();
  const dialogs = useDialogs();
  const [period, setPeriod] = useState<Period>({ mode: "month", value: defaultValue("month") });
  const today = todayISO();

  const s = useMemo(() => {
    const views = txnViews(data.txns, data.payments);
    const pTxns = views.filter((t) => inPeriod(t.date, period));
    const pPays = data.payments.filter((p) => inPeriod(p.date, period));
    const overdue = pTxns.filter((t) => t.remaining > 0 && t.dueDate && t.dueDate < today);
    const collected = pPays.reduce((a, p) => a + p.amount, 0);
    const collectedClients = pPays.filter((p) => p.partyType === "client").reduce((a, p) => a + p.amount, 0);
    return {
      clients: data.clients.length,
      newClients: data.clients.filter((c) => inPeriod(new Date(c.createdAt).toISOString().slice(0, 10), period)).length,
      collected,
      collectedClients,
      collectedAgents: collected - collectedClients,
      required: pTxns.reduce((a, t) => a + t.required, 0),
      remaining: pTxns.reduce((a, t) => a + t.remaining, 0),
      overdue: sortOldestFirst(overdue),
      overdueAmount: overdue.reduce((a, t) => a + t.remaining, 0),
      txnCount: pTxns.length,
      cardsOut: pTxns.reduce((a, t) => a + cardsCount(t.cards), 0),
      stock: inventory(data).reduce((a, r) => a + r.remaining, 0),
      recent: sortOldestFirst(pPays).reverse().slice(0, 6),
    };
  }, [data, period, today]);

  const chart = useMemo(() => {
    const months: string[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
    }
    return months.map((m) => {
      const ps = data.payments.filter((p) => p.date.slice(0, 7) === m);
      return {
        name: new Intl.DateTimeFormat("ar-EG", { month: "short" }).format(new Date(`${m}-01T00:00:00`)),
        clients: ps.filter((p) => p.partyType === "client").reduce((a, p) => a + p.amount, 0),
        agents: ps.filter((p) => p.partyType === "agent").reduce((a, p) => a + p.amount, 0),
      };
    });
  }, [data.payments]);

  const partyName = (type: string, id: string) =>
    (type === "client" ? data.clients.find((c) => c.id === id) : data.agents.find((a) => a.id === id))?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="الشاشة الرئيسية والتحليلات"
        subtitle="ملخص فوري للعملاء والتحصيل والمديونيات"
        icon="chart-pie"
        actions={
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-1.5 shadow-soft">
            {MODES.map(({ m, l }) => (
              <button
                key={m}
                type="button"
                onClick={() => setPeriod({ mode: m, value: defaultValue(m) })}
                className={cn(
                  "rounded-xl px-4 py-1.5 text-sm font-bold transition",
                  period.mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {l}
              </button>
            ))}
            {period.mode !== "all" && (
              <Input
                type={period.mode === "day" ? "date" : period.mode === "month" ? "month" : "number"}
                min={period.mode === "year" ? 2000 : undefined}
                max={period.mode === "year" ? 2100 : undefined}
                value={period.value}
                onChange={(e) => setPeriod({ ...period, value: e.target.value })}
                className="h-8 w-40"
              />
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي العملاء" value={num(s.clients)} icon="users" sub={`جدد في الفترة: ${num(s.newClients)}`} />
        <StatCard
          label="إيرادات المحصّل"
          value={money(s.collected)}
          icon="sack-dollar"
          tone="success"
          sub={`عملاء ${money(s.collectedClients)} · مناديب ${money(s.collectedAgents)}`}
        />
        <StatCard label="الديون والمتبقي" value={money(s.remaining)} icon="scale-unbalanced" tone="warning" sub={`من مطلوب ${money(s.required)}`} />
        <StatCard
          label="الديون المتأخرة"
          value={num(s.overdue.length)}
          icon="triangle-exclamation"
          tone="danger"
          sub={`بقيمة ${money(s.overdueAmount)}`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="عدد العمليات في الفترة" value={num(s.txnCount)} icon="receipt" tone="primary" />
        <StatCard label="كروت صادرة في الفترة" value={num(s.cardsOut)} icon="ticket" tone="gold" />
        <StatCard label="رصيد المخزن الحالي" value={`${num(s.stock)} كارت`} icon="warehouse" tone="primary" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 font-extrabold">
            <Icon name="chart-column" className="text-primary" /> التحصيل خلال آخر 6 أشهر
          </h2>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, direction: "rtl" }}
                  formatter={(v: number, n: string) => [money(v), n === "clients" ? "العملاء" : "المناديب"]}
                />
                <Bar dataKey="clients" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="agents" stackId="a" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 font-extrabold">
            <Icon name="clock-rotate-left" className="text-success" /> آخر التحصيلات
          </h2>
          {s.recent.length === 0 ? (
            <EmptyState icon="inbox" text="لا توجد تحصيلات في هذه الفترة" />
          ) : (
            <div className="divide-y">
              {s.recent.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => dialogs.openProfile(p.partyType, p.partyId)}
                  className="flex w-full items-center justify-between py-2.5 text-start hover:text-primary"
                >
                  <div>
                    <div className="font-bold">{partyName(p.partyType, p.partyId)}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(p.date)} · {p.method}
                    </div>
                  </div>
                  <span className="num font-extrabold text-success">{money(p.amount)}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 font-extrabold">
          <Icon name="triangle-exclamation" className="text-destructive" /> حالات الديون المتأخرة
        </h2>
        {s.overdue.length === 0 ? (
          <EmptyState icon="circle-check" text="لا توجد ديون متأخرة في هذه الفترة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="p-2 text-start">الحساب</th>
                  <th className="p-2 text-start">النوع</th>
                  <th className="p-2 text-start">البيان</th>
                  <th className="p-2 text-start">الاستحقاق</th>
                  <th className="p-2 text-start">التأخير</th>
                  <th className="p-2 text-start">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {s.overdue.map((t) => {
                  const days = Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${t.dueDate}T00:00:00`).getTime()) / 86400000);
                  return (
                    <tr
                      key={t.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted"
                      onClick={() => dialogs.openProfile(t.partyType, t.partyId)}
                    >
                      <td className="p-2 font-bold">{partyName(t.partyType, t.partyId)}</td>
                      <td className="p-2">{t.partyType === "client" ? "عميل" : "مندوب"}</td>
                      <td className="p-2">{t.description}</td>
                      <td className="num p-2">{fmtDate(t.dueDate)}</td>
                      <td className="num p-2 font-bold text-destructive">{num(days)} يوم</td>
                      <td className="num p-2 font-extrabold">{money(t.remaining)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
