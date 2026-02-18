import { LayoutDashboard, BedDouble, CalendarDays, CreditCard, Receipt, BarChart3, Settings, Gem } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useLanguage();
  const { hotel } = useData();

  const mainItems = [
    { title: t.nav.dashboard, url: "/", icon: LayoutDashboard },
    { title: t.nav.rooms, url: "/rooms", icon: BedDouble },
    { title: t.nav.stays, url: "/stays", icon: CalendarDays },
  ];

  const financeItems = [
    { title: t.nav.payments, url: "/payments", icon: CreditCard },
    { title: t.nav.expenses, url: "/expenses", icon: Receipt },
    { title: t.nav.reports, url: "/reports", icon: BarChart3 },
  ];

  const systemItems = [
    { title: t.nav.settings, url: "/settings", icon: Settings },
  ];

  const NavItem = ({ item }: { item: typeof mainItems[0] }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.url === "/"}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium border border-sidebar-primary/20 glow-gold-sm"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="text-sm">{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r-0">
      {/* Header */}
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg gradient-gold flex items-center justify-center shrink-0">
            <Gem className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="text-sm font-bold tracking-wide text-sidebar-accent-foreground truncate">
            {hotel.name || t.app.name}
          </h2>
        </div>
        <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest pl-9">
          Management System
        </p>
      </div>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="p-0 mb-1">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1">
            Управление
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainItems.map((item) => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0 mb-1">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1">
            Финансы
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {financeItems.map((item) => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1">
            Система
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {systemItems.map((item) => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-5 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">Online</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
