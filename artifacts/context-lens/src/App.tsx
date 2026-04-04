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
  
  // Set dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground selection:bg-primary/30">
        <TopNav activeMode={activeMode} onModeChange={setActiveMode} />
        
        <main className="flex-1 flex flex-col">
          {activeMode === "analyze" && <AnalyzePage onNavigateToExplore={() => setActiveMode("explore")} />}
          {activeMode === "explore" && <ExplorePage onNavigateToAnalyze={() => setActiveMode("analyze")} />}
          {activeMode === "simulate" && <SimulatePage />}
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
