# Web Research via claude.ai

A [Claude Code](https://claude.com/claude-code) skill that runs **deep research** through
claude.ai's built-in Research feature (driven in Chrome), then saves a clean Markdown
report with working source links — fully as a background agent.

It wraps the Research run in a small Dutch-language workflow: a short briefing, an English
research prompt, the run itself, and a gap-analysis loop so you can dig deeper round by
round. (The interaction language is Dutch by default but easy to adapt.)

## Why it exists

Driving claude.ai through screenshots is slow and burns tokens. This skill instead uses a
small, tested JavaScript driver plus claude.ai's own conversation API, so it knows exactly
what to do and barely touches the context window.

## How it works

| Phase | Mechanism |
|---|---|
| **Start** a run (enable Research, fill the prompt, submit) | UI/DOM — a synthetic `Enter` keydown on the editor (works on a background tab, no foreground focus) |
| **Poll** status, detect deep-vs-degraded, **extract** the report | claude.ai conversation API, fetched in-page with the session cookie — **no clicking, no foreground, no opening the artifact panel** |

The finished report lives in an `artifacts` tool-use block in the conversation API as plain
Markdown (with links). The driver reads it directly and writes it to disk via a Blob
download, so the report text never has to pass back through the model's context.

Key API signals on the last assistant message:

- `stop_reason` is `null` while running, set when done.
- a `launch_extended_search_task` tool-use confirms a *real* deep-research run (vs. a
  quota-degraded plain web-search answer).
- the `artifacts` tool-use's `input.content` is the full report Markdown.

## Requirements

1. Claude Code with the **Claude in Chrome** extension installed and logged in
2. A paid Claude plan (Research is a paid feature)
3. Chrome running, with downloads set to **auto-save** (not "ask where to save")

## Usage

```
/research-via-web
/research-via-web "your rough question here"
```

The skill then walks you through briefing → prompt → background run → report → gap analysis.

## Files

| File | Role |
|---|---|
| `SKILL.md` | The skill definition and end-to-end flow |
| `claude-ai-driver.js` | The tested JS driver injected into the claude.ai tab |
| `agent-prompt.md` | Deterministic playbook for the background research agent |
| `brief-questions.md` | The Dutch briefing questions |
| `prompt-template.md` | English research-prompt skeleton |
| `gap-analysis-template.md` | Dutch gap-analysis skeleton |
| `commands/` | The `/research-via-web` slash command |

## Status

The driver's selectors and the conversation-API extraction were verified live on
2026-05-29. The "Start" actions use the browser UI; everything after submit runs through
the API, which is what makes the skill usable as an unattended background agent.

## License

MIT
