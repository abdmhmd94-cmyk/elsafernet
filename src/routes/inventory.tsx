import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/app/ConfirmButton";
import { useDialogs } from "@/components/app/dialog-context";
import { EmptyState, PageHeader, StatCard } from "@/components/app/bits";
import { Icon } from "@/components/app/Icon";
import { Button } from "@/components/ui/button";
import { inventory, sortOldestFirst, WHOLESALE_PRICES } from "@/lib/finance";
import { fmtDate, money, num } from "@/lib/format";
import { deleteStockIn, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "مخزن الكروت — شبكة السفير" },
      { name: "description", content: "مخزن كروت الإنترنت بفئات 5 و10 و20 و50 و100: الوارد والصادر والمتبقي." },
      { property: "og:title", content: "مخزن الكروت — شبكة السفير" },
      { property: "og:description", content: "الوارد والصادر والمتبقي من كروت الإنترنت تلقائياً." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { data } = useApp();
  const dialogs = useDialogs();
  const rows = useMemo(() => inventory(data), [data]);
  const log = useMemo(() => sortOldestFirst(data.stockIns).reverse(), [data.stockIns]);
  const totals = rows.reduce(
    (a, r) => ({
      in: a.in + r.incoming,
      out: a.out + r.outgoing,
      rem: a.rem + r.remaining,
      value: a.value + r.remaining * WHOLESALE_PRICES[r.denom],
    }),
    { in: 0, out: 0, rem: 0, value: 0 },
  );

  return (
    <div>
      <PageHeader
        title="مخزن كروت الإنترنت"
        subtitle="الوارد والصادر والمتبقي يُحسب تلقائياً من عمليات التوريد"
        icon="boxes-stacked"
        actions={
          <Button onClick={() => dialogs.open({ kind: "stock" })}>
            <Icon name="truck-ramp-box" /> وارد جديد
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الوارد" value={num(totals.in)} icon="arrow-down-to-bracket" tone="primary" />
        <StatCard label="إجمالي الصادر" value={num(totals.out)} icon="arrow-up-from-bracket" tone="gold" />
        <StatCard label="المتبقي بالمخزن" value={num(totals.rem)} icon="warehouse" tone="success" />
        <StatCard label="قيمة المخزن (جملة)" value={money(totals.value)} icon="coins" tone="warning" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map((r) => {
          const pct = r.incoming ? Math.round((r.remaining / r.incoming) * 100) : 0;
          const low = r.remaining <= Math.max(10, r.incoming * 0.1);
          return (
            <div key={r.denom} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <div className="flex items-center justify-between bg-hero px-4 py-3 text-primary-foreground">
                <span className="text-sm font-semibold opacity-80">كارت</span>
                <span className="text-3xl font-black">{r.denom}</span>
              </div>
              <div className="grid gap-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">وارد</span>
                  <b className="num">{num(r.incoming)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">صادر</span>
                  <b className="num">{num(r.outgoing)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">متبقي</span>
                  <b className={cn("num text-lg", low ? "text-destructive" : "text-success")}>{num(r.remaining)}</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", low ? "bg-destructive" : "bg-success")} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>سعر الجملة</span>
                  <span className="num font-bold text-foreground">{money(WHOLESALE_PRICES[r.denom])}</span>
                </div>
                {low && (
                  <div className="flex items-center gap-1 text-xs font-bold text-destructive">
                    <Icon name="circle-exclamation" /> رصيد منخفض
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-4 flex items-center gap-2 font-extrabold">
          <Icon name="clipboard-list" className="text-primary" /> سجل الواردات
        </h2>
        {log.length === 0 ? (
          <EmptyState icon="box-open" text="لا توجد واردات مسجلة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="p-2 text-start">التاريخ</th>
                  <th className="p-2 text-start">الفئة</th>
                  <th className="p-2 text-start">الكمية</th>
                  <th className="p-2 text-start">ملاحظة</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {log.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="num p-2">{fmtDate(s.date)}</td>
                    <td className="p-2 font-bold">كارت {s.denom}</td>
                    <td className="num p-2 font-bold text-success">+{num(s.quantity)}</td>
                    <td className="p-2 text-muted-foreground">{s.note || "—"}</td>
                    <td className="p-2 text-end">
                      <ConfirmButton
                        title="حذف هذا الوارد؟"
                        onConfirm={() => {
                          try {
                            deleteStockIn(s.id);
                            toast.success("تم حذف الوارد");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label="حذف">
                          <Icon name="trash-can" />
                        </Button>
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
