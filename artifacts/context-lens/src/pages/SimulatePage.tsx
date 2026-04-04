import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SCENARIOS, getScenario } from "@/data/scenarios";
import { ModelId, ContextWindow } from "@/types";
import { scenarioToContextWindow } from "@/lib/parser";
import { applySlindingWindow, applySummarization, applyHardCompression } from "@/lib/compression";
import { getHeatmapGrid, accuracyToColor } from "@/lib/niahData";
import { formatTokenCount, formatCost } from "@/lib/tokenizer";
import { getSegmentColor } from "@/lib/segmentColors";
import { Scissors, FileText, Minimize2, Activity, Settings2, Sparkles, AlertTriangle } from "lucide-react";

export default function SimulatePage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SCENARIOS[1].id); // Default to Forgotten Soul
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapModel, setHeatmapModel] = useState<ModelId>("gpt4o");
  
  // Simulator State
  const [slidingWindowTurns, setSlidingWindowTurns] = useState<number>(8);
  const [summarizeTurns, setSummarizeTurns] = useState<number>(10);
  const [compressionRatio, setCompressionRatio] = useState<number>(0.5);

  const baseWindow = useMemo(() => {
    const scenario = getScenario(selectedScenarioId);
    if (!scenario) return null;
    return scenarioToContextWindow(scenario.turns, scenario.identityFile, scenario.model);
  }, [selectedScenarioId]);

  if (!baseWindow) return null;

  const slidingResult = applySlindingWindow(baseWindow, slidingWindowTurns);
  const summaryResult = applySummarization(baseWindow, summarizeTurns);
  const hardResult = applyHardCompression(baseWindow, compressionRatio);

  const heatmapData = showHeatmap ? getHeatmapGrid(heatmapModel, 128000) : null;

  const MiniMap = ({ window, segments }: { window: ContextWindow | null, segments?: ContextWindow["segments"] }) => {
    if (!window) return null;
    const segs = segments || window.segments;
    const total = segments ? segments.reduce((sum: number, s: ContextWindow["segments"][0]) => sum + s.tokenCount, 0) : window.totalTokens;
    return (
      <div className="h-4 w-full flex rounded overflow-hidden ring-1 ring-border/50 opacity-80">
        {segs.map((seg, i) => {
          const colors = getSegmentColor(seg.type);
          const widthPct = Math.max(1, (seg.tokenCount / total) * 100);
          return (
            <div
              key={seg.id + i}
              className="h-full border-r border-background/50 last:border-0"
              style={{ backgroundColor: colors.dot, width: `${widthPct}%` }}
              title={`${seg.label}: ${seg.tokenCount}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="container max-w-7xl py-8 px-4 md:px-6 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simulation Lab</h1>
          <p className="text-muted-foreground mt-1">Test compression strategies and visualize model recall limits.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg border border-border">
          <Label htmlFor="heatmap-toggle" className="font-medium cursor-pointer">NIAH Heatmap</Label>
          <Switch id="heatmap-toggle" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
        </div>
      </div>

      {/* Section B: Heatmap (Conditional) */}
      {showHeatmap && (
        <Card className="border-border bg-card/50 overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
          <CardHeader className="bg-muted/20 pb-4 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Needle in a Haystack (NIAH) Heatmap
              </CardTitle>
              <CardDescription>Visualizing retrieval degradation across context length and document depth.</CardDescription>
            </div>
            <Select value={heatmapModel} onValueChange={(v) => setHeatmapModel(v as ModelId)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt4o">GPT-4o (128k)</SelectItem>
                <SelectItem value="claude35">Claude 3.5 (200k)</SelectItem>
                <SelectItem value="gemini25">Gemini 2.5 (2M)</SelectItem>
                <SelectItem value="llama31">Llama 3.1 (128k)</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-6">
            {heatmapData && (
              <div className="space-y-6">
                <div className="relative pt-6 pl-12 pr-4 pb-8">
                  {/* Y Axis Label */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground tracking-wider origin-center w-32 text-center -ml-10">
                    Document Depth %
                  </div>
                  {/* X Axis Label */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground tracking-wider">
                    Context Length (Tokens)
                  </div>

                  <div className="grid grid-rows-[repeat(11,minmax(0,1fr))] gap-0.5 aspect-[2.5/1] w-full">
                    {heatmapData.map((row, y) => (
                      <div key={y} className="grid grid-cols-10 gap-0.5">
                        {row.map((cell, x) => (
                          <div
                            key={`${x}-${y}`}
                            className="w-full h-full rounded-sm cursor-help transition-transform hover:scale-110 hover:z-10 hover:shadow-md"
                            style={{ backgroundColor: accuracyToColor(cell.accuracy) }}
                            title={`Accuracy: ${(cell.accuracy * 100).toFixed(1)}%\nDepth: ${cell.depth}%\nLength: ${formatTokenCount(cell.contextLength)}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  
                  {/* Axis markers */}
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-2 ml-12">
                    <span>0</span>
                    <span>128k</span>
                  </div>
                  <div className="absolute top-6 left-6 bottom-8 flex flex-col justify-between text-[10px] text-muted-foreground font-mono items-end pr-2">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#22c55e]"></div>{" "}{">"} 90%</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#84cc16]"></div>{" "}{">"} 75%</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#eab308]"></div>{" "}{">"} 60%</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#f97316]"></div>{" "}{">"} 45%</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#ef4444]"></div>{" "}{"<"} 45%</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section A: Compression Simulator */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Context Payload
            </h2>
            <div className="text-sm text-muted-foreground">Select a scenario to test compression against.</div>
          </div>
          
          <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIOS.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Base State Ref */}
        <div className="px-2">
          <div className="text-xs font-mono text-muted-foreground mb-1">Uncompressed Baseline: {formatTokenCount(baseWindow.totalTokens)} tokens</div>
          <MiniMap window={baseWindow} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Strategy 1: Sliding Window */}
          <Card className="border-border/60 hover:border-blue-500/30 transition-colors">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2 text-blue-400">
                  <Scissors className="h-4 w-4" /> Sliding Window
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">{slidingResult.savingsPercent}% saved</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Keep last N turns</Label>
                  <span className="font-mono font-medium">{slidingWindowTurns}</span>
                </div>
                <Slider 
                  value={[slidingWindowTurns]} 
                  onValueChange={(v) => setSlidingWindowTurns(v[0])} 
                  max={20} min={2} step={1} 
                  className="[&_[role=slider]]:bg-blue-500"
                />
              </div>

              <div className="p-3 bg-muted/30 rounded-lg space-y-2 border border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-mono">{formatTokenCount(slidingResult.compressedTokens)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality Est.</span>
                  <span className={`font-mono ${slidingResult.estimatedQualityRetention < 70 ? 'text-red-400' : 'text-green-400'}`}>
                    {slidingResult.estimatedQualityRetention}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost Delta</span>
                  <span className="font-mono text-green-400">-{formatCost(slidingResult.costDelta)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Resulting Map</span>
                <MiniMap window={baseWindow} segments={slidingResult.compressedSegments} />
              </div>
            </CardContent>
          </Card>

          {/* Strategy 2: Summarization */}
          <Card className="border-border/60 hover:border-purple-500/30 transition-colors">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2 text-purple-400">
                  <FileText className="h-4 w-4" /> Summarization
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">{summaryResult.savingsPercent}% saved</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Summarize older than</Label>
                  <span className="font-mono font-medium">Turn {summarizeTurns}</span>
                </div>
                <Slider 
                  value={[summarizeTurns]} 
                  onValueChange={(v) => setSummarizeTurns(v[0])} 
                  max={20} min={2} step={1}
                  className="[&_[role=slider]]:bg-purple-500"
                />
              </div>

              <div className="p-3 bg-muted/30 rounded-lg space-y-2 border border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-mono">{formatTokenCount(summaryResult.compressedTokens)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality Est.</span>
                  <span className={`font-mono ${summaryResult.estimatedQualityRetention < 70 ? 'text-red-400' : 'text-green-400'}`}>
                    {summaryResult.estimatedQualityRetention}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost Delta</span>
                  <span className="font-mono text-green-400">-{formatCost(summaryResult.costDelta)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Resulting Map</span>
                <MiniMap window={baseWindow} segments={summaryResult.compressedSegments} />
              </div>
            </CardContent>
          </Card>

          {/* Strategy 3: Hard Compression */}
          <Card className="border-border/60 hover:border-amber-500/30 transition-colors">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2 text-amber-400">
                  <Minimize2 className="h-4 w-4" /> Hard Compression
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">{hardResult.savingsPercent}% saved</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Target Ratio</Label>
                  <span className="font-mono font-medium">{Math.round(compressionRatio * 100)}%</span>
                </div>
                <Slider 
                  value={[compressionRatio * 100]} 
                  onValueChange={(v) => setCompressionRatio(v[0] / 100)} 
                  max={80} min={10} step={5}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              <div className="p-3 bg-muted/30 rounded-lg space-y-2 border border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-mono">{formatTokenCount(hardResult.compressedTokens)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality Est.</span>
                  <span className={`font-mono ${hardResult.estimatedQualityRetention < 70 ? 'text-red-400' : 'text-green-400'}`}>
                    {hardResult.estimatedQualityRetention}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost Delta</span>
                  <span className="font-mono text-green-400">-{formatCost(hardResult.costDelta)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Resulting Map</span>
                <MiniMap window={baseWindow} segments={hardResult.compressedSegments} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}