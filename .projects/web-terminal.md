# Project: Web Terminal

## Goal
Add interactive terminal support to the agent-server web UI. Clicking a tmux session opens a full terminal in the browser — supporting nvim, colors, resize — by bridging xterm.js over WebSocket to a PTY-spawned `tmux attach`.

## MVP Definition
A user can open `localhost:3456`, see available tmux sessions, click one, and get a working interactive terminal in a modal overlay. They can type commands, run nvim, resize the window, and close the terminal cleanly.

## Status
active

---

## Milestone 1: Backend — WebSocket + PTY bridge
**Status:** pending

### Objective
Stand up a WebSocket endpoint on the existing server that spawns `tmux attach -t <name>` in a pseudo-terminal and bridges I/O to the browser.

### Technical Details
- Add `node-pty` and `ws` dependencies
- Create `src/terminal.ts` exporting `setupTerminalWebSocket(server: http.Server)`
  - `WebSocketServer` attached to the Node HTTP server, filtered to path `/terminal`
  - On connection: parse `?session=<name>`, validate via `tmux has-session -t <name>`
  - Spawn PTY: `pty.spawn('tmux', ['attach', '-t', name], { cols: 80, rows: 24 })`
  - Wire: PTY `onData` → `ws.send()`, `ws.onMessage` → PTY `write()`
  - Handle resize: JSON `{"type":"resize","cols":N,"rows":N}` → `pty.resize()`
  - On close: kill PTY, clean up
- Modify `src/server.ts` to create `http.Server` manually and share it between Effect layer and WebSocket server
- Protocol: client sends raw strings (input) or JSON (control); server sends raw strings (output)

### Acceptance Criteria
- [ ] `node-pty` and `ws` installed and importable
- [ ] `src/terminal.ts` exists with `setupTerminalWebSocket` export
- [ ] `src/server.ts` creates HTTP server manually, passes to both Effect and WS
- [ ] Connecting via `wscat -c ws://localhost:3456/terminal?session=agent-server` attaches to tmux and relays I/O
- [ ] Closing the WebSocket kills the PTY process

### Notes

---

## Milestone 2: Frontend — xterm.js terminal modal
**Status:** pending

### Objective
Render an interactive terminal in the browser using xterm.js inside a full-screen modal overlay.

### Technical Details
- Load xterm.js and fit addon from CDN in `public/index.html`:
  - `@xterm/xterm@5.5.0` (JS + CSS)
  - `@xterm/addon-fit@0.10.0`
- Add terminal modal HTML: fixed overlay, title bar with session name + close button, `#terminal-container`
- Add JS functions:
  - `openTerminal(sessionName)`: show modal, create Terminal instance, connect WebSocket, wire I/O, fit to container
  - `closeTerminal()`: close WebSocket, dispose terminal, hide modal
- Wire resize: on window resize → `fitAddon.fit()` → send resize message to server
- Theme: match existing dark theme (`#0d1117` background)

### Acceptance Criteria
- [ ] xterm.js loads from CDN without errors
- [ ] `openTerminal('agent-server')` opens modal with working terminal
- [ ] Typing in terminal sends input to tmux session
- [ ] Terminal output (colors, cursor movement) renders correctly
- [ ] `closeTerminal()` cleans up all resources
- [ ] Browser resize reflows the terminal

### Notes

---

## Milestone 3: tmux session discovery + UI integration
**Status:** pending

### Objective
Dynamically list available tmux sessions in the web UI and make them clickable to open terminals.

### Technical Details
- New API route `GET /api/tmux/sessions` in `src/server.ts`
  - Runs `tmux list-sessions -F "#{session_name}\t#{session_windows}\t#{session_attached}"`
  - Returns `[{ name, windows, attached }]`
- Update `public/index.html`:
  - New "tmux Sessions" section in the UI (above or alongside Claude session cards)
  - Poll `/api/tmux/sessions` on the same 2s interval
  - Render cards with: session name, window count, attached badge
  - Click handler calls `openTerminal(sessionName)`
  - Distinct styling (different border color) from Claude session cards

### Acceptance Criteria
- [ ] `GET /api/tmux/sessions` returns current tmux sessions as JSON
- [ ] tmux session cards appear in the UI
- [ ] Cards update when tmux sessions are created/destroyed
- [ ] Clicking a tmux card opens the terminal modal for that session
- [ ] Visual distinction between tmux session cards and Claude session cards

### Notes

---

## Milestone 4: Polish and resilience
**Status:** pending

### Objective
Harden the terminal experience for real-world use.

### Technical Details
- Debounce resize events (100ms)
- Send correct initial dimensions on WebSocket open
- On WebSocket close: show "Disconnected" overlay with reconnect button
- Body scroll lock while terminal modal is open
- Auto-focus terminal on open, return focus on close
- Escape key closes terminal (with consideration for nvim — may bind to close button only)

### Acceptance Criteria
- [ ] Rapid browser resizing doesn't flood the server
- [ ] Network disconnect shows reconnect UI (not a blank screen)
- [ ] Page doesn't scroll behind the terminal modal
- [ ] Terminal receives keyboard focus immediately on open
- [ ] Closing terminal returns focus to the main UI

### Notes
