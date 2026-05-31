# Web Research via claude.ai of Gemini

## Doel

Deze skill voert diep onderzoek uit via een **deep-research-feature in Chrome** — je
kiest per sessie de provider: **claude.ai Research** of **Gemini Deep Research**. De
workflow eromheen is identiek: een Nederlandstalig vragenrondje vooraf, en na elke ronde
een gap-analyse + follow-up loop om dieper door te kunnen graven.

De Engelse research-prompt wordt onder de motorkap gebruikt voor kwaliteit, maar alle
interactie met jou is in het Nederlands en het eindrapport is in helder NL.

**Alleen de driver verschilt per provider; alles eromheen is gedeeld** (zie de
providers-tabel hieronder). Een functionele update aan de brief-vragen, prompt-compositie
of gap-analyse geldt daardoor automatisch voor beide providers.

BELANGRIJK: De Research-run zelf moet als background agent draaien
omdat hij 5 tot 30+ minuten kan duren. Niet inline forceren.

## Providers

| | **Claude** (claude.ai) | **Gemini** (gemini.google.com/app) |
|---|---|---|
| Driver | `drivers/claude-ai-driver.js` | `drivers/gemini-driver.js` |
| Draaiboek | `agent-prompt-claude.md` | `agent-prompt-gemini.md` |
| Research aanzetten | "+"-menu → Research-toggle | "Upload & tools" → "Deep research" (**model moet op Flash staan**) |
| Extra plan-stap | nee | ja — **"Start research"** bevestigen na het plan |
| Status + extractie | conversatie-API (`artifacts`-blok) | DOM-scraping (`deep-research-immersive-panel`) |
| Klaar-signaal | `stop_reason` gevuld | `Stop response`-knop verdwenen |

## Vereisten

**Gedeeld:**
1. Claude in Chrome extension geïnstalleerd en ingelogd
2. Claude Code v2.0.60+ (voor background agents)
3. Chrome browser draait
4. Chrome **auto-save** voor downloads aan (niet "vragen waar opslaan") — anders
   blokkeert een "Opslaan als"-dialoog de agent. Downloadmap instelbaar via
   `downloads_dir` (default `%USERPROFILE%\Downloads`); het rapport wordt na de
   Blob-download automatisch naar de sessiemap verplaatst.

**Provider-specifiek:**
- **Claude:** betaald Claude-abonnement (Pro/Team/Max/Enterprise), ingelogd op claude.ai.
- **Gemini:** ingelogd Google-account met Deep Research-toegang, **model op Flash**
  (anders ontbreekt "Deep research" in het menu).

## Hoe aan te roepen

### Optie 1: Slash-command (aanbevolen)

```
/research-via-web
```

Met een provider en/of een ruwe vraag erbij (de provider is `claude` of `gemini`;
de ruwe vraag vult brief-vraag 1 alvast in):

```
/research-via-web gemini "Wat is de impact van late-night eten op slaapkwaliteit?"
/research-via-web claude "Vergelijk Inertia.js vs Livewire voor Laravel SPA's"
```

**Provider-keuze:** geef je geen provider mee, dan vraagt de skill als **stap 0**
"Claude of Gemini?" voordat het brief-rondje begint.

### Optie 2: Vrije invocatie

"Voer een diepe research uit via Gemini over {onderwerp}." (of "via claude.ai")
Noem je geen provider, dan vraagt de skill het.

## De flow

```
0. Provider      — claude of gemini? (uit argument, of de skill vraagt het)
   ↓
1. Start         — /research-via-web (geen query, of ruwe query)
   ↓
2. Brief         — NL vragenrondje (zie brief-questions.md)
                    → schrijft brief.md
   ↓
3. Prompt        — EN Research-prompt samenstellen (zie prompt-template.md)
                    → user approve / edit
                    → schrijft prompt-r{N}.md
   ↓
4. Research run  — background agent met het driver-draaiboek van de gekozen provider
                    → claude.ai Research  (agent-prompt-claude.md), of
                    → Gemini Deep Research (agent-prompt-gemini.md), 5–30 min
                    → schrijft report-r{N}.md (NL)
   ↓
5. Gap-analyse   — NL coverage check (zie gap-analysis-template.md)
                    → schrijft gap-r{N}.md
                    → toont voorstellen + vraagt user-keuze
   ↓
6. Loop?         — user kiest nummer / vrije tekst → terug naar stap 3
                    user zegt "klaar" → naar stap 7
   ↓
7. Index         — alleen als N > 1: schrijft index.md
```

Stap 0–3, 5–7 zijn **identiek voor beide providers**. Alleen stap 4 (de run) gebruikt de
provider-specifieke driver + draaiboek. De provider mag per ronde verschillen — de
rapport-header noteert welke provider de ronde draaide, dus een gemengde sessie blijft
zelf-documenterend.

### index.md format (stap 7)

Alleen aanmaken als er meer dan één ronde was:

```markdown
# Research-sessie: {hoofdvraag}

Brief: [[brief]]

## Rondes
1. **Ronde 1** — {1-zins beschrijving} — [[report-r1]] · [[gap-r1]]
2. **Ronde 2** — {1-zins beschrijving} — [[report-r2]] · [[gap-r2]]
```

## Sessie-map en bestanden

Per research-sessie wordt een map aangemaakt op:

```
./docs/research/{YYYYMMDD}-{slug}/
```

waar `{slug}` een kebab-case afkorting van de hoofdvraag is (max 40 tekens).

Bestanden in de sessie-map:

| Bestand | Taal | Inhoud |
|---|---|---|
| `brief.md` | NL | Antwoorden op de 6 brief-vragen |
| `prompt-r1.md` | EN | Samengestelde Research-prompt ronde 1 |
| `report-r1.md` | NL | Output van de research-run ronde 1 (header noteert de provider) |
| `gap-r1.md` | NL | Gap-analyse ronde 1 |
| `prompt-r2.md` etc. | EN | Vervolgrondes |
| `report-r2.md` etc. | NL | Vervolgrondes |
| `gap-r2.md` etc. | NL | Vervolgrondes |
| `index.md` | NL | Alleen als >1 ronde — overzicht met links |

## Template-bestanden in deze skill

**Gedeeld (provider-agnostisch):**

| Bestand | Verantwoordelijkheid |
|---|---|
| `brief-questions.md` | De 6 NL brief-vragen, skip-gedrag, brief.md format |
| `prompt-template.md` | EN Research-prompt skelet met placeholders |
| `gap-analysis-template.md` | NL gap-analyse skelet + user-respons regels |

**Provider-specifiek (stap 4):**

| Bestand | Verantwoordelijkheid |
|---|---|
| `agent-prompt-claude.md` | Deterministisch draaiboek voor de **Claude** background agent |
| `agent-prompt-gemini.md` | Deterministisch draaiboek voor de **Gemini** background agent |
| `drivers/claude-ai-driver.js` | Getest JS-recept voor claude.ai. **Starten** via de UI (Research aan, prompt vullen, submit via Enter-keydown); **status, deep-research-check en extractie** via claude.ai's conversatie-API (geen klik/voorgrond/artifact-paneel nodig → background-proof). Rapport komt als markdown uit het `artifacts`-blok; Blob-download naar schijf. Live geverifieerd 2026-05-29. |
| `drivers/gemini-driver.js` | Getest JS-recept voor Gemini Deep Research. **Alles via UI/DOM**: model op Flash (`ensureFlashModel`), Deep Research aan, prompt vullen, submitten, plan bevestigen (`startResearch`), status via de `Stop response`-knop, extractie uit `deep-research-immersive-panel .markdown` (HTML→markdown) → Blob-download. Live geverifieerd 2026-05-31. |

## Taal-regels

| Onderdeel | Taal |
|---|---|
| Interactie Claude Code ↔ user | NL |
| `brief.md`, `gap-r{N}.md`, `index.md` | NL |
| `prompt-r{N}.md` | EN |
| `report-r{N}.md` | NL (claude.ai / Gemini geïnstrueerd) |
| Citaten in rapporten | originele taal |
| Wetenschappelijke vaktermen | EN waar gangbaar |

## Tijdsindicatie

| Fase | Duur |
|---|---|
| Brief-vragenrondje | 2–5 min |
| Prompt-compositie + approve | 1–3 min |
| Research-run (claude.ai of Gemini) | 5–30+ min |
| Result-extractie + opslaan | 30 sec |
| Gap-analyse + user-keuze | 2–5 min |

Per ronde dus 10–40 min totaal. Meerdere rondes vermenigvuldigen dit.

## Wat deze skill NIET doet (latere rondes)

- Project-profielen voor health-wiki / school
- Auto-context-injectie uit bestaande vault-notes
- Output-splitsing naar `<category>/sources/` per study
- Bron-kwaliteitsfilter per domein
- Quality-check checklist achteraf (citaties, contradicties)
- Schoolmodule-modus (leerdoelen, oefenvragen)

Ontwerp- en scope-notities worden lokaal in `docs/` bewaard (niet meegepubliceerd).