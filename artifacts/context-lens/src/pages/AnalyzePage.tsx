import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  FEATURED_SCENARIOS, 
  SAMPLE_PROMPT_JSON 
} from "@/data/scenarios";
import { MODEL_LIST } from "@/lib/models";
import { ModelId, HealthReport } from "@/types";
import { parseInput } from "@/lib/parser";
import { analyzeContext } from "@/lib/scoring";
import { Upload, ArrowRight, Activity, AlertTriangle, AlertCircle, FileWarning, Zap, ListChecks, CheckCircle2, ChevronRight, Save, Copy } from "lucide-react";
import { formatTokenCount, formatCost, projectTurnCost, estimateCost } from "@/lib/tokenizer";
import { getSegmentColor } from "@/lib/segmentColors";
import { saveToHistory } from "@/lib/history";
import { useToast } from "@/hooks/use-toast";

interface AnalyzePageProps {
  onNavigateToExplore: () => void;
}

export default function AnalyzePage({ onNavigateToExplore }: AnalyzePageProps) {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ModelId>("gpt4o");
  const [report, setReport] = useState<HealthReport | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = () => {
    if (!input.trim()) return;
    const window = parseInput(input, model);
    if (!window) return; // Add error handling in a real app
    
    const analysis = analyzeContext(window);
    setReport(analysis);
  };

  const handleLoadSample = (scenarioId: string) => {
    onNavigateToExplore();
    // In a fuller implementation, this could also load it into Analyze mode directly
  };

  const copyReport = () => {
    if (!report) return;
    const summary = `ContextLens Report
Score: ${report.score}/100 (${report.scoreLabel})
Tokens: ${report.context.totalTokens} / ${report.context.modelMaxTokens}
Risks: ${report.risks.length} detected
Top Rec: ${report.recommendations[0]?.title || "None"}`;
    navigator.clipboard.writeText(summary);
    toast({ title: "Report Copied", description: "Summary copied to clipboard." });
  };

  const saveReport = () => {
    if (!report) return;
    saveToHistory(report, `Analysis: ${report.context.totalTokens} tokens`);
    toast({ title: "Report Saved", description: "Saved to your local history." });
  };

  if (!report) {
    return (
      <div className="container max-w-5xl py-10 px-4 md:px-6 flex flex-col gap-10">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Context Window Observatory</h1>
          <p className="text-lg text-muted-foreground">
            Analyze prompt decay, identity drift, and token economics. Paste your context below to get a spatial health report.
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6 md:p-8 space-y-6">
            <Textarea
              placeholder="Paste your prompt, conversation JSON, or OpenAI messages array..."
              className="min-h-[240px] font-mono text-sm resize-none bg-background border-dashed focus-visible:ring-primary/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              data-testid="input-context"
            />
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
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

                <Button variant="outline" size="icon" title="Upload File" className="shrink-0 bg-background" data-testid="button-upload">
                  <Upload className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setInput(SAMPLE_PROMPT_JSON)}
                >
                  Load JSON Example
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

        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Load Sample Scenarios</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURED_SCENARIOS.map((scenario) => (
              <Card key={scenario.id} className="flex flex-col bg-card/40 border-border/40 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border-border/50">
                      {scenario.concept}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{scenario.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{scenario.tagline}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto pt-4">
                  <Button 
                    variant="secondary" 
                    className="w-full gap-2 group" 
                    onClick={() => handleLoadSample(scenario.id)}
                    data-testid={`button-load-sample-${scenario.id}`}
                  >
                    Explore Demo <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Report View
  const scoreColors = {
    excellent: "text-green-500",
    good: "text-lime-500",
    fair: "text-yellow-500",
    poor: "text-orange-500",
    critical: "text-red-500",
  };

  const getRiskIcon = (severity: string) => {
    switch(severity) {
      case "high": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "medium": return <FileWarning className="h-5 w-5 text-amber-500" />;
      default: return <AlertCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getRiskBorder = (severity: string) => {
    switch(severity) {
      case "high": return "border-red-500/30 bg-red-500/5";
      case "medium": return "border-amber-500/30 bg-amber-500/5";
      default: return "border-slate-500/30 bg-slate-500/5";
    }
  };

  return (
    <div className="container max-w-[1400px] py-6 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setReport(null)} className="text-muted-foreground">
            ← Back to Input
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Context Health Report</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyReport} className="gap-2">
            <Copy className="h-4 w-4" /> Copy Summary
          </Button>
          <Button variant="outline" size="sm" onClick={saveReport} className="gap-2">
            <Save className="h-4 w-4" /> Save Report
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6 xl:gap-8 items-start">
        {/* Left Column: Score & Summary */}
        <div className="flex flex-col gap-6">
          <Card className="border-border/50 bg-card overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="relative w-48 h-48 flex items-center justify-center mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-muted fill-none stroke-[8]" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="fill-none stroke-[8] transition-all duration-1000 ease-out" 
                    style={{ 
                      stroke: `var(--color-${scoreColors[report.scoreLabel].split('-')[1]}-500, currentColor)`,
                      strokeDasharray: `${(report.score / 100) * 251.2} 251.2`,
                      color: report.score >= 85 ? '#22c55e' : report.score >= 70 ? '#84cc16' : report.score >= 50 ? '#eab308' : report.score >= 30 ? '#f97316' : '#ef4444'
                    }} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-mono font-bold tracking-tighter">{report.score}</span>
                  <span className={`text-sm font-semibold uppercase tracking-widest mt-1 ${scoreColors[report.scoreLabel]}`}>
                    {report.scoreLabel}
                  </span>
                </div>
              </div>
              
              <div className="w-full space-y-3 mt-4">
                {[
                  { label: "Token Efficiency", val: report.breakdown.tokenEfficiency },
                  { label: "Recency Dist.", val: report.breakdown.recencyDistribution },
                  { label: "Identity Survival", val: report.breakdown.identitySurvival },
                  { label: "Poison Risk", val: report.breakdown.poisonRisk },
                  { label: "Compressibility", val: report.breakdown.compressionOpportunity }
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.label}</span>
                      <span className="font-mono">{item.val}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-primary/60" 
                        style={{ width: `${item.val}%`, backgroundColor: item.val > 70 ? '#22c55e' : item.val > 40 ? '#eab308' : '#ef4444' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4" /> Token Economics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-mono">{formatTokenCount(report.context.totalTokens)}</div>
                  <div className="text-xs text-muted-foreground">Total Tokens Used</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono">{((report.context.totalTokens / report.context.modelMaxTokens) * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">of Window Capacity</div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-3">Estimated Cost per Turn</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-500">GPT-4o</span>
                    <span className="font-mono">{formatCost(estimateCost(report.context.totalTokens, "gpt4o"))}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-500">Claude 3.5</span>
                    <span className="font-mono">{formatCost(estimateCost(report.context.totalTokens, "claude35"))}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-500">Gemini 2.5</span>
                    <span className="font-mono">{formatCost(estimateCost(report.context.totalTokens, "gemini25"))}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Visualization & Details */}
        <div className="flex flex-col gap-6">
          
          {/* Spatial Map */}
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">Spatial Context Map</CardTitle>
              <CardDescription>Hover or click segments to inspect structure</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-16 w-full flex rounded-md overflow-hidden ring-1 ring-border shadow-inner">
                {report.context.segments.map((seg) => {
                  const colors = getSegmentColor(seg.type);
                  const widthPct = Math.max(0.5, (seg.tokenCount / report.context.totalTokens) * 100);
                  const isActive = activeSegmentId === seg.id;
                  
                  return (
                    <div
                      key={seg.id}
                      className="h-full transition-all cursor-pointer relative group border-r border-background/20 last:border-0 hover:brightness-125"
                      style={{ 
                        width: `${widthPct}%`, 
                        backgroundColor: colors.dot,
                        opacity: isActive || !activeSegmentId ? 1 : 0.4 
                      }}
                      onClick={() => setActiveSegmentId(isActive ? null : seg.id)}
                      title={`${seg.label} (${seg.tokenCount} tokens)`}
                    >
                      {seg.metadata?.isFailedAttempt && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse m-1" />
                      )}
                    </div>
                  );
                })}
              </div>

              {activeSegmentId && (
                <div className="mt-6 p-4 rounded-md border border-border bg-muted/20 text-sm animate-in slide-in-from-top-2">
                  {(() => {
                    const seg = report.context.segments.find(s => s.id === activeSegmentId);
                    if (!seg) return null;
                    const colors = getSegmentColor(seg.type);
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.dot }} />
                            <span className="font-semibold text-foreground">{seg.label}</span>
                            <Badge variant="outline" className="font-mono text-[10px] uppercase">
                              {seg.tokenCount} tokens
                            </Badge>
                          </div>
                          {seg.metadata?.isFailedAttempt && (
                            <Badge variant="destructive" className="uppercase text-[10px]">Failed Attempt</Badge>
                          )}
                        </div>
                        <div className="p-3 bg-background rounded border border-border/50 font-mono text-xs text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {seg.content}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Risks */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" /> 
                Risk Factors ({report.risks.length})
              </h3>
              
              {report.risks.length === 0 ? (
                <Card className="border-dashed border-border bg-transparent">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                    No significant risks detected in this context window.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {report.risks.map(risk => (
                    <div 
                      key={risk.id}
                      className={`p-4 rounded-lg border ${getRiskBorder(risk.severity)} flex gap-3 items-start`}
                      onMouseEnter={() => risk.affectedSegmentIds && setActiveSegmentId(risk.affectedSegmentIds[0])}
                      onMouseLeave={() => setActiveSegmentId(null)}
                    >
                      <div className="shrink-0 mt-0.5">{getRiskIcon(risk.severity)}</div>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium text-foreground">{risk.title}</div>
                        <div className="text-muted-foreground leading-relaxed">{risk.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-muted-foreground" /> 
                Recommendations
              </h3>
              
              <div className="flex flex-col gap-3">
                {report.recommendations.map((rec, i) => (
                  <Card key={rec.id} className="border-border/50 shadow-none overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
                    <CardContent className="p-4 pl-5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-mono text-muted-foreground">
                            {i+1}
                          </span>
                          {rec.title}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground pl-7">{rec.description}</p>
                      <div className="flex items-center gap-2 pl-7 pt-1">
                        <Badge variant="secondary" className="text-[10px] font-mono capitalize px-1.5 py-0">
                          {rec.action}
                        </Badge>
                        <span className="text-[10px] font-mono text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                          +{rec.estimatedScoreGain} score est.
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}