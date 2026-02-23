---
stepsCompleted: [1, 2, 3]
research_type: domain
research_topic: "Agentic AI + Computer Use Technology + Agentic UX/HCI"
research_goals: "Deep domain grounding for ARIA development: agent architectures, computer use tech stack, and agentic UX design principles — to inform the brief, PRD, and architecture"
date: 2026-02-23
project: gemini-hackathon
---

# Domain Research: Agentic AI · Computer Use · Agentic UX/HCI

**Researcher:** Mary (Business Analyst Agent)  
**Date:** February 23, 2026  
**Purpose:** Domain grounding for ARIA — three interconnected domains that define the technical and design space

---

## Executive Summary

This research covers the three foundational domains ARIA must master:

1. **Agentic AI** — the architecture patterns, protocols, memory systems, and safety norms governing modern multi-agent systems
2. **Computer Use Technology** — the technical underpinnings of how AI agents perceive and act on UIs (vision vs. DOM vs. hybrid, Playwright, screenshot pipelines)
3. **Agentic UX/HCI** — the emerging science of designing trustworthy, transparent, controllable AI agent interfaces

**Cross-domain insight:** All three domains point to the same gap ARIA fills — the field knows *how* to build capable agents, knows *what* tech to use, and even knows *how* to design them well — but the market hasn't yet delivered a product that does all three simultaneously at a high level. ARIA is that product.

---

## Domain 1: Agentic AI — Architecture, Patterns & Ecosystem

### 1.1 Core Terminology

| Term | Definition |
|---|---|
| **Agent** | An AI system that perceives its environment, reasons, plans, and takes actions autonomously to achieve a goal |
| **Agentic AI** | AI systems designed for multi-step, goal-directed task execution with minimal human guidance per step |
| **Orchestrator** | A controlling agent that decomposes a high-level task, delegates subtasks to worker agents, and synthesizes results |
| **Worker / Executor** | A specialized agent that receives a specific subtask and executes it (e.g., takes a screenshot, clicks an element, fills a form) |
| **Tool use** | An agent's ability to invoke external functions: browser control, web search, code execution, file I/O |
| **Memory** | Mechanisms for agents to retain state: in-context (working), external (vector/graph DB), episodic (session history) |
| **Grounding** | Connecting agent reasoning to verifiable, real-world data sources (e.g., Google Search grounding in ADK) |
| **Human-in-the-loop (HITL)** | Design pattern where agent execution pauses for human approval at defined checkpoints |
| **ReAct pattern** | Reason + Act loop: agent reasons about next step, acts, observes result, reasons again |
| **A2A Protocol** | Agent-to-Agent communication protocol for multi-agent coordination (emerging standard, 2025) |
| **MCP** | Model Context Protocol — dominant standard (as of early 2026) for agent-to-tool integration |

---

### 1.2 The Eight Google ADK Multi-Agent Design Patterns

Google has formally published eight design patterns for multi-agent systems in ADK — these are the architectural vocabulary ARIA's team should use:

| Pattern | Description | ARIA Relevance |
|---|---|---|
| **1. Sequential Pipeline** | Agents execute in sequence; output of one feeds next | Planner → Executor chain |
| **2. Parallel Fan-out** | Multiple agents work simultaneously on independent subtasks | Parallel screenshot + DOM extraction |
| **3. Loop / Retry** | Agent repeats action until condition met or max retries | Action verification loop after click/type |
| **4. Orchestrator + Workers** | Central coordinator delegates to specialized sub-agents | ARIA's core architecture |
| **5. Router** | Classifier agent routes task to the best-fit specialist | Route task type to browser vs. file vs. search agent |
| **6. Human-in-the-Loop** | Structured pause for human approval at decision points | Destructive action confirmation in ARIA |
| **7. Long-running / Async** | Agent offloads task to background process; user notified on completion | Background task execution |
| **8. Memory-augmented** | Agent reads/writes persistent memory to maintain context across sessions | ARIA session memory + audit log |

**Key insight:** ARIA's Planner + Executor maps cleanly to Pattern 4 (Orchestrator + Workers) with Pattern 6 (HITL) at destructive action gates and Pattern 1 (Sequential Pipeline) for planned step execution. This is a well-understood, ADK-native architecture — not custom.

---

### 1.3 Agent Execution Paradigms

Three fundamental execution models exist for multi-agent systems:

#### Sequential (ARIA's primary mode)
- Steps execute in order: Perceive → Plan → Execute → Verify → Next step
- Predictable, debuggable, auditable
- Matches ARIA's audit log + step-by-step thinking panel design

#### Loop
- Agent keeps retrying/refining until success or max attempts
- Used for element detection failures, CAPTCHA encounters, page load waits

#### Parallel
- Multiple observations happen simultaneously (e.g., screenshot + accessibility tree extraction)
- Used for enriching context before deciding on an action

---

### 1.4 Key Frameworks in the Ecosystem (2026)

| Framework | Best For | Notable |
|---|---|---|
| **Google ADK** | Production-grade multi-agent on Google Cloud; ComputerUse native | ARIA's choice |
| **LangGraph** | Graph-based state machine workflows; fine-grained control | Most flexible for complex flows |
| **CrewAI** | Role-based multi-agent; quick to scaffold | Good for prototyping role separation |
| **LangChain** | RAG + tool-augmented chains; modular | Mature but basic orchestration |
| **LlamaIndex** | Document/data retrieval pipelines | Best for knowledge retrieval layer |
| **AutoGen (Microsoft)** | Conversation-driven multi-agent | Requires full MS ecosystem adoption |

**Why ADK wins for ARIA:** Native ComputerUseToolset, native Live API integration (voice streaming), native observability (feeds thinking panel), Vertex AI deploy path, Google Search grounding — no other framework offers all five.

---

### 1.5 Agent Memory Architecture

A production agent needs all four memory tiers:

| Tier | Type | Implementation for ARIA |
|---|---|---|
| **In-context** | Working memory — current task state, recent screenshots | Gemini context window (large context in Gemini 3) |
| **Session** | Task history within a single session | Firestore / session state |
| **Episodic** | Record of completed tasks with screenshots + actions | ARIA's audit log — doubles as documentation export |
| **Semantic** | Long-term knowledge about UI patterns, user preferences | Vector DB (optional, post-hackathon) |

---

### 1.6 Agent Safety Standards & Norms (2026)

| Concern | Current Industry Approach | ARIA Implementation |
|---|---|---|
| **Prompt injection** | Malicious instructions hidden in page content hijack agent | Sandboxed Chromium; strict system prompt boundaries |
| **Destructive action prevention** | Classify actions by risk level; require explicit approval for irreversible actions | ARIA's destructive action guard + voice confirmation |
| **Data privacy** | Agent should not exfiltrate sensitive page content | Scope-limited tool permissions |
| **Scope creep** | Agent performing actions outside intended task | Planner confirms task scope before Executor acts |
| **agent-permissions.json** | Emerging standard (proposed Dec 2025) extending robots.txt to express granular agent interaction allowances | Future consideration |

---

## Domain 2: Computer Use Technology

### 2.1 The Three Architectural Paradigms for Web Automation

Academic and industry consensus (2025–2026) identifies three core paradigms:

#### (A) Modular Pipeline
- Separate, specialized components: Perceiver → Planner → Actor → Verifier
- Each module can be swapped independently
- **ARIA maps to this** — Planner and Executor are distinct modules

#### (B) End-to-End LLM Policy
- Single LLM receives raw screenshot and outputs action directly
- Simpler but harder to debug, less transparent
- Pure "Computer Use model" approach

#### (C) Hybrid Framework ← Industry Best Practice
- Combines vision model (screenshot understanding) + DOM parsing (structured data) + LLM reasoning
- Higher accuracy than either alone
- **ARIA should target hybrid** — vision for element targeting + DOM accessibility tree for structural understanding

---

### 2.2 Vision-Based vs. DOM-Based vs. Hybrid

| Approach | How it works | Accuracy | Speed | Works on dynamic UIs | Works on legacy/hostile UIs |
|---|---|---|---|---|---|
| **DOM parsing only** (Agent-E) | Reads HTML structure; finds clickable elements by selector | 73.1% | Fast | ❌ Fails when dropdowns/JS change DOM | ❌ Legacy often has malformed DOM |
| **Vision only** (pure screenshot) | LLM reads screenshot, estimates coordinates | ~57% (WebVoyager baseline) | Slow | ✅ | ✅ |
| **Hybrid** (browser-use, Skyvern, ARIA) | Screenshot + DOM accessibility tree + LLM reasoning | 85–89% | Medium | ✅ | ✅ |
| **Computer Use model** (Gemini CU) | Specialized model trained on UI interaction; vision-first with structured output | Strong benchmark perf | Medium | ✅ | ✅ |

**Key finding:** Hybrid is the current best practice. Gemini 2.5 Computer Use is essentially a purpose-trained hybrid model — it understands both visual layout and interactive element semantics. ARIA should use it as the Executor's core perception layer.

---

### 2.3 The Browser Control Stack

```
User Voice / Text Input
         ↓
  Gemini Live API (voice → text)
         ↓
  ARIA Planner Agent (Gemini 3 Pro)
   — Decomposes task into steps
   — Sends step instructions to Executor
         ↓
  ARIA Executor Agent (Gemini 2.5 Computer Use)
   — Receives instruction + screenshot
   — Outputs: action type + target coordinates / selector
         ↓
  ADK ComputerUseToolset
         ↓
  Playwright (Chromium)
   — click(x, y) / type(text) / navigate(url) / screenshot()
         ↓
  Web Page / Application
         ↓
  Screenshot feedback → Executor verification loop
```

---

### 2.4 Key Technologies in the Stack

| Component | Technology | Role in ARIA |
|---|---|---|
| **Browser control** | Playwright + Chromium (via ADK ComputerUseToolset) | Execute clicks, typing, navigation; capture screenshots |
| **Vision model** | Gemini 2.5 Computer Use | Interpret screenshots; identify UI elements; output actions |
| **DOM enrichment** | Browser accessibility tree (via Playwright) | Structured fallback for element identification |
| **Voice input** | Gemini Live API (streaming STT) | Real-time voice task assignment |
| **Voice output** | Gemini Live API (TTS) | Agent narration while working |
| **Orchestration** | Google ADK | Multi-agent coordination, tool routing |
| **Session state** | Firestore | Audit log, screenshot storage, session history |

---

### 2.5 Critical Technical Challenges

| Challenge | Why it Happens | ARIA Mitigation |
|---|---|---|
| **Dynamic dropdowns** | DOM changes after user selection; agent loses element reference | Hybrid approach: re-screenshot + re-identify after each interaction |
| **CAPTCHA** | Bot detection triggers on cloud IPs | Pause + ask user to solve; document in audit log |
| **JavaScript-heavy pages** | DOM not visible until JS executes | Wait-for-network-idle before screenshot |
| **Coordinate drift** | Pages reflow between screenshot and click | Use accessibility tree selectors when available; screenshot-verify after click |
| **Prompt injection** | Malicious content in page hijacks agent instructions | System prompt sandboxing; content filtering before LLM ingestion |
| **Long tasks losing context** | Gemini context window fills up over long sessions | Summarize completed steps; keep only current step + last 3 steps in active context |
| **Speed vs. accuracy tradeoff** | More screenshots = more accurate but slower | Cache conversation history; only send delta screenshots (browser-use BU 1.0 approach: 15s per task) |

---

### 2.6 Performance Benchmarks Reference

| Metric | Value | Source |
|---|---|---|
| Best open-source accuracy | 89.1% (browser-use on WebVoyager subset) | browser-use benchmark |
| Best cloud-realistic accuracy | 85.85% (Skyvern 2.0 on cloud infra) | Skyvern evaluation |
| Typical task completion time | 15–60 seconds depending on complexity | browser-use BU 1.0 |
| Token cost driver | Number of screenshots × tokens per image | browser-use infrastructure data |
| Real-world vs. benchmark delta | ~10–15% lower in production (bot detection, CAPTCHAs) | Skyvern analysis |

---

## Domain 3: Agentic UX / Human-Computer Interaction

### 3.1 The Paradigm Shift in UX (2025–2026)

> *"As AI becomes more capable, UX design becomes more consequential — not because user interfaces become complex, but because the direction of power shifts."* — UXmatters, Dec 2025

> *"Users no longer judge your product only by UI — they now judge how helpful, autonomous, trustworthy, and collaborative your AI agent feels."* — Medium, Agentic Design Patterns 2026

**The core shift:** Traditional UX is about what users *do* with a system. Agentic UX is about what users *delegate* to a system — and how much they trust that delegation. **Trust is the new usability.**

---

### 3.2 The Six Canonical Agentic UX Design Patterns (2026)

These are the must-implement patterns from industry consensus (Smashing Magazine, UXmatters, HCI research):

#### Pattern 1: Intent Preview (Pre-execution Plan Display)
- Before acting, show the user what the agent *plans to do*
- "Here are the 5 steps I'll take. Confirm?"
- **ARIA implementation:** Planner outputs its step list to the thinking panel before Executor begins

#### Pattern 2: Autonomy Dial (Variable Control Level)
- Users expect to configure how much the agent acts vs. asks
- At minimum: Full auto / Confirm each step / Review-only modes
- **ARIA implementation:** Confidence threshold setting — auto below X%, pause above

#### Pattern 3: Confidence Surfacing
- Agent surfaces its own uncertainty about plans and actions
- "I'm 62% confident this is the 'Submit' button — confirming before clicking"
- **ARIA implementation:** Per-element confidence scores in the thinking panel ← core differentiator

#### Pattern 4: Graceful Escalation (Humility Mechanism)
- When agent is stuck or below threshold, it asks for help rather than guessing
- "I've encountered a CAPTCHA. Please solve it and I'll continue."
- Designed as a feature, not a failure — builds trust
- **ARIA implementation:** Pause + voice prompt to user + resume on completion

#### Pattern 5: Reversibility (Undo Layer)
- *"The single most powerful mechanism for building user confidence is the ability to easily reverse an agent's action"* — Smashing Magazine, Feb 2026
- Undo should be one step: click → revert to pre-action screenshot state
- **ARIA implementation:** Audit log as undo history; each step is independently reversible

#### Pattern 6: Transparent Reasoning (Explainability)
- Show *why* the agent made a decision, not just *what* it did
- Human-readable explanations accompanying actions
- **ARIA implementation:** Live annotated thinking panel — highlights element, narrates reason, shows confidence

---

### 3.3 The Triadic Co-Agency Model (HCI Research, 2025)

The most rigorous HCI framework for agent design (H-ACD — Human-Agent Centered Design):

```
Human Intent
     ↓
  Agent (Mediator)
  — Interprets intent
  — Exposes what it CAN do & how it interprets instructions
  — Escalates when context gaps exceed threshold
     ↓
System Workflow (Execution)
```

Key principle: **Agents must expose not just "what I can do" but "how I interpret and what I escalate"** — the mediation must be auditable, not a black box.

**ARIA's thinking panel is a direct implementation of this model.** This is not just a nice-to-have — it's the theoretically correct design for trustworthy agent UX.

---

### 3.4 Voice Interface Design Principles

| Principle | Description | ARIA Application |
|---|---|---|
| **Confirmation feedback** | User must know voice input was received and understood | Visual + audio acknowledgment before acting |
| **Barge-in support** | User can interrupt mid-task with "wait, stop that" | Passive voice listening during execution (ADK Live API) |
| **Progressive disclosure** | Don't overwhelm with narration; summarize steps not every micro-action | Narrate step-level, not click-level |
| **Error repair** | Voice agents must detect intent gaps and ask clarifying questions | "Did you mean X or Y?" before acting on ambiguous instruction |
| **Multimodal fallback** | If voice fails, text input always available | Hybrid voice + text task input |

---

### 3.5 Trust Building Through Transparency — The Research Consensus

From three independent sources (UXmatters Dec 2025, Smashing Magazine Feb 2026, Designative.info Jan 2026), the same conclusion emerges:

1. **Transparency ≠ complexity.** Showing reasoning doesn't overwhelm users — it reassures them.
2. **Humility builds trust faster than confidence.** An agent that says "I'm not sure, let me check" is trusted more than one that plows ahead.
3. **Control is more important than speed.** Users will accept a slower agent that explains itself over a faster black box.
4. **Reversibility is the ultimate trust signal.** If users know they can undo, they grant more autonomy.

**All four of these principles are baked into ARIA's design.** This isn't accidental — it's the theoretically correct design for the domain.

---

### 3.6 Agentic UX Anti-Patterns (What to Avoid)

| Anti-Pattern | Problem | ARIA Counter-Design |
|---|---|---|
| **Silent execution** | Agent acts without narrating; user loses track | Live narration + annotated thinking panel |
| **Over-confirmation** | Asking approval for every micro-action (Atlas problem) | Only interrupt for destructive/uncertain actions |
| **Black box errors** | Agent fails silently or shows generic error | Detailed error context in audit log + voice explanation |
| **Scope creep UX** | Agent does more than asked without signaling | Intent preview + explicit task scope confirmation |
| **Irreversible default** | Actions can't be undone | Every step logged + reversible via audit log |
| **Single modality lock-in** | Voice-only or text-only — no fallback | ARIA: voice + text + visual (multimodal input) |

---

## Cross-Domain Synthesis: What This Means for ARIA

### The Convergence Point

All three domains converge on the same design space:

| Domain | What It Tells Us | ARIA Feature |
|---|---|---|
| Agentic AI | Orchestrator + Workers + HITL is the right architecture | Planner + Executor + Destructive Action Guard |
| Computer Use | Hybrid (vision + DOM) is the most accurate approach | Gemini Computer Use + accessibility tree enrichment |
| Agentic UX | Transparency + Confidence Surfacing + Reversibility builds trust | Thinking Panel + Confidence Scores + Audit Log |

### The Technical Stack ARIA Should Use

```
INPUT LAYER
  Voice → Gemini Live API (STT streaming)
  Text  → Direct input

PLANNING LAYER
  Gemini 3 Pro (Planner Agent via ADK)
  — Task decomposition
  — Step planning with confidence estimates
  — Intent preview output to UI

EXECUTION LAYER
  Gemini 2.5 Computer Use (Executor Agent via ADK)
  — Screenshot perception
  — Accessibility tree enrichment (Playwright)
  — Action output: click(x,y) / type / navigate
  — Per-element confidence scoring
  — Verification loop after each action

SAFETY LAYER
  Destructive action classifier
  Confidence threshold gate (configurable)
  CAPTCHA / blocked state escalation

MEMORY LAYER
  In-context: Gemini 3 long context window
  Session: Firestore (audit log + screenshots)
  Episodic: Stored task runs (replay / export)

OUTPUT LAYER
  Live Thinking Panel (annotated screenshot feed + step list + confidence)
  Voice narration (Gemini Live API TTS)
  Audit Log (Firestore → export as docs / undo history)

INFRASTRUCTURE
  ADK (orchestration + tool routing)
  Cloud Run (backend)
  Vertex AI (model hosting)
  Firebase Hosting (frontend)
  Google Search grounding (contextual awareness)
```

---

## Domain Glossary (Quick Reference for the Team)

| Term | Plain English Definition |
|---|---|
| **ADK** | Google's Agent Development Kit — the framework for building ARIA |
| **Accessibility tree** | Browser's structured representation of interactive UI elements (used alongside screenshots) |
| **A2A Protocol** | Standard for agents communicating with each other |
| **Autonomy dial** | UX control letting users set how autonomous the agent is |
| **Confidence score** | Agent's self-reported certainty (0–100%) about a specific decision |
| **Computer Use model** | Gemini model specialized for understanding and acting on UI screenshots |
| **Destructive action** | Any irreversible action: delete, submit, send, purchase |
| **DOM** | Document Object Model — the structured HTML representation of a web page |
| **Graceful escalation** | Agent asking for help rather than guessing when stuck |
| **HITL** | Human-in-the-loop — pausing for user approval |
| **Hybrid navigation** | Using both vision (screenshot) and DOM/accessibility tree for element identification |
| **Intent preview** | Showing user the plan before executing |
| **MCP** | Model Context Protocol — standard for agent-tool integration |
| **Orchestrator** | The Planner — coordinates the overall task |
| **Playwright** | Browser automation library ARIA uses for actual click/type actions |
| **Prompt injection** | Attack where malicious page content hijacks agent instructions |
| **ReAct loop** | Reason → Act → Observe → Reason cycle for agent decision-making |
| **Tool use** | Agent calling external functions (browser, search, file system) |
| **Worker/Executor** | The sub-agent that performs individual steps |
