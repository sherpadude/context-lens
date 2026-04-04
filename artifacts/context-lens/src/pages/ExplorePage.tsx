import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCENARIOS, getScenario } from "@/data/scenarios";
import { Scenario, ContextWindow } from "@/types";
import { scenarioToContextWindow } from "@/lib/parser";
import { getSegmentColor } from "@/lib/segmentColors";
import { analyzeContext } from "@/lib/scoring";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExplorePageProps {
  onNavigateToAnalyze: () => void;
}

export default function ExplorePage({ onNavigateToAnalyze }: ExplorePageProps) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  if (activeScenarioId) {
    const scenario = getScenario(activeScenarioId);
    if (!scenario) return null;
    return (
      <ScenarioPlayer
        scenario={scenario}
        onBack={() => setActiveScenarioId(null)}
        onLoadAnalyze={onNavigateToAnalyze}
      />
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      <div className="container max-w-6xl py-10 px-4 md:px-6 space-y-10">
        <div className="space-y-3 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Concept Explorer</h1>
          <p className="text-lg text-muted-foreground">
            Interactive case studies demonstrating how context behavior affects model performance.
            Watch prompt decay and identity drift happen in real-time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {SCENARIOS.map((scenario) => (
            <Card
              key={scenario.id}
              className="flex flex-col bg-card/40 border-border/40 hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setActiveScenarioId(scenario.id)}
              data-testid={`card-scenario-${scenario.id}`}
            >
              <CardHeader>
                <div className="flex items-center gap-2 mb-3">
                  <Badge
                    variant="secondary"
                    className="font-mono text-[10px] uppercase tracking-wider text-primary bg-primary/10"
                  >
                    {scenario.concept}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{scenario.turns.length} turns</span>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {scenario.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">{scenario.tagline}</p>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex-1">{scenario.description}</CardContent>
              <CardFooter className="pt-4 border-t border-border/30">
                <span className="text-sm font-medium text-primary flex items-center gap-2 group-hover:gap-3 transition-all">
                  Play Scenario <ChevronRight className="h-4 w-4" />
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Scenario Player — fills the full viewport,
   controls always visible, no page scroll.
───────────────────────────────────────────── */
function ScenarioPlayer({
  scenario,
  onBack,
  onLoadAnalyze,
}: {
  scenario: Scenario;
  onBack: () => void;
  onLoadAnalyze: () => void;
}) {
  const [turnIndex, setTurnIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [activeSubAgentId, setActiveSubAgentId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const activeTurns = activeSubAgentId
    ? scenario.subAgents?.find((a) => a.id === activeSubAgentId)?.turns || []
    : scenario.turns;

  const identityFile = activeSubAgentId
    ? scenario.subAgents?.find((a) => a.id === activeSubAgentId)?.identityFile
    : scenario.identityFile;

  const currentContext: ContextWindow = scenarioToContextWindow(
    activeTurns,
    identityFile,
    scenario.model,
    turnIndex
  );
  const report = analyzeContext(currentContext);
  const isFinished = turnIndex >= activeTurns.length - 1;

  useEffect(() => {
    let timer: number;
    if (isPlaying && !isFinished) {
      timer = window.setTimeout(() => setTurnIndex((p) => p + 1), 1500 / speed);
    } else if (isFinished && isPlaying) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, turnIndex, speed, isFinished]);

  // Auto-scroll feed to latest turn
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [turnIndex]);

  const scoreGrade =
    report.score >= 85 ? "Excellent" : report.score >= 70 ? "Good" : report.score >= 50 ? "Fair" : report.score >= 30 ? "Poor" : "Critical";

  const scoreStroke =
    report.score >= 85 ? "#22c55e" : report.score >= 70 ? "#84cc16" : report.score >= 50 ? "#eab308" : report.score >= 30 ? "#f97316" : "#ef4444";

  const progressPct = ((turnIndex + 1) / activeTurns.length) * 100;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-border bg-card/50 px-4 py-2.5 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Explore
        </button>
        <div className="w-px h-5 bg-border" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm leading-none truncate">{scenario.name}</h2>
            <Badge variant="outline" className="text-[10px] font-mono uppercase shrink-0 border-primary/30 text-primary/80">
              {scenario.concept}
            </Badge>
          </div>
        </div>

        {/* Sub-agent switcher */}
        {scenario.agentType === "orchestrator" && scenario.subAgents && (
          <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg shrink-0">
            <button
              onClick={() => { setActiveSubAgentId(null); setTurnIndex(0); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeSubAgentId === null ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu className="h-3 w-3" /> Orchestrator
            </button>
            {scenario.subAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => { setActiveSubAgentId(agent.id); setTurnIndex(0); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeSubAgentId === agent.id ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {agent.name}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onLoadAnalyze}
          className="shrink-0 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Open in Analyze
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="shrink-0 h-0.5 bg-muted">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* ── Main content: feed (left) + dashboard (right) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] overflow-hidden">

        {/* LEFT: Scrollable turn feed + locked playback bar */}
        <div className="flex flex-col min-h-0 border-r border-border overflow-hidden">

          {/* Scrollable feed */}
          <div ref={feedRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {identityFile && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rounded-lg border border-violet-500/25 bg-violet-950/20 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 mb-2">
                    System Identity
                  </div>
                  <pre className="text-xs text-violet-200/80 font-mono whitespace-pre-wrap leading-relaxed">{identityFile}</pre>
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {activeTurns.slice(0, turnIndex + 1).map((turn, idx) => {
                const isFailed = !!turn.metadata?.isFailedAttempt;
                const isCurrent = idx === turnIndex;
                const isUser = turn.role === "user";
                const isTool = turn.role === "tool";

                return (
                  <motion.div
                    key={`${activeSubAgentId ?? "main"}-${idx}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed border transition-all ${
                        isCurrent ? "ring-1 ring-primary/40 shadow-lg shadow-primary/5" : ""
                      } ${
                        isUser
                          ? "bg-blue-950/60 border-blue-500/30 text-blue-50"
                          : isTool
                          ? "bg-amber-950/50 border-amber-500/30 text-amber-100 font-mono text-xs"
                          : isFailed
                          ? "bg-red-950/50 border-red-500/40 text-red-100"
                          : "bg-slate-800/60 border-slate-600/30 text-slate-100"
                      }`}
                    >
                      {/* Role label */}
                      <div className={`flex items-center gap-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest ${
                        isUser ? "text-blue-400" : isTool ? "text-amber-400" : isFailed ? "text-red-400" : "text-slate-400"
                      }`}>
                        <span>{isUser ? "User" : isTool ? "Tool Result" : "Assistant"}</span>
                        {isFailed && (
                          <span className="ml-auto px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-bold tracking-wider">
                            FAILED ATTEMPT
                          </span>
                        )}
                        {isCurrent && !isFailed && (
                          <span className="ml-auto text-primary/60 text-[9px] tracking-wider">CURRENT</span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{turn.content}</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isFinished && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mt-4">
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 mb-1">Lesson</div>
                    <h3 className="font-bold text-base text-foreground">{scenario.lessonTitle}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{scenario.lessonBody}</p>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-foreground/70">How to fix this:</div>
                    <ul className="space-y-1.5">
                      {scenario.fixes.map((fix, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm text-muted-foreground">
                          <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={onLoadAnalyze}
                    className="w-full mt-2 py-2 rounded-lg border border-border text-sm hover:bg-muted/50 transition-colors"
                  >
                    Analyze this scenario in detail
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Locked Playback Controls ── always at the bottom */}
          <div className="shrink-0 border-t border-border bg-background/90 backdrop-blur px-5 py-3">
            {/* Turn progress track */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1.5">
                <span>Turn {turnIndex + 1} of {activeTurns.length}</span>
                <span>{activeTurns[turnIndex]?.role?.toUpperCase() ?? ""}</span>
              </div>
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setTurnIndex(Math.max(0, Math.min(activeTurns.length - 1, Math.round(pct * (activeTurns.length - 1)))));
                  setIsPlaying(false);
                }}
              >
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* Transport buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setTurnIndex(0); setIsPlaying(false); }}
                  disabled={turnIndex === 0}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTurnIndex((p) => Math.max(0, p - 1))}
                  disabled={turnIndex === 0}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                  title="Previous"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  disabled={isFinished}
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                    isPlaying ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  } disabled:opacity-30`}
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setTurnIndex((p) => Math.min(activeTurns.length - 1, p + 1))}
                  disabled={isFinished}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
                  title="Next"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Speed */}
              <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                      speed === s ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Live status */}
              {isPlaying && (
                <div className="flex items-center gap-1.5 text-xs text-primary/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Playing
                </div>
              )}
              {isFinished && (
                <div className="text-xs text-muted-foreground">Completed</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Live Dashboard — always visible */}
        <div className="hidden lg:flex flex-col min-h-0 overflow-y-auto bg-card/30 border-l border-border">

          {/* Score display */}
          <div className="p-5 border-b border-border/50 flex items-center gap-5">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" className="stroke-muted fill-none" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="38"
                  className="fill-none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 238.8" }}
                  animate={{ strokeDasharray: `${(report.score / 100) * 238.8} 238.8` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{ stroke: scoreStroke }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-mono font-bold">{report.score}</span>
                <span className="text-[9px] uppercase tracking-widest" style={{ color: scoreStroke }}>{scoreGrade}</span>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {[
                { label: "Efficiency", val: report.breakdown.tokenEfficiency },
                { label: "Recency", val: report.breakdown.recencyDistribution },
                { label: "Identity", val: report.breakdown.identitySurvival },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                    <span>{item.label}</span>
                    <span className="font-mono">{item.val}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: `${item.val}%` }}
                      transition={{ duration: 0.4 }}
                      style={{ backgroundColor: item.val > 70 ? "#22c55e" : item.val > 40 ? "#eab308" : "#ef4444" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Context map */}
          <div className="p-4 border-b border-border/50 space-y-2">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>Context Map</span>
              <span>{currentContext.totalTokens.toLocaleString()} tokens</span>
            </div>
            <div className="h-7 w-full flex rounded-md overflow-hidden ring-1 ring-border/60">
              {currentContext.segments.map((seg, i) => {
                const colors = getSegmentColor(seg.type);
                const widthPct = Math.max(1, (seg.tokenCount / currentContext.totalTokens) * 100);
                return (
                  <motion.div
                    key={seg.id + i}
                    layout
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    className="h-full border-r border-background/40 last:border-0 relative"
                    style={{ backgroundColor: colors.dot, width: `${widthPct}%` }}
                    title={`${seg.label}: ${seg.tokenCount} tokens`}
                  >
                    {seg.metadata?.isFailedAttempt && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {currentContext.segments.map((seg, i) => {
                const colors = getSegmentColor(seg.type);
                const pct = ((seg.tokenCount / currentContext.totalTokens) * 100).toFixed(0);
                return (
                  <div key={seg.id + i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: colors.dot }} />
                    <span className="truncate">{colors.label}</span>
                    <span className="font-mono ml-auto shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Risks */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Active Risks
            </div>
            <AnimatePresence mode="popLayout">
              {report.risks.length === 0 ? (
                <motion.div
                  key="no-risks"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-lg"
                >
                  No risks detected
                </motion.div>
              ) : (
                report.risks.slice(0, 4).map((risk) => (
                  <motion.div
                    key={risk.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3 rounded-lg border border-border/50 bg-background/40 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: risk.severity === "high" ? "#ef4444" : risk.severity === "medium" ? "#f59e0b" : "#6b7280" }}
                      />
                      <span className="text-foreground/90">{risk.title}</span>
                      <span
                        className="ml-auto text-[9px] uppercase font-mono shrink-0"
                        style={{ color: risk.severity === "high" ? "#ef4444" : risk.severity === "medium" ? "#f59e0b" : "#6b7280" }}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{risk.description}</p>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {/* Token economics strip */}
            <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Token Economics</div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Window Used</span>
                <span className="font-mono">
                  {((currentContext.totalTokens / currentContext.modelMaxTokens) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${(currentContext.totalTokens / currentContext.modelMaxTokens) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  style={{
                    backgroundColor:
                      currentContext.totalTokens / currentContext.modelMaxTokens > 0.8
                        ? "#ef4444"
                        : currentContext.totalTokens / currentContext.modelMaxTokens > 0.6
                        ? "#f59e0b"
                        : "#22c55e",
                  }}
                />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                {currentContext.totalTokens.toLocaleString()} / {currentContext.modelMaxTokens.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
