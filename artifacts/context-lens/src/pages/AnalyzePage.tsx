import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SCENARIOS, SAMPLE_PROMPT_JSON } from "@/data/scenarios";
import { MODEL_LIST } from "@/lib/models";
import { ModelId, HealthReport, ScoreHistoryEntry } from "@/types";
import { parseInput } from "@/lib/parser";
import { analyzeContext } from "@/lib/scoring";
import {
  Upload, Activity, AlertTriangle, AlertCircle, FileWarning,
  Zap, ListChecks, CheckCircle2, Save, Copy, ArrowLeft, FileJson, Github
} from "lucide-react";
import { formatTokenCount, formatCost, estimateCost } from "@/lib/tokenizer";
import { getSegmentColor } from "@/lib/segmentColors";
import { saveToHistory, loadHistory } from "@/lib/history";
import { useToast } from "@/hooks/use-toast";
import type { PreloadedContext } from "@/App";
import { encodeShareURL, exportReportPNG } from "@/lib/share";
import { Link2, ImageDown } from "lucide-react";

interface AnalyzePageProps {
  onNavigateToExplore: () => void;
  preloadedContext?: PreloadedContext | null;
  onPreloadConsumed?: () => void;
  onReportChange?: (report: HealthReport | null) => void;
}

export default function AnalyzePage({ onNavigateToExplore, preloadedContext, onPreloadConsumed, onReportChange }: AnalyzePageProps) {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ModelId>("gpt4o");
  const [report, setReport] = useState<HealthReport | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [historyBest, setHistoryBest] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const applyReport = (r: HealthReport | null) => {
    setReport(r);
    onReportChange?.(r);
    // Auto-persist each analysis to local history (capped at 10 internally)
    if (r) {
      const label = `${r.context.totalTokens.toLocaleString()} tok · ${r.context.segments.length} segs`;
      saveToHistory(r, label);
      // Update historyBest after saving
      const entries = loadHistory();
      if (entries.length >= 2) {
        const best = Math.max(...entries.map((e: ScoreHistoryEntry) => e.score));
        setHistoryBest(best);
      }
    }
  };

  // Auto-load and analyze when a preloaded context arrives (e.g. from Explore)
  useEffect(() => {
    if (preloadedContext) {
      setInput(preloadedContext.input);
      setModel(preloadedContext.model);
      applyReport(null);
      // Auto-analyze on next tick so state is settled
      setTimeout(() => {
        const ctx = parseInput(preloadedContext.input, preloadedContext.model);
        applyReport(analyzeContext(ctx));
      }, 50);
      onPreloadConsumed?.();
    }
  }, [preloadedContext]);

  const handleAnalyze = () => {
    if (!input.trim()) return;
    const ctx = parseInput(input, model);
    applyReport(analyzeContext(ctx));
  };

  /** Serialize a scenario's turns to OpenAI-format JSON and analyze it */
  const handleLoadScenario = (scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    const messages = scenario.turns.map(t => ({ role: t.role, content: t.content }));
    const json = JSON.stringify(messages, null, 2);
    const scenarioModel = scenario.model ?? "gpt4o";
    setInput(json);
    setModel(scenarioModel);
    applyReport(null);
    const ctx = parseInput(json, scenarioModel);
    applyReport(analyzeContext(ctx));
  };

  /** Read a .txt / .json / .jsonl file and load its content into the textarea */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInput(text);
      setReport(null);
      toast({ title: "File Loaded", description: `${file.name} — click Analyze to process.` });
    };
    reader.readAsText(file);
    // reset so same file can be re-uploaded
    e.target.value = "";
  };

  const copyReport = () => {
    if (!report) return;
    const lines: string[] = [
      `ContextLens Context Health Report`,
      `Score: ${report.score}/100 (${report.scoreLabel})`,
      `Model: ${report.context.model}`,
      `Tokens: ${report.context.totalTokens} / ${report.context.modelMaxTokens} (${((report.context.totalTokens / report.context.modelMaxTokens) * 100).toFixed(1)}% of window)`,
      ``,
      `Sub-scores:`,
      `  Token Efficiency:    ${report.breakdown.tokenEfficiency}`,
      `  Recency Dist.:       ${report.breakdown.recencyDistribution}`,
      `  Identity Survival:   ${report.breakdown.identitySurvival}`,
      `  Poison Risk:         ${report.breakdown.poisonRisk}`,
      `  Compressibility:     ${report.breakdown.compressionOpportunity}`,
      ``,
      `Risks (${report.risks.length}):`,
      ...report.risks.map(r => `  [${r.severity.toUpperCase()}] ${r.title}`),
      ``,
      `Top Recommendations:`,
      ...report.recommendations.slice(0, 3).map((r, i) => `  ${i + 1}. ${r.title} (+${r.estimatedScoreGain} pts)`),
      ``,
      `Cost per turn: GPT-4o ${formatCost(estimateCost(report.context.totalTokens, "gpt4o"))} | Claude 3.5 ${formatCost(estimateCost(report.context.totalTokens, "claude35"))}`,
      ``,
      `Generated by ContextLens — https://github.com/sherpadude/context-lens`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Report Copied", description: "Full report copied to clipboard." });
  };

  const saveReport = () => {
    if (!report) return;
    const label = `${report.context.totalTokens} tok · ${report.context.segments.length} segs`;
    saveToHistory(report, label);
    toast({ title: "Saved to History", description: "Report saved locally." });
  };

  const GITHUB_REPO_URL = "https://github.com/sherpadude/context-lens";

  const copyRepoLink = () => {
    navigator.clipboard.writeText(GITHUB_REPO_URL);
    toast({ title: "Copied!", description: "GitHub repo URL copied to clipboard." });
  };

  /* ─── Empty/Input State ─── */
  if (!report) {
    return (
      <div className="container max-w-5xl py-10 px-4 md:px-6 flex flex-col gap-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Context Window Observatory</h1>
          <p className="text-lg text-muted-foreground">
            Analyze prompt decay, identity drift, and token economics. Paste your context below to get a spatial health report.
          </p>
          {/* GitHub repo link */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="font-mono">{GITHUB_REPO_URL.replace("https://", "")}</span>
            </a>
            <button
              onClick={copyRepoLink}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Copy repo URL"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6 md:p-8 space-y-5">
            <Textarea
              placeholder="Paste plain text, OpenAI messages array, Anthropic format JSON, or JSONL conversation..."
              className="min-h-[200px] font-mono text-sm resize-none bg-background border-dashed focus-visible:ring-primary/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              data-testid="input-context"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Select value={model} onValueChange={(v) => setModel(v as ModelId)}>
                  <SelectTrigger className="w-[180px] bg-background" data-testid="select-model">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_LIST.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({formatTokenCount(m.maxTokens)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* File Upload — actually reads the file */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.json,.jsonl,.md"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-background"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload"
                >
                  <Upload className="h-4 w-4" /> Upload File
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={() => setInput(SAMPLE_PROMPT_JSON)}
                  data-testid="button-load-json-example"
                >
                  <FileJson className="h-3.5 w-3.5" /> JSON Example
                </Button>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!input.trim()}
                className="w-full sm:w-auto gap-2"
                size="lg"
                data-testid="button-analyze"
              >
                <Activity className="h-4 w-4" /> Analyze Context
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Load Sample Scenarios — actually loads into Analyze */}
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Load Sample Scenarios</h2>
            <p className="text-sm text-muted-foreground mt-1">Click any scenario to instantly analyze it — no copy-paste needed.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {SCENARIOS.map((scenario) => (
              <Card
                key={scenario.id}
                className="flex flex-col bg-card/40 border-border/40 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => handleLoadScenario(scenario.id)}
                data-testid={`button-load-sample-${scenario.id}`}
              >
                <CardHeader className="pb-3">
                  <Badge
                    variant="outline"
                    className="w-fit font-mono text-[10px] uppercase tracking-wider text-muted-foreground border-border/50 mb-2"
                  >
                    {scenario.concept}
                  </Badge>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">{scenario.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{scenario.tagline}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto pt-3 border-t border-border/30">
                  <span className="text-xs font-medium text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                    <Activity className="h-3.5 w-3.5" /> Analyze this scenario
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Report View ─── */
  const scoreStroke =
    report.score >= 85 ? "#22c55e" :
    report.score >= 70 ? "#84cc16" :
    report.score >= 50 ? "#eab308" :
    report.score >= 30 ? "#f97316" : "#ef4444";

  const scoreTextColor =
    report.score >= 85 ? "text-green-400" :
    report.score >= 70 ? "text-lime-400" :
    report.score >= 50 ? "text-yellow-400" :
    report.score >= 30 ? "text-orange-400" : "text-red-400";

  const getRiskIcon = (severity: string) => {
    if (severity === "high") return <AlertTriangle className="h-5 w-5 text-red-400" />;
    if (severity === "medium") return <FileWarning className="h-5 w-5 text-amber-400" />;
    return <AlertCircle className="h-5 w-5 text-slate-400" />;
  };

  const getRiskClasses = (severity: string) => {
    if (severity === "high") return "border-red-500/30 bg-red-950/20";
    if (severity === "medium") return "border-amber-500/30 bg-amber-950/20";
    return "border-slate-600/30 bg-slate-900/20";
  };

  const avgTokensPerTurn = report.context.totalTokens / Math.max(1, report.context.segments.length);
  const turnProjections = [20, 50, 100].map(turns => ({
    turns,
    cost: estimateCost(report.context.totalTokens + avgTokensPerTurn * turns, report.context.model),
  }));

  return (
    <div className="container max-w-[1400px] py-6 px-4 md:px-6">
      {/* Report Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => applyReport(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="w-px h-5 bg-border" />
          <h1 className="text-xl font-bold tracking-tight">Context Health Report</h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline" size="sm"
            onClick={() => {
              const url = encodeShareURL(input, model);
              navigator.clipboard.writeText(url);
              toast({ title: "Share Link Copied", description: "Anyone with this link can load and analyze the same context." });
            }}
            className="gap-1.5 text-xs"
            data-testid="button-share-report"
          >
            <Link2 className="h-3.5 w-3.5" /> Share Link
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => { exportReportPNG(report); toast({ title: "Exporting PNG…", description: "Your report image will download shortly." }); }}
            className="gap-1.5 text-xs"
            data-testid="button-export-png"
          >
            <ImageDown className="h-3.5 w-3.5" /> Export PNG
          </Button>
          <Button variant="outline" size="sm" onClick={copyReport} className="gap-1.5 text-xs" data-testid="button-copy-report">
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={saveReport} className="gap-1.5 text-xs" data-testid="button-save-report">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      {/* Beat Your Score banner */}
      {historyBest !== null && (
        <div className={`mb-6 px-4 py-3 rounded-lg border text-sm flex items-center gap-3 ${
          report.score > historyBest
            ? "border-green-500/30 bg-green-950/20 text-green-300"
            : report.score === historyBest
            ? "border-blue-500/30 bg-blue-950/20 text-blue-300"
            : "border-amber-500/20 bg-amber-950/10 text-amber-300/80"
        }`}
          data-testid="beat-your-score-banner"
        >
          {report.score > historyBest ? (
            <>
              <span className="text-lg">🏆</span>
              <span><strong>New personal best!</strong> You beat your previous best of {historyBest} — great optimization.</span>
            </>
          ) : report.score === historyBest ? (
            <>
              <span className="text-lg">🎯</span>
              <span>Matched your best score of <strong>{historyBest}</strong>. Follow the recommendations to push further.</span>
            </>
          ) : (
            <>
              <span className="text-lg">🎯</span>
              <span>Your personal best is <strong>{historyBest}</strong>. Apply the recommendations below to beat it.</span>
            </>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">

        {/* Left: Score Panel */}
        <div className="flex flex-col gap-5">
          <Card className="border-border/50 bg-card overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="relative w-44 h-44 flex items-center justify-center mb-5">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" strokeWidth="7" strokeLinecap="round"
                    style={{
                      stroke: scoreStroke,
                      strokeDasharray: `${(report.score / 100) * 251.2} 251.2`,
                      transition: "stroke-dasharray 1s ease-out",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-mono font-bold tracking-tighter">{report.score}</span>
                  <span className={`text-xs font-semibold uppercase tracking-widest mt-1 ${scoreTextColor}`}>
                    {report.scoreLabel}
                  </span>
                </div>
              </div>

              <div className="w-full space-y-3">
                {[
                  { label: "Token Efficiency", val: report.breakdown.tokenEfficiency },
                  { label: "Recency Dist.", val: report.breakdown.recencyDistribution },
                  { label: "Identity Survival", val: report.breakdown.identitySurvival },
                  { label: "Poison Risk", val: report.breakdown.poisonRisk },
                  { label: "Compressibility", val: report.breakdown.compressionOpportunity },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.label}</span>
                      <span className="font-mono">{item.val}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.val}%`,
                          backgroundColor: item.val > 70 ? "#22c55e" : item.val > 40 ? "#eab308" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Token Economics */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" /> Token Economics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-mono">{formatTokenCount(report.context.totalTokens)}</div>
                  <div className="text-[11px] text-muted-foreground">Total Tokens</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono">
                    {((report.context.totalTokens / report.context.modelMaxTokens) * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-muted-foreground">of Window</div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(report.context.totalTokens / report.context.modelMaxTokens) * 100}%`,
                    backgroundColor:
                      report.context.totalTokens / report.context.modelMaxTokens > 0.8 ? "#ef4444" :
                      report.context.totalTokens / report.context.modelMaxTokens > 0.6 ? "#f59e0b" : "#22c55e",
                  }}
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <div className="text-[11px] text-muted-foreground mb-2">Cost per turn (input only)</div>
                {(["gpt4o", "claude35", "gemini25"] as const).map((mid) => (
                  <div key={mid} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{mid === "gpt4o" ? "GPT-4o" : mid === "claude35" ? "Claude 3.5" : "Gemini 2.5"}</span>
                    <span className="font-mono">{formatCost(estimateCost(report.context.totalTokens, mid))}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <div className="text-[11px] text-muted-foreground mb-2">Projected cost for {report.context.model === "gpt4o" ? "GPT-4o" : report.context.model}</div>
                {turnProjections.map(({ turns, cost }) => (
                  <div key={turns} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{turns} turns</span>
                    <span className="font-mono">{formatCost(cost)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Visualizations */}
        <div className="flex flex-col gap-6">

          {/* Spatial Map */}
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle className="text-base">Spatial Context Map</CardTitle>
              <CardDescription className="text-xs">Click a segment to inspect its content</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-14 w-full flex rounded-lg overflow-hidden ring-1 ring-border/60">
                {report.context.segments.map((seg) => {
                  const colors = getSegmentColor(seg.type);
                  const widthPct = Math.max(0.5, (seg.tokenCount / report.context.totalTokens) * 100);
                  const isActive = activeSegmentId === seg.id;
                  return (
                    <div
                      key={seg.id}
                      className="h-full transition-all cursor-pointer relative border-r border-background/20 last:border-0 hover:brightness-125"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: colors.dot,
                        opacity: isActive || !activeSegmentId ? 1 : 0.35,
                      }}
                      onClick={() => setActiveSegmentId(isActive ? null : seg.id)}
                      title={`${seg.label} (${seg.tokenCount} tokens)`}
                    >
                      {seg.metadata?.isFailedAttempt && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Segment legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {report.context.segments.map((seg) => {
                  const colors = getSegmentColor(seg.type);
                  return (
                    <div key={seg.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => setActiveSegmentId(activeSegmentId === seg.id ? null : seg.id)}>
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: colors.dot }} />
                      <span>{colors.label}</span>
                      <span className="font-mono opacity-60">{seg.tokenCount}</span>
                    </div>
                  );
                })}
              </div>

              {/* Segment detail panel */}
              {activeSegmentId && (() => {
                const seg = report.context.segments.find(s => s.id === activeSegmentId);
                if (!seg) return null;
                const colors = getSegmentColor(seg.type);
                return (
                  <div className="mt-4 rounded-lg border border-border bg-muted/20 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors.dot }} />
                        <span className="text-sm font-medium">{seg.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{seg.tokenCount} tokens</span>
                      </div>
                      {seg.metadata?.isFailedAttempt && (
                        <Badge variant="destructive" className="text-[10px]">Failed Attempt</Badge>
                      )}
                    </div>
                    <pre className="p-4 font-mono text-xs text-muted-foreground max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {seg.content}
                    </pre>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Risks */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Risk Factors
                <span className="text-xs font-normal text-muted-foreground ml-1">({report.risks.length})</span>
              </h3>
              {report.risks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-6 rounded-lg border border-dashed border-border/50 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500/40" />
                  <span className="text-sm text-muted-foreground">No significant risks detected.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {report.risks.map((risk) => (
                    <div
                      key={risk.id}
                      className={`p-4 rounded-lg border flex gap-3 items-start ${getRiskClasses(risk.severity)}`}
                      onMouseEnter={() => risk.affectedSegmentIds?.[0] && setActiveSegmentId(risk.affectedSegmentIds[0])}
                      onMouseLeave={() => setActiveSegmentId(null)}
                    >
                      <div className="shrink-0 mt-0.5">{getRiskIcon(risk.severity)}</div>
                      <div className="space-y-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{risk.title}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">{risk.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                Recommendations
              </h3>
              <div className="flex flex-col gap-3">
                {report.recommendations.map((rec, i) => (
                  <div key={rec.id} className="rounded-lg border border-border/50 bg-card/50 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: scoreStroke }} />
                    <div className="p-4 pl-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-mono text-muted-foreground shrink-0">
                            {i + 1}
                          </span>
                          <span>{rec.title}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-7">{rec.description}</p>
                      <div className="flex items-center gap-2 pl-7">
                        <Badge variant="secondary" className="text-[10px] font-mono capitalize px-1.5 py-0">
                          {rec.action}
                        </Badge>
                        <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                          +{rec.estimatedScoreGain} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
