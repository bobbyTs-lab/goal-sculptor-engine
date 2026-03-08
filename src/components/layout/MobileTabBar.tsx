import { Home, Calendar, Target, Users, Dumbbell, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const tabs = [
  { title: "Home", url: "/", icon: Home },
  { title: "Program", url: "/program", icon: Calendar },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "People", url: "/people", icon: Users },
  { title: "Gym", url: "/workouts", icon: Dumbbell },
];

export function MobileTabBar() {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {tabs.map((tab) => {
          const active = isActive(tab.url);
          return (
            <NavLink
              key={tab.url}
              to={tab.url}
              end={tab.url === "/"}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors"
              activeClassName=""
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <tab.icon
                  className={`h-5 w-5 transition-all ${
                    active
                      ? "drop-shadow-[0_0_6px_hsl(130,100%,40%,0.5)]"
                      : ""
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-medieval leading-none ${
                  active ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {tab.title}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}