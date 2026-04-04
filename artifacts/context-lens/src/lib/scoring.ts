import type {
  ContextWindow,
  ContextSegment,
  HealthReport,
  RiskFlag,
  Recommendation,
} from "../types";
import { estimateCost } from "./tokenizer";

function scoreTokenEfficiency(segments: ContextSegment[], totalTokens: number): number {
  const wasteTypes = ["history-old", "unknown"] as const;
  const wasteTokens = segments
    .filter((s) => (wasteTypes as readonly string[]).includes(s.type))
    .reduce((sum, s) => sum + s.tokenCount, 0);
  const wasteRatio = wasteTokens / Math.max(totalTokens, 1);
  return Math.max(0, 100 - wasteRatio * 150);
}

function scoreRecencyDistribution(segments: ContextSegment[], totalTokens: number): number {
  const recentTokens = segments
    .filter((s) => s.type === "history-recent")
    .reduce((sum, s) => sum + s.tokenCount, 0);
  const oldTokens = segments
    .filter((s) => s.type === "history-old")
    .reduce((sum, s) => sum + s.tokenCount, 0);

  if (recentTokens + oldTokens === 0) return 85;

  const recencyRatio = recentTokens / (recentTokens + oldTokens);
  return Math.min(100, recencyRatio * 120);
}

function scoreIdentitySurvival(segments: ContextSegment[], totalTokens: number): number {
  const identitySegments = segments.filter((s) => s.type === "identity");
  if (identitySegments.length === 0) return 75;

  const identityTokens = identitySegments.reduce((sum, s) => sum + s.tokenCount, 0);
  const identityRatio = identityTokens / Math.max(totalTokens, 1);

  const firstIdentityIdx = segments.indexOf(identitySegments[0]);
  const positionScore = 1 - firstIdentityIdx / segments.length;

  const survivalScore = identityRatio > 0.02 ? 80 : identityRatio > 0.005 ? 60 : 40;
  return Math.min(100, survivalScore * 0.7 + positionScore * 30);
}

function scorePoisonRisk(segments: ContextSegment[]): number {
  const failedAttempts = segments.filter(
    (s) => s.metadata?.isFailedAttempt === true
  );
  if (failedAttempts.length === 0) return 95;
  if (failedAttempts.length === 1) return 70;
  if (failedAttempts.length === 2) return 50;
  return Math.max(10, 50 - failedAttempts.length * 12);
}

function scoreCompressionOpportunity(segments: ContextSegment[], totalTokens: number): number {
  const compressibleTypes = ["history-old", "rag"] as const;
  const compressibleTokens = segments
    .filter((s) => (compressibleTypes as readonly string[]).includes(s.type))
    .reduce((sum, s) => sum + s.tokenCount, 0);
  const compressibleRatio = compressibleTokens / Math.max(totalTokens, 1);
  return Math.max(0, 100 - compressibleRatio * 80);
}

function detectRisks(
  segments: ContextSegment[],
  totalTokens: number,
  modelMaxTokens: number
): RiskFlag[] {
  const risks: RiskFlag[] = [];

  const failedSegments = segments.filter((s) => s.metadata?.isFailedAttempt);
  if (failedSegments.length > 0) {
    risks.push({
      id: "poison-1",
      type: "poison",
      severity: failedSegments.length >= 3 ? "high" : "medium",
      title: "Context Poisoning Risk",
      description: `${failedSegments.length} turn${failedSegments.length > 1 ? "s" : ""} contain${failedSegments.length === 1 ? "s" : ""} failed attempts that may be contaminating later reasoning. Early failures stay in context and can anchor incorrect reasoning in future turns.`,
      affectedSegmentIds: failedSegments.map((s) => s.id),
    });
  }

  const identitySegments = segments.filter((s) => s.type === "identity");
  if (identitySegments.length > 0) {
    const identityTokens = identitySegments.reduce((sum, s) => sum + s.tokenCount, 0);
    const identityRatio = identityTokens / Math.max(totalTokens, 1);
    const firstIdentityIdx = segments.indexOf(identitySegments[0]);
    const normalizedPosition = firstIdentityIdx / segments.length;

    if (normalizedPosition > 0.5 || identityRatio < 0.015) {
      const severity = normalizedPosition > 0.7 ? "high" : "medium";
      risks.push({
        id: "drift-1",
        type: "drift",
        severity,
        title: "Identity Drift Detected",
        description: `The agent identity file represents only ${(identityRatio * 100).toFixed(1)}% of the context and is positioned in the bottom ${Math.round((1 - normalizedPosition) * 100)}% of the window. Research shows models deprioritize instructions buried in the middle of long contexts ("Lost in the Middle", 2024).`,
        affectedSegmentIds: identitySegments.map((s) => s.id),
      });
    }
  }

  const oldHistorySegments = segments.filter((s) => s.type === "history-old");
  const oldHistoryTokens = oldHistorySegments.reduce((sum, s) => sum + s.tokenCount, 0);
  const oldRatio = oldHistoryTokens / Math.max(totalTokens, 1);
  if (oldRatio > 0.3) {
    risks.push({
      id: "compress-1",
      type: "compression",
      severity: oldRatio > 0.5 ? "high" : "medium",
      title: "Compression Opportunity",
      description: `${(oldRatio * 100).toFixed(0)}% of the context (${Math.round(oldHistoryTokens / 1000)}k tokens) is older conversation history with low recency value. Summarizing these turns could reduce cost by up to ${Math.round(oldRatio * 70)}% while preserving critical information.`,
      affectedSegmentIds: oldHistorySegments.map((s) => s.id),
    });
  }

  const windowUtilization = totalTokens / modelMaxTokens;
  if (windowUtilization > 0.7) {
    risks.push({
      id: "recency-1",
      type: "recency",
      severity: windowUtilization > 0.85 ? "high" : "medium",
      title: "Window Pressure",
      description: `Context is at ${(windowUtilization * 100).toFixed(0)}% capacity. Studies show performance degradation begins well before the limit — at ${windowUtilization > 0.85 ? "this level, significant" : "70%+, noticeable"} accuracy drops are expected ("Lost in the Middle", Stanford 2024).`,
    });
  }

  return risks;
}

function generateRecommendations(
  risks: RiskFlag[],
  segments: ContextSegment[],
  totalTokens: number
): Recommendation[] {
  const recs: Recommendation[] = [];

  const poisonRisk = risks.find((r) => r.type === "poison");
  if (poisonRisk) {
    recs.push({
      id: "rec-1",
      priority: 1,
      title: "Remove or summarize failed attempt turns",
      description: `The ${poisonRisk.affectedSegmentIds?.length} failed turn(s) should be removed or replaced with a summary like "Previous attempt: tried X, result was incorrect, correct answer is Y." This prevents early failures from biasing future responses.`,
      estimatedScoreGain: 18,
      action: "remove",
    });
  }

  const driftRisk = risks.find((r) => r.type === "drift");
  if (driftRisk) {
    recs.push({
      id: "rec-2",
      priority: poisonRisk ? 2 : 1,
      title: "Reinject identity file closer to recent turns",
      description: `Move or duplicate key identity instructions into the last 20% of the context window. Research confirms that instructions within the last quarter of the context have near-full retrieval probability, regardless of context length.`,
      estimatedScoreGain: 14,
      action: "reorder",
    });
  }

  const compressRisk = risks.find((r) => r.type === "compression");
  if (compressRisk) {
    const oldTokens = segments
      .filter((s) => s.type === "history-old")
      .reduce((sum, s) => sum + s.tokenCount, 0);
    recs.push({
      id: "rec-3",
      priority: recs.length + 1 as 1 | 2 | 3,
      title: `Summarize older turns (~${Math.round(oldTokens / 1000)}k tokens)`,
      description: `Use a sliding window of 8-10 recent turns and compress earlier history into a structured summary. This typically achieves 60-80% token reduction with less than 5% information loss on factual tasks.`,
      estimatedScoreGain: 12,
      action: "summarize",
    });
  }

  const windowRisk = risks.find((r) => r.type === "recency");
  if (windowRisk && recs.length < 3) {
    recs.push({
      id: "rec-4",
      priority: recs.length + 1 as 1 | 2 | 3,
      title: "Implement context compaction before next turn",
      description: "Apply hard prompt compression (LLMLingua-style) to tool outputs and RAG chunks. These typically contain high redundancy and can be compressed 40-60% with minimal quality loss.",
      estimatedScoreGain: 10,
      action: "compress",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "rec-default",
      priority: 1,
      title: "Context looks healthy — consider proactive monitoring",
      description: "Set a turn-count threshold (e.g., turn 12) to automatically trigger summarization before window pressure begins affecting quality.",
      estimatedScoreGain: 5,
      action: "compress",
    });
  }

  return recs.slice(0, 3);
}

function computeCompositeScore(breakdown: HealthReport["breakdown"]): number {
  const weights = {
    tokenEfficiency: 0.2,
    recencyDistribution: 0.2,
    identitySurvival: 0.2,
    poisonRisk: 0.25,
    compressionOpportunity: 0.15,
  };

  return Math.round(
    breakdown.tokenEfficiency * weights.tokenEfficiency +
    breakdown.recencyDistribution * weights.recencyDistribution +
    breakdown.identitySurvival * weights.identitySurvival +
    breakdown.poisonRisk * weights.poisonRisk +
    breakdown.compressionOpportunity * weights.compressionOpportunity
  );
}

function getScoreLabel(score: number): HealthReport["scoreLabel"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  if (score >= 30) return "poor";
  return "critical";
}

export function analyzeContext(window: ContextWindow): HealthReport {
  const { segments, totalTokens, modelMaxTokens } = window;

  const breakdown = {
    tokenEfficiency: Math.round(scoreTokenEfficiency(segments, totalTokens)),
    recencyDistribution: Math.round(scoreRecencyDistribution(segments, totalTokens)),
    identitySurvival: Math.round(scoreIdentitySurvival(segments, totalTokens)),
    poisonRisk: Math.round(scorePoisonRisk(segments)),
    compressionOpportunity: Math.round(scoreCompressionOpportunity(segments, totalTokens)),
  };

  const score = computeCompositeScore(breakdown);
  const risks = detectRisks(segments, totalTokens, modelMaxTokens);
  const recommendations = generateRecommendations(risks, segments, totalTokens);

  return {
    score,
    scoreLabel: getScoreLabel(score),
    breakdown,
    risks,
    recommendations,
    context: window,
    analyzedAt: new Date().toISOString(),
  };
}

export function scoreColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 70) return "#84cc16";
  if (score >= 50) return "#eab308";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

export function scoreBackground(score: number): string {
  if (score >= 85) return "rgba(34, 197, 94, 0.12)";
  if (score >= 70) return "rgba(132, 204, 22, 0.12)";
  if (score >= 50) return "rgba(234, 179, 8, 0.12)";
  if (score >= 30) return "rgba(249, 115, 22, 0.12)";
  return "rgba(239, 68, 68, 0.12)";
}
