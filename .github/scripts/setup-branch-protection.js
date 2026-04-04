#!/usr/bin/env node
/**
 * setup-branch-protection.js
 *
 * Applies branch protection rules to the context-lens main branch via the
 * GitHub REST API. Run once after cloning or to re-apply rules.
 *
 * Usage:
 *   GITHUB_TOKEN=<pat-with-repo-admin-scope> node .github/scripts/setup-branch-protection.js
 *
 * Required status checks match exactly the job `name:` fields in
 * .github/workflows/security-scan.yml so GitHub can enforce them.
 */

const OWNER = "sherpadude";
const REPO  = "context-lens";
const BRANCH = "main";

const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error("Error: set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN before running.");
  process.exit(1);
}

async function gh(path, method = "GET", body) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  console.log(`Applying branch protection to ${OWNER}/${REPO}@${BRANCH}...\n`);

  // ── 1. Branch protection ──────────────────────────────────────────────────
  // GitHub formats required check names as "<workflow name> / <job display name>".
  // These MUST match exactly the `name:` of the workflow (top-level) and each
  // job's `name:` in the YAML, so GitHub can enforce them as status gates.
  const { status, data } = await gh(`/branches/${BRANCH}/protection`, "PUT", {
    required_status_checks: {
      strict: true, // require branch to be up-to-date before merge
      contexts: [
        // From security-scan.yml (workflow name: "Security Gate")
        "Security Gate / Secret Scanning",        // job name: Secret Scanning
        "Security Gate / Dependency Audit",       // job name: Dependency Audit
        "Security Gate / CodeQL Static Analysis", // job name: CodeQL Static Analysis
        "Security Gate / OSSF Scorecard",         // job name: OSSF Scorecard
        "Security Gate / AI Pattern Scan",        // job name: AI Pattern Scan
        // From merge-gate.yml (workflow name: "Merge Gate — Owner Approval")
        "Merge Gate \u2014 Owner Approval / Await Owner Approval",
      ],
    },
    enforce_admins: true,         // admins are also bound by these protections
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,        // re-review after new commits
      require_code_owner_reviews: true,   // @sherpadude must approve (CODEOWNERS)
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  });

  if (status === 200) {
    console.log("✅ Branch protection applied successfully.");
  } else {
    console.error(`❌ Branch protection failed (${status}): ${data.message}`);
    process.exit(1);
  }

  // ── 2. GitHub Environment: production-merge ───────────────────────────────
  // Get owner user ID first
  const userRes = await fetch(`https://api.github.com/users/${OWNER}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  const user = await userRes.json();

  const envRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/environments/production-merge`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wait_timer: 0,
        reviewers: [{ type: "User", id: user.id }],
        deployment_branch_policy: null,
      }),
    }
  );
  const envData = await envRes.json();
  if (envRes.status === 200) {
    console.log("✅ GitHub Environment 'production-merge' configured with required reviewer.");
  } else {
    console.warn(`⚠️  Environment setup returned ${envRes.status}: ${envData.message}`);
    console.warn("   (Environments with required reviewers need GitHub Pro or Teams.)");
  }

  console.log("\nBranch protection summary:");
  console.log("  • Direct pushes to main:  BLOCKED");
  console.log("  • Admin bypass:           BLOCKED (enforce_admins: true)");
  console.log("  • Required status checks:");
  console.log("      Security Gate / Secret Scanning");
  console.log("      Security Gate / Dependency Audit");
  console.log("      Security Gate / CodeQL Static Analysis");
  console.log("      Security Gate / OSSF Scorecard");
  console.log("      Security Gate / AI Pattern Scan");
  console.log("      Merge Gate — Owner Approval / Await Owner Approval");
  console.log("  • Required reviews:       1 (dismiss stale, require CODEOWNER = @sherpadude)");
  console.log("  • Force pushes:           BLOCKED");
  console.log("  • Branch deletions:       BLOCKED");
}

main();
