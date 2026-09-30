#!/usr/bin/env node

/**
 * PreToolUse hook: blocks `git push` unless the user explicitly approved it.
 *
 * How it works:
 * - Runs BEFORE Claude executes any `git push` command
 * - Reads the tool input from stdin (JSON with command details)
 * - Outputs a JSON response to stdout:
 *   - { "decision": "block", "reason": "..." } → push is blocked, Claude sees the reason
 *   - { "decision": "allow" } → push goes through
 *
 * The hook checks if the user's original prompt contains "push".
 * If not, the push is blocked with a message asking for confirmation.
 */

const fs = require('fs');

async function main() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString());

    // Check the tool input for the actual command
    const command = input.tool_input?.command || '';
    const isPush = command.includes('git push');

    if (!isPush) {
      // Not a push command, allow
      console.log(JSON.stringify({ decision: "allow" }));
      process.exit(0);
    }

    // Check if pushing to main/master — extra dangerous
    const isMainPush = command.includes('main') || command.includes('master');
    const isForcePush = command.includes('--force') || command.includes('-f');

    // All pushes require user confirmation — build the reason message
    let reason = "Git push requires explicit user approval. Ask the user to confirm before pushing.";

    if (isForcePush && isMainPush) {
      reason = "Force push to main/master detected. This is extremely dangerous — ask the user to confirm.";
    } else if (isForcePush) {
      reason = "Force push detected. Ask the user to confirm before proceeding.";
    } else if (isMainPush) {
      reason = "Push to main/master (production). Ask the user to confirm before pushing.";
    }

    console.log(JSON.stringify({ decision: "block", reason }));
    process.exit(0);

  } catch {
    // On error, allow (fail-open to not break workflow)
    console.log(JSON.stringify({ decision: "allow" }));
    process.exit(0);
  }
}

main();
