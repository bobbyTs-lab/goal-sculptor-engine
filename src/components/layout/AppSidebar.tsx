import { Target, Dumbbell, Download, Skull } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { exportAllData } from "@/lib/storage";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Workouts", url: "/workouts", icon: Dumbbell },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goalforge-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-gothic text-2xl gradient-alien-text py-4">
            {!collapsed && "GoalForge"}
          </SidebarGroupLabel>
          <div className="divider-alien mx-2 mb-2" />
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={false}
                      className="hover:bg-muted/50 transition-all font-medieval text-base tracking-wide"
                      activeClassName="bg-primary/20 text-primary font-bold glow-green border-l-2 border-primary"
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="divider-alien mx-2 mb-2" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="w-full justify-start text-muted-foreground hover:text-secondary hover:glow-gold-text transition-all font-medieval"
        >
          <Download className="h-4 w-4 mr-2" />
          {!collapsed && "Export Data"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
