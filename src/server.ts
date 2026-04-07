import { HttpMiddleware, HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { RecordedEvent } from "./types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexHtml = readFileSync(resolve(__dirname, "../public/index.html"), "utf-8")
const DATA_FILE = resolve(__dirname, "../data/events.jsonl")
const PORT = 3456

const parseLines = (content: string): RecordedEvent[] =>
  content.trim().split("\n").filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line) as RecordedEvent] }
    catch { return [] }
  })

const readEvents = (params: URLSearchParams): Promise<RecordedEvent[]> =>
  readFile(DATA_FILE, "utf-8").then(content => {
    let events = parseLines(content)

    const sid = params.get("session_id")
    if (sid) events = events.filter(e => e.session_id === sid)

    const cwd = params.get("cwd")
    if (cwd) events = events.filter(e => e.cwd === cwd)

    const ev = params.get("event")
    if (ev) events = events.filter(e => e.hook_event_name === ev)

    const since = params.get("since")
    if (since) events = events.filter(e => (e.recorded_at ?? "") > since)

    return events.slice(-(parseInt(params.get("limit") ?? "500")))
  }).catch(() => [])

const readMeta = (): Promise<{ sessions: string[]; cwds: string[]; events: string[] }> =>
  readFile(DATA_FILE, "utf-8").then(content => {
    const events = parseLines(content)
    return {
      sessions: [...new Set(events.map(e => e.session_id).filter((s): s is string => !!s))],
      cwds: [...new Set(events.map(e => e.cwd).filter((s): s is string => !!s))],
      events: [...new Set(events.map(e => e.hook_event_name).filter(Boolean))],
    }
  }).catch(() => ({ sessions: [], cwds: [], events: [] }))

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", Effect.gen(function* () {
    return HttpServerResponse.text(indexHtml, { contentType: "text/html; charset=utf-8" })
  })),
  HttpRouter.get("/api/events", Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const events = yield* Effect.promise(() => readEvents(url.searchParams))
    return yield* HttpServerResponse.json(events)
  })),
  HttpRouter.get("/api/meta", Effect.gen(function* () {
    const meta = yield* Effect.promise(() => readMeta())
    return yield* HttpServerResponse.json(meta)
  }))
)

const HttpLive = router.pipe(
  HttpServer.serve(HttpMiddleware.logger),
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT }))
)

NodeRuntime.runMain(Layer.launch(HttpLive))
