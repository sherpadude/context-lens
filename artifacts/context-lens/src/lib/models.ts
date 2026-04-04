import type { ModelSpec, ModelId } from "../types";

export const MODELS: Record<ModelId, ModelSpec> = {
  gpt4o: {
    id: "gpt4o",
    name: "GPT-4o",
    maxTokens: 128000,
    inputCostPer1kTokens: 0.0025,
    outputCostPer1kTokens: 0.01,
    color: "#10b981",
  },
  claude35: {
    id: "claude35",
    name: "Claude 3.5 Sonnet",
    maxTokens: 200000,
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    color: "#f59e0b",
  },
  gemini25: {
    id: "gemini25",
    name: "Gemini 2.5 Pro",
    maxTokens: 2000000,
    inputCostPer1kTokens: 0.00125,
    outputCostPer1kTokens: 0.005,
    color: "#3b82f6",
  },
  llama31: {
    id: "llama31",
    name: "Llama 3.1 70B",
    maxTokens: 128000,
    inputCostPer1kTokens: 0.0002,
    outputCostPer1kTokens: 0.0002,
    color: "#8b5cf6",
  },
};

export const MODEL_LIST = Object.values(MODELS);

export function getModel(id: ModelId): ModelSpec {
  return MODELS[id];
}
