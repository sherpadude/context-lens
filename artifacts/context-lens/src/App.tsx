import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import AnalyzePage from "@/pages/AnalyzePage";
import ExplorePage from "@/pages/ExplorePage";
import SimulatePage from "@/pages/SimulatePage";
import { AppMode } from "@/types";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  const [activeMode, setActiveMode] = useState<AppMode>("analyze");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <TooltipProvider>
      <div className="h-[100dvh] w-full flex flex-col bg-background text-foreground selection:bg-primary/30 overflow-hidden">
        <TopNav activeMode={activeMode} onModeChange={setActiveMode} />
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeMode === "analyze" && (
            <div className="flex-1 overflow-y-auto">
              <AnalyzePage onNavigateToExplore={() => setActiveMode("explore")} />
            </div>
          )}
          {activeMode === "explore" && (
            <ExplorePage onNavigateToAnalyze={() => setActiveMode("analyze")} />
          )}
          {activeMode === "simulate" && (
            <div className="flex-1 overflow-y-auto">
              <SimulatePage />
            </div>
          )}
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
