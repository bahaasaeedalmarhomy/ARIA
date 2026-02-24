# User Journey Flows

The PRD documents six personas but confirms a single underlying capability pattern: all six are served by the same mechanics  task assignment, live execution with thinking panel, voice barge-in, destructive action guard, and audit log. Three universal interaction flows cover every journey.

### Flow 1  Core Task Execution

*Entry to completion  the spine every session follows.*
**Personas:** All six (Sara, James, Margaret, Ravi, Leila, Chris)

```mermaid
flowchart LR
  A["User opens ARIA\nCommand Center layout"] --> B["Task Input Bar\nvoice or text"]
  B --> C["Planner receives task\nGenerates step plan"]
  C --> D["Plan displayed\nin Thinking Panel"]
  D --> E["Executor begins step 1"]
  E --> F["Browser view shows\nlive navigation"]
  F --> G{"Mid-task\ninput needed?"}
  G -- "Yes" --> H["ARIA pauses\nVoice prompt to user"]
  H --> I["User provides input"]
  I --> E
  G -- "No" --> J{"Destructive\naction ahead?"}
  J -- "Yes" --> K["Destructive Action\nGuard triggers"]
  K --> L["User confirms\nor cancels"]
  L -- "Confirm" --> M["Action executes"]
  L -- "Cancel" --> N["Task paused\nAwaiting instruction"]
  J -- "No" --> M
  M --> O{"More steps?"}
  O -- "Yes" --> E
  O -- "No" --> P["Task complete\nAudit log generated"]
```

**Entry points:** Voice via always-on waveform mic  Text in task input bar
**Success signal:** Green `signal-done` badge on all steps + audit log tab unlocks with screenshot count
**Key UX moment:** Browser moves and thinking panel updates simultaneously  users see coordination, not just logging

---

### Flow 2  Voice Barge-in

*User speaks while agent is executing  agent stops, listens, adapts.*
**Personas:** James (correction), Ravi (stop), Sara (implicit), Leila

```mermaid
flowchart LR
  A["Executor running\nBrowser actively navigating"] --> B["User speaks\nVAD detects voice"]
  B --> C["Thinking panel header:\nsignal-pause violet glow\n200ms ease-out"]
  C --> D["Executor suspends\ncurrent action"]
  D --> E["Gemini Live API\nstreams audio input"]
  E --> F{"Utterance\nclassified"}
  F -- "Correction" --> G["Planner updates\nstep plan"]
  F -- "Stop" --> H["Task halted\nAudit log: user-interrupted"]
  F -- "Question" --> I["ARIA responds\nverbal + text in panel"]
  F -- "Confirm/Continue" --> J["Executor resumes\nfrom suspension point"]
  G --> J
  I --> K{"User satisfied?"}
  K -- "Yes" --> J
  K -- "No" --> E
  H --> L["User can resume\nor assign new task"]
```

**Barge-in affordance:** VAD waveform always active in thinking panel  no button required to interrupt
**Visual signal:** `signal-pause` violet replaces `signal-active` blue instantly  the color change IS the acknowledgment
**Emotional goal:** User feels heard within 200ms before ARIA finishes processing

---

### Flow 3  Destructive Action Guard

*ARIA detects irreversible action and requires explicit human confirmation.*
**Personas:** Sara (submit), Margaret (submit), Leila (purchase), Chris (publish)

```mermaid
flowchart LR
  A["Executor identifies\nnext action"] --> B{"Confidence +\nAction type check"}
  B -- "Confidence >= 0.85\nNon-destructive" --> C["Execute silently\nLog action"]
  B -- "Confidence < 0.85\nOR destructive action" --> D["Executor pauses"]
  D --> E["Destructive Action Guard\nModal: zinc-950/90 backdrop"]
  E --> F["ARIA reads aloud:\nThis action cannot be undone.\nShall I proceed?"]
  F --> G{"User response"}
  G -- "Voice: Yes/Confirm" --> H["Action executes\nAudit log: confirmed-destructive"]
  G -- "Voice: No/Stop" --> I["Action cancelled\nAudit log: user-cancelled"]
  G -- "Click Confirm" --> H
  G -- "Click Cancel / Esc" --> I
  I --> J["Task paused\nUser decides next instruction"]
  H --> K["Execution continues"]
```

**Guard triggers:** Form submit, purchase/payment, publish/post, delete, send email/message, file overwrite
**Guard does NOT trigger:** Navigation, reading, searching, filling non-submit fields, scrolling
**Emotional goal:** Users know ARIA will never silently do something irreversible

---

### Journey Patterns

| Pattern | Description | Flows |
|---|---|---|
| **Suspend-Resume** | Executor suspends at any step boundary and resumes from the same point without re-executing prior steps | Barge-in (Flow 2), Mid-task input (Flow 1), Guard cancel (Flow 3) |
| **Voice-first confirmation** | Every pause that requires user input is voiced aloud AND shown in the thinking panel  dual channel reduces missed prompts | Guard (Flow 3), Mid-task input (Flow 1) |
| **Audit point injection** | Every state transition (plan-start, step-complete, user-interrupted, guard-confirmed, guard-cancelled) writes a timestamped audit record | All flows |

### Flow Optimization Principles

1. **Zero idle time on the happy path**  high confidence + non-destructive action = ARIA moves without pausing
2. **Every pause has an obvious resume**  thinking panel always shows what ARIA is waiting for and how to provide it
3. **Barge-in suspends, not stops**  voice interruption is a modification unless user explicitly says "stop"
4. **Audit log is a first-class output**  not a debug tool; it is what Sara hands her intern, what Ravi pastes into the launch ticket, what Margaret screenshots for her records

---
