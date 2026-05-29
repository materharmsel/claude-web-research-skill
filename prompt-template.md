# Research-prompt template (EN)

Claude Code vult dit template in op basis van de antwoorden uit
`brief-questions.md`. De ingevulde prompt wordt opgeslagen als
`prompt-r{N}.md` in de sessie-map, en is wat naar claude.ai's
Research-feature wordt gestuurd.

## Taal-keuzes

- Prompt zelf: **Engels** (claude.ai Research is op EN getuned).
- Output-instructie: rapport moet **Nederlands** zijn.
- Vaktermen: blijven Engels waar gangbaar.

## Template

````
You are conducting deep research for a Dutch user.

RESEARCH QUESTION
{hoofdvraag, vertaald naar EN}

PURPOSE
{doel, korte EN omschrijving — bv. "background knowledge for a personal
wiki on nutrition" of "decision support for choosing X over Y"}

REQUIRED COVERAGE
- {must-include item 1, EN}
- {must-include item 2, EN}
- {must-include item 3, EN}
{... meer items uit brief vraag 3 ...}

SOURCE PREFERENCES
{bronvoorkeur, EN — bv. "Prefer peer-reviewed studies (PubMed, Cochrane).
Government/regulatory sources (RIVM, EFSA, FDA) acceptable. Industry
sources only if explicitly justified."}
Recency: {recency, EN — bv. "Prefer sources from the last 10 years;
seminal older work is acceptable when clearly foundational."}

OUT OF SCOPE / ALREADY KNOWN
{exclusies, EN}

OUTPUT REQUIREMENTS
- Write the final report in clear, natural Dutch.
- Reading level: educated layperson — not overly technical, not oversimplified.
- Keep scientific/technical terms in English where that is standard
  (e.g. "leucine threshold", not "leucinedrempel").
- Cite sources inline; keep citations and quotes in their original language
  (do not translate quotes).
- Structure:
  1. Korte introductie (2–4 zinnen — wat ga ik beantwoorden, hoe).
  2. Eén hoofdsectie per item uit REQUIRED COVERAGE.
  3. Conclusie met de belangrijkste takeaways (3–6 bullets).
  4. Lijst van geraadpleegde bronnen onderaan.
````

## Follow-up runs (ronde 2+)

Bij een follow-up run wordt de gekozen gap-analyse-prompt als basis
gebruikt. Het template wordt licht aangepast:

- `RESEARCH QUESTION` wordt de follow-up vraag.
- `PURPOSE` krijgt context: "follow-up to previous round; deepen on X".
- `REQUIRED COVERAGE` mag korter — alleen het gap-onderwerp.
- `OUT OF SCOPE / ALREADY KNOWN` krijgt: "what was already covered in
  round 1 (see brief and prior report)".

De rest blijft hetzelfde.
