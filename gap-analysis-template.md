# Gap-analyse template (NL)

Na elke Research-ronde leest Claude Code `report-r{N}.md` en `brief.md`,
en produceert hij een gap-analyse in het Nederlands. Opgeslagen als
`gap-r{N}.md` in de sessie-map.

## Wat de analyse moet doen

1. **Coverage check**: loop elk item uit brief vraag 3 (Must-include) langs
   en oordeel: ✅ goed behandeld / ⚠️ oppervlakkig / ❌ niet behandeld.
2. **Zwakke onderbouwing**: noem claims die op één bron, oude bronnen,
   of niet-peer-reviewed bronnen leunen (afhankelijk van brief vraag 4 + 5).
3. **Ontbrekende perspectieven**: contra-evidence, recentere meta-analyses,
   alternatieve interpretaties.
4. **Voorgestelde follow-up prompts** (2–4): elk met korte NL omschrijving
   van wat de prompt zou onderzoeken.
5. **Vrije invoer**: ruimte voor user om zelf een onderwerp te kiezen.

## Template

````
# Gap-analyse ronde {N}

**Sessie:** {hoofdvraag, kort}
**Datum:** {YYYY-MM-DD}

## Coverage check
- ✅ {must-include item 1} — {1-zins toelichting}
- ⚠️ {must-include item 2} — oppervlakkig, mist {wat}
- ❌ {must-include item 3} — niet behandeld
{... voor elk item uit brief vraag 3 ...}

## Zwakke onderbouwing
- {claim Y, kort} steunt alleen op {bron Z, jaar}
- {claim X} mist contra-evidence
{... of "geen zwakke punten gevonden" ...}

## Ontbrekende perspectieven
- {perspectief 1, kort}
- {perspectief 2, kort}
{... of weglaten als niets ontbreekt ...}

## Voorgestelde follow-up prompts

1. **Verdieping op {item 2}** — "{korte NL omschrijving van wat de
   follow-up prompt zou onderzoeken}"
2. **Recentere bronnen voor {claim Y}** — "{korte NL omschrijving}"
3. **Contra-evidence op {claim X}** — "{korte NL omschrijving}"
{... 2–4 voorstellen totaal ...}

## Eigen invoer
Wil je iets anders onderzoeken? Typ vrij — of kies 1/2/3/..., of "klaar".
````

## User-respons

Na het tonen van de gap-analyse wacht Claude Code op input:

- **Nummer** (`1`, `2`, ...) → die voorgestelde prompt wordt basis voor
  ronde N+1. Eerst nog approve/edit-stap (zoals in stap 3 van de flow).
- **Vrije tekst** → die wordt basis voor ronde N+1.
- **"klaar"** → loop stopt. Als er meer dan één ronde was, schrijft
  Claude Code een `index.md` aan (zie SKILL.md stap 7).
