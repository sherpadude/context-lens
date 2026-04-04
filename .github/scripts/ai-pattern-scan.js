#!/usr/bin/env node
/**
 * AI Pattern Scanner for ContextLens
 *
 * Detects patterns that could indicate:
 *   - Prompt injection strings embedded in source code
 *   - Suspicious eval() / Function() usage
 *   - Hard-coded external fetch targets (unexpected APIs)
 *   - Data exfiltration patterns (sending user data externally)
 *
 * Runs as part of the Security Gate on every PR.
 */

const fs = require("fs");
const path = require("path");

const SCAN_DIRS = ["artifacts/context-lens/src", "artifacts/api-server/src"];
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const PATTERNS = [
  {
    name: "Prompt Injection String",
    regex: /ignore (previous|all|above) instructions?/i,
    severity: "HIGH",
    description: "Hard-coded prompt injection attempt detected in source code.",
  },
  {
    name: "Suspicious eval()",
    regex: /\beval\s*\(/,
    severity: "HIGH",
    description: "Use of eval() can lead to arbitrary code execution.",
    allowlist: ["// ai-scan-allow"],
  },
  {
    name: "Dynamic Function Construction",
    regex: /new\s+Function\s*\(/,
    severity: "HIGH",
    description: "Dynamic Function() construction is equivalent to eval().",
    allowlist: ["// ai-scan-allow"],
  },
  {
    name: "Hard-coded External Fetch",
    regex: /fetch\s*\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1)/,
    severity: "MEDIUM",
    description: "ContextLens should be fully client-side with no external API calls. External fetch detected.",
    allowlist: ["// ai-scan-allow-external"],
  },
  {
    name: "XMLHttpRequest to External",
    regex: /XMLHttpRequest|\.open\s*\(\s*['"`](GET|POST)/,
    severity: "MEDIUM",
    description: "Direct XHR usage detected — verify no external data transmission.",
    allowlist: ["// ai-scan-allow-external"],
  },
  {
    name: "Data Exfiltration Pattern",
    regex: /document\.cookie|localStorage\.getItem[^;]*fetch|sendBeacon/,
    severity: "HIGH",
    description: "Potential data exfiltration pattern: reading storage then transmitting externally.",
  },
  {
    name: "Suspicious postMessage",
    regex: /postMessage\s*\(.*\*\s*\)/,
    severity: "MEDIUM",
    description: "postMessage with wildcard targetOrigin can leak data cross-origin.",
  },
  {
    name: "Base64 Obfuscation",
    regex: /atob\s*\(|btoa\s*\(.*eval/,
    severity: "MEDIUM",
    description: "Base64 decode followed by execution suggests code obfuscation.",
  },
  {
    name: "Embedded API Key Pattern",
    regex: /['"`](sk-[a-zA-Z0-9]{32,}|AIza[0-9A-Za-z\-_]{35}|AKIA[0-9A-Z]{16})/,
    severity: "CRITICAL",
    description: "Hard-coded API key pattern detected (OpenAI, Google, AWS).",
  },
];

function getAllFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      results.push(...getAllFiles(full, extensions));
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function scanFile(filePath, patterns) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const findings = [];

  for (const pattern of patterns) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!pattern.regex.test(line)) continue;

      // Check allowlist comments
      if (pattern.allowlist && pattern.allowlist.some((allow) => line.includes(allow))) {
        continue;
      }

      findings.push({
        pattern: pattern.name,
        severity: pattern.severity,
        description: pattern.description,
        file: filePath,
        line: i + 1,
        content: line.trim().slice(0, 120),
      });
    }
  }

  return findings;
}

function main() {
  console.log("🔍 ContextLens AI Pattern Scanner");
  console.log("═".repeat(60));

  const allFiles = SCAN_DIRS.flatMap((dir) => getAllFiles(dir, SCAN_EXTENSIONS));
  console.log(`Scanning ${allFiles.length} files...\n`);

  const allFindings = allFiles.flatMap((f) => scanFile(f, PATTERNS));

  if (allFindings.length === 0) {
    console.log("✅ No suspicious patterns detected. All clear.\n");
    process.exit(0);
  }

  const bySeverity = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
  for (const f of allFindings) {
    (bySeverity[f.severity] || bySeverity.LOW).push(f);
  }

  for (const [sev, findings] of Object.entries(bySeverity)) {
    if (!findings.length) continue;
    const icon = sev === "CRITICAL" ? "🚨" : sev === "HIGH" ? "❌" : "⚠️";
    console.log(`${icon} ${sev} (${findings.length} finding${findings.length > 1 ? "s" : ""})`);
    for (const f of findings) {
      console.log(`   Pattern : ${f.pattern}`);
      console.log(`   File    : ${f.file}:${f.line}`);
      console.log(`   Detail  : ${f.description}`);
      console.log(`   Code    : ${f.content}`);
      console.log();
    }
  }

  const hasCriticalOrHigh = bySeverity.CRITICAL.length + bySeverity.HIGH.length > 0;

  console.log("═".repeat(60));
  if (hasCriticalOrHigh) {
    console.log("❌ Scan FAILED — CRITICAL or HIGH findings must be resolved before merge.");
    process.exit(1);
  } else {
    console.log("⚠️  Scan completed with MEDIUM findings. Review before merge.");
    process.exit(0);
  }
}

main();
