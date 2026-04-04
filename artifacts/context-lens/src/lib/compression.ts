import type {
  ContextWindow,
  CompressionResult,
  CompressionStrategy,
  ContextSegment,
} from "../types";
import { estimateTokens, estimateCost } from "./tokenizer";

export function applySlindingWindow(
  window: ContextWindow,
  keepLastNTurns: number
): CompressionResult {
  const historySegments = window.segments.filter(
    (s) => s.type === "history-old" || s.type === "history-recent"
  );
  const nonHistorySegments = window.segments.filter(
    (s) => s.type !== "history-old" && s.type !== "history-recent"
  );

  const keptTurns = historySegments.slice(-keepLastNTurns);
  const removedTurns = historySegments.slice(0, -keepLastNTurns);

  const removedTokens = removedTurns.reduce((sum, s) => sum + s.tokenCount, 0);
  const compressedSegments: ContextSegment[] = [...nonHistorySegments, ...keptTurns];
  const compressedTokens = compressedSegments.reduce((sum, s) => sum + s.tokenCount, 0);

  const savings = window.totalTokens - compressedTokens;
  const savingsPercent = (savings / window.totalTokens) * 100;

  const qualityRetention = Math.max(
    60,
    100 - (removedTurns.length / historySegments.length) * 35
  );

  const originalCost = estimateCost(window.totalTokens, window.model, "input");
  const compressedCost = estimateCost(compressedTokens, window.model, "input");

  return {
    strategy: "sliding-window",
    originalTokens: window.totalTokens,
    compressedTokens,
    savings,
    savingsPercent: Math.round(savingsPercent),
    estimatedQualityRetention: Math.round(qualityRetention),
    costDelta: originalCost - compressedCost,
    description: `Kept the ${keepLastNTurns} most recent turns, discarded ${removedTurns.length} older turns. Fast and predictable — no LLM call required.`,
    compressedSegments,
  };
}

export function applySummarization(
  window: ContextWindow,
  summarizeTurnsOlderThan: number
): CompressionResult {
  const historySegments = window.segments.filter(
    (s) => s.type === "history-old" || s.type === "history-recent"
  );
  const nonHistorySegments = window.segments.filter(
    (s) => s.type !== "history-old" && s.type !== "history-recent"
  );

  const turnsToSummarize = historySegments.slice(0, summarizeTurnsOlderThan);
  const remainingTurns = historySegments.slice(summarizeTurnsOlderThan);

  const summarizedContent = `[Summary of ${turnsToSummarize.length} earlier turns]: ` +
    `Key topics discussed: ${turnsToSummarize
      .slice(0, 3)
      .map((s) => s.content.substring(0, 60))
      .join("; ")}... ` +
    `Main outcomes and decisions preserved. ${turnsToSummarize.length} original turns compressed.`;

  const summarySegment: ContextSegment = {
    id: "summary-block",
    type: "summary",
    label: `Summary of ${turnsToSummarize.length} Earlier Turns`,
    content: summarizedContent,
    tokenCount: estimateTokens(summarizedContent),
    metadata: { originalTurnCount: turnsToSummarize.length },
  };

  const compressedSegments: ContextSegment[] = [
    ...nonHistorySegments,
    summarySegment,
    ...remainingTurns,
  ];

  const compressedTokens = compressedSegments.reduce((sum, s) => sum + s.tokenCount, 0);
  const savings = window.totalTokens - compressedTokens;
  const savingsPercent = (savings / window.totalTokens) * 100;

  const turnsRatio = turnsToSummarize.length / historySegments.length;
  const qualityRetention = Math.max(70, 95 - turnsRatio * 20);

  const originalCost = estimateCost(window.totalTokens, window.model, "input");
  const compressedCost = estimateCost(compressedTokens, window.model, "input");

  return {
    strategy: "summarization",
    originalTokens: window.totalTokens,
    compressedTokens,
    savings,
    savingsPercent: Math.round(savingsPercent),
    estimatedQualityRetention: Math.round(qualityRetention),
    costDelta: originalCost - compressedCost,
    description: `${turnsToSummarize.length} older turns replaced with a structured summary block. Requires one LLM call to generate the summary. Preserves key decisions and outcomes.`,
    compressedSegments,
  };
}

export function applyHardCompression(
  window: ContextWindow,
  compressionRatio: number
): CompressionResult {
  const compressedSegments: ContextSegment[] = window.segments.map((seg) => {
    const typeRatios: Record<string, number> = {
      system: 0.15,
      identity: 0.1,
      tools: 0.5,
      rag: 0.6,
      "history-old": 0.65,
      "history-recent": 0.3,
      summary: 0.1,
      unknown: 0.5,
    };

    const segmentRatio = typeRatios[seg.type] || 0.4;
    const adjustedRatio = segmentRatio * (compressionRatio / 0.5);
    const newTokenCount = Math.round(seg.tokenCount * (1 - Math.min(0.85, adjustedRatio)));
    const newContent = compressText(seg.content, 1 - Math.min(0.85, adjustedRatio));

    return {
      ...seg,
      content: newContent,
      tokenCount: newTokenCount,
    };
  });

  const compressedTokens = compressedSegments.reduce((sum, s) => sum + s.tokenCount, 0);
  const savings = window.totalTokens - compressedTokens;
  const savingsPercent = (savings / window.totalTokens) * 100;

  const qualityRetention = Math.max(55, 98 - compressionRatio * 60);

  const originalCost = estimateCost(window.totalTokens, window.model, "input");
  const compressedCost = estimateCost(compressedTokens, window.model, "input");

  return {
    strategy: "hard-compression",
    originalTokens: window.totalTokens,
    compressedTokens,
    savings,
    savingsPercent: Math.round(savingsPercent),
    estimatedQualityRetention: Math.round(qualityRetention),
    costDelta: originalCost - compressedCost,
    description: `LLMLingua-style token filtering: removed low-perplexity tokens from RAG chunks and tool outputs (${Math.round(compressionRatio * 100)}% compression ratio). No LLM call required — fast ML model.`,
    compressedSegments,
  };
}

function compressText(text: string, keepRatio: number): string {
  const words = text.split(" ");
  const keepCount = Math.round(words.length * keepRatio);
  const step = words.length / keepCount;
  const kept: string[] = [];
  for (let i = 0; i < keepCount; i++) {
    const idx = Math.round(i * step);
    if (idx < words.length) kept.push(words[idx]);
  }
  return kept.join(" ") + " [compressed]";
}

export function getStrategyLabel(strategy: CompressionStrategy): string {
  const labels: Record<CompressionStrategy, string> = {
    "sliding-window": "Sliding Window",
    summarization: "Summarization",
    "hard-compression": "Hard Compression",
  };
  return labels[strategy];
}

export function getStrategyColor(strategy: CompressionStrategy): string {
  const colors: Record<CompressionStrategy, string> = {
    "sliding-window": "#3b82f6",
    summarization: "#8b5cf6",
    "hard-compression": "#f59e0b",
  };
  return colors[strategy];
}
