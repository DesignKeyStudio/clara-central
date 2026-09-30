#!/usr/bin/env node
/**
 * gather-changes.mjs
 * Collect the raw material for a changelog entry and print it as JSON.
 *
 * It does NOT write the changelog — curation into user-facing release notes is the
 * model's job (see SKILL.md). This script only gathers reliably:
 *   - git commits in a range (subject/body/date/author + parsed conventional type)
 *   - a name-status file list + diffstat for the range
 *   - the latest tag (for versioning hints)
 *   - the current Claude Code session's user prompts (intent context), if available
 *
 * Flags (all optional):
 *   --since  "<ref|date>"   Range start. Default: latest tag, else HEAD~30 (or root).
 *   --until  "<ref>"        Range end. Default: HEAD.
 *   --root   "<dir>"        Repo directory. Default: cwd.
 *   --no-session            Skip reading the session transcript.
 *   --max    <n>            Cap the number of commits returned (default 200).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const has = (n) => argv.includes(n);

const root = path.resolve(flag("--root") || process.cwd());
const until = flag("--until") || "HEAD";
const maxCommits = Number(flag("--max") || 200);

const git = (args) => {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const die = (m) => { console.error("gather-changes: " + m); process.exit(1); };

if (!git(["rev-parse", "--is-inside-work-tree"])) die(`not a git repository: ${root}`);

// ---------- resolve the range start ----------
const latestTag = git(["describe", "--tags", "--abbrev=0"]) || null;
let since = flag("--since");
if (!since) {
  if (latestTag) since = latestTag;
  else {
    // No tags — use the last 30 commits, or the root commit if the history is shorter.
    const count = Number(git(["rev-list", "--count", until]) || "0");
    since = count > 30 ? git(["rev-parse", `${until}~30`]) : git(["rev-list", "--max-parents=0", until]).split("\n")[0];
  }
}
const range = since ? `${since}..${until}` : until;

// ---------- commits ----------
// Records split on \x1e, fields split on \x1f — safe against newlines in bodies.
const FMT = ["%H", "%h", "%aI", "%an", "%s", "%b"].join("%x1f");
const raw = git(["log", `--pretty=format:${FMT}%x1e`, "--no-merges", range]);
const CONVENTIONAL = /^(feat|fix|hotfix|perf|refactor|cleanup|docs|spec|tests|task|ticket|cr|chore|build|ci|style|revert)(\([^)]*\))?!?:/i;

const commits = raw
  ? raw.split("\x1e").map((r) => r.trim()).filter(Boolean).slice(0, maxCommits).map((rec) => {
      const [hash, shortHash, date, author, subject, body] = rec.split("\x1f");
      const m = (subject || "").match(CONVENTIONAL);
      return {
        hash, shortHash, date, author,
        subject: (subject || "").trim(),
        body: (body || "").trim(),
        type: m ? m[1].toLowerCase() : null,
        breaking: /!:/.test(subject || "") || /BREAKING CHANGE/.test(body || ""),
      };
    })
  : [];

// ---------- files + diffstat for the range ----------
const nameStatus = git(["diff", "--name-status", range]);
const files = nameStatus
  ? nameStatus.split("\n").filter(Boolean).map((l) => {
      const [status, ...rest] = l.split("\t");
      return { status: status[0], path: rest.join("\t") };
    })
  : [];

let diffstat = { filesChanged: 0, insertions: 0, deletions: 0 };
const shortstat = git(["diff", "--shortstat", range]);
if (shortstat) {
  const f = shortstat.match(/(\d+) files? changed/);
  const i = shortstat.match(/(\d+) insertions?/);
  const d = shortstat.match(/(\d+) deletions?/);
  diffstat = {
    filesChanged: f ? +f[1] : 0,
    insertions: i ? +i[1] : 0,
    deletions: d ? +d[1] : 0,
  };
}

// ---------- current session prompts (intent context) ----------
let session = null;
if (!has("--no-session") && process.env.CLAUDE_CODE_SESSION_ID) {
  const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const projectsDir = path.join(configDir, "projects");
  let transcript = null;
  if (fs.existsSync(projectsDir)) {
    for (const d of fs.readdirSync(projectsDir)) {
      const c = path.join(projectsDir, d, sessionId + ".jsonl");
      if (fs.existsSync(c)) { transcript = c; break; }
    }
  }
  if (transcript) {
    const strip = (s) => String(s ?? "")
      .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
      .replace(/<command-[a-z-]+>[\s\S]*?<\/command-[a-z-]+>/g, "")
      .trim();
    const prompts = [];
    for (const line of fs.readFileSync(transcript, "utf8").split("\n").filter(Boolean)) {
      let e; try { e = JSON.parse(line); } catch { continue; }
      if (e.type !== "user" || !e.message) continue;
      const c = e.message.content;
      const text = strip(typeof c === "string" ? c : Array.isArray(c) ? c.filter((b) => b.type === "text").map((b) => b.text).join("\n") : "");
      if (text) prompts.push(text.length > 500 ? text.slice(0, 500) + " …" : text);
    }
    session = { id: sessionId, prompts };
  }
}

const out = {
  root,
  range: { since, until, expr: range, latestTag },
  commitCount: commits.length,
  commits,
  diffstat,
  files,
  session,
  generatedAt: new Date().toISOString(),
};

process.stdout.write(JSON.stringify(out, null, 2) + "\n");
