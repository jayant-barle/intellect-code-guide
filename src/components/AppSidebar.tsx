import { Link, useRouterState } from "@tanstack/react-router";
import { GitCompare, History, Home, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Review", url: "/review", icon: GitCompare },
  { title: "History", url: "/history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3 px-1 py-2">
          <div className="grid size-9 shrink-0 place-items-center rounded-md border border-neon/40 bg-neon/10 font-mono text-sm font-semibold text-neon">
            py
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-sidebar-foreground">
                PyLens
              </p>
              <p className="truncate text-[11px] text-muted-foreground">AI code analysis</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em]">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              className="group flex w-full items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              title={`Switch to ${isDark ? "light" : "dark"} theme (currently ${theme})`}
              aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            >
              {isDark ? (
                <Moon className="size-4 shrink-0 text-neon transition-transform duration-200 group-hover:scale-110" />
              ) : (
                <Sun className="size-4 shrink-0 text-amber-500 transition-transform duration-200 group-hover:scale-110" />
              )}
              {!collapsed && (
                <span className="flex flex-1 items-center justify-between text-xs">
                  <span>Theme</span>
                  <span className="text-[10px] uppercase text-neon font-semibold">
                    {isDark ? "Dark" : "Light"}
                  </span>
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
