import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileTabBar } from "./MobileTabBar";
import { AmbientSound } from "@/components/AmbientSound";
import { loadSettings } from "@/lib/storage";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [settings] = useState(() => loadSettings());
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <main className="flex-1 overflow-auto px-3 pt-3 pb-20">
          {children}
        </main>
        <MobileTabBar />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card/50 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            <SidebarTrigger className="mr-4 relative z-10" />
            <h1 className="font-gothic text-2xl gradient-alien-text animate-flicker relative z-10">GoalForge</h1>
            <div className="ml-auto relative z-10">
              <AmbientSound enabled={settings.ambientSoundEnabled} />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}