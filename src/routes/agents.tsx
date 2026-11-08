import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useDialogs } from "@/components/app/dialog-context";
import { EmptyState, PageHeader, PartyCard, StatCard } from "@/components/app/bits";
import { Icon } from "@/components/app/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cardsCount, partyBalance, sortOldestFirst, txnViews, WHOLESALE_PRICES } from "@/lib/finance";
import { fmtDate, money, num, todayISO } from "@/lib/format";
import { useApp } from "@/lib/store";
import { DENOMS } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "مناديب الكروت والمحلات — شبكة السفير" },
      { name: "description", content: "حسابات مناديب ومحلات كروت الإنترنت بالجملة وسجل عمليات التوريد." },
      { property: "og:title", content: "مناديب الكروت والمحلات — شبكة السفير" },
      { property: "og:description", content: "حسابات المناديب والمحلات وسجل التوريد بأسعار الجملة." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const { data } = useApp();
  const dialogs = useDialogs();
  const [q, setQ] = useState("");
  const today = todayISO();

  const rows = useMemo(() => data.agents.map((a) => ({ a, bal: partyBalance(data, "agent", a.id, today) })), [data, today]);
  const shown = rows.filter(({ a }) => {
    const s = q.trim();
    return !s || [a.name, a.code, a.phone, a.address ?? ""].some((v) => v.includes(s));
  });
  const supplies = useMemo(
    () => sortOldestFirst(txnViews(data.txns.filter((t) => t.partyType === "agent"), data.payments)).reverse(),
    [data],
  );
  const name = (id: string) => data.agents.find((a) => a.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="مناديب الكروت (جملة)"
        subtitle="حسابات المحلات والمناديب وعمليات التوريد"
        icon="store"
        actions={
          <Button onClick={() => dialogs.open({ kind: "agent" })}>
            <Icon name="plus" /> مندوب / محل جديد
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="عدد الحسابات" value={num(data.agents.length)} icon="id-badge" />
        <StatCard label="إجمالي المتبقي على المناديب" value={money(rows.reduce((s, r) => s + r.bal.remaining, 0))} icon="scale-unbalanced" tone="warning" />
        <StatCard label="حسابات متأخرة" value={num(rows.filter((r) => r.bal.overdue).length)} icon="triangle-exclamation" tone="danger" />
        <StatCard label="إجمالي الكروت الموردة" value={num(supplies.reduce((s, t) => s + cardsCount(t.cards), 0))} icon="ticket" tone="gold" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border bg-card p-3 text-sm shadow-soft">
        <span className="flex items-center gap-2 font-bold text-muted-foreground">
          <Icon name="tags" /> أسعار الجملة:
        </span>
        {DENOMS.map((d) => (
          <span key={d} className="num rounded-lg bg-muted px-3 py-1">
            كارت <b>{d}</b> ← <b className="text-primary">{WHOLESALE_PRICES[d]} جـ</b>
          </span>
        ))}
      </div>

      <Tabs defaultValue="accounts" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="accounts">
            <Icon name="address-book" className="ms-1" /> الحسابات
          </TabsTrigger>
          <TabsTrigger value="log">
            <Icon name="list-ul" className="ms-1" /> سجل التوريد ({supplies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <div className="relative mb-4">
            <Icon name="magnifying-glass" className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الكود أو الهاتف" className="h-10 ps-9" />
          </div>
          {shown.length === 0 ? (
            <EmptyState
              icon="store-slash"
              text={data.agents.length ? "لا توجد نتائج" : "لم تتم إضافة مناديب أو محلات بعد"}
              action={
                !data.agents.length && (
                  <Button onClick={() => dialogs.open({ kind: "agent" })}>
                    <Icon name="plus" /> أضف أول حساب
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map(({ a, bal }) => (
                <PartyCard
                  key={a.id}
                  title={a.name}
                  code={a.code}
                  bal={bal}
                  onOpen={() => dialogs.openProfile("agent", a.id)}
                  lines={[
                    { icon: a.kind === "shop" ? "shop" : "person-walking-luggage", text: a.kind === "shop" ? "محل" : "مندوب" },
                    { icon: "phone", text: a.phone || "—" },
                    ...(a.address ? [{ icon: "location-dot", text: a.address }] : []),
                  ]}
                  actions={
                    <>
                      <Button size="sm" variant="soft" className="flex-1" onClick={() => dialogs.open({ kind: "txn", type: "agent", id: a.id })}>
                        <Icon name="truck-fast" /> توريد
                      </Button>
                      <Button
                        size="sm"
                        variant="gold"
                        className="flex-1"
                        disabled={bal.remaining <= 0}
                        onClick={() => dialogs.open({ kind: "pay", type: "agent", id: a.id })}
                      >
                        <Icon name="hand-holding-dollar" /> سداد
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dialogs.openProfile("agent", a.id)} aria-label="الملف">
                        <Icon name="folder-open" />
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log">
          {supplies.length === 0 ? (
            <EmptyState icon="truck" text="لا توجد عمليات توريد بعد" />
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-3 text-start">التاريخ</th>
                    <th className="p-3 text-start">الحساب</th>
                    <th className="p-3 text-start">الكروت</th>
                    <th className="p-3 text-start">المطلوب</th>
                    <th className="p-3 text-start">المدفوع</th>
                    <th className="p-3 text-start">المتبقي</th>
                    <th className="p-3 text-start">الاستحقاق</th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.map((t) => (
                    <tr key={t.id} className="cursor-pointer border-t hover:bg-muted/60" onClick={() => dialogs.openProfile("agent", t.partyId)}>
                      <td className="num p-3 whitespace-nowrap">{fmtDate(t.date)}</td>
                      <td className="p-3 font-bold">{name(t.partyId)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {DENOMS.filter((d) => t.cards?.[d]).map((d) => (
                            <span key={d} className="num rounded-md bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
                              {t.cards![d]}×{d}
                            </span>
                          ))}
                          {!cardsCount(t.cards) && <span className="text-muted-foreground">{t.description}</span>}
                        </div>
                      </td>
                      <td className="num p-3">{money(t.required)}</td>
                      <td className="num p-3 text-success">{money(t.paid)}</td>
                      <td className={cn("num p-3 font-bold", t.remaining > 0 && "text-destructive")}>{money(t.remaining)}</td>
                      <td className={cn("num p-3", t.remaining > 0 && t.dueDate && t.dueDate < today && "font-bold text-destructive")}>
                        {t.remaining > 0 ? fmtDate(t.dueDate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
