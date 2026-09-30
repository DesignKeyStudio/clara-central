#!/usr/bin/env node

/**
 * Changelog Hook for Claude Code
 * Tracks all changes made during a session and logs them to JSONL files.
 *
 * Handles three types of entries:
 * - task: User prompts (from UserPromptSubmit hook)
 * - change: File modifications (from PostToolUse for Write|Edit|MultiEdit)
 * - summary: Session completion with LLM's final output (from Stop hook)
 */

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Read JSON input from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString());

    // Get project directory from env or use current working directory
    const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
    const changelogsDir = path.join(projectDir, '.claude', 'changelogs');

    // Ensure changelogs directory exists
    if (!fs.existsSync(changelogsDir)) {
      fs.mkdirSync(changelogsDir, { recursive: true });
    }

    // Get session ID and create date-prefixed filename for easy sorting
    const sessionId = input.session_id || 'unknown';
    const now = new Date();
    const datePrefix = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(changelogsDir, `${datePrefix}-session-${sessionId}.jsonl`);

    // Create the log entry based on hook type
    let entry = null;
    const timestamp = new Date().toISOString();

    if (input.hook_event_name === 'UserPromptSubmit') {
      // Task entry: user prompt (includes plan mode prompts)
      entry = {
        timestamp,
        type: 'task',
        mode: input.permission_mode || 'default',
        prompt: input.prompt || ''
      };
    } else if (input.hook_event_name === 'PostToolUse') {
      // Change entry: file modification
      const toolName = input.tool_name || input.tool?.name || '';
      const toolInput = input.tool_input || input.tool?.input || {};

      // Only log Write, Edit, or MultiEdit tools
      if (/^(Write|Edit|MultiEdit)$/.test(toolName)) {
        const absolutePath = toolInput.file_path || toolInput.filePath || '';
        // Convert to relative path with forward slashes (consistent across platforms)
        const relativePath = absolutePath
          ? path.relative(projectDir, absolutePath).split(path.sep).join('/')
          : '';

        // Generate description based on tool type
        let description = '';
        if (toolName === 'Write') {
          description = 'File written';
        } else if (toolName === 'Edit') {
          description = toolInput.old_string
            ? `Replaced "${truncate(toolInput.old_string, 50)}" with "${truncate(toolInput.new_string, 50)}"`
            : 'File edited';
        } else if (toolName === 'MultiEdit') {
          const editCount = Array.isArray(toolInput.edits) ? toolInput.edits.length : 0;
          description = `${editCount} edit(s) applied`;
        }

        entry = {
          timestamp,
          type: 'change',
          tool: toolName,
          file: relativePath,
          description
        };
      }
    } else if (input.hook_event_name === 'Stop') {
      // Summary entry: session completion with LLM's final output
      const summary = extractLastAssistantMessage(input.transcript_path);
      entry = {
        timestamp,
        type: 'summary',
        output: summary
      };
    }

    // Write entry to log file if we have one
    if (entry) {
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
    }

    // Exit successfully
    process.exit(0);
  } catch (error) {
    // Fail silently to not break workflow
    process.exit(0);
  }
}

/**
 * Extract the last assistant message from the transcript file
 */
function extractLastAssistantMessage(transcriptPath) {
  if (!transcriptPath) return 'Session ended';

  try {
    // Expand ~ to home directory if needed
    const expandedPath = transcriptPath.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '');

    if (!fs.existsSync(expandedPath)) return 'Session ended';

    const content = fs.readFileSync(expandedPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    // Read from the end to find the last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const message = JSON.parse(lines[i]);
        if (message.type === 'assistant' || message.role === 'assistant') {
          // Extract text content from the message
          const text = extractTextContent(message);
          if (text) {
            return truncate(text, 500);
          }
        }
      } catch {
        // Skip malformed lines
        continue;
      }
    }

    return 'Session ended';
  } catch {
    return 'Session ended';
  }
}

/**
 * Extract text content from an assistant message
 */
function extractTextContent(message) {
  // Handle different message formats
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    // Find text blocks in content array
    const textBlocks = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    return textBlocks || null;
  }

  if (message.message?.content) {
    return extractTextContent(message.message);
  }

  return null;
}

/**
 * Truncate a string to a maximum length
 */
function truncate(str, maxLength) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

main();
