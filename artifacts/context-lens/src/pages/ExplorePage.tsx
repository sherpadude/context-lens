import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FEATURED_SCENARIOS, SCENARIOS, getScenario } from "@/data/scenarios";
import { Scenario, ScenarioTurn, ContextWindow, AppMode } from "@/types";
import { scenarioToContextWindow } from "@/lib/parser";
import { getSegmentColor } from "@/lib/segmentColors";
import { analyzeContext } from "@/lib/scoring";
import { Play, Pause, SkipBack, SkipForward, FastForward, RotateCcw, Network } from "lucide-react";
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
    <div className="container max-w-6xl py-10 px-4 md:px-6 space-y-10 animate-in fade-in duration-500">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Concept Explorer</h1>
        <p className="text-lg text-muted-foreground">
          Interactive case studies demonstrating how context behavior affects model performance. Watch prompt decay and identity drift happen in real-time.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {SCENARIOS.map((scenario) => (
          <Card key={scenario.id} className="flex flex-col bg-card/40 border-border/40 hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setActiveScenarioId(scenario.id)}>
            <CardHeader>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider text-primary bg-primary/10">
                  {scenario.concept}
                </Badge>
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors">{scenario.name}</CardTitle>
              <CardDescription className="text-sm mt-2">{scenario.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex-1">
              {scenario.description}
            </CardContent>
            <CardFooter className="pt-4 border-t border-border/30">
              <span className="text-sm font-medium text-primary flex items-center gap-2">
                Play Scenario <Play className="h-3 w-3" />
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ScenarioPlayer({ scenario, onBack, onLoadAnalyze }: { scenario: Scenario, onBack: () => void, onLoadAnalyze: () => void }) {
  const [turnIndex, setTurnIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [activeSubAgentId, setActiveSubAgentId] = useState<string | null>(null);

  // Use the active agent's turns
  const activeTurns = activeSubAgentId 
    ? scenario.subAgents?.find(a => a.id === activeSubAgentId)?.turns || []
    : scenario.turns;

  const identityFile = activeSubAgentId
    ? scenario.subAgents?.find(a => a.id === activeSubAgentId)?.identityFile
    : scenario.identityFile;

  // Build context window up to current turn
  const currentContext = scenarioToContextWindow(
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
      timer = window.setTimeout(() => {
        setTurnIndex(prev => prev + 1);
      }, 1500 / speed);
    } else if (isFinished && isPlaying) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, turnIndex, speed, isFinished, activeTurns.length]);

  return (
    <div className="h-full flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-300">
      {/* Player Header */}
      <div className="shrink-0 border-b border-border bg-card/50 p-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground h-8 px-2">
            ← Explore
          </Button>
          <div>
            <h2 className="font-bold text-lg leading-none">{scenario.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">Concept: {scenario.concept}</p>
          </div>
        </div>

        {scenario.agentType === "orchestrator" && scenario.subAgents && (
          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg">
            <Button 
              variant={activeSubAgentId === null ? "secondary" : "ghost"} 
              size="sm" 
              className="text-xs h-7"
              onClick={() => { setActiveSubAgentId(null); setTurnIndex(0); }}
            >
              Orchestrator
            </Button>
            {scenario.subAgents.map(agent => (
              <Button 
                key={agent.id}
                variant={activeSubAgentId === agent.id ? "secondary" : "ghost"} 
                size="sm" 
                className="text-xs h-7"
                onClick={() => { setActiveSubAgentId(agent.id); setTurnIndex(0); }}
              >
                {agent.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Main Player Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px]">
        
        {/* Left: Turn Feed */}
        <div className="relative flex flex-col h-full bg-background border-r border-border overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 pb-32">
            {identityFile && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border bg-card/30">
                  <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex justify-between">
                      <span className="uppercase tracking-wider">System Identity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                    {identityFile}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {activeTurns.slice(0, turnIndex + 1).map((turn, idx) => {
                const isFailed = turn.metadata?.isFailedAttempt;
                const isCurrent = idx === turnIndex;
                
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-lg border ${
                      turn.role === 'user' ? 'bg-primary/10 border-primary/20 text-primary-foreground' : 
                      isFailed ? 'bg-red-500/10 border-red-500/30' :
                      turn.role === 'tool' ? 'bg-amber-500/10 border-amber-500/20 font-mono text-xs' :
                      'bg-card border-border'
                    } p-4 shadow-sm ${isCurrent ? 'ring-1 ring-primary/50' : ''}`}>
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold opacity-70 uppercase tracking-wider">
                        {turn.role === 'user' ? 'User' : turn.role === 'assistant' ? 'Assistant' : 'Tool Result'}
                        {isFailed && <Badge variant="destructive" className="ml-auto text-[10px]">Failed Attempt</Badge>}
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {turn.content}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isFinished && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8">
                <Card className="border-primary/50 bg-primary/5 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg text-primary">Lesson: {scenario.lessonTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <p className="leading-relaxed">{scenario.lessonBody}</p>
                    <div className="space-y-2 pt-2">
                      <h4 className="font-semibold text-foreground">How to fix this:</h4>
                      <ul className="space-y-2">
                        {scenario.fixes.map((fix, i) => (
                          <li key={i} className="flex gap-2 items-start text-muted-foreground">
                            <span className="text-primary mt-0.5">✓</span> {fix}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={onLoadAnalyze}>
                      Load in Analyze Mode
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Playback Controls Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setTurnIndex(0)} disabled={turnIndex === 0}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setTurnIndex(prev => Math.max(0, prev - 1))} disabled={turnIndex === 0}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant={isPlaying ? "secondary" : "default"} size="icon" onClick={() => setIsPlaying(!isPlaying)} disabled={isFinished}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setTurnIndex(prev => Math.min(activeTurns.length - 1, prev + 1))} disabled={isFinished}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-xs font-mono text-muted-foreground">
              Turn {turnIndex + 1} of {activeTurns.length}
            </div>

            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
              {[0.5, 1, 2].map(s => (
                <Button 
                  key={s} 
                  variant={speed === s ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-xs px-2"
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Telemetry */}
        <div className="bg-card p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Live Telemetry</h3>
            
            {/* Score Circle */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-muted fill-none stroke-[8]" />
                  <motion.circle 
                    cx="50" cy="50" r="40" 
                    className="fill-none stroke-[8]" 
                    initial={{ strokeDasharray: "0 251.2" }}
                    animate={{ strokeDasharray: `${(report.score / 100) * 251.2} 251.2` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ 
                      stroke: report.score >= 85 ? '#22c55e' : report.score >= 70 ? '#84cc16' : report.score >= 50 ? '#eab308' : report.score >= 30 ? '#f97316' : '#ef4444'
                    }} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-mono font-bold">{report.score}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Context Map */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Context Map</span>
              <span className="font-mono">{currentContext.totalTokens} tk</span>
            </div>
            <div className="h-8 w-full flex rounded overflow-hidden ring-1 ring-border">
              {currentContext.segments.map((seg) => {
                const colors = getSegmentColor(seg.type);
                const widthPct = Math.max(1, (seg.tokenCount / currentContext.totalTokens) * 100);
                return (
                  <motion.div
                    key={seg.id}
                    layout
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: `${widthPct}%` }}
                    className="h-full border-r border-background/50 last:border-0 relative"
                    style={{ backgroundColor: colors.dot }}
                    title={seg.label}
                  >
                    {seg.metadata?.isFailedAttempt && (
                      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse m-0.5" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Active Risks */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Risks</h4>
            <AnimatePresence mode="popLayout">
              {report.risks.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-muted-foreground p-3 border border-dashed rounded text-center">
                  No risks detected yet.
                </motion.div>
              ) : (
                report.risks.map(risk => (
                  <motion.div 
                    key={risk.id}
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="p-3 rounded border border-border bg-background text-sm space-y-1"
                  >
                    <div className="font-medium flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${risk.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      {risk.title}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {risk.description}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}