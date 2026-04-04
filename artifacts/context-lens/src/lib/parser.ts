import type { ContextSegment, ContextWindow, ModelId, SegmentType } from "../types";
import { estimateTokens } from "./tokenizer";
import { MODELS } from "./models";

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool" | "function";
  content: string | null | Array<{ type: string; text?: string }>;
  name?: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
}

/** Anthropic SDK / Messages API format */
interface AnthropicFormat {
  model?: string;
  system?: string | Array<{ type: string; text: string }>;
  messages: Array<{
    role: "user" | "assistant";
    content: string | Array<{ type: string; text?: string }>;
  }>;
}

function extractText(
  content: string | null | Array<{ type: string; text?: string }>
): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content.map((c) => c.text || "").join(" ");
}

function classifySegment(
  msg: OpenAIMessage,
  index: number,
  totalMessages: number
): SegmentType {
  if (msg.role === "system") {
    const content = extractText(msg.content).toLowerCase();
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
    const content = extractText(msg.content).toLowerCase();
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
  const content = extractText(msg.content).toLowerCase();
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
  const content = extractText(msg.content);
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
    case "tools": return "Tool Result";
    case "rag": return "RAG Document";
    case "history-recent": return `Turn ${index} (Recent)`;
    case "history-old": return `Turn ${index} (Old)`;
    case "response": return "Response";
    case "summary": return "Compressed Summary";
    default: return `Message ${index}`;
  }
}

/** Detect and parse Anthropic Messages API format */
function isAnthropicFormat(parsed: unknown): parsed is AnthropicFormat {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  const obj = parsed as Record<string, unknown>;
  return Array.isArray(obj.messages) && ("system" in obj || "model" in obj);
}

function parseAnthropicFormat(parsed: AnthropicFormat, model: ModelId): ContextWindow {
  const segments: ContextSegment[] = [];

  // Add system field as system/identity segment if present
  if (parsed.system) {
    const systemText =
      typeof parsed.system === "string"
        ? parsed.system
        : parsed.system.map((b) => b.text || "").join(" ");
    const lc = systemText.toLowerCase();
    const segType: SegmentType =
      lc.includes("identity") ||
      lc.includes("persona") ||
      lc.includes("you are") ||
      lc.includes("soul") ||
      lc.includes("values:")
        ? "identity"
        : "system";
    segments.push({
      id: "seg-system",
      type: segType,
      label: segType === "identity" ? "Identity / Soul File" : "System Prompt",
      content: systemText,
      tokenCount: estimateTokens(systemText),
      turnIndex: -1,
      metadata: { isIdentityFile: segType === "identity" },
    });
  }

  const msgs = parsed.messages;
  msgs.forEach((msg, i) => {
    const openAIMsg: OpenAIMessage = {
      role: msg.role,
      content: msg.content,
    };
    segments.push(messageToSegment(openAIMsg, i, msgs.length));
  });

  const totalTokens = segments.reduce((sum, s) => sum + s.tokenCount, 0);
  return {
    segments,
    totalTokens,
    modelMaxTokens: MODELS[model].maxTokens,
    model,
  };
}

/** Parse JSONL (one JSON object per line) as a conversation */
function parseJSONL(input: string, model: ModelId): ContextWindow | null {
  const lines = input.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;
  try {
    const parsed = lines.map((l) => JSON.parse(l));
    // Expect each line to have a role field (OpenAI-like)
    if (!parsed.every((p) => typeof p.role === "string")) return null;
    const messages = parsed as OpenAIMessage[];
    const segments = messages.map((msg, i) => messageToSegment(msg, i, messages.length));
    const totalTokens = segments.reduce((sum, s) => sum + s.tokenCount, 0);
    return { segments, totalTokens, modelMaxTokens: MODELS[model].maxTokens, model };
  } catch {
    return null;
  }
}

export function parseOpenAIFormat(
  input: string,
  model: ModelId = "gpt4o"
): ContextWindow | null {
  try {
    const parsed = JSON.parse(input);

    // Anthropic format: { system?, messages: [...] }
    if (isAnthropicFormat(parsed)) {
      return parseAnthropicFormat(parsed, model);
    }

    // OpenAI / generic array or { messages: [...] }
    const messages: OpenAIMessage[] | null = Array.isArray(parsed)
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

  // Try JSONL first (multi-line, starts with {)
  if (trimmed.startsWith("{") && trimmed.includes("\n")) {
    const jsonl = parseJSONL(trimmed, model);
    if (jsonl) return jsonl;
  }

  // Try JSON (array or object)
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
