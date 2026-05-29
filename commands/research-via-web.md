# /research-via-web

Voer diep onderzoek uit via claude.ai's Research-feature, met een
Nederlandstalig brief-vragenrondje vooraf en een gap-analyse + follow-up
loop achteraf.

## Gebruik

Zonder query (Claude Code stelt zelf de hoofdvraag-vraag):

```
/research-via-web
```

Met een ruwe vraag (deze wordt gebruikt om brief-vraag 1 in te vullen):

```
/research-via-web "Wat is de impact van late-night eten op slaapkwaliteit?"
```

## Wat er gebeurt

1. **Brief** — Claude Code stelt 6 NL vragen (één voor één) om hoofdvraag,
   doel, must-include aspecten, bronvoorkeur, recency en exclusies vast te
   leggen. Per vraag mag je "skip" zeggen.
2. **Prompt-voorstel** — Claude Code componeert een EN Research-prompt
   uit je brief en toont die aan jou. Je kunt approven of editen.
3. **Background research** — een background agent opent Chrome, gaat
   naar claude.ai, zet Research aan, en stuurt je prompt. Dit duurt
   5 tot 30+ minuten.
4. **NL rapport** — claude.ai is geïnstrueerd het rapport in helder
   Nederlands te schrijven; bronnen blijven in originele taal.
5. **Gap-analyse** — Claude Code leest het rapport en stelt 2–4
   follow-up prompts voor. Je kiest één, schrijft je eigen, of zegt
   "klaar".
6. **Loop of stop** — bij keuze: terug naar stap 2 voor ronde 2.
   Bij "klaar": done (en als er >1 ronde was, krijg je een `index.md`).

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
(brief-rondje start direct met vraag 1)

```
/research-via-web "Vergelijk Inertia.js vs Livewire voor Laravel SPA's"
```
(vraag 1 vooraf ingevuld; rondje begint bij vraag 2)

```
/research-via-web "SharePoint Framework SPFx performance patterns"
```
