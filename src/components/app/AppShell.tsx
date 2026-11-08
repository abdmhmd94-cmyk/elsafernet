import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { hydrateStore, logout, toggleTheme, useApp } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DialogCtx, type ActionDialog, type DialogApi } from "./dialog-context";
import { Icon } from "./Icon";
import { LoginScreen } from "./LoginScreen";
import { AgentFormDialog, ClientFormDialog } from "./PartyFormDialogs";
import { PaymentDialog } from "./PaymentDialog";
import { ProfileDialog } from "./ProfileDialog";
import { StockInDialog } from "./StockInDialog";
import { TxnDialog } from "./TxnDialog";

type NavPath = "/" | "/clients" | "/agents" | "/inventory" | "/settings";
const NAV: { to: NavPath; label: string; icon: string; roles: Role[] }[] = [
  { to: "/", label: "الرئيسية والتحليلات", icon: "chart-pie", roles: ["admin"] },
  { to: "/clients", label: "العملاء", icon: "users", roles: ["admin"] },
  { to: "/agents", label: "المناديب والمحلات", icon: "store", roles: ["admin", "cards"] },
  { to: "/inventory", label: "مخزن الكروت", icon: "boxes-stacked", roles: ["admin", "cards"] },
  { to: "/settings", label: "البيانات والإعدادات", icon: "gear", roles: ["admin"] },
];

const ROLE_LABEL: Record<Role, string> = { admin: "مدير النظام", cards: "مسؤول مناديب الكروت" };

export function AppShell({ children }: { children: ReactNode }) {
  const { hydrated, role, theme, data } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [action, setAction] = useState<ActionDialog | null>(null);
  const [profile, setProfile] = useState<{ type: "client" | "agent"; id: string } | null>(null);

  useEffect(() => {
    hydrateStore();
  }, []);

  const nav = useMemo(() => NAV.filter((n) => role && n.roles.includes(role)), [role]);
  const allowed = nav.some((n) => n.to === location.pathname);

  useEffect(() => {
    const first = nav[0];
    if (role && first && !allowed && NAV.some((n) => n.to === location.pathname)) {
      navigate({ to: first.to, replace: true });
    }
  }, [role, allowed, location.pathname, nav, navigate]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const api: DialogApi = useMemo(
    () => ({ open: setAction, openProfile: (type, id) => setProfile({ type, id }) }),
    [],
  );

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Icon name="spinner" className="fa-spin text-primary" /> جارِ التحميل…
        </div>
      </div>
    );
  }

  if (!role) return <LoginScreen />;

  const close = () => setAction(null);
  const current = NAV.find((n) => n.to === location.pathname);

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar-gradient text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="grid size-11 place-items-center rounded-2xl bg-gold-gradient text-lg text-gold-foreground shadow-lift">
          <Icon name="tower-broadcast" />
        </span>
        <div>
          <div className="text-lg font-black leading-tight">{data.settings.companyName}</div>
          <div className="text-xs opacity-70">نظام إدارة الشبكة</div>
        </div>
      </div>
      <nav className="grid gap-1 px-3">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
              location.pathname === n.to
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lift"
                : "opacity-80 hover:bg-sidebar-accent hover:opacity-100",
            )}
          >
            <Icon name={n.icon} className="w-5 text-center" /> {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-sidebar-accent p-4">
          <div className="text-xs opacity-70">تم الدخول بصلاحية</div>
          <div className="font-extrabold">{ROLE_LABEL[role]}</div>
          <button
            type="button"
            onClick={() => {
              logout();
              toast("تم تسجيل الخروج");
            }}
            className="mt-3 flex items-center gap-2 text-sm font-semibold opacity-80 hover:opacity-100"
          >
            <Icon name="right-from-bracket" /> تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <DialogCtx.Provider value={api}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 lg:block">{sidebar}</aside>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="right" className="w-72 border-0 p-0">
            <SheetTitle className="sr-only">القائمة</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-4 py-3 backdrop-blur lg:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="القائمة">
              <Icon name="bars" />
            </Button>
            <div className="truncate font-bold text-muted-foreground">{current?.label}</div>
            <div className="ms-auto flex items-center gap-2">
              <Button variant="gold" onClick={() => setAction({ kind: "quick" })}>
                <Icon name="bolt" /> <span className="hidden sm:inline">تحصيل سريع</span>
              </Button>
              <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="تبديل الوضع الليلي">
                <Icon name={theme === "dark" ? "sun" : "moon"} />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>

      {profile && <ProfileDialog type={profile.type} id={profile.id} onClose={() => setProfile(null)} />}
      <PaymentDialog
        open={action?.kind === "quick" || action?.kind === "pay"}
        onOpenChange={(o) => !o && close()}
        party={action?.kind === "pay" ? { type: action.type, id: action.id } : undefined}
      />
      {action?.kind === "txn" && (
        <TxnDialog open onOpenChange={(o) => !o && close()} type={action.type} id={action.id} />
      )}
      <ClientFormDialog
        open={action?.kind === "client"}
        onOpenChange={(o) => !o && close()}
        id={action?.kind === "client" ? action.id : undefined}
      />
      <AgentFormDialog
        open={action?.kind === "agent"}
        onOpenChange={(o) => !o && close()}
        id={action?.kind === "agent" ? action.id : undefined}
      />
      <StockInDialog open={action?.kind === "stock"} onOpenChange={(o) => !o && close()} />
    </DialogCtx.Provider>
  );
}
