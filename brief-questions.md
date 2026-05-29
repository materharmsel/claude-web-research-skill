# Brief-vragen — web-research-task

Claude Code stelt deze vragen **één voor één** in het Nederlands voordat
de Research-prompt wordt samengesteld. De antwoorden worden opgeslagen
in `brief.md` in de sessie-map.

## Skip-gedrag

Bij elke vraag mag de user "skip" zeggen. Claude Code vult dat veld dan
zelf in op basis van wat tot dan toe bekend is uit eerdere antwoorden of
uit de oorspronkelijke ruwe query. Bij "skip" wordt in `brief.md`
expliciet vermeld dat dit veld is afgeleid (`[afgeleid]`) zodat het
verschil zichtbaar blijft.

## Pre-fill bij ruwe query

Als `/research-via-web "ruwe vraag"` is aangeroepen, wordt vraag 1
al ingevuld met die ruwe vraag (user kan bijschaven of "ok" zeggen),
en begint de skill bij vraag 2.

## De 6 vragen

### 1. Hoofdvraag
"Wat is je hoofdvraag? Formuleer in één zin wat je precies wilt weten."

Doel: scherpe formulering vóór alles. Vage hoofdvragen leiden tot vage
research-output.

### 2. Doel
"Waarvoor ga je deze research gebruiken?"
Opties: achtergrondkennis / besluit nemen / vault-input / schoolmodule / anders.

Doel: bepaalt de toon en diepte van het rapport. Een besluit vraagt om
concrete aanbevelingen; vault-input vraagt om bron-citeerbaarheid.

### 3. Must-include aspecten
"Welke aspecten moeten zeker behandeld worden? Som ze op (3–6 punten)."

Doel: dwingt de scope expliciet te maken. Wordt later gebruikt in de
gap-analyse als coverage-checklist.

### 4. Bronvoorkeur
"Welke bronnen prefereer je?"
Opties: peer-reviewed / overheid-RIVM / industry / mix / geen voorkeur.

Doel: vertelt claude.ai welk soort bewijs zwaarder mag wegen.

### 5. Recency
"Hoe recent moeten bronnen zijn?"
Opties: ≤5 jaar / ≤10 jaar / klassiek mag ook.

Doel: domein-afhankelijk. Voor health: meestal ≤10j met seminal-klassiekers.

### 6. Exclusies
"Wat moet expliciet NIET behandeld worden, of is al bekend?"

Doel: voorkomt dat de research-output tijd verspilt aan dingen die je
al weet. Wordt in de prompt als "OUT OF SCOPE" sectie opgenomen.

## brief.md output-format

Na het vragenrondje schrijft Claude Code dit naar de sessie-map:

```markdown
# Brief: {hoofdvraag, kort}

**Datum:** {YYYY-MM-DD}

## 1. Hoofdvraag
{antwoord}

## 2. Doel
{antwoord}

## 3. Must-include
- {item 1}
- {item 2}
- ...

## 4. Bronvoorkeur
{antwoord}

## 5. Recency
{antwoord}

## 6. Exclusies
{antwoord}
```

Velden waar de user "skip" zei krijgen achter het antwoord `[afgeleid]`.
