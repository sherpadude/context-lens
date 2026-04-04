import { Telescope, ChevronDown, Clock, Plug, Wifi, WifiOff, X } from "lucide-react";
import { AppMode, ScoreHistoryEntry, HealthReport } from "@/types";
import { Button } from "@/components/ui/button";
import { loadHistory, formatTimestamp } from "@/lib/history";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { scoreColor } from "@/lib/scoring";

interface TopNavProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  currentReport?: HealthReport | null;
}

export default function TopNav({ activeMode, onModeChange, currentReport }: TopNavProps) {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [showConnect, setShowConnect] = useState(false);
  const [connected, setConnected] = useState(false);
  const [endpointInput, setEndpointInput] = useState("ws://localhost:8080/context-stream");

  useEffect(() => {
    setHistory(loadHistory());
  }, [activeMode]);

  const scoreStrokeColor = currentReport
    ? currentReport.score >= 85 ? "#22c55e"
      : currentReport.score >= 70 ? "#84cc16"
      : currentReport.score >= 50 ? "#eab308"
      : currentReport.score >= 30 ? "#f97316"
      : "#ef4444"
    : undefined;

  return (
    <>
      <header className="shrink-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 md:px-6 flex h-14 max-w-screen-2xl mx-auto items-center gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <Telescope className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight text-foreground hidden sm:block">ContextLens</span>
          </div>

          {/* Mode tabs */}
          <nav className="flex items-center space-x-1">
            {(["analyze", "explore", "simulate"] as AppMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                data-testid={`tab-${mode}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  activeMode === mode
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {mode}
              </button>
            ))}
          </nav>

          {/* Persistent Score Indicator — shown when a report is active */}
          {currentReport && (
            <div
              className="flex items-center gap-2 ml-2 px-3 py-1 rounded-full border border-border/50 bg-muted/30"
              data-testid="score-indicator"
            >
              {/* Mini SVG ring */}
              <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90 shrink-0">
                <circle cx="10" cy="10" r="7" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                <circle
                  cx="10" cy="10" r="7" fill="none" strokeWidth="2.5" strokeLinecap="round"
                  style={{
                    stroke: scoreStrokeColor,
                    strokeDasharray: `${(currentReport.score / 100) * 43.98} 43.98`,
                    transition: "stroke-dasharray 0.5s ease-out",
                  }}
                />
              </svg>
              <span
                className="text-sm font-mono font-bold leading-none"
                style={{ color: scoreStrokeColor }}
              >
                {currentReport.score}
              </span>
              <span className="text-xs text-muted-foreground hidden md:block capitalize">
                {currentReport.scoreLabel}
              </span>
            </div>
          )}

          <div className="flex flex-1 items-center justify-end gap-2">
            {/* Connect button — experimental placeholder for future WebSocket integration */}
            <button
              onClick={() => setShowConnect(!showConnect)}
              data-testid="button-connect"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                connected
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {connected ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Live</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </>
              ) : (
                <>
                  <Plug className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Connect</span>
                </>
              )}
            </button>

            {/* History Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 border-dashed text-xs" data-testid="button-history">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">History</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Recent Analyses</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {history.length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">No recent analyses</div>
                ) : (
                  history.map((entry) => (
                    <DropdownMenuItem key={entry.id} className="flex flex-col items-start py-2 gap-1 cursor-default">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm truncate pr-2">{entry.label}</span>
                        <span className="font-mono text-xs font-bold shrink-0" style={{ color: scoreColor(entry.score) }}>
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

      {/* Connect Panel — experimental UI for future WebSocket integration */}
      {showConnect && (
        <div className="shrink-0 border-b border-border/50 bg-card/60 backdrop-blur px-4 md:px-6 py-3">
          <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              {connected ? (
                <Wifi className="h-4 w-4 text-emerald-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">Live Context Stream</span>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">EXPERIMENTAL</span>
            </div>

            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={endpointInput}
                onChange={e => setEndpointInput(e.target.value)}
                disabled={connected}
                placeholder="ws://your-agent:8080/context-stream"
                className="flex-1 min-w-0 text-xs font-mono bg-background/60 border border-border/60 rounded px-3 py-1.5 text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50 focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={() => setConnected(!connected)}
                className={`shrink-0 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  connected
                    ? "bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    : "bg-primary/80 hover:bg-primary text-white"
                }`}
              >
                {connected ? "Disconnect" : "Connect"}
              </button>
            </div>

            <p className="text-xs text-muted-foreground hidden md:block max-w-xs shrink-0">
              Planned: stream context snapshots from a live agent to see real-time scoring updates.
            </p>

            <button onClick={() => setShowConnect(false)} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
