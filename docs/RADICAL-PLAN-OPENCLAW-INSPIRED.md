# Radical Plan: OpenClaw-Inspired Evolution of LLM Chat

**Version:** 0.1  
**Last modified:** 2025-02-26  
**Status:** Draft — strategic options, not committed roadmap

This document compares [OpenClaw](https://github.com/openclaw/openclaw) with LLM Chat and proposes a **radical** direction: better MCP connectivity, leaner orchestration, and coding improvements so the project can scale without carrying legacy weight.

---

## 1. Why OpenClaw as a North Star?

OpenClaw is a **personal AI gateway** (233k+ stars): multi-channel (WhatsApp, Telegram, Slack, Discord, iMessage, etc.), single WebSocket control plane, Pi agent in RPC mode, skills/plugins, and **MCP via an external bridge** ([mcporter](https://github.com/steipete/mcporter)) rather than first-class in core.

| Dimension | OpenClaw | LLM Chat (current) |
|-----------|----------|----------------------|
| **MCP** | mcporter bridge: discover Cursor/Claude/Codex configs, call MCPs as TypeScript/CLI; add servers without restart | In-process MCP server; tools hardcoded in `mcpService.js`; manual tool list + mapping |
| **Orchestration** | Single Gateway, session-based routing, one primary agent (Pi); no manager-of-managers | Partner–Principal–Associate consulting + multi-avatar chat; heavy custom orchestration |
| **Tools/skills** | Skills in workspace/ClawHub; plugins as npm packages; one active memory plugin | Tools = MCP tools only; avatars get “enabled tools” from same server; no skill format |
| **Stack** | TypeScript-first, Node 22+, protocol gen (TypeBox), Vitest e2e, plugin SDK | Mixed JS/TS, two Redux stores, Jest backend-only tests |
| **Channels** | Many (WhatsApp, Telegram, Slack, …) + WebChat | Web only |
| **Security** | DM pairing, allowlists, sandbox for non-main sessions, explicit knobs | API keys in settings; no formal sandbox or pairing model |

We are **not** proposing to become OpenClaw. We are proposing to **adopt patterns** that make LLM Chat more flexible, maintainable, and aligned with where the ecosystem is going (MCP as external, orchestration lean, skills/plugins explicit).

---

## 2. Strategic Pillars

### Pillar A: MCP as a bridge, not a monolith

**Current:** Every tool lives in `backend/services/mcpService.js`. Adding a new MCP server means editing that file, registering tools, and restarting the backend. Yahoo Finance and SEC are real; Google Maps and Weather are mocks. Tool list and `executeFunction` mapping are hand-maintained.

**OpenClaw’s approach ([VISION.md](https://github.com/openclaw/openclaw/blob/main/VISION.md)):** MCP via [mcporter](https://github.com/steipete/mcporter). Benefits:

- Discover MCP servers from `~/.mcporter`, Cursor/Claude/Codex configs, project config.
- Add or change MCP servers **without restarting** the gateway.
- Call MCP tools via typed clients or CLI; optional `emit-ts` for codegen.
- Keeps core lean; MCP churn stays in the bridge.

**Radical direction:**

1. **Introduce an MCP bridge layer** instead of (or in front of) the in-process MCP server.
   - **Option A — Use mcporter:** Run mcporter as a subprocess or use its Node API (if exposed). Our backend asks mcporter “list tools for server X” and “call server X, tool Y, args Z”. Our chat/consulting flows call this bridge instead of `mcpServer.executeFunction`.
   - **Option B — Thin MCP gateway in our repo:** A small service that:
     - Reads MCP server config from env + optional config file (e.g. `~/.llm-chat/mcp.json` or project `mcp.json`).
     - For each configured server (HTTP/stdio), maintains a connection and exposes a single API: `GET /mcp/tools` (aggregated or per-server) and `POST /mcp/call` (server, tool, args). Our backend and frontend use this instead of talking to one big in-process server.
   - In both options, **Yahoo Finance and SEC** can become “first-party” MCP servers we ship (e.g. small stdio or HTTP servers) or remain as special-case tools in the bridge that map to our existing implementations. Either way, they are no longer the only way to add capabilities.

2. **Tool discovery and schema at runtime.** Today we have a static `getAvailableTools()` and `getFunctionDefinitions()`. With a bridge, we derive these from the MCP servers we connect to (and optionally cache). Avatars’ “enabled tools” become “enabled MCP servers + tool names” or “enabled tool IDs” that the bridge can resolve.

3. **No more hand-maintained tool mapping.** The bridge returns tool schemas (name, args, description). We pass those to OpenAI/Claude as function definitions. When the model returns a tool call, we send (server, tool, args) to the bridge. No `toolMapping` object in our code.

**Concrete steps (Phase 1):**

- [x] Spike: Run mcporter from Node (subprocess/API path). Result: blocked in this environment by Node version (`v18`) while current mcporter requires Node `>=20`; bridge now detects incompatibility and falls back to internal adapter unless strict mode is enabled.
- [ ] Decide: mcporter vs. thin in-repo MCP gateway. Document decision (e.g. in PRD or ADR).
- [x] Implement bridge in backend: `mcpBridge.js` with `listTools()`, `getFunctionDefinitions()`, `callTool()`, `executeFunction()` (default delegates to `mcpService`).
- [x] Replace direct `mcpServer` in OpenAI/Claude, avatarService, consulting agents, chooseAvatar with bridge. Routes keep `mcpService` for SSE and SEC.
- [ ] Move Yahoo/SEC either into small MCP servers or into bridge “adapters” that the bridge knows about. Prefer one pattern for all tools long term.

---

### Pillar B: Leaner orchestration — sessions and tools, not fixed hierarchies

**Current:** We have two heavy orchestration paths:

1. **Chat:** Multi-avatar; `queryDispatcher` → avatarService or teamCollaborationService; each avatar can call MCP tools; responses aggregated.
2. **Consulting:** Partner → Principal → Associate pool; phases and work modules; DB and WebSocket; all agents can use the same MCP tools.

OpenClaw deliberately avoids “agent-hierarchy frameworks (manager-of-managers / nested planner trees) as a default architecture” and “heavy orchestration layers that duplicate existing agent and tool infrastructure.” They use **sessions** and **routing** (who gets which message, which workspace) and one primary agent (Pi) that has tools and memory.

**Radical direction:**

1. **Session-centric model.** One “session” = one conversation context, one set of tools (from bridge), one model (or model choice). “Virtual team” can be modeled as:
   - **Option 1:** One session per “room”; the room has a single agent that can use multiple “personas” or tools (simpler).
   - **Option 2:** One session per avatar, but the backend treats them as parallel tool-calling sessions and merges responses (closer to today, but we simplify the dispatcher and avoid duplicating tool-calling logic in many places).

2. **Consulting as a tool or flow, not a fixed trio.** Instead of a mandatory Partner–Principal–Associate pipeline:
   - **Option A:** “Consulting” is a **tool** the agent can call: e.g. `start_consulting_project(spec)` that enqueues a project and returns a project ID; progress is streamed via WebSocket or polling. The rest of the flow (phases, deliverables) stays, but the **entry point** is tool-call from the main chat agent.
   - **Option B:** Consulting remains a dedicated UX (Consulting page) but the **orchestrator** is simplified: one “consulting agent” that can delegate to specialized tools (research, writing, data) instead of three fixed agent classes. Fewer custom agent files, more “tool use + prompt”.

3. **Single place for “LLM + tools”.** Today both chat and consulting have their own paths to the model and to MCP. We should have **one** module: “session runner” or “agent runner” that takes (sessionId, messages, tools from bridge, model config) and returns (message, tool calls, results). Chat and consulting both use this. That reduces duplication and makes it easier to add streaming, retries, and observability in one place.

**Concrete steps (Phase 2):**

- [ ] Document current flow: chat vs consulting, where tools are called, where context is built. Identify one “agent run” abstraction.
- [ ] Introduce “agent run” (or “session run”) service: inputs = session state + message + available tools (from bridge) + model; output = assistant message + tool calls; loop tool calls inside this service.
- [ ] Refactor chat to use “agent run” only; remove duplicate tool-handling from avatarService/teamCollaborationService where possible.
- [ ] Refactor consulting: either (A) make “start project” a tool from main agent and keep current orchestrator for phase/deliverables only, or (B) replace P/P/A with one consulting agent + tools. Choose one and implement.
- [ ] (Optional) Add “room” or “team” as a session parameter so that “virtual team” is a view over one or more sessions, not a completely separate code path.

---

### Pillar C: Skills and plugins — optional but structured

**Current:** “Tools” = MCP tools only. Avatars have “enabled tools” from the same MCP server. There is no notion of “skill” (e.g. a bundle of prompts + tools + docs) or “plugin” (external package).

OpenClaw has **skills** (ClawHub, workspace, bundled) and a **plugin API** (extensions, memory plugin slot). They keep core small and push optional capability to plugins/skills.

**Radical direction:**

1. **Skill format (minimal).** A “skill” is a folder or package with:
   - `skill.json` or `SKILL.md` (name, description, list of tool IDs or MCP server names it needs).
   - Optionally: prompt snippets or system-prompt additions.
   - No new runtime required: we just “attach” a skill to an avatar or team by name; the backend resolves “this skill needs tools X, Y” and passes those tools (from the bridge) into the agent run. So “Yahoo Finance skill” = “avatar has tools yahoo_finance_stock_metric, yahoo_finance_historical_data” (or server `yahoo`).

2. **Plugins (later).** If we add a plugin system, it could:
   - Register MCP server configs (so the bridge knows about them).
   - Register skills (so UI can show “Install skill X”).
   - Optionally: custom nodes for the flow editor.  
   We do **not** need to match OpenClaw’s full plugin API; we only need a contract (e.g. “plugin exports `mcpServers` and/or `skills`”) and a loader (e.g. from a folder or npm).

3. **First-party “tools” as skills or MCP servers.** Yahoo, SEC, etc. become either:
   - Small MCP servers we ship (e.g. in `packages/mcp-yahoo` or `servers/yahoo-mcp`), or
   - “Built-in” skills that the bridge knows about and that expose the same interface as any other MCP tool.  
   This way we stop editing a 1200-line `mcpService.js` for every new capability.

**Concrete steps (Phase 3):**

- [ ] Define `skill.json` / `SKILL.md` schema (name, description, toolIds or mcpServers).
- [ ] Add “skills” to avatar/team config (e.g. `avatar.skills = ["yahoo-finance", "sec-edgar"]`). Resolve to tool list via bridge + skill registry.
- [ ] (Optional) Local skill registry: scan a directory or config for skills; show in Settings/Agent Wizard.
- [ ] (Later) Plugin loader and contract; document how to add a third-party MCP server or skill without touching core.

---

### Pillar D: Code quality and platform

**Current:** Mixed JS/TS; two Redux stores (chat vs flow); hardcoded localhost/ports; CORS and .env path brittle; feature flags use `REACT_APP_*` (Vite expects `VITE_*`); AgentWizard very large; no frontend e2e.

**Radical direction:**

1. **Config and URLs.** (Already in PRD Phase 1.) Single source of truth for backend/base URL and WebSocket URL (serviceDiscovery or env). Replace every hardcoded `localhost:3001` and fix .env loading and CORS from env. Required for Mac + Azure and for any future channel (e.g. Slack bot hitting our API).

2. **TypeScript.** New backend surface (MCP bridge client, agent run, config) in TypeScript. Migrate critical paths (chat controller, MCP routes) over time. Frontend: flow is already TS; chat can migrate slice-by-slice.

3. **Single Redux store.** Merge chat and flow into one root store with lazy-loaded reducers or clearly document “two apps in one shell” and boundaries. Prefer one store for fewer surprises and easier “open flow from chat” later.

4. **AgentWizard.** Split into smaller components; single wizard context (remove duplicate). Consider a step-based layout (steps in config or array) so adding a step doesn’t mean editing a 2k-line file.

5. **Testing.** E2E for: start app → open chat → send message → (optional) trigger tool call. Backend: contract tests for “agent run” and “bridge call tool.” OpenClaw uses Vitest and Docker for e2e; we can add Playwright or Vitest e2e for the web app.

6. **Docs.** Env reference, architecture diagram, and “where to add a new tool” (bridge + skill) in README or docs/.

**Concrete steps (aligned with PRD):**

- [ ] Complete PRD Phase 1 (URLs, .env, CORS, feature flags).
- [ ] Add MCP bridge (Pillar A) and use it from one provider path (e.g. OpenAI only) as a spike.
- [ ] Introduce “agent run” module (Pillar B) and refactor chat to use it.
- [ ] Migrate one backend route to TypeScript (e.g. MCP bridge client).
- [ ] Add one e2e test: send message, expect 200 and a response (with or without tools).

---

## 3. What we are not doing (guardrails)

- **Becoming OpenClaw.** We are not switching to Pi agent, multi-channel messaging, or their exact Gateway protocol. We take ideas (MCP bridge, session-centric, skills, lean orchestration), not the product.
- **Removing “virtual team” or consulting.** We are simplifying *how* they are implemented (sessions, optional consulting-as-tool, one agent run), not removing the features.
- **Big-bang rewrite.** Each pillar can be done in small steps; bridge can coexist with current MCP server; consulting can stay as-is until “agent run” and optional “consulting as tool” are proven.
- **First-class MCP runtime in core.** Like OpenClaw, we prefer a bridge (mcporter or our own) so MCP servers can be added/changed without restart and core stays stable.

---

## 4. Phasing and dependencies

| Phase | Focus | Depends on |
|-------|--------|------------|
| **1 — Foundation** | URLs, .env, CORS, feature flags (PRD Phase 1); spike mcporter vs. thin gateway | None |
| **2 — MCP bridge** | Implement bridge (mcporter or thin), client in backend, replace one call path | Phase 1 (config) |
| **3 — Agent run** | Single “agent run” service; refactor chat to use it; tool loop inside run | Phase 2 (tools come from bridge) |
| **4 — Orchestration** | Simplify consulting (tool or single agent); session-centric wording | Phase 3 |
| **5 — Skills** | skill.json, avatar.skills, resolve tools from bridge + skills | Phase 2 |
| **6 — Code quality** | TS migration, single store, AgentWizard split, e2e | Ongoing |

Phases 2 and 3 give the biggest leverage: **better MCP connectivity** and **better orchestration** with less duplicated code. Pillar D (code quality) runs in parallel.

---

## 5. Success criteria (radical plan)

- **MCP:** New “tools” are added by configuring an MCP server (or a skill), not by editing `mcpService.js`. At least one external MCP server (e.g. from mcporter config) is callable from chat.
- **Orchestration:** One “agent run” path for chat (and optionally consulting); tool loop and model call live in one place. Consulting is either a tool or a single agent + tools, not three hardcoded agent classes.
- **Platform:** App runs on Mac and Azure with env-only config; no hardcoded hosts/ports. At least one e2e test covers send-message → response.
- **Clarity:** A new contributor can add a new “capability” by (a) adding an MCP server to the bridge config or (b) adding a skill that references existing tools.

---

## 6. References

- [OpenClaw](https://github.com/openclaw/openclaw) — multi-channel AI gateway.
- [OpenClaw VISION.md](https://github.com/openclaw/openclaw/blob/main/VISION.md) — MCP via mcporter, plugins, what they won’t merge.
- [mcporter](https://github.com/steipete/mcporter) — MCP discovery, call, CLI, emit-ts; “call MCPs from TypeScript.”
- [LLM Chat PRD](PRD.md) — current product and Phase 1–3 roadmap.
- [OpenClaw docs](https://docs.openclaw.ai/) — architecture, channels, nodes, security.

---

*This plan is a living document. Update version and “Last modified” when making material changes. Decisions (e.g. mcporter vs. thin gateway) should be recorded in an ADR once made.*
