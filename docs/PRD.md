# Product Requirements Document: LLM Chat (Your Virtual Team)

**Version:** 0.1  
**Last modified:** 2025-02-26  
**Status:** Draft for review

---

## 1. Product vision and goals

### 1.1 Vision

**LLM Chat** is an advanced multi-model AI chat platform that lets users work with a “virtual team” of AI avatars, real-time data (e.g. Yahoo Finance, SEC), and structured consulting workflows—supporting both cloud and offline (Ollama) use.

### 1.2 Goals

- **Multi-model, multi-context**: One place to use Strategic / General / Rapid / Tactical model categories (OpenAI, Anthropic, Ollama) with clear escalation and fallback.
- **Real-time data in chat**: MCP-style tools (Yahoo Finance, SEC Edgar, optional Maps/Weather/Companies House) so answers can use live data.
- **Consulting workflows**: Formal Partner–Principal–Associate style engagements with progress, deliverables, and optional DB/Redis.
- **Avatar and team management**: Custom AI personas, tool access per avatar, and team-based multi-avatar discussions.
- **Automation and flows**: Visual flow editor for pipelines (data transformation, APIs, LLM nodes) with execution.
- **Cross-environment**: Reliable on **Mac (local)** and **Linux (e.g. Azure VM)** without hardcoded hosts/ports.

### 1.3 Non-goals (out of scope for this PRD)

- Full multi-tenancy or enterprise SSO (can be a later PRD).
- Replacing the avatar wrapper / RD-Agent module with a different stack (improvements only).
- Mobile-native apps (web-first).

---

## 2. Current state summary

### 2.1 Architecture

| Layer | Stack | Notes |
|-------|--------|------|
| **Frontend** | React 18, Vite, Redux Toolkit, React Router, ReactFlow, Tailwind, MUI | Port discovery via `serviceDiscovery.js`; in dev uses Vite proxy for backend. |
| **Backend** | Node.js, Express | REST + WebSocket (`/ws/consulting`). Dynamic port via `findAvailablePort()`. |
| **Modules** | `avatar_predictive_wrapper_rd_agent` (Node) | Separate process; port from env (e.g. WRAPPER_PORT). |
| **Data** | Optional PostgreSQL + Redis for consulting; file storage under `storage/`. | Consulting works with graceful DB/Redis fallback. |

**Deployment:** `start.sh` discovers ports (backend, wrapper, frontend), writes `.env`, and starts all processes via **PM2** (`ecosystem.config.js`).

### 2.2 Main user flows and routes

| Route | Purpose |
|-------|--------|
| `/` | Chat with selected avatars; sessions; file upload; data feeds. |
| `/teams` | Create/edit teams; assign avatars; “Start chat” with team. |
| `/consulting` | Start consulting project; WebSocket progress; deliverables. |
| `/agent-wizard` | Create/edit AI avatars (roles, models, tools). |
| `/automation` | Flow editor (nodes, edges, execution). |
| `/settings` | API keys, MCP tools, avatars list. |

### 2.3 Feature summary

- **Chat**: Multi-avatar chat, session list, file attach, thinking indicators, model display.
- **Models**: OpenAI, Anthropic, Ollama; plane mode and fallback.
- **MCP**: Yahoo Finance (backend `yahoo-finance2`), SEC Edgar; others configurable.
- **Consulting**: Partner/Principal/Associate orchestration, DB persistence, WebSocket streaming.
- **Avatars**: Stored in settings; per-avatar model and tool config.
- **Flow editor**: Custom nodes (LLM, file upload, data transform, etc.); separate Redux store and React Flow state.

---

## 3. Technical debt and risks

*Identified from codebase review; relevant to “built when coding models weren’t great” and cross-platform.*

### 3.1 Configuration and portability (Mac / Azure Linux)

- **Hardcoded `localhost` / port `3001`** in several places:
  - `ConsultingPage.jsx`: WebSocket `ws://localhost:3001/ws/consulting` (should use discovered backend URL).
  - `EditAvatarForm.jsx`, `ChatWindow.jsx`: image URLs `http://localhost:3001`.
  - `FileUploadExecutorComponent.tsx`: `API_BASE = 'http://localhost:3001'`.
  - `fileService.js`: callback URL to backend for chat.
  - `rdAgentService.js`: `REACT_APP_RD_AGENT_API_URL` (CRA naming) with fallback `localhost:3002`.
- **Backend .env path**: `dotenv.config({ path: '../.env' })` in `app.js` and `config/environment.js` depends on CWD; can break when running from different directories (e.g. `backend/` vs repo root).
- **CORS**: `app.js` allows only `localhost:5173–5175`. Production or Azure will need env-driven `CORS_ORIGINS` (and possibly protocol/host for WebSocket).
- **Ollama**: Uses `127.0.0.1:11434` in a few places; fine for local; on Azure, Ollama (if used) may be on another host → should be configurable via env.

**Risk:** On Azure (or any non-localhost deployment), consulting WebSocket, file/avatar URLs, and API calls may fail or point to wrong host/port.

### 3.2 Frontend state and consistency

- **Two Redux stores**:
  - Main app: `state/store.js` (chat slice only).
  - Flow editor: `store/store.ts` (flow slice only), mounted inside `FlowEditor.tsx` with its own `<Provider>`.
- **Implication:** Chat and flow state are isolated; no shared store. Acceptable if intentional; otherwise consider a single root store and lazy-loaded flow reducer for consistency and future features (e.g. “open this flow from chat”).

### 3.3 Language and structure

- **Mixed JS/TS**: Flow editor and several services are TypeScript; chat, consulting, and many components are JS. No project-wide typing strategy.
- **AgentWizard**: Very large component (~2.2k+ lines); duplicate wizard context pattern (`WizardContext.tsx` vs inline in `AgentWizard.jsx`). Good candidate for splitting and single wizard context.
- **Legacy**: `main.jsx` still disables/removes Mirage; safe to remove dead code.

### 3.4 Environment and feature flags

- **Feature flags** in `featureFlags.ts` use `REACT_APP_*`; app is Vite-based. Vite exposes only `VITE_*` via `import.meta.env`. Flags may be undefined unless aliased or migrated to `VITE_*`.

### 3.5 Testing and reliability

- **Backend**: Tests exist for consulting (orchestrator, partner agent, DB, integration). No frontend unit/e2e tests in scope of review.
- **No shared contract tests** for API or WebSocket between frontend and backend.

### 3.6 Documentation and runbooks

- **README** is strong (features, setup, Ollama). Missing: deployment for Azure/Linux, env var reference, architecture diagram, and which routes require DB/Redis.

---

## 4. User personas and use cases (concise)

| Persona | Use case |
|---------|----------|
| **Analyst** | Ask avatars about live market data (Yahoo, SEC) and save sessions. |
| **Consultant** | Run a consulting project with progress and deliverables. |
| **Builder** | Create avatars and teams, then design automation flows. |
| **Offline user** | Use Ollama-only when internet is unavailable. |

---

## 5. Proposed roadmap (phased)

### Phase 1: Foundation and portability (recommended first)

**Objective:** Run reliably on Mac and Azure Linux; remove known config pitfalls.

- **1.1 Centralise API/WebSocket base URL**
  - Use `serviceDiscovery` (or a single `config` module) for backend base URL and WebSocket URL.
  - Replace all hardcoded `localhost:3001` / `3002` in frontend and backend (ConsultingPage, EditAvatarForm, ChatWindow, FileUploadExecutor, fileService, rdAgentService).
  - Document required env vars (e.g. `VITE_API_PORT`, `BACKEND_PORT`, optional `VITE_BACKEND_HOST` for Azure).
- **1.2 Robust .env loading**
  - Resolve `.env` path from project root or `__dirname` so it works when running from `backend/` or root (e.g. `path.join(__dirname, '../../.env')` from backend).
- **1.3 CORS and WebSocket origin**
  - Add `CORS_ORIGINS` (and optionally `WS_ORIGIN`) from env; default to current localhost list for dev.
- **1.4 Feature flags**
  - Migrate `REACT_APP_*` to `VITE_*` in code and docs so flags work under Vite.

**Success:** Same repo runs on Mac and an Azure Linux VM with only env/config changes; no code edits for host/port.

### Phase 2: Code health and maintainability

- **2.1** Unify or clearly document Redux strategy (single root store vs. two stores and when to use which).
- **2.2** Break down AgentWizard into smaller components and one wizard context.
- **2.3** Remove Mirage-related code from `main.jsx`.
- **2.4** Add env var reference (e.g. `docs/ENV.md` or section in README) and a simple architecture diagram.

### Phase 3: Product and UX (prioritise by need)

- **3.1** Consulting: improve error states and reconnection when WebSocket drops.
- **3.2** Chat: team selection from sidebar actually loading team avatars (currently placeholder).
- **3.3** Flow editor: persist/save flows to backend (if not already).
- **3.4** Optional: E2E tests for critical paths (chat, consulting start, settings).

---

## 6. Success criteria

- **Portability:** One set of env vars runs the app on macOS and on an Azure Linux VM (no hardcoded hosts/ports).
- **Stability:** Consulting WebSocket and file/avatar URLs work when backend port/host is non-default.
- **Clarity:** New contributors can infer where to add API calls (serviceDiscovery / api.js) and where to add env (documented list).
- **Maintainability:** AgentWizard and config loading are easier to change without regressions.

---

## 7. Open questions

1. **Production deployment:** Will the app be deployed behind a reverse proxy (e.g. Nginx) with a single host/port, or will frontend and backend remain on different ports? This affects CORS and WebSocket URL design.
2. **PostgreSQL/Redis:** Are they required for any “must-have” flow, or is “consulting works without DB” acceptable long term? Affects docs and default setup.
3. **Single store vs. two stores:** Is isolation of flow state intentional (e.g. to keep flow editor bundle and state independent), or should we plan a single root store?
4. **Azure:** Will Ollama run on the same VM or a separate host? Drives whether we need `OLLAMA_HOST` (or similar) in config.

---

## 8. Appendix: key files reference

| Area | Path |
|------|------|
| App entry, routes | `frontend/src/App.jsx`, `main.jsx` |
| Chat state | `frontend/src/state/store.js`, `chatSlice.js` |
| Flow state | `frontend/src/store/store.ts`, `flowSlice.ts` |
| API / discovery | `frontend/src/services/api.js`, `serviceDiscovery.js` |
| Backend app | `backend/app.js`, `server.js` |
| Consulting | `backend/services/consulting/consultingOrchestrator.js`, `ConsultingPage.jsx` |
| MCP / Yahoo | `backend/services/yahoo-finance-mcp-integration.js`, `backend/routes/mcp.routes.js` |
| Config | `backend/config/environment.js`, `frontend/vite.config.js` |
| Start | `start.sh`, `ecosystem.config.js` |

---

*This PRD is a living document. Update version and “Last modified” when making material changes.*
