import { WebSocketServer, type WebSocket } from "ws"
import * as pty from "node-pty"
import { execSync } from "node:child_process"
import { createServer } from "node:http"

export function setupTerminalWebSocket(port: number): void {
  const server = createServer((_req, res) => {
    res.writeHead(426)
    res.end("WebSocket only")
  })
  const wss = new WebSocketServer({ server })

  server.listen(port, () => {
    console.log(`[terminal] WebSocket server listening on port ${port}`)
  })

  wss.on("connection", (ws: WebSocket, req) => {
    const url = new URL(req.url ?? "/", "http://localhost")
    const sessionName = url.searchParams.get("session")

    if (!sessionName) {
      ws.send("\r\n\x1b[31mError: no session name provided\x1b[0m\r\n")
      ws.close()
      return
    }

    try {
      execSync(`tmux has-session -t ${JSON.stringify(sessionName)}`, { stdio: "ignore" })
    } catch {
      ws.send(`\r\n\x1b[31mError: tmux session "${sessionName}" not found\x1b[0m\r\n`)
      ws.close()
      return
    }

    const cols = parseInt(url.searchParams.get("cols") ?? "80")
    const rows = parseInt(url.searchParams.get("rows") ?? "24")

    console.log("[terminal] spawning tmux attach -t", sessionName, "cols:", cols, "rows:", rows)

    let term: pty.IPty
    try {
      const env = { ...process.env } as Record<string, string>
      delete env.TMUX
      delete env.TMUX_PANE
      term = pty.spawn("tmux", ["attach", "-t", sessionName], {
        name: "xterm-256color",
        cols,
        rows,
        cwd: process.env.HOME ?? "/",
        env,
      })
      console.log("[terminal] pty spawned, pid:", term.pid)
    } catch (e) {
      console.error("[terminal] pty spawn failed:", e)
      ws.send(`\r\n\x1b[31mError spawning terminal: ${e}\x1b[0m\r\n`)
      ws.close()
      return
    }

    term.onData((data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data)
      }
    })

    term.onExit(({ exitCode }) => {
      console.log("[terminal] pty exited, code:", exitCode)
      if (ws.readyState === ws.OPEN) {
        ws.close()
      }
    })

    ws.on("message", (msg) => {
      const str = msg.toString()
      if (str.startsWith("{")) {
        try {
          const parsed = JSON.parse(str)
          if (parsed.type === "resize" && parsed.cols && parsed.rows) {
            term.resize(parsed.cols, parsed.rows)
            return
          }
        } catch { /* not JSON, treat as input */ }
      }
      term.write(str)
    })

    ws.on("close", () => {
      term.kill()
    })
  })
}
