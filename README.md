# Web Research via claude.ai or Gemini

A [Claude Code](https://claude.com/claude-code) skill that runs **deep research** through a
built-in deep-research feature (driven in Chrome), then saves a clean Markdown report with
working source links — fully as a background agent.

You pick the engine per session: **claude.ai Research** or **Gemini Deep Research**. The
workflow around the run is identical — a short Dutch briefing, an English research prompt,
the run itself, and a gap-analysis loop so you can dig deeper round by round. (The
interaction language is Dutch by default but easy to adapt.)

## Why it exists

Driving a chat UI through screenshots is slow and burns tokens. This skill instead uses a
small, tested JavaScript driver per provider, so it knows exactly what to do and barely
touches the context window. **Only the driver differs per provider; everything around it is
shared** — so a change to the briefing, prompt composition or gap analysis applies to both.

## How it works

| Phase | Claude (claude.ai) | Gemini (gemini.google.com/app) |
|---|---|---|
| **Start** a run | enable Research, fill the prompt, submit (synthetic `Enter` keydown) | set model to **Flash**, enable Deep Research, fill, submit, then confirm the plan with **"Start research"** |
| **Poll / detect** | conversation API (`stop_reason`, `launch_extended_search_task`) | DOM signal — the `Stop response` button |
| **Extract** the report | `artifacts` tool-use block (plain Markdown) from the conversation API | scrape `deep-research-immersive-panel .markdown` → HTML→Markdown |

Both drivers write the report to disk via a Blob download, so the report text never has to
pass back through the model's context. The Claude path runs entirely through the API after
submit (no clicking/foreground needed); the Gemini path is DOM-driven because Gemini has no
clean report API.

## Requirements

**Shared:**
1. Claude Code with the **Claude in Chrome** extension installed and logged in
2. Chrome running, with downloads set to **auto-save** (not "ask where to save")

**Per provider:**
- **Claude:** a paid Claude plan, logged in to claude.ai.
- **Gemini:** a Google account with Deep Research access, **model set to Flash** (Deep
  Research is hidden when Pro is selected).

## Usage

```
/research-via-web                       # asks "Claude or Gemini?", then briefs you
/research-via-web gemini "your question"
/research-via-web claude "your question"
```

The skill then walks you through provider → briefing → prompt → background run → report →
gap analysis.

## Files

| File | Role |
|---|---|
| `SKILL.md` | The skill definition and end-to-end flow (both providers) |
| `brief-questions.md` | The Dutch briefing questions (shared) |
| `prompt-template.md` | English research-prompt skeleton (shared) |
| `gap-analysis-template.md` | Dutch gap-analysis skeleton (shared) |
| `agent-prompt-claude.md` | Deterministic playbook for the Claude run |
| `agent-prompt-gemini.md` | Deterministic playbook for the Gemini run |
| `drivers/claude-ai-driver.js` | Tested JS driver injected into the claude.ai tab |
| `drivers/gemini-driver.js` | Tested JS driver injected into the Gemini tab |
| `commands/` | The `/research-via-web` slash command |

## Status

The Claude driver was verified live on 2026-05-29; the Gemini driver on 2026-05-31
(model→Flash, Deep Research toggle, plan + "Start research", `Stop response` running signal,
and report extraction from the immersive panel — a real run produced a Dutch report with 49
working source links). Selectors can drift on a UI redesign; each driver has a per-step
vision fallback that logs `SELECTOR DRIFT` so it's quick to repair in one file.

## License

MIT
