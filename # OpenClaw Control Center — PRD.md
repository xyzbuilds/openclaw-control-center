# OpenClaw Control Center — PRD

**Author:** Xuyang Zhang
**Date:** 2026-03-11
**Status:** Draft
**Codename:** Mission Control

---

## 1. Overview

A web-based dashboard for managing, monitoring, and orchestrating OpenClaw agents. Think "Mission Control for your AI workforce" — a single pane of glass where you see everything your agents are doing, queue new work, review outputs, track costs, and intervene when needed.

**Inspiration:** Community-built "军机处" dashboard (task board + session stats + agent management). We take that foundation and add real-time observability, cost intelligence, multi-agent orchestration, and a polished UX.

---

## 2. Problem Statement

Running OpenClaw at scale (multiple agents, cron jobs, heartbeats, sub-agents, integrations) today means:

- **No visibility** — You don't know what your agents are doing right now unless you check Telegram
- **No cost tracking** — Token usage is invisible until you check provider billing
- **No task management** — Work is ad-hoc via chat; no queue, no prioritization, no history
- **No intervention UI** — Steering a sub-agent means CLI or chat commands
- **No performance insights** — Which tasks succeed? Which fail? How long do they take?

Power users (like us) need a control plane, not just a chat interface.

---

## 3. Target Users

| Persona | Description |
|---------|-------------|
| **Solo Power User** | Runs 1-3 agents, multiple cron jobs, integrations. Wants visibility + cost control. |
| **Team Lead** | Manages agents across a small team. Needs audit trail + approval workflows. |
| **Builder/Developer** | Creates skills, templates, automations. Needs debugging + testing tools. |

**MVP focus:** Solo Power User (that's us).

---

## 4. Core Features

### 4.1 🏠 Dashboard (Home)

The at-a-glance view. Everything important in one screen.

**Cards:**
- **Agent Status** — Online/offline/busy for each agent, with uptime
- **Active Sessions** — Count + list of currently running sessions (main, sub-agents, cron)
- **Today's Stats** — Messages sent, tokens consumed, API calls, cost estimate
- **Recent Activity Feed** — Last 20 events (emails triaged, tasks completed, errors, alerts)
- **System Health** — Gateway status, node connectivity, integration status (Gmail, Telegram, etc.)
- **Cost Burn Rate** — Rolling 24h/7d/30d token cost with trend line

**Design:** Dark mode default. Dense but readable. No wasted space. Think Grafana meets Linear.

### 4.2 📋 Task Board

Kanban-style task management for AI work.

**Columns:** Backlog → Queued → In Progress → Review → Done → Archived

**Task Card Fields:**
- Title + description
- Assigned agent (Watson, Codex, Claude Code, custom)
- Priority (P0-P3)
- Status + progress indicator
- Token cost (running total)
- Duration (elapsed + estimated)
- Output artifacts (files, PRs, links)
- Tags/labels

**Task Sources:**
- Manual creation (UI form)
- Chat-initiated ("Watson, build X" → auto-creates task card)
- Cron-generated (recurring tasks show as repeating cards)
- GitHub issue sync (optional — pull issues, assign to agents)

**Task Actions:**
- Pause / Resume / Cancel
- Reassign to different agent or model
- Steer (send instruction to running task)
- Fork (duplicate task with modifications)
- View full session transcript

### 4.3 🤖 Agent Management

**Agent Registry:**
- List all configured agents (name, model, status, current task)
- Agent profile: capabilities, skills loaded, default model, token budget
- Agent performance: avg task completion time, success rate, cost per task

**Agent Config (edit in UI):**
- Model selection (with alias support)
- Skill assignment
- Token budget / rate limits
- Notification preferences
- System prompt preview (read-only view of SOUL.md, AGENTS.md)

**Multi-Agent View:**
- See all agents simultaneously
- Drag-and-drop task assignment
- Agent-to-agent communication log

### 4.4 💬 Session Explorer

**Session List:**
- All sessions (active + recent) with filters: type (main/sub-agent/cron), status, date range, agent
- Search across session transcripts
- Sort by: recent, cost, duration, message count

**Session Detail View:**
- Full message transcript (collapsible tool calls)
- Token usage breakdown (input/output/thinking per message)
- Timeline visualization (when was the agent thinking vs. waiting vs. executing)
- Cost attribution per message
- "Replay" mode — step through the session like a debugger

**Live Session:**
- Real-time streaming view of active sessions
- Intervene: send a message into any active session
- Watch mode: observe sub-agents working without interrupting

### 4.5 📊 Analytics & Cost Intelligence

**Cost Dashboard:**
- Total spend: today / this week / this month / all time
- Cost by agent, by model, by task type
- Cost per task completion (efficiency metric)
- Budget alerts (set monthly cap, warn at 80%)
- Model comparison: "This task cost $0.12 on Opus vs. estimated $0.03 on Sonnet"

**Usage Analytics:**
- Token consumption over time (line chart)
- Most expensive tasks (ranked)
- Peak usage hours
- Model utilization breakdown (pie chart)

**Performance Analytics:**
- Task success rate over time
- Average completion time by task type
- Error/retry frequency
- Agent efficiency comparison

### 4.6 🔗 Integration Status

**Connected Services Panel:**
- Gmail: watch status, last sync, message count today
- Telegram: connected chats, message volume
- GitHub: linked repos, recent PR/issue activity
- Nodes: Mac Studio, MacBook — online/offline, last heartbeat
- Cron jobs: list, next run time, last result

**Health Checks:**
- Green/yellow/red status for each integration
- Auto-detect issues (e.g., Gmail token expired, node disconnected)
- One-click re-auth / reconnect where possible

### 4.7 📝 Template Library

**Pre-built Task Templates:**
- "Triage today's emails" — pre-configured prompt + model + output format
- "Draft LinkedIn post from topic" — with content style guidelines baked in
- "Code review PR #X" — spawn agent with repo context
- "Research topic and summarize" — web search + synthesis

**Custom Templates:**
- Create from any completed task ("Save as template")
- Parameterized fields (fill in the blanks)
- Share templates (export as JSON / publish to ClawHub)

### 4.8 🔔 Notification Center

**In-App Notifications:**
- Task completed / failed
- Budget threshold reached
- Integration error
- Agent needs human decision

**Notification Rules (configurable):**
- Route by severity: critical → Telegram push, info → dashboard only
- Quiet hours (suppress non-critical during sleep)
- Digest mode (batch notifications every N hours)

---

## 5. Architecture

### 5.1 Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend** | Next.js 15 + React 19 | SSR, fast, we already know it (clone-a-claw) |
| **UI** | Tailwind + shadcn/ui | Consistent with clone-a-claw, great dark mode |
| **Charts** | Recharts or Tremor | Lightweight, React-native charting |
| **State** | Zustand + React Query | Simple, performant, good for real-time updates |
| **Backend** | Next.js API routes + OpenClaw API | Thin layer — most data comes from OpenClaw directly |
| **Real-time** | WebSocket (OpenClaw events) or SSE | For live session streaming + activity feed |
| **Database** | SQLite (local) or Supabase (hosted) | Session history, task metadata, cost tracking |
| **Auth** | Optional — local-only MVP needs none | Add auth if exposing beyond localhost |

### 5.2 Data Sources

The dashboard reads from OpenClaw's existing APIs and data:

```
┌─────────────────────────────────────────────┐
│              Control Center UI              │
│         (Next.js on localhost:3333)          │
└────────────┬───────────────┬────────────────┘
             │               │
     ┌───────▼──────┐  ┌────▼─────────────┐
     │  OpenClaw    │  │  Local SQLite     │
     │  Gateway API │  │  (tasks, costs,   │
     │  :18789      │  │   templates)      │
     └───────┬──────┘  └──────────────────┘
             │
    ┌────────┼────────────┐
    │        │            │
┌───▼──┐ ┌──▼───┐  ┌─────▼────┐
│Sessions│ │Nodes │  │Integrations│
│& Agents│ │Status│  │(Gmail,TG) │
└────────┘ └──────┘  └──────────┘
```

**Key integration points:**
- `sessions_list` / `sessions_history` — session data
- `session_status` — usage & cost per session
- `subagents list` — sub-agent status
- `nodes status` — node health
- Gateway config — agent definitions, cron jobs
- Custom event stream — hook into OpenClaw's internal event bus (if API available)

### 5.3 Cost Tracking Strategy

OpenClaw doesn't natively expose per-message cost. Options:

1. **Parse session_status** — has token counts, calculate cost from known model pricing
2. **Intercept at gateway** — middleware that logs every LLM call with token counts
3. **Provider billing APIs** — pull from Anthropic/OpenAI usage dashboards (delayed)

MVP: Option 1 (poll session_status, compute costs locally, store in SQLite).

---

## 6. Full Build Scope

**Everything below is in scope. Build it all.**

### Phase 1: Core Dashboard
- [ ] Dashboard home (agent status, today's stats, activity feed)
- [ ] Session explorer (list + detail view with transcript)
- [ ] Basic cost tracking (token count × price lookup)
- [ ] Node status panel
- [ ] Integration health (Gmail, Telegram — green/red)
- [ ] Dark mode UI
- [ ] Runs on localhost (no auth needed)
- [ ] System health: CPU, RAM, disk, gateway PID, uptime, memory

### Phase 2: Task Management & Templates
- [ ] Kanban task board (Backlog → Queued → In Progress → Review → Done)
- [ ] Drag-and-drop task cards with priority, assignment, comments
- [ ] Template library (save completed tasks as templates, parameterized)
- [ ] Recurring tasks with natural language scheduling ("every morning at 9am")

### Phase 3: Analytics & Intelligence
- [ ] Cost analytics charts (daily/weekly/monthly trends, per-model breakdown)
- [ ] Token usage dashboard with Recharts visualizations
- [ ] Budget alerts (set monthly cap, warn at 80%)
- [ ] Model comparison ("this task cost $X on Opus vs $Y on Sonnet")
- [ ] Agent efficiency metrics (success rate, avg completion time)
- [ ] Sub-agent activity tracking with cost/duration/status

### Phase 4: Real-time & Advanced
- [ ] Live session streaming via WebSocket/SSE
- [ ] Notification center (in-app + configurable routing rules)
- [ ] Cmd+K command palette (keyboard-first navigation)
- [ ] Mobile responsive
- [ ] Role-based auth (viewer/operator/admin) for multi-user
- [ ] Cron job management (view, edit, status, last/next run)

### Phase 5: Community-Inspired Features (NEW)
*Inspired by builderz-labs/mission-control and mudrii/openclaw-dashboard*
- [ ] **AI Chat Panel** — Natural language queries about your dashboard ("how much did I spend this week?", "which cron jobs failed?") powered by OpenClaw gateway
- [ ] **Smart Alerts Banner** — Auto-detect high costs, failed crons, high context usage, gateway offline, OAuth token expiry
- [ ] **Multi-theme Support** — 3+ dark themes (Midnight, Nord, Catppuccin Mocha) + light themes, switchable from UI
- [ ] **Skills Hub** — Browse installed skills, view skill details, security scan results
- [ ] **Git Activity Log** — Recent git commits in the workspace (shows what agents have been building)
- [ ] **Agent Lifecycle Management** — Register, heartbeat, wake, retire agents with full lifecycle UI
- [ ] **Quality Gates / Review System** — Block task completion without human sign-off for critical tasks
- [ ] **Webhook Management** — Outbound webhooks with delivery history, retry, circuit breaker
- [ ] **Pipeline Orchestration** — Visual workflow templates for multi-step agent tasks
- [ ] **Cost Projection** — Projected monthly spend based on current burn rate
- [ ] **Context Usage Indicators** — Per-session context window % used (how close to limit)
- [ ] **Onboarding Wizard** — Guided setup for first-time users (credential setup, agent discovery, health scan)
- [ ] **Model Grid** — Visual grid of all available models with capabilities, pricing, status
- [ ] **Top Metrics Bar** — Always-visible bar with CPU/RAM/disk/gateway status (color-coded thresholds)
- [ ] **Session Type Badges** — Visual badges for DM/group/cron/subagent session types
- [ ] **Auto-Refresh with Countdown** — Configurable auto-refresh with visible countdown timer

---

## 7. Design Principles

1. **Information density over whitespace** — Power users want data, not decoration
2. **Real data, no placeholders** — Every number on screen is live from OpenClaw
3. **Dark mode first** — We're staring at this late at night
4. **Sub-3s load** — No spinner walls. Cache aggressively, stream updates.
5. **Keyboard navigable** — Cmd+K command palette for power users
6. **Non-destructive** — Dashboard reads and displays; destructive actions (kill, cancel) require confirmation

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Daily active usage | Creator uses it daily instead of checking Telegram for agent status |
| Time to insight | < 5 seconds to answer "what are my agents doing right now?" |
| Cost awareness | User knows daily/weekly AI spend without checking provider dashboards |
| Task completion visibility | 100% of agent tasks visible in one place |

---

## 9. Competitive Landscape

| Product | What It Does | Gap We Fill |
|---------|-------------|-------------|
| **军机处 (screenshot)** | Task board + basic stats | No cost tracking, no session explorer, no live view |
| **OpenClaw Control UI** | Basic built-in web UI | Minimal — no task management, no analytics |
| **Langfuse / LangSmith** | LLM observability | Developer-focused tracing, not user-facing control plane |
| **Dify / FlowiseAI** | Visual AI workflow builder | Low-code focus, not agent orchestration |

**Our angle:** Purpose-built for OpenClaw. Not a generic LLM dashboard — an agent command center that understands sessions, sub-agents, nodes, skills, and integrations.

---

## 10. Open Questions

1. **Should this be an OpenClaw skill or standalone app?** Skill = easier distribution via ClawHub. Standalone = more flexibility.
2. **OpenClaw API surface** — Do we have enough API access for everything? Need to audit what's queryable.
3. **Event streaming** — Does OpenClaw expose a WebSocket/SSE event stream? If not, we poll (worse UX).
4. **Multi-agent orchestration** — How far do we push this in v0.1? Just visibility, or actual control (assign, steer, kill)?
5. **Monetization** — Is this a ClawKit to sell on cloneaclaw.com? Open source? Both?

---

## 11. Timeline (Rough)

| Phase | Scope | Effort |
|-------|-------|--------|
| **v0.1 MVP** | Dashboard + Session Explorer + Cost Basics | ~20 hrs |
| **v0.2** | Task Board + Template Library | ~15 hrs |
| **v0.3** | Analytics + Live Streaming + Notifications | ~15 hrs |
| **v1.0** | Polish, auth, mobile, public release | ~10 hrs |

---

## 12. Portfolio & Brand Value

This project is **excellent** for Xuyang's PM portfolio:

- **Shows product thinking** — PRD → MVP → iterate
- **Shows technical depth** — Building on top of AI infrastructure
- **Shows AI-native approach** — A control plane for AI agents is peak 2026
- **LinkedIn content gold** — "I built a mission control for my AI agents" is a banger post
- **ClawKit potential** — Sell it on cloneaclaw.com, demonstrate marketplace viability
- **Differentiated** — Very few people are building agent orchestration UIs from a PM perspective

---

*"Every AI agent needs a control tower. This is ours."*
