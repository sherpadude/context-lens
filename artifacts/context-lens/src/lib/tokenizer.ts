import type { ModelId } from "../types";

const CHARS_PER_TOKEN: Record<string, number> = {
  english: 4.0,
  code: 3.2,
  json: 3.6,
  markdown: 3.8,
};

function detectContentType(text: string): keyof typeof CHARS_PER_TOKEN {
  const codePatterns = /function\s|const\s|import\s|class\s|def\s|return\s|if\s*\(/;
  const jsonPatterns = /^\s*[\[\{]/;
  if (jsonPatterns.test(text.trim())) return "json";
  if (codePatterns.test(text)) return "code";
  if (text.includes("```") || text.includes("##") || text.includes("**")) return "markdown";
  return "english";
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const contentType = detectContentType(text);
  const charsPerToken = CHARS_PER_TOKEN[contentType];
  return Math.ceil(text.length / charsPerToken);
}

export function estimateCost(
  tokens: number,
  model: ModelId,
  type: "input" | "output" = "input"
): number {
  const costs: Record<ModelId, { input: number; output: number }> = {
    gpt4o: { input: 0.0025, output: 0.01 },
    claude35: { input: 0.003, output: 0.015 },
    gemini25: { input: 0.00125, output: 0.005 },
    llama31: { input: 0.0002, output: 0.0002 },
  };
  const rate = costs[model][type];
  return (tokens / 1000) * rate;
}

export function formatTokenCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export function formatCost(usd: number): string {
  if (usd < 0.001) return `<$0.001`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

export function getWindowUtilization(tokens: number, maxTokens: number): number {
  return Math.min(tokens / maxTokens, 1);
}

export function projectTurnCost(
  currentTokens: number,
  turnsPerConversation: number,
  growthPerTurn: number,
  model: ModelId
): { at20: number; at50: number; at100: number } {
  const base = currentTokens;

  function costAt(turns: number): number {
    const totalTokens = base + growthPerTurn * turns;
    return estimateCost(totalTokens, model, "input");
  }

  return {
    at20: costAt(20),
    at50: costAt(50),
    at100: costAt(100),
  };
}
