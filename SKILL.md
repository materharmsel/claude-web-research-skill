# Web Research via claude.ai

## Doel

Deze skill voert diep onderzoek uit via claude.ai's Research-feature
(in Chrome) op basis van een Nederlandstalig vragenrondje vooraf, en
biedt na elke ronde een gap-analyse + follow-up loop om dieper door
te kunnen graven.

Het Engelse Research-feature wordt onder de motorkap gebruikt voor
kwaliteit, maar alle interactie met jou is in het Nederlands en het
eindrapport is in helder NL.

BELANGRIJK: De Research-run zelf moet als background agent draaien
omdat hij 5 tot 30+ minuten kan duren. Niet inline forceren.

## Vereisten

1. Claude in Chrome extension geïnstalleerd en ingelogd
2. Claude Code v2.0.60+ (voor background agents)
3. Betaald Claude-abonnement (Pro/Team/Max/Enterprise)
4. Chrome browser draait
5. Chrome **auto-save** voor downloads aan (niet "vragen waar opslaan") — anders
   blokkeert een "Opslaan als"-dialoog de agent. Downloadmap instelbaar via
   `downloads_dir` (default `%USERPROFILE%\Downloads`); het rapport wordt na de
   Blob-download automatisch naar de sessiemap verplaatst.

## Hoe aan te roepen

### Optie 1: Slash-command (aanbevolen)

```
/research-via-web
```

of met een ruwe vraag erbij (deze wordt dan al gebruikt om brief-vraag 1
in te vullen):

```
/research-via-web "Wat is de impact van late-night eten op slaapkwaliteit?"
```

### Optie 2: Vrije invocatie

"Voer een diepe research uit via claude.ai over {onderwerp}."

## De 7-stap flow

```
1. Start         — /research-via-web (geen query, of ruwe query)
   ↓
2. Brief         — NL vragenrondje (zie brief-questions.md)
                    → schrijft brief.md
   ↓
3. Prompt        — EN Research-prompt samenstellen (zie prompt-template.md)
                    → user approve / edit
                    → schrijft prompt-r{N}.md
   ↓
4. Research run  — background agent (zie agent-prompt.md)
                    → claude.ai Research, 5–30 min
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
| `report-r1.md` | NL | Output van claude.ai ronde 1 |
| `gap-r1.md` | NL | Gap-analyse ronde 1 |
| `prompt-r2.md` etc. | EN | Vervolgrondes |
| `report-r2.md` etc. | NL | Vervolgrondes |
| `gap-r2.md` etc. | NL | Vervolgrondes |
| `index.md` | NL | Alleen als >1 ronde — overzicht met links |

## Template-bestanden in deze skill

| Bestand | Verantwoordelijkheid |
|---|---|
| `brief-questions.md` | De 6 NL brief-vragen, skip-gedrag, brief.md format |
| `prompt-template.md` | EN Research-prompt skelet met placeholders |
| `gap-analysis-template.md` | NL gap-analyse skelet + user-respons regels |
| `agent-prompt.md` | Deterministisch draaiboek voor de background agent (gebruikt de driver) |
| `claude-ai-driver.js` | Getest JS-recept voor claude.ai. **Starten** via de UI (Research aan, prompt vullen, submit via Enter-keydown); **status, deep-research-check en extractie** via claude.ai's conversatie-API (geen klik/voorgrond/artifact-paneel nodig → background-proof). Rapport komt als markdown uit het `artifacts`-blok; Blob-download naar schijf. Live geverifieerd 2026-05-29. |

## Taal-regels

| Onderdeel | Taal |
|---|---|
| Interactie Claude Code ↔ user | NL |
| `brief.md`, `gap-r{N}.md`, `index.md` | NL |
| `prompt-r{N}.md` | EN |
| `report-r{N}.md` | NL (claude.ai geïnstrueerd) |
| Citaten in rapporten | originele taal |
| Wetenschappelijke vaktermen | EN waar gangbaar |

## Tijdsindicatie

| Fase | Duur |
|---|---|
| Brief-vragenrondje | 2–5 min |
| Prompt-compositie + approve | 1–3 min |
| Research-run in claude.ai | 5–30+ min |
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