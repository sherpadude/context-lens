import type { ContextSegment, ContextWindow, ModelId, SegmentType } from "../types";
import { estimateTokens } from "./tokenizer";
import { MODELS } from "./models";

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool" | "function";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
}

function classifySegment(
  msg: OpenAIMessage,
  index: number,
  totalMessages: number
): SegmentType {
  if (msg.role === "system") {
    const content = msg.content?.toLowerCase() || "";
    if (
      content.includes("identity") ||
      content.includes("persona") ||
      content.includes("you are") ||
      content.includes("soul") ||
      content.includes("personality") ||
      content.includes("values:")
    ) {
      return "identity";
    }
    return "system";
  }

  if (msg.role === "tool" || msg.name?.startsWith("tool")) {
    const content = msg.content?.toLowerCase() || "";
    if (content.length > 500) return "rag";
    return "tools";
  }

  if (msg.role === "user" || msg.role === "assistant") {
    const historyThreshold = Math.floor(totalMessages * 0.6);
    if (index < historyThreshold) return "history-old";
    return "history-recent";
  }

  return "unknown";
}

function detectFailedAttempt(msg: OpenAIMessage): boolean {
  const content = (msg.content || "").toLowerCase();
  const failureKeywords = [
    "i made an error",
    "i apologize",
    "let me correct",
    "that was wrong",
    "incorrect",
    "i was wrong",
    "let me try again",
    "my mistake",
    "failed to",
    "error occurred",
  ];
  return failureKeywords.some((kw) => content.includes(kw));
}

function messageToSegment(
  msg: OpenAIMessage,
  index: number,
  totalMessages: number
): ContextSegment {
  const content = Array.isArray(msg.content)
    ? msg.content.map((c: { text?: string }) => c.text || "").join(" ")
    : msg.content || "";

  const type = classifySegment(msg, index, totalMessages);
  const isFailedAttempt = detectFailedAttempt(msg);

  return {
    id: `seg-${index}`,
    type,
    label: getLabelForType(type, msg, index),
    content,
    tokenCount: estimateTokens(content),
    turnIndex: index,
    metadata: {
      role: msg.role,
      isFailedAttempt,
      isToolResult: msg.role === "tool",
      isRAGChunk: type === "rag",
      isIdentityFile: type === "identity",
    },
  };
}

function getLabelForType(type: SegmentType, msg: OpenAIMessage, index: number): string {
  switch (type) {
    case "system": return "System Prompt";
    case "identity": return "Identity / Soul File";
    case "tools": return `Tool Result`;
    case "rag": return `RAG Document`;
    case "history-recent": return `Turn ${index} (Recent)`;
    case "history-old": return `Turn ${index} (Old)`;
    case "response": return "Response";
    case "summary": return "Compressed Summary";
    default: return `Message ${index}`;
  }
}

export function parseOpenAIFormat(
  input: string,
  model: ModelId = "gpt4o"
): ContextWindow | null {
  try {
    const parsed = JSON.parse(input);
    const messages: OpenAIMessage[] = Array.isArray(parsed)
      ? parsed
      : parsed.messages || parsed.conversation || null;

    if (!messages) return null;

    const segments: ContextSegment[] = messages.map((msg, i) =>
      messageToSegment(msg, i, messages.length)
    );

    const totalTokens = segments.reduce((sum, s) => sum + s.tokenCount, 0);

    return {
      segments,
      totalTokens,
      modelMaxTokens: MODELS[model].maxTokens,
      model,
    };
  } catch {
    return null;
  }
}

export function parsePlainText(
  input: string,
  model: ModelId = "gpt4o"
): ContextWindow {
  const segments: ContextSegment[] = [
    {
      id: "seg-0",
      type: "system",
      label: "Pasted Content",
      content: input,
      tokenCount: estimateTokens(input),
      turnIndex: 0,
      metadata: {},
    },
  ];

  const totalTokens = segments.reduce((sum, s) => sum + s.tokenCount, 0);

  return {
    segments,
    totalTokens,
    modelMaxTokens: MODELS[model].maxTokens,
    model,
  };
}

export function parseInput(input: string, model: ModelId = "gpt4o"): ContextWindow {
  const trimmed = input.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = parseOpenAIFormat(input, model);
    if (parsed) return parsed;
  }
  return parsePlainText(input, model);
}

export function scenarioToContextWindow(
  turns: { role: string; content: string; metadata?: Record<string, boolean | string | number> }[],
  identityFile: string | undefined,
  model: ModelId,
  playUntilTurn?: number
): ContextWindow {
  const activeTurns = playUntilTurn !== undefined ? turns.slice(0, playUntilTurn + 1) : turns;
  const segments: ContextSegment[] = [];

  if (identityFile) {
    segments.push({
      id: "identity-0",
      type: "identity",
      label: "Identity / Soul File",
      content: identityFile,
      tokenCount: estimateTokens(identityFile),
      metadata: { isIdentityFile: true },
    });
  }

  const totalTurns = activeTurns.length;
  activeTurns.forEach((turn, i) => {
    const type = classifyTurnType(turn, i, totalTurns);
    segments.push({
      id: `turn-${i}`,
      type,
      label: getLabelForType(type, { role: turn.role as OpenAIMessage["role"], content: turn.content }, i),
      content: turn.content,
      tokenCount: estimateTokens(turn.content),
      turnIndex: i,
      metadata: turn.metadata || {},
    });
  });

  const totalTokens = segments.reduce((sum, s) => sum + s.tokenCount, 0);

  return {
    segments,
    totalTokens,
    modelMaxTokens: MODELS[model].maxTokens,
    model,
  };
}

function classifyTurnType(
  turn: { role: string; content: string; metadata?: Record<string, boolean | string | number> },
  index: number,
  totalTurns: number
): SegmentType {
  if (turn.metadata?.isFailedAttempt) return "history-old";
  if (turn.role === "system") return "system";
  if (turn.role === "tool") return "tools";
  const threshold = Math.floor(totalTurns * 0.6);
  if (index < threshold) return "history-old";
  return "history-recent";
}
