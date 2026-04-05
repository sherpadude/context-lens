#!/usr/bin/env node
/**
 * Auto-Fix Audit Script
 * Reads `pnpm audit --json` output, extracts all high/critical vulnerabilities,
 * and writes safe version overrides into the root package.json.
 * Run `pnpm install` after this script to regenerate the lockfile.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PKG_PATH = path.join(__dirname, "../../package.json");

function runAudit() {
  try {
    execSync("pnpm audit --json --audit-level=high 2>/dev/null", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log("✅ No high-severity vulnerabilities found. Nothing to fix.");
    process.exit(0);
  } catch (err) {
    // pnpm audit exits non-zero when vulnerabilities are found
    return err.stdout || "";
  }
}

function parseVulnerabilities(auditOutput) {
  const overrides = {};
  let parsed;

  try {
    parsed = JSON.parse(auditOutput);
  } catch {
    console.error("Could not parse audit JSON output.");
    return overrides;
  }

  // pnpm audit --json uses advisories key (npm v6 format) or vulnerabilities (v7+ format)
  const advisories =
    parsed.advisories ||
    (parsed.vulnerabilities
      ? Object.fromEntries(Object.entries(parsed.vulnerabilities))
      : {});

  for (const [, adv] of Object.entries(advisories)) {
    const severity = adv.severity || adv.cvss?.score;
    if (!["high", "critical"].includes(severity)) continue;

    const name = adv.module_name || adv.name;
    const patched = adv.patched_versions || adv.fixAvailable?.version;

    if (!name) continue;

    if (patched && patched !== "<0.0.0" && patched !== "*") {
      // Convert ">=2.3.2" style ranges to an override value
      overrides[name] = patched;
      console.log(`  📦 ${name}: override → "${patched}" (was vulnerable)`);
    } else {
      console.log(
        `  ⚠️  ${name}: no patched version available — manual fix needed`
      );
    }
  }

  return overrides;
}

function applyOverrides(overrides) {
  if (Object.keys(overrides).length === 0) {
    console.log("No overrides to apply.");
    return false;
  }

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
  pkg.pnpm = pkg.pnpm || {};
  pkg.pnpm.overrides = { ...(pkg.pnpm.overrides || {}), ...overrides };

  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
  console.log("\n✅ Applied overrides to package.json:");
  console.log(JSON.stringify(pkg.pnpm.overrides, null, 2));
  return true;
}

function regenerateLockfile() {
  console.log("\n🔄 Regenerating lockfile with patched versions...");
  try {
    execSync("pnpm install", { stdio: "inherit", cwd: path.join(__dirname, "../..") });
    console.log("✅ Lockfile updated.");
  } catch (err) {
    console.error("❌ pnpm install failed:", err.message);
    process.exit(1);
  }
}

function verifyFix() {
  console.log("\n🔍 Verifying audit passes after fix...");
  try {
    execSync("pnpm audit --audit-level=high", {
      stdio: "inherit",
      cwd: path.join(__dirname, "../.."),
    });
    console.log("✅ All high-severity vulnerabilities resolved!");
    return true;
  } catch {
    console.log("⚠️  Some vulnerabilities remain (may need manual review).");
    return false;
  }
}

// Main
console.log("🔍 Running dependency audit...\n");
const auditOutput = runAudit();

console.log("📋 Parsing vulnerabilities...");
const overrides = parseVulnerabilities(auditOutput);

const changed = applyOverrides(overrides);
if (changed) {
  regenerateLockfile();
  const allClear = verifyFix();
  process.exit(allClear ? 0 : 2); // exit 2 = partial fix (human may need to review)
} else {
  console.log("\n✅ Nothing to patch automatically.");
  process.exit(0);
}
