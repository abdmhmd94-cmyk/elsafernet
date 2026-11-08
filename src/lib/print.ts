import { partyBalance, statement } from "./finance";
import { fmtDate, money, todayISO } from "./format";
import type { DataState, PartyType } from "./types";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Print a party's account statement through a hidden iframe (works inside the preview frame). */
export function printStatement(data: DataState, type: PartyType, id: string) {
  const party =
    type === "client" ? data.clients.find((c) => c.id === id) : data.agents.find((a) => a.id === id);
  if (!party) return;
  const rows = statement(data, type, id);
  const bal = partyBalance(data, type, id, todayISO());
  const extra =
    type === "client" && "package" in party
      ? `<div><b>الباقة:</b> ${esc(party.package || "—")}</div><div><b>الموظف المسؤول:</b> ${esc(party.employee || "—")}</div>`
      : "";

  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
<title>كشف حساب — ${esc(party.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap"/>
<style>
*{box-sizing:border-box} body{font-family:Cairo,system-ui,sans-serif;color:#1d2a33;margin:32px;font-size:13px}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c9a24a;padding-bottom:14px;margin-bottom:18px}
h1{margin:0;font-size:24px;color:#1f4d58} h2{margin:4px 0 0;font-size:15px;font-weight:600;color:#55656f}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 18px;background:#f6f3ec;border-radius:10px;padding:12px 16px;margin-bottom:18px}
table{width:100%;border-collapse:collapse} th{background:#1f4d58;color:#fff;font-weight:600;padding:8px;text-align:right}
td{padding:7px 8px;border-bottom:1px solid #e6e1d6} tr:nth-child(even) td{background:#fbfaf6}
.n{font-variant-numeric:tabular-nums;white-space:nowrap}
.tot{display:flex;gap:12px;margin-top:18px} .tot div{flex:1;border:1px solid #e6e1d6;border-radius:10px;padding:10px 14px}
.tot b{display:block;font-size:17px} .rem b{color:#b23a2a}
.foot{margin-top:28px;color:#8a949a;font-size:11px;text-align:center}
</style></head><body>
<div class="head"><div><h1>${esc(data.settings.companyName)}</h1><h2>كشف حساب ${type === "client" ? "عميل" : "مندوب / محل"}</h2></div>
<div style="text-align:left"><div>تاريخ الطباعة</div><b>${fmtDate(todayISO())}</b></div></div>
<div class="meta"><div><b>الاسم:</b> ${esc(party.name)}</div><div><b>الكود:</b> ${esc(party.code)}</div><div><b>الهاتف:</b> ${esc(party.phone || "—")}</div>${extra}</div>
<table><thead><tr><th>التاريخ</th><th>البيان</th><th>مدين (مطلوب)</th><th>دائن (مدفوع)</th><th>الرصيد</th></tr></thead><tbody>
${rows
  .map(
    (r) =>
      `<tr><td class="n">${fmtDate(r.date)}</td><td>${esc(r.description)}</td><td class="n">${r.debit ? money(r.debit) : "—"}</td><td class="n">${r.credit ? money(r.credit) : "—"}</td><td class="n">${money(r.balance)}</td></tr>`,
  )
  .join("") || `<tr><td colspan="5" style="text-align:center;padding:20px">لا توجد حركات</td></tr>`}
</tbody></table>
<div class="tot"><div>إجمالي المطلوب<b class="n">${money(bal.required)}</b></div><div>إجمالي المدفوع<b class="n">${money(bal.paid)}</b></div><div class="rem">المتبقي<b class="n">${money(bal.remaining)}</b></div></div>
<div class="foot">${esc(data.settings.companyName)} — هذا الكشف صادر من النظام</div>
</body></html>`;

  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;left:0;bottom:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  };
  // give the web font a moment to load
  setTimeout(go, 600);
}
