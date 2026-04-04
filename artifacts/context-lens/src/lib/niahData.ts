import type { NIAHBenchmark, NIAHDataPoint, ModelId } from "../types";

function generateNIAHData(
  modelId: ModelId,
  performanceProfile: "excellent" | "good" | "moderate" | "weak"
): NIAHDataPoint[] {
  const contextLengths = [1000, 4000, 8000, 16000, 32000, 64000, 128000];
  const depths = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const data: NIAHDataPoint[] = [];

  const baseAccuracy: Record<typeof performanceProfile, number> = {
    excellent: 0.97,
    good: 0.91,
    moderate: 0.82,
    weak: 0.72,
  };

  const contextPenalty: Record<typeof performanceProfile, number> = {
    excellent: 0.00001,
    good: 0.00002,
    moderate: 0.00004,
    weak: 0.00006,
  };

  for (const contextLength of contextLengths) {
    for (const depth of depths) {
      const base = baseAccuracy[performanceProfile];
      const lengthPenalty = contextPenalty[performanceProfile] * contextLength;

      const middleZone = depth >= 30 && depth <= 70;
      const middlePenalty = middleZone ? 0.08 + Math.sin((depth - 30) / 40 * Math.PI) * 0.07 : 0;

      const noise = (Math.random() - 0.5) * 0.04;

      const accuracy = Math.max(0, Math.min(1, base - lengthPenalty - middlePenalty + noise));
      data.push({ contextLength, depth, accuracy });
    }
  }

  return data;
}

export const NIAH_BENCHMARKS: NIAHBenchmark[] = [
  { modelId: "gpt4o", data: generateNIAHData("gpt4o", "excellent") },
  { modelId: "claude35", data: generateNIAHData("claude35", "excellent") },
  { modelId: "gemini25", data: generateNIAHData("gemini25", "good") },
  { modelId: "llama31", data: generateNIAHData("llama31", "moderate") },
];

export function getBenchmark(modelId: ModelId): NIAHBenchmark | undefined {
  return NIAH_BENCHMARKS.find((b) => b.modelId === modelId);
}

export function getAccuracyAt(
  modelId: ModelId,
  contextLength: number,
  depth: number
): number {
  const benchmark = getBenchmark(modelId);
  if (!benchmark) return 0;

  const sorted = benchmark.data
    .filter((d) => Math.abs(d.depth - depth) < 8)
    .sort(
      (a, b) =>
        Math.abs(a.contextLength - contextLength) -
        Math.abs(b.contextLength - contextLength)
    );

  if (sorted.length === 0) return 0.5;
  return sorted[0].accuracy;
}

export function getHeatmapGrid(
  modelId: ModelId,
  maxContextLength: number
): { depth: number; contextLength: number; accuracy: number }[][] {
  const depths = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const contextSteps = [
    Math.round(maxContextLength * 0.1),
    Math.round(maxContextLength * 0.2),
    Math.round(maxContextLength * 0.3),
    Math.round(maxContextLength * 0.4),
    Math.round(maxContextLength * 0.5),
    Math.round(maxContextLength * 0.6),
    Math.round(maxContextLength * 0.7),
    Math.round(maxContextLength * 0.8),
    Math.round(maxContextLength * 0.9),
    maxContextLength,
  ];

  return depths.map((depth) =>
    contextSteps.map((contextLength) => ({
      depth,
      contextLength,
      accuracy: getAccuracyAt(modelId, contextLength, depth),
    }))
  );
}

export function accuracyToColor(accuracy: number): string {
  if (accuracy >= 0.9) return "#22c55e";
  if (accuracy >= 0.75) return "#84cc16";
  if (accuracy >= 0.6) return "#eab308";
  if (accuracy >= 0.45) return "#f97316";
  return "#ef4444";
}
