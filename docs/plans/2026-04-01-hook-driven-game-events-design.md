# Hook-Driven Game Events Design

## Overview

Extend Super Mario Runner to leverage all available Claude Code hooks, turning each hook into a distinct visual and audio game event. Currently we use 5 hooks (statusLine, PermissionRequest, Elicitation, PostToolUse, Stop). This design adds 10 more.

## Pipeline Architecture

All hooks flow through the same `scripts/collect.js` script. Each hook type produces a distinct `type` value in the JSONL file. The browser SSE handler routes each type to its game effect.

### New JSONL Event Types

```
subagent_start  -> { type: 'subagent_start', sessionId, agentId }
subagent_stop   -> { type: 'subagent_stop', sessionId, agentId }
tool_failure    -> { type: 'tool_failure', sessionId, tool }
session_start   -> { type: 'session_start', sessionId }
session_end     -> { type: 'session_end', sessionId }
compact_start   -> { type: 'compact_start', sessionId }
compact_end     -> { type: 'compact_end', sessionId }
user_prompt     -> { type: 'user_prompt', sessionId }
task_created    -> { type: 'task_created', sessionId }
task_completed  -> { type: 'task_completed', sessionId }
```

### Files Modified

- `hooks/hooks.json` — add entries for all new hooks
- `scripts/collect.js` — handle new hook_event_name values
- `scripts/super-mario-runner.js` — forward new event types via SSE
- `webview/super-mario-runner.html` — render game effects for each event

## Game Mechanics

### SubagentStart/Stop — Mini Marios

When a subagent spawns, a smaller Mario (60% scale) appears behind the main Mario and runs alongside. Each subagent gets a slightly different color tint. When the subagent finishes, its mini-Mario does a victory jump and fades out. Max 5 mini-Marios on screen; beyond that, a counter badge shows the overflow.

### PostToolUseFailure — Damage

Mario flashes red for 0.5s and stumbles (brief backward slide). A small "X" particle burst appears. Multiple failures in quick succession cause Mario to shrink briefly (like losing a power-up). A failure counter appears in the HUD.

### SessionStart — Game Intro

On first SSE connection, show "GAME START" title with session ID, model name, and a 3-2-1 countdown. Mario drops in from the top. World starts generating after countdown.

### SessionEnd — Game Over

"GAME OVER" screen with final stats: total tokens, coins collected, time elapsed, cost, tools used. Mario does a victory wave. Fireworks for long sessions.

### PreCompact/PostCompact — Context Compression

When compaction starts: warning siren SFX, purple vignette on screen edges, "COMPACTING..." banner. Tiles visually compress horizontally. When done: vignette clears, "REFRESHED!" banner, brief speed boost (lighter context = faster).

### UserPromptSubmit — Power-up Mushroom

A mushroom item spawns on the ground ahead of Mario. When Mario reaches it, brief glow + speed boost. Signals "user gave new instructions."

### TaskCreated — Checkpoint Flag

A small flag plants into the ground when a task is created. Serves as a progress marker in the world.

### TaskCompleted — Victory Lap

Mario does a fist-pump animation, coins burst, and the checkpoint flag waves. Per-task celebration (different from session-level "COMPLETE!").

## Sound Effects

| Hook | Sound |
|------|-------|
| SubagentStart | Pop |
| SubagentStop | Ding |
| PostToolUseFailure | Error buzz |
| SessionStart | Fanfare |
| SessionEnd | End jingle |
| PreCompact | Siren |
| PostCompact | Chime |
| UserPromptSubmit | Pop |
| TaskCreated | Click |
| TaskCompleted | Celebration |

## Implementation Order

1. Update `hooks/hooks.json` with all new hook entries
2. Update `collect.js` to handle new event names
3. Update `super-mario-runner.js` to forward new event types via SSE
4. Implement browser-side effects one by one:
   a. SessionStart/End (intro/outro screens)
   b. SubagentStart/Stop (mini Marios)
   c. PostToolUseFailure (damage)
   d. PreCompact/PostCompact (compression warning)
   e. UserPromptSubmit (mushroom power-up)
   f. TaskCreated/Completed (checkpoint flags)
5. Add sound effects for each event
