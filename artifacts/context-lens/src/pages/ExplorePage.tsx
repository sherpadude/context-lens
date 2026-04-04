import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCENARIOS, getScenario } from "@/data/scenarios";
import { Scenario, ContextWindow, CompressionStrategy } from "@/types";
import { scenarioToContextWindow } from "@/lib/parser";
import { getSegmentColor } from "@/lib/segmentColors";
import { analyzeContext, scoreColor } from "@/lib/scoring";
import { getAccuracyAt } from "@/lib/niahData";
import { applySlindingWindow, applySummarization, applyHardCompression } from "@/lib/compression";
import { formatTokenCount } from "@/lib/tokenizer";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  Cpu,
  ChevronDown,
  ChevronUp,
  Crosshair,
  TrendingDown,
  Scissors,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PreloadedContext } from "@/App";

interface ExplorePageProps {
  onLoadIntoAnalyze: (ctx: PreloadedContext) => void;
}

export default function ExplorePage({ onLoadIntoAnalyze }: ExplorePageProps) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  if (activeScenarioId) {
    const scenario = getScenario(activeScenarioId);
    if (!scenario) return null;
    return (
      <ScenarioPlayer
        scenario={scenario}
        onBack={() => setActiveScenarioId(null)}
        onLoadAnalyze={onLoadIntoAnalyze}
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
            Watch prompt decay and identity drift happen in real-time — and keep running past the preset turns.
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
                  <span className="text-xs text-muted-foreground ml-auto">
                    {scenario.turns.length + (scenario.continuationTurns?.length ?? 0)} turns total
                  </span>
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

/* ── Score history sparkline ── */
function ScoreSparkline({ history, width = 200, height = 36 }: { history: number[]; width?: number; height?: number }) {
  if (history.length < 2) return null;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = Math.max(max - min, 10);
  const pts = history.map((s, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((s - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const lastScore = history[history.length - 1];
  const color = scoreColor(lastScore);
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      {pts.map((pt, i) => {
        if (i !== 0 && i !== history.length - 1 && i % 3 !== 0) return null;
        const [x, y] = pt.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r={i === history.length - 1 ? 3 : 1.5} fill={color} opacity={0.8} />;
      })}
    </svg>
  );
}

/* ── Needle recall gauge ── */
function NeedleRecall({
  accuracy,
  label,
  shortContent,
  depth,
  contextFill,
}: {
  accuracy: number;
  label: string;
  shortContent: string;
  depth: number;
  contextFill: number;
}) {
  const pct = Math.round(accuracy * 100);
  const color = accuracy >= 0.85 ? "#22c55e" : accuracy >= 0.65 ? "#eab308" : accuracy >= 0.45 ? "#f97316" : "#ef4444";
  const label2 = accuracy >= 0.85 ? "Strong recall" : accuracy >= 0.65 ? "Degraded" : accuracy >= 0.45 ? "Weak" : "Critical";
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Crosshair className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
            Needle in Haystack
          </div>
          <div className="text-[11px] font-medium text-foreground/90 truncate" title={label}>{label}</div>
          <div className="text-[10px] text-muted-foreground truncate italic" title={shortContent}>"{shortContent}"</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
            style={{ backgroundColor: color }}
          />
        </div>
        <span className="font-mono text-[11px] shrink-0" style={{ color }}>{pct}%</span>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
        <span style={{ color }}>{label2}</span>
        <span>depth {Math.round(depth)}% · fill {Math.round(contextFill * 100)}%</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Scenario Player
───────────────────────────────────────────── */
function ScenarioPlayer({
  scenario,
  onBack,
  onLoadAnalyze,
}: {
  scenario: Scenario;
  onBack: () => void;
  onLoadAnalyze: (ctx: PreloadedContext) => void;
}) {
  const [turnIndex, setTurnIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [activeSubAgentId, setActiveSubAgentId] = useState<string | null>(null);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [compressionOpen, setCompressionOpen] = useState(false);
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [compressionStrategy, setCompressionStrategy] = useState<CompressionStrategy>("sliding-window");
  const [slidingWindow, setSlidingWindow] = useState(8);
  const [summarizeTurns, setSummarizeTurns] = useState(8);
  const [hardRatio, setHardRatio] = useState(0.4);
  const feedRef = useRef<HTMLDivElement>(null);

  const activeTurns = useMemo(() => {
    if (activeSubAgentId) {
      return scenario.subAgents?.find((a) => a.id === activeSubAgentId)?.turns || [];
    }
    return [
      ...scenario.turns,
      ...(scenario.continuationTurns || []),
    ];
  }, [activeSubAgentId, scenario]);

  const identityFile = activeSubAgentId
    ? scenario.subAgents?.find((a) => a.id === activeSubAgentId)?.identityFile
    : scenario.identityFile;

  const currentContext: ContextWindow = useMemo(
    () => scenarioToContextWindow(activeTurns, identityFile, scenario.model, turnIndex),
    [activeTurns, identityFile, scenario.model, turnIndex]
  );

  const report = useMemo(() => analyzeContext(currentContext), [currentContext]);

  const compressedContext = useMemo(() => {
    if (!compressionEnabled) return null;
    if (compressionStrategy === "sliding-window")
      return applySlindingWindow(currentContext, slidingWindow);
    if (compressionStrategy === "summarization")
      return applySummarization(currentContext, summarizeTurns);
    return applyHardCompression(currentContext, hardRatio);
  }, [compressionEnabled, compressionStrategy, currentContext, slidingWindow, summarizeTurns, hardRatio]);

  const compressedReport = useMemo(() => {
    if (!compressedContext) return null;
    const ctx: ContextWindow = {
      segments: compressedContext.compressedSegments,
      totalTokens: compressedContext.compressedTokens,
      modelMaxTokens: currentContext.modelMaxTokens,
      model: currentContext.model,
    };
    return analyzeContext(ctx);
  }, [compressedContext, currentContext]);

  const presetEnd = scenario.turns.length - 1;
  const inContinuation = !activeSubAgentId && turnIndex > presetEnd;
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

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [turnIndex]);

  useEffect(() => {
    setScoreHistory((prev) => {
      const next = [...prev];
      next[turnIndex] = report.score;
      return next;
    });
  }, [turnIndex, report.score]);

  useEffect(() => {
    setTurnIndex(0);
    setIsPlaying(false);
    setScoreHistory([]);
  }, [activeSubAgentId]);

  const scoreStroke = scoreColor(report.score);
  const scoreGrade =
    report.score >= 85 ? "Excellent" : report.score >= 70 ? "Good" : report.score >= 50 ? "Fair" : report.score >= 30 ? "Poor" : "Critical";

  const progressPct = ((turnIndex + 1) / activeTurns.length) * 100;

  const needle = scenario.needle && !activeSubAgentId ? scenario.needle : null;
  const needleAccuracy = useMemo(() => {
    if (!needle) return null;
    const needleDepthPct =
      currentContext.totalTokens > 0
        ? Math.min(100, (needle.turnIndex / Math.max(activeTurns.length, 1)) * 100)
        : 0;
    return {
      accuracy: getAccuracyAt(scenario.model, currentContext.totalTokens, needleDepthPct),
      depth: needleDepthPct,
      contextFill: currentContext.totalTokens / currentContext.modelMaxTokens,
    };
  }, [needle, currentContext, activeTurns.length, scenario.model]);

  const trimmedHistory = scoreHistory.filter((s) => s !== undefined);

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
            {inContinuation && (
              <Badge variant="outline" className="text-[10px] font-mono uppercase shrink-0 border-amber-500/40 text-amber-400">
                Extended
              </Badge>
            )}
          </div>
        </div>

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
          onClick={() => {
            const turns = activeTurns.slice(0, turnIndex + 1);
            const messages = turns.map((t) => ({ role: t.role, content: t.content }));
            onLoadAnalyze({
              input: JSON.stringify(messages, null, 2),
              model: scenario.model,
              label: scenario.name,
            });
          }}
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

            {/* Preset / continuation divider */}
            {!activeSubAgentId && scenario.continuationTurns && scenario.continuationTurns.length > 0 && turnIndex >= presetEnd && (
              <AnimatePresence>
                {turnIndex >= presetEnd && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    className="flex items-center gap-3 my-1"
                  >
                    <div className="flex-1 h-px bg-amber-500/30" />
                    <span className="text-[10px] font-mono text-amber-400/70 uppercase tracking-widest shrink-0">
                      ↓ extended — scenario continues
                    </span>
                    <div className="flex-1 h-px bg-amber-500/30" />
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            <AnimatePresence initial={false}>
              {activeTurns.slice(0, turnIndex + 1).map((turn, idx) => {
                const isFailed = !!turn.metadata?.isFailedAttempt;
                const isCurrent = idx === turnIndex;
                const isUser = turn.role === "user";
                const isTool = turn.role === "tool";
                const isContinuation = !activeSubAgentId && idx > presetEnd;

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
                          : isContinuation
                          ? "bg-slate-900/70 border-amber-500/10 text-slate-100"
                          : "bg-slate-800/60 border-slate-600/30 text-slate-100"
                      }`}
                    >
                      <div className={`flex items-center gap-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest ${
                        isUser ? "text-blue-400" : isTool ? "text-amber-400" : isFailed ? "text-red-400" : isContinuation ? "text-amber-400/60" : "text-slate-400"
                      }`}>
                        <span>{isUser ? "User" : isTool ? "Tool Result" : "Assistant"}</span>
                        {isFailed && (
                          <span className="ml-auto px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-bold tracking-wider">
                            FAILED ATTEMPT
                          </span>
                        )}
                        {isContinuation && !isFailed && (
                          <span className="ml-auto text-amber-400/40 text-[9px] tracking-wider">EXT</span>
                        )}
                        {isCurrent && !isFailed && !isContinuation && (
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
                    onClick={() => {
                      const turns = activeTurns.slice(0, turnIndex + 1);
                      const messages = turns.map((t) => ({ role: t.role, content: t.content }));
                      onLoadAnalyze({ input: JSON.stringify(messages, null, 2), model: scenario.model, label: scenario.name });
                    }}
                    className="w-full mt-2 py-2 rounded-lg border border-border text-sm hover:bg-muted/50 transition-colors"
                  >
                    Analyze this scenario in detail
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Locked Playback Controls ── */}
          <div className="shrink-0 border-t border-border bg-background/90 backdrop-blur px-5 py-3">
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1.5">
                <span>
                  Turn {turnIndex + 1} of {activeTurns.length}
                  {inContinuation && (
                    <span className="ml-2 text-amber-400/70">
                      +{turnIndex - presetEnd} extended
                    </span>
                  )}
                </span>
                <span>{activeTurns[turnIndex]?.role?.toUpperCase() ?? ""}</span>
              </div>
              <div
                className="relative h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setTurnIndex(Math.max(0, Math.min(activeTurns.length - 1, Math.round(pct * (activeTurns.length - 1)))));
                  setIsPlaying(false);
                }}
              >
                {/* Preset section marker */}
                {!activeSubAgentId && scenario.continuationTurns?.length && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-amber-500/40 z-10"
                    style={{ left: `${((presetEnd + 1) / activeTurns.length) * 100}%` }}
                  />
                )}
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
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
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

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

              {isPlaying && (
                <div className="flex items-center gap-1.5 text-xs text-primary/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Playing
                </div>
              )}
              {isFinished && <div className="text-xs text-muted-foreground">Completed</div>}
            </div>
          </div>
        </div>

        {/* RIGHT: Live Dashboard */}
        <div className="hidden lg:flex flex-col min-h-0 overflow-y-auto bg-card/30 border-l border-border">

          {/* Score + breakdown */}
          <div className="p-5 border-b border-border/50 flex items-start gap-4">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
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
                <span className="text-xl font-mono font-bold">{report.score}</span>
                <span className="text-[8px] uppercase tracking-widest" style={{ color: scoreStroke }}>{scoreGrade}</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              {[
                { label: "Efficiency", val: report.breakdown.tokenEfficiency },
                { label: "Recency", val: report.breakdown.recencyDistribution },
                { label: "Identity", val: report.breakdown.identitySurvival },
                { label: "Poison", val: report.breakdown.poisonRisk },
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

          {/* Score trend sparkline */}
          {trimmedHistory.length >= 2 && (
            <div className="px-5 pt-4 pb-3 border-b border-border/50 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="h-3 w-3" /> Score Trend
                </span>
                <span className="font-mono normal-case">
                  {trimmedHistory.length > 1
                    ? `${trimmedHistory[0]} → ${trimmedHistory[trimmedHistory.length - 1]}`
                    : ""}
                </span>
              </div>
              <div className="w-full">
                <ScoreSparkline history={trimmedHistory} width={320} height={36} />
              </div>
            </div>
          )}

          {/* Needle in haystack */}
          {needle && needleAccuracy && (
            <div className="px-5 pt-4 pb-3 border-b border-border/50">
              <NeedleRecall
                accuracy={needleAccuracy.accuracy}
                label={needle.label}
                shortContent={needle.shortContent}
                depth={needleAccuracy.depth}
                contextFill={needleAccuracy.contextFill}
              />
            </div>
          )}

          {/* Context map */}
          <div className="p-4 border-b border-border/50 space-y-2">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>Context Map</span>
              <span>{formatTokenCount(currentContext.totalTokens)}</span>
            </div>
            <div className="h-6 w-full flex rounded-md overflow-hidden ring-1 ring-border/60">
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
                    title={`${seg.label}: ${formatTokenCount(seg.tokenCount)}`}
                  >
                    {seg.metadata?.isFailedAttempt && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-white/70 animate-pulse" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
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

          {/* Compression Lab */}
          <div className="border-b border-border/50">
            <button
              onClick={() => setCompressionOpen((p) => !p)}
              className="w-full flex items-center justify-between px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Scissors className="h-3 w-3" /> Compression Lab
              </span>
              <div className="flex items-center gap-2">
                {compressionEnabled && compressedReport && (
                  <span
                    className="font-mono normal-case text-[11px]"
                    style={{ color: compressedReport.score > report.score ? "#22c55e" : "#f97316" }}
                  >
                    {compressedReport.score > report.score ? "+" : ""}{compressedReport.score - report.score} pts
                  </span>
                )}
                {compressionOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
            </button>

            <AnimatePresence>
              {compressionOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Enable compression</Label>
                      <Switch checked={compressionEnabled} onCheckedChange={setCompressionEnabled} />
                    </div>

                    {compressionEnabled && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Strategy</Label>
                          <Select value={compressionStrategy} onValueChange={(v) => setCompressionStrategy(v as CompressionStrategy)}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sliding-window">Sliding Window</SelectItem>
                              <SelectItem value="summarization">Summarization</SelectItem>
                              <SelectItem value="hard-compression">Hard Compression</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {compressionStrategy === "sliding-window" && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Keep last N turns</span>
                              <span className="font-mono">{slidingWindow}</span>
                            </div>
                            <Slider value={[slidingWindow]} onValueChange={(v) => setSlidingWindow(v[0])} min={2} max={20} step={1} className="[&_[role=slider]]:bg-blue-500" />
                          </div>
                        )}
                        {compressionStrategy === "summarization" && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Summarize older than turn</span>
                              <span className="font-mono">{summarizeTurns}</span>
                            </div>
                            <Slider value={[summarizeTurns]} onValueChange={(v) => setSummarizeTurns(v[0])} min={2} max={20} step={1} className="[&_[role=slider]]:bg-purple-500" />
                          </div>
                        )}
                        {compressionStrategy === "hard-compression" && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Compression ratio</span>
                              <span className="font-mono">{Math.round(hardRatio * 100)}%</span>
                            </div>
                            <Slider value={[hardRatio * 100]} onValueChange={(v) => setHardRatio(v[0] / 100)} min={10} max={80} step={5} className="[&_[role=slider]]:bg-amber-500" />
                          </div>
                        )}

                        {compressedContext && compressedReport && (
                          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                              <div className="text-muted-foreground">Tokens</div>
                              <div className="font-mono text-right">
                                {formatTokenCount(compressedContext.compressedTokens)}{" "}
                                <span className="text-green-400">−{compressedContext.savingsPercent}%</span>
                              </div>
                              <div className="text-muted-foreground">Score</div>
                              <div className="font-mono text-right">
                                <span style={{ color: scoreColor(compressedReport.score) }}>{compressedReport.score}</span>
                                {" "}
                                <span style={{ color: compressedReport.score > report.score ? "#22c55e" : "#f97316" }}>
                                  ({compressedReport.score > report.score ? "+" : ""}{compressedReport.score - report.score})
                                </span>
                              </div>
                              <div className="text-muted-foreground">Quality Est.</div>
                              <div className="font-mono text-right">{compressedContext.estimatedQualityRetention}%</div>
                            </div>
                            <div className="h-3 w-full flex rounded overflow-hidden ring-1 ring-border/40 mt-1">
                              {compressedContext.compressedSegments.map((seg, i) => {
                                const colors = getSegmentColor(seg.type);
                                const widthPct = Math.max(1, (seg.tokenCount / compressedContext.compressedTokens) * 100);
                                return (
                                  <div
                                    key={seg.id + i}
                                    className="h-full"
                                    style={{ backgroundColor: colors.dot, width: `${widthPct}%` }}
                                    title={`${seg.label}: ${formatTokenCount(seg.tokenCount)}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

            {/* Token economics */}
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
                {formatTokenCount(currentContext.totalTokens)} / {formatTokenCount(currentContext.modelMaxTokens)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
