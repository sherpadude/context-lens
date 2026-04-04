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
  // Required status check names MUST match the `name:` field of each job in
  // .github/workflows/security-scan.yml exactly (GitHub uses the display name).
  const { status, data } = await gh(`/branches/${BRANCH}/protection`, "PUT", {
    required_status_checks: {
      strict: true, // require branch to be up-to-date before merge
      contexts: [
        "Secret Scanning",        // job: secret-scan
        "Dependency Audit",       // job: dependency-audit
        "CodeQL Static Analysis", // job: codeql
        "OSSF Scorecard",         // job: scorecard
        "AI Pattern Scan",        // job: ai-pattern-scan
        "Await Owner Approval",   // job: await-owner-approval (merge-gate.yml)
      ],
    },
    enforce_admins: false,        // owner can bypass for hotfixes
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,        // re-review after new commits
      require_code_owner_reviews: true,   // @sherpadude must approve (CODEOWNERS)
    },
    restrictions: null,           // no team/user push restrictions beyond PR gate
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
  console.log("  • Required status checks: Secret Scanning, Dependency Audit,");
  console.log("                            CodeQL Static Analysis, OSSF Scorecard,");
  console.log("                            AI Pattern Scan, Await Owner Approval");
  console.log("  • Required reviews:       1 (dismiss stale, require CODEOWNER)");
  console.log("  • Force pushes:           BLOCKED");
  console.log("  • Branch deletions:       BLOCKED");
}

main();
