export type SegmentType =
  | "system"
  | "identity"
  | "tools"
  | "history-recent"
  | "history-old"
  | "rag"
  | "response"
  | "summary"
  | "unknown";

export interface ContextSegment {
  id: string;
  type: SegmentType;
  label: string;
  content: string;
  tokenCount: number;
  turnIndex?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ContextWindow {
  segments: ContextSegment[];
  totalTokens: number;
  modelMaxTokens: number;
  model: ModelId;
}

export type ModelId = "gpt4o" | "claude35" | "gemini25" | "llama31";

export interface ModelSpec {
  id: ModelId;
  name: string;
  maxTokens: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  color: string;
}

export interface RiskFlag {
  id: string;
  type: "poison" | "drift" | "compression" | "recency" | "efficiency";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  affectedSegmentIds?: string[];
  turnRange?: [number, number];
}

export interface Recommendation {
  id: string;
  priority: 1 | 2 | 3;
  title: string;
  description: string;
  estimatedScoreGain: number;
  action: "reorder" | "summarize" | "compress" | "remove" | "split";
}

export interface HealthReport {
  score: number;
  scoreLabel: "critical" | "poor" | "fair" | "good" | "excellent";
  breakdown: {
    tokenEfficiency: number;
    recencyDistribution: number;
    identitySurvival: number;
    poisonRisk: number;
    compressionOpportunity: number;
  };
  risks: RiskFlag[];
  recommendations: Recommendation[];
  context: ContextWindow;
  analyzedAt: string;
}

export interface ScenarioTurn {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  metadata?: {
    isFailedAttempt?: boolean;
    isToolResult?: boolean;
    isRAGChunk?: boolean;
    isIdentityFile?: boolean;
  };
}

export interface Scenario {
  id: string;
  name: string;
  tagline: string;
  description: string;
  concept: string;
  turns: ScenarioTurn[];
  identityFile?: string;
  model: ModelId;
  agentType?: "orchestrator" | "sub-agent";
  subAgents?: {
    id: string;
    name: string;
    turns: ScenarioTurn[];
    identityFile?: string;
  }[];
  lessonTitle: string;
  lessonBody: string;
  fixes: string[];
}

export type AppMode = "analyze" | "explore" | "simulate";

export interface ScoreHistoryEntry {
  id: string;
  label: string;
  score: number;
  scoreLabel: string;
  timestamp: string;
  segmentSummary: string;
}

export type CompressionStrategy = "sliding-window" | "summarization" | "hard-compression";

export interface CompressionResult {
  strategy: CompressionStrategy;
  originalTokens: number;
  compressedTokens: number;
  savings: number;
  savingsPercent: number;
  estimatedQualityRetention: number;
  costDelta: number;
  description: string;
  compressedSegments: ContextSegment[];
}

export interface NIAHDataPoint {
  contextLength: number;
  depth: number;
  accuracy: number;
}

export interface NIAHBenchmark {
  modelId: ModelId;
  data: NIAHDataPoint[];
}
