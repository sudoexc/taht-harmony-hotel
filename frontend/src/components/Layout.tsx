import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Moon, Sun, LogOut, User, Wallet, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";

const METHOD_COLORS: Record<string, string> = {
  CASH: "text-success",
  CARD: "text-info",
  PAYME: "text-primary",
  CLICK: "text-purple-500",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const { payments, expenses, transfers, customPaymentMethods } = useData();

  const kassaStats = useMemo(() => {
    const income: Record<string, number> = {};
    const outcome: Record<string, number> = {};

    // seed all custom methods with 0
    for (const m of customPaymentMethods) {
      income[m.name] = 0;
      outcome[m.name] = 0;
    }

    for (const p of payments) {
      const label = p.custom_method_label || p.method;
      income[label] = (income[label] || 0) + p.amount;
    }
    for (const e of expenses) {
      const label = e.custom_method_label || e.method;
      outcome[label] = (outcome[label] || 0) + e.amount;
    }
    // transfers move money between registers
    for (const tr of transfers) {
      outcome[tr.from_method] = (outcome[tr.from_method] || 0) + tr.amount;
      income[tr.to_method]    = (income[tr.to_method]    || 0) + tr.amount;
    }

    const allMethods = new Set([...Object.keys(income), ...Object.keys(outcome)]);
    const byMethod: Record<string, { income: number; outcome: number; balance: number }> = {};
    for (const m of allMethods) {
      const i = income[m] || 0;
      const o = outcome[m] || 0;
      byMethod[m] = { income: i, outcome: o, balance: i - o };
    }

    const totalBalance = Object.values(byMethod).reduce((s, v) => s + v.balance, 0);
    return { totalBalance, byMethod };
  }, [payments, expenses, transfers, customPaymentMethods]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
            <SidebarTrigger
              aria-label={t.common.toggleSidebar}
              title={t.common.toggleSidebar}
              className="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            />
            <div className="flex items-center gap-1">
              {user?.username && (
                <div className="flex items-center gap-1.5 mr-1 px-2.5 py-1 rounded-lg bg-muted/60">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">{user.username}</span>
                </div>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <button className={`flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${kassaStats.totalBalance >= 0 ? 'bg-primary/10 border-primary/20 hover:bg-primary/20' : 'bg-destructive/10 border-destructive/20 hover:bg-destructive/20'}`}>
                    <Wallet className={`h-3 w-3 ${kassaStats.totalBalance >= 0 ? 'text-primary' : 'text-destructive'}`} />
                    <span className={`text-xs font-semibold tabular-nums ${kassaStats.totalBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(kassaStats.totalBalance, locale, t.common.currency)}
                    </span>
                    <ChevronDown className={`h-3 w-3 ${kassaStats.totalBalance >= 0 ? 'text-primary/60' : 'text-destructive/60'}`} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{t.finance.registers}</p>
                  <div className="space-y-2">
                    {Object.entries(kassaStats.byMethod).map(([method, stat]) => (
                      <div key={method} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{method}</span>
                          <span className={`text-xs font-bold tabular-nums ${stat.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(stat.balance, locale, t.common.currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>↑ {formatCurrency(stat.income, locale, t.common.currency)}</span>
                          <span>↓ {formatCurrency(stat.outcome, locale, t.common.currency)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-border mt-2 pt-2 flex items-center justify-between">
                      <span className="text-xs font-bold">{t.common.total}</span>
                      <span className={`text-xs font-bold tabular-nums ${kassaStats.totalBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatCurrency(kassaStats.totalBalance, locale, t.common.currency)}
                      </span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground gap-1.5 text-xs h-8"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t.auth.signOut}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
