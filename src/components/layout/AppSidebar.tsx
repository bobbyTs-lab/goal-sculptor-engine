import { Target, Dumbbell, Home, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Workouts", url: "/workouts", icon: Dumbbell },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-gothic text-2xl gradient-alien-text py-4">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-block"
              >
                GoalForge
              </motion.span>
            )}
          </SidebarGroupLabel>
          <div className="divider-alien mx-2 mb-2" />
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, i) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="relative font-medieval text-base tracking-wide transition-all duration-300 hover:bg-muted/50 group"
                        activeClassName="text-primary font-bold"
                      >
                        {/* Active ember glow bar */}
                        {active && (
                          <motion.div
                            layoutId="sidebar-active-glow"
                            className="absolute inset-0 rounded-md bg-primary/15 border-l-2 border-primary"
                            style={{
                              boxShadow: '0 0 12px hsl(130 100% 40% / 0.3), inset 0 0 12px hsl(280 100% 50% / 0.05)',
                            }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}

                        {/* Hover ember glow */}
                        <motion.div
                          className="absolute inset-0 rounded-md pointer-events-none"
                          initial={false}
                          whileHover={{
                            boxShadow: '0 0 20px hsl(280 100% 50% / 0.15), 0 0 40px hsl(280 100% 50% / 0.05)',
                          }}
                        />

                        <motion.div
                          className="relative z-10 flex items-center"
                          whileHover={{ x: collapsed ? 0 : 4 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <motion.span
                            className="mr-2 inline-flex"
                            whileHover={{
                              rotate: [0, -8, 8, -4, 0],
                              filter: 'drop-shadow(0 0 6px hsl(280 100% 60% / 0.6))',
                            }}
                            transition={{ duration: 0.5 }}
                          >
                            <item.icon className={`h-5 w-5 transition-all duration-300 ${active ? 'drop-shadow-[0_0_8px_hsl(130,100%,40%,0.6)]' : 'group-hover:drop-shadow-[0_0_6px_hsl(280,100%,60%,0.4)]'}`} />
                          </motion.span>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.05 * i }}
                            >
                              {item.title}
                            </motion.span>
                          )}
                        </motion.div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="divider-alien mx-2 mb-2" />
      </SidebarFooter>
    </Sidebar>
  );
}
