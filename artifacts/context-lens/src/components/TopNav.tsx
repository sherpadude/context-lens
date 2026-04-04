import { Telescope, ChevronDown, Clock } from "lucide-react";
import { AppMode, ScoreHistoryEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { loadHistory, formatTimestamp } from "@/lib/history";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { scoreColor } from "@/lib/scoring";

interface TopNavProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export default function TopNav({ activeMode, onModeChange }: TopNavProps) {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, [activeMode]); // Refresh history when tab changes

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex items-center gap-2 mr-6 text-primary">
          <Telescope className="h-5 w-5" />
          <span className="font-bold text-lg tracking-tight text-foreground">ContextLens</span>
        </div>

        <nav className="flex items-center space-x-1 lg:space-x-2">
          <Button
            variant={activeMode === "analyze" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onModeChange("analyze")}
            className={activeMode === "analyze" ? "bg-muted font-medium" : "text-muted-foreground"}
            data-testid="tab-analyze"
          >
            Analyze
          </Button>
          <Button
            variant={activeMode === "explore" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onModeChange("explore")}
            className={activeMode === "explore" ? "bg-muted font-medium" : "text-muted-foreground"}
            data-testid="tab-explore"
          >
            Explore
          </Button>
          <Button
            variant={activeMode === "simulate" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onModeChange("simulate")}
            className={activeMode === "simulate" ? "bg-muted font-medium" : "text-muted-foreground"}
            data-testid="tab-simulate"
          >
            Simulate
          </Button>
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <p className="text-sm text-muted-foreground hidden md:block">
            Visualize your context. Engineer it.
          </p>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 border-dashed" data-testid="button-history">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">History</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {history.length === 0 ? (
                <div className="p-4 text-sm text-center text-muted-foreground">No recent analyses</div>
              ) : (
                history.map((entry) => (
                  <DropdownMenuItem key={entry.id} className="flex flex-col items-start py-2 gap-1 cursor-default">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm truncate pr-2">{entry.label}</span>
                      <span 
                        className="font-mono text-xs font-bold shrink-0"
                        style={{ color: scoreColor(entry.score) }}
                      >
                        {entry.score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                      <span className="truncate pr-2">{entry.segmentSummary}</span>
                      <span className="shrink-0">{formatTimestamp(entry.timestamp)}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}