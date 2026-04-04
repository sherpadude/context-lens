import type { SegmentType } from "../types";

export interface SegmentColorScheme {
  bg: string;
  border: string;
  text: string;
  label: string;
  dot: string;
}

export const SEGMENT_COLORS: Record<SegmentType, SegmentColorScheme> = {
  system: {
    bg: "rgba(139, 92, 246, 0.15)",
    border: "rgba(139, 92, 246, 0.4)",
    text: "#c4b5fd",
    label: "System Prompt",
    dot: "#8b5cf6",
  },
  identity: {
    bg: "rgba(20, 184, 166, 0.15)",
    border: "rgba(20, 184, 166, 0.4)",
    text: "#5eead4",
    label: "Identity / Soul",
    dot: "#14b8a6",
  },
  tools: {
    bg: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.4)",
    text: "#fcd34d",
    label: "Tool Result",
    dot: "#f59e0b",
  },
  "history-recent": {
    bg: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.4)",
    text: "#93c5fd",
    label: "Recent History",
    dot: "#3b82f6",
  },
  "history-old": {
    bg: "rgba(71, 85, 105, 0.2)",
    border: "rgba(71, 85, 105, 0.4)",
    text: "#94a3b8",
    label: "Old History",
    dot: "#475569",
  },
  rag: {
    bg: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.4)",
    text: "#6ee7b7",
    label: "RAG / Document",
    dot: "#10b981",
  },
  response: {
    bg: "rgba(236, 72, 153, 0.15)",
    border: "rgba(236, 72, 153, 0.4)",
    text: "#f9a8d4",
    label: "Response",
    dot: "#ec4899",
  },
  summary: {
    bg: "rgba(99, 102, 241, 0.15)",
    border: "rgba(99, 102, 241, 0.4)",
    text: "#a5b4fc",
    label: "Summary Block",
    dot: "#6366f1",
  },
  unknown: {
    bg: "rgba(107, 114, 128, 0.15)",
    border: "rgba(107, 114, 128, 0.4)",
    text: "#9ca3af",
    label: "Unknown",
    dot: "#6b7280",
  },
};

export function getSegmentColor(type: SegmentType): SegmentColorScheme {
  return SEGMENT_COLORS[type] || SEGMENT_COLORS.unknown;
}

export const SEGMENT_TYPE_ORDER: SegmentType[] = [
  "system",
  "identity",
  "tools",
  "rag",
  "history-old",
  "history-recent",
  "summary",
  "response",
  "unknown",
];
