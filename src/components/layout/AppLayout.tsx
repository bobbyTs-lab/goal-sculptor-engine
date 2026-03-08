import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full vignette-burn">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center border-b px-4 bg-card/50 backdrop-blur-sm relative overflow-hidden border-runic texture-cracks texture-parchment">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            {/* Extra purple fog in header */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-purple-800/10 pointer-events-none" />
            <SidebarTrigger className="mr-4 relative z-10" />
            <h1 className="font-gothic text-3xl gradient-alien-text animate-flicker relative z-10 chromatic-aberration">GoalForge</h1>
          </header>
          <main className="flex-1 overflow-auto p-6 texture-cracks scanlines-heavy relative">
            <div className="relative z-10">
            {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
