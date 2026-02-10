import { LayoutDashboard, BedDouble, CalendarDays, CreditCard, Receipt, BarChart3, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useLanguage();
  const { hotel } = useData();

  const items = [
    { title: t.nav.dashboard, url: "/", icon: LayoutDashboard },
    { title: t.nav.rooms, url: "/rooms", icon: BedDouble },
    { title: t.nav.stays, url: "/stays", icon: CalendarDays },
    { title: t.nav.payments, url: "/payments", icon: CreditCard },
    { title: t.nav.expenses, url: "/expenses", icon: Receipt },
    { title: t.nav.reports, url: "/reports", icon: BarChart3 },
    { title: t.nav.settings, url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar>
      <div className="p-5 border-b border-sidebar-border">
        <h2 className="text-lg font-bold tracking-tight">{hotel.name || t.app.name}</h2>
        <p className="text-xs text-sidebar-foreground/60">{t.app.description}</p>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
