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

  const { payments } = useData();

  const kassaStats = useMemo(() => {
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      const label = p.custom_method_label || p.method;
      byMethod[label] = (byMethod[label] || 0) + p.amount;
    }
    const total = Object.values(byMethod).reduce((s, v) => s + v, 0);
    return { total, byMethod };
  }, [payments]);

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
              {user?.email && (
                <div className="flex items-center gap-1.5 mr-1 px-2.5 py-1 rounded-lg bg-muted/60">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">{user.email}</span>
                </div>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
                    <Wallet className="h-3 w-3 text-primary" />
                    <span className="text-xs font-semibold text-primary tabular-nums">
                      {formatCurrency(kassaStats.total, locale, t.common.currency)}
                    </span>
                    <ChevronDown className="h-3 w-3 text-primary/60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="end">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Касса</p>
                  <div className="space-y-1.5">
                    {Object.entries(kassaStats.byMethod).filter(([, v]) => v > 0).map(([method, amount]) => (
                      <div key={method} className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${METHOD_COLORS[method] || 'text-foreground'}`}>
                          {(t.paymentMethod as Record<string, string>)[method] ?? method}
                        </span>
                        <span className="text-xs tabular-nums text-foreground font-medium">
                          {formatCurrency(amount, locale, t.common.currency)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-border mt-2 pt-2 flex items-center justify-between">
                      <span className="text-xs font-bold">Итого</span>
                      <span className="text-xs font-bold tabular-nums text-primary">
                        {formatCurrency(kassaStats.total, locale, t.common.currency)}
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
