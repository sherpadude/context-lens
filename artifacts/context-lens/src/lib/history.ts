import type { ScoreHistoryEntry, HealthReport } from "../types";

const HISTORY_KEY = "contextlens-history";
const MAX_HISTORY = 10;

export function saveToHistory(report: HealthReport, label: string): void {
  const existing = loadHistory();
  const segmentSummary = report.context.segments
    .map((s) => s.type)
    .reduce<Record<string, number>>((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

  const entry: ScoreHistoryEntry = {
    id: `history-${Date.now()}`,
    label,
    score: report.score,
    scoreLabel: report.scoreLabel,
    timestamp: new Date().toISOString(),
    segmentSummary: Object.entries(segmentSummary)
      .map(([type, count]) => `${count} ${type}`)
      .join(", "),
  };

  const updated = [entry, ...existing].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function loadHistory(): ScoreHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ScoreHistoryEntry[];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
