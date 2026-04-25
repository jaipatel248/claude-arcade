---
name: super-mario-runner
description: Open Super Mario Runner — an auto-playing pixel arcade game in the browser, driven by this Claude Code session's real-time token throughput, tool calls, and context usage. Trigger only when the user explicitly asks to start, open, launch, or run the arcade/game/Mario.
disable-model-invocation: true
---

# Super Mario Runner

Launch the Super Mario Runner arcade game in your browser. Auto-detects the
current Claude Code session and locks the visualization to it.

## Instructions

The user may provide a port number as the skill argument (e.g. `/claude-arcade:super-mario-runner 4000`).

1. **Validate the port if provided.** It must be an integer between 1024 and 65535. If invalid, tell the user: "Port must be a number between 1024 and 65535." and stop.

2. **Launch the game.** The launcher self-daemonizes (forks itself into the background) and works on macOS, Linux, and Windows — no shell backgrounding tricks needed. Run **one** of these via the Bash tool:

   With a port:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/super-mario-runner.js" --port PORT_NUMBER
   ```

   Default port (3248):
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/super-mario-runner.js"
   ```

   If the server is already running on that port, it just reopens the browser tab.

3. **Tell the user it's running.** Use this exact message (substitute PORT for the actual port — default 3248):

   > Super Mario Runner is now open in your browser at http://localhost:PORT/. The character auto-runs and auto-jumps based on this session's token throughput. To stop the server, run `/claude-arcade:super-mario-runner` with `--stop`, or:
   >
   > ```
   > node "${CLAUDE_PLUGIN_ROOT}/scripts/super-mario-runner.js" --stop --port PORT
   > ```

## Troubleshooting

- **Port already in use by another app:** Re-run the skill with a different port.
- **Server didn't start:** Run the script with `--foreground` to see errors directly in the terminal.
