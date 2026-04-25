#!/usr/bin/env node
// Claude Arcade — Data Collector
// Reads Claude Code statusLine/hook JSON from stdin, writes to JSONL.
// Zero dependencies — uses only Node.js built-ins.

const fs = require('fs');
const os = require('os');
const path = require('path');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const LIVE_DATA_FILE = path.join(HOME, '.claude', 'token-graph-live.jsonl');
const DEBUG = process.env.CLAUDE_ARCADE_DEBUG === '1';
const DEBUG_FILE = path.join(os.tmpdir(), 'claude-arcade-debug.jsonl');

let input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input.trim());
    if (DEBUG) {
      try {
        fs.appendFileSync(DEBUG_FILE,
          JSON.stringify({ _file: __filename, _ts: Date.now(), ...data }) + '\n');
      } catch {}
    }
    
    // Detect source by hook_event_name or presence of session_id
    const event = (data.hook_event_name || '').toLowerCase();
    if (event === 'permissionrequest' || event === 'elicitation') {
      handleWaitingEvent(data, event);
    } else if (event === 'pretooluse') {
      // AskUserQuestion is about to show options — treat as waiting
      const tool = (data.tool_name || '').toLowerCase();
      if (tool === 'askuserquestion') handleWaitingEvent(data, event);
      else handleToolUse(data); // Signal the game that Claude is actively working
    } else if (event === 'posttooluse') {
      const tool = (data.tool_name || '').toLowerCase();
      if (tool === 'askuserquestion') {
        handleSimpleEvent(data, 'resume');
      } else {
        handleToolUse(data);
      }
    } else if (event === 'posttoolusefailure') {
      handleSimpleEvent(data, 'tool_failure', { tool: data.tool_name || 'unknown' });
    } else if (event === 'stop') {
      handleTaskStop(data);
    } else if (event === 'sessionstart') {
      handleSimpleEvent(data, 'session_start');
    } else if (event === 'sessionend') {
      handleSimpleEvent(data, 'session_end');
    } else if (event === 'subagentstart') {
      handleSimpleEvent(data, 'subagent_start', { agentId: data.agent_id || data.subagent_id || '' });
    } else if (event === 'subagentstop') {
      handleSimpleEvent(data, 'subagent_stop', { agentId: data.agent_id || data.subagent_id || '' });
    } else if (event === 'precompact') {
      handleSimpleEvent(data, 'compact_start');
    } else if (event === 'postcompact') {
      handleSimpleEvent(data, 'compact_end');
    } else if (event === 'userpromptsubmit') {
      handleSimpleEvent(data, 'user_prompt');
    } else if (event === 'taskcreated') {
      handleSimpleEvent(data, 'task_created');
    } else if (event === 'taskcompleted') {
      handleSimpleEvent(data, 'task_completed');
    } else if (data.session_id && !data.hook_event_name) {
      handleStatusLine(data);
    } else if (data.transcript_path) {
      handleStopHook(data);
    }
  } catch {
    // Silently ignore parse errors
  }
});

// Note: This handler is typically not reached when a global statusLine is
// configured in ~/.claude/settings.json (e.g., statusline-wrapper.sh),
// since the global config takes precedence over the plugin's hooks.json
// statusLine. Kept as a fallback if the global override is removed.
function handleStatusLine(data) {
  const entry = {
    ts: Math.floor(Date.now() / 1000),
    type: 'status',
    sessionId: data.session_id || 'unknown',
    contextPct: data.context_window?.used_percentage || 0,
    model: data.model?.display_name || 'unknown',
    costUSD: data.cost?.total_cost_usd || 0,
    totalInput: data.context_window?.total_input_tokens || 0,
    totalOutput: data.context_window?.total_output_tokens || 0,
  };

  // Deduplicate: only write if data changed
  const fingerprint = `${entry.sessionId}:${entry.contextPct}:${entry.totalInput}:${entry.totalOutput}`;
  const lastFingerprint = getLastFingerprint();

  if (fingerprint !== lastFingerprint) {
    appendEntry(entry);
  }
}

function handleToolUse(data) {
  const toolName = data.tool_name || 'unknown';
  const entry = {
    ts: Math.floor(Date.now() / 1000),
    type: 'tool',
    sessionId: data.session_id || 'unknown',
    tool: toolName,
  };
  appendEntry(entry);
}

function handleTaskStop(data) {
  const entry = {
    ts: Math.floor(Date.now() / 1000),
    type: 'stop',
    sessionId: data.session_id || 'unknown',
  };
  appendEntry(entry);
}

function handleWaitingEvent(data, event) {
  const entry = {
    ts: Math.floor(Date.now() / 1000),
    type: 'waiting',
    sessionId: data.session_id || 'unknown',
    event: event,
  };
  appendEntry(entry);
}

function handleSimpleEvent(data, type, extra) {
  const entry = Object.assign({
    ts: Math.floor(Date.now() / 1000),
    type: type,
    sessionId: data.session_id || 'unknown',
  }, extra || {});
  appendEntry(entry);
}

function handleStopHook(data) {
  if (!data.transcript_path || !fs.existsSync(data.transcript_path)) return;

  try {
    const content = fs.readFileSync(data.transcript_path, 'utf-8');
    const lines = content.trim().split('\n');

    // Find last line with usage data
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
      try {
        const line = JSON.parse(lines[i]);
        if (line.usage && typeof line.usage === 'object') {
          const entry = {
            ts: Math.floor(Date.now() / 1000),
            type: 'tokens',
            sessionId: data.session_id || 'unknown',
            input: line.usage.input_tokens || 0,
            output: line.usage.output_tokens || 0,
            cacheRead: line.usage.cache_read_input_tokens || 0,
            cacheCreate: line.usage.cache_creation_input_tokens || 0,
          };
          if (entry.input > 0 || entry.output > 0) {
            appendEntry(entry);
          }
          return;
        }
      } catch {}
    }
  } catch {}
}

function getLastFingerprint() {
  try {
    const content = fs.readFileSync(LIVE_DATA_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return '';
    const last = JSON.parse(lines[lines.length - 1]);
    return `${last.sessionId}:${last.contextPct}:${last.totalInput}:${last.totalOutput}`;
  } catch {
    return '';
  }
}

function appendEntry(entry) {
  try {
    const dir = path.dirname(LIVE_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LIVE_DATA_FILE, JSON.stringify(entry) + '\n');
  } catch {}
}
