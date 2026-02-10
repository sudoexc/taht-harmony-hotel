import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
            <SidebarTrigger aria-label={t.common.toggleSidebar} title={t.common.toggleSidebar} />
            <div className="flex items-center gap-3">
              {user?.email && (
                <span className="text-xs text-muted-foreground">{user.email}</span>
              )}
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" onClick={signOut}>
                {t.auth.signOut}
              </Button>
              <Button
                variant="ghost"
                size="icon"
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
