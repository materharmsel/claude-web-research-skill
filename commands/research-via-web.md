# /research-via-web

Voer diep onderzoek uit via **claude.ai Research** of **Gemini Deep Research** (jouw
keuze), met een Nederlandstalig brief-vragenrondje vooraf en een gap-analyse + follow-up
loop achteraf. De flow eromheen is voor beide providers identiek.

## Gebruik

Zonder provider/query (Claude Code vraagt eerst "Claude of Gemini?", dan de hoofdvraag):

```
/research-via-web
```

Met een provider (`claude` of `gemini`) en/of een ruwe vraag (de vraag vult brief-vraag 1
alvast in):

```
/research-via-web gemini "Wat is de impact van late-night eten op slaapkwaliteit?"
/research-via-web claude "Vergelijk Inertia.js vs Livewire voor Laravel SPA's"
/research-via-web "SharePoint Framework SPFx performance patterns"   (provider wordt gevraagd)
```

**Provider-keuze:** geef je geen provider mee, dan vraagt Claude Code het als eerste stap.
- **Gemini** vereist dat het model op **Flash** staat (anders ontbreekt "Deep research").

## Wat er gebeurt

0. **Provider** — Claude of Gemini? (uit je argument, anders vraagt Claude Code het).
1. **Brief** — Claude Code stelt 6 NL vragen (één voor één) om hoofdvraag,
   doel, must-include aspecten, bronvoorkeur, recency en exclusies vast te
   leggen. Per vraag mag je "skip" zeggen.
2. **Prompt-voorstel** — Claude Code componeert een EN Research-prompt
   uit je brief en toont die aan jou. Je kunt approven of editen.
3. **Background research** — een background agent opent Chrome, gaat naar de
   gekozen provider (claude.ai of gemini.google.com/app), zet deep research
   aan en stuurt je prompt. Bij Gemini bevestigt de agent ook het research-plan.
   Dit duurt 5 tot 30+ minuten.
4. **NL rapport** — de provider is geïnstrueerd het rapport in helder
   Nederlands te schrijven; bronnen blijven in originele taal.
5. **Gap-analyse** — Claude Code leest het rapport en stelt 2–4
   follow-up prompts voor. Je kiest één, schrijft je eigen, of zegt
   "klaar".
6. **Loop of stop** — bij keuze: terug naar stap 2 voor ronde 2 (je mag dan
   ook van provider wisselen). Bij "klaar": done (en als er >1 ronde was,
   krijg je een `index.md`).

## BELANGRIJK: background-uitvoering

De Research-stap zelf draait als background agent. Druk Ctrl+Shift+B
om hem naar de achtergrond te sturen als dat niet automatisch gebeurt.

Je kunt in de tussentijd ander werk doen in Claude Code. Je krijgt
een notificatie zodra de ronde klaar is en de gap-analyse start.

## Output

Alles wordt opgeslagen in:

```
./docs/research/{YYYYMMDD}-{slug}/
```

Inhoud: zie `SKILL.md` sectie "Sessie-map en bestanden".

## Voorbeelden

```
/research-via-web
```
(provider wordt gevraagd, daarna start het brief-rondje bij vraag 1)

```
/research-via-web gemini "Vergelijk Inertia.js vs Livewire voor Laravel SPA's"
```
(Gemini gekozen; vraag 1 vooraf ingevuld; rondje begint bij vraag 2)

```
/research-via-web claude "SharePoint Framework SPFx performance patterns"
```
(Claude gekozen; vraag 1 vooraf ingevuld)
