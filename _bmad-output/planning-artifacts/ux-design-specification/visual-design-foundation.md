# Visual Design Foundation

### Color System

**Design philosophy:** Color serves signal before aesthetics. Every color has a functional purpose and is never used decoratively.

**Surface palette (dark theme):**

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `bg-base` | `#09090B` | `zinc-950` | Full page background |
| `bg-surface` | `#18181B` | `zinc-900` | Panel backgrounds |
| `bg-raised` | `#27272A` | `zinc-800` | Step item cards, raised surfaces |
| `bg-muted` | `#3F3F46` | `zinc-700` | Hover states, input fills |
| `border` | `#52525B` | `zinc-600` | Dividers, outlines |

**Text hierarchy:**

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#FAFAFA` | Headings, active content, task text |
| `text-secondary` | `#A1A1AA` | Metadata, labels, muted descriptions |
| `text-disabled` | `#52525B` | Inactive steps, placeholder text |

**Semantic signal palette:**

| Token | Hex | Usage |
|---|---|---|
| `signal-active` | `#3B82F6` (Blue) | Currently executing step; active voice state |
| `signal-success` | `#10B981` (Emerald) | Completed steps; confidence ≥ 80% |
| `signal-warning` | `#F59E0B` (Amber) | Confidence 50–79%; requires attention |
| `signal-danger` | `#F43F5E` (Rose) | Confidence < 50%; destructive action guard |
| `signal-pause` | `#A78BFA` (Violet) | Barge-in / paused state — distinct from all other signals |

### Typography System

| Role | Size | Weight | Font Family |
|---|---|---|---|
| Section header | 20px / 1.25rem | 600 | Geist Sans |
| Step description | 14px / 0.875rem | 400 | Geist Mono |
| Task input | 16px / 1rem | 400 | Geist Sans |
| UI labels / body | 14px / 0.875rem | 400 | Geist Sans |
| Metadata / timestamps | 12px / 0.75rem | 400 | Geist Sans |
| Confidence badge | 11px / 0.688rem | 600 | Geist Sans |

Geist Mono is used exclusively for step action descriptions, URLs, and technical command output — reinforcing the "precise and technical" register without applying it globally.

### Spacing & Layout Foundation

**Base unit:** 4px. All spacing values are multiples of 4.

| Context | Value |
|---|---|
| Step item padding | `12px 16px` (3u vertical / 4u horizontal) |
| Gap between step items | `8px` |
| Panel internal padding | `16px` |
| Panel-to-panel gap | `16px` |
| Page content max-width | `1440px` |

**Primary layout (1280px+ viewport):**

```
┌──────────────────────────────────┬────────────────────┐
│  Browser View (flex-grow)        │  Thinking Panel    │
│                                  │  (400px fixed)     │
│                                  │  [Step list]       │
│                                  │  [Voice state]     │
│                                  │  [Audit log]       │
└──────────────────────────────────┴────────────────────┘
│  Task Input Bar (full-width, fixed bottom, 64px height)│
└────────────────────────────────────────────────────────┘
```

The thinking panel is right-anchored and fixed-width. The browser view fills all remaining horizontal space. The task input bar is always visible at the bottom — lowest z-index interruption priority.

### Accessibility Considerations

- All text/background combinations meet WCAG AA contrast (4.5:1 minimum): `text-secondary` (`#A1A1AA`) on `bg-surface` (`#18181B`) = 5.9:1 ✅
- Color is never the sole signal carrier: step status uses icon + color; confidence uses text label + color badge
- Focus rings: `ring-2 ring-signal-active ring-offset-2` — visible keyboard navigation path throughout
- Font sizes: minimum 12px; no content below 11px (badge labels only)
- Destructive action guard modal: meets color contrast + has explicit text label — never icon-only


---
