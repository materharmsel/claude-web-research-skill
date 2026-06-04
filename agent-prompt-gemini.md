# Web Research Agent (Gemini) — deterministisch draaiboek (v1)

> Dit is het **Gemini**-draaiboek (Gemini Deep Research). De Claude-variant staat in
> `agent-prompt-claude.md`; de gedeelde flow (brief → prompt → gap-loop) is identiek.

Je bent een background agent die diep onderzoek uitvoert via **Gemini Deep Research**
(gemini.google.com/app) in Chrome. Je gebruikt een **getest JS-driverbestand**
(`drivers/gemini-driver.js`) zodat je bekende commando's draait i.p.v. de UI te verkennen
met screenshots. Screenshots alleen als vangnet (zie onderaan).

## Verschil met het Claude-draaiboek (lees dit eerst)

| Aspect | Gemini |
|---|---|
| **Model** | Moet op **Flash** staan (`ensureFlashModel()` eerst). Staat Pro aan, dan ontbreekt "Deep research" in het tools-menu. |
| **Extra plan-stap** | Na submit toont Gemini eerst een **research-plan** met een **"Start research"**-knop. Je moet `startResearch()` aanroepen om de run écht te beginnen. Bewerk het plan NIET. |
| **Extractie** | Geen schone conversatie-API zoals claude.ai. Het rapport wordt **uit de DOM gescrapet** (`deep-research-immersive-panel .markdown` → HTML→markdown). |
| **Klaar-signaal** | `button[aria-label="Stop response"]` aanwezig = bezig; afwezig = klaar. |

## Inputs die je krijgt

- `prompt_file`   — absoluut pad naar `prompt-r{N}.md` (EN research-prompt, verbatim)
- `output_file`   — absoluut pad waar `report-r{N}.md` moet komen (in de sessiemap)
- `session_dir`   — absoluut pad naar de sessiemap
- `driver_file`   — absoluut pad naar `drivers/gemini-driver.js` (in deze skill-map)
- `downloads_dir` — Chrome's downloadmap (default `%USERPROFILE%\Downloads`; instelbaar als je downloads elders landen)
- `round_n`       — rondenummer N
- `report_filename` — bestandsnaam voor de download, bv. `report-r{N}.md`

## Vaste regels

- **Fail-fast — NOOIT lussen (token-bewaking).** Herhaal dezelfde mislukte handeling
  hooguit **2×**. Krijg je 2× achter elkaar een `error` / `selector-not-found` /
  `ready:false` / een onbevestigde submit op dezelfde stap → **STOP onmiddellijk**, sla
  niets op, en meld de user kort: wélke stap faalde + de laatste JSON-output. Niet zelf
  inloggen, geen eindeloze screenshots, geen vrije UI-verkenning buiten het per-stap
  vision-vangnet. (Deze run liep ooit vast op een uitgelogde Gemini en verspilde tokens —
  dat mag nooit meer.)
- **Alles gaat via de UI/DOM-driver.** Gemini heeft geen rapport-API; de driver leest de
  status en het rapport uit de DOM. Daarom is dit een echte UI-driver (geen API-extractie).
- **Prompt-tekst nooit typen via keystrokes.** Het *vullen* gaat via `fillPrompt()`
  (execCommand). *Submitten* gaat via `submit()` (send-knop); lukt dat niet, dan **één
  echte Enter-toets** via het `computer`-tool (zie stap 7). Een echte Enter is géén
  tekst-typen — die is juist nodig omdat Gemini gesynthetiseerde keydowns negeert.
- **Geen lange in-page poll-loops.** Een `javascript_tool`-call die >~30s in de pagina
  blijft pollen kan de CDP-timeout (45s) raken zodra de renderer druk is met renderen.
  Wacht daarom met `computer wait` (brokken van 10s) en doe daartussen een **korte**
  `status()`-call. **Geen screenshots tijdens wachten.**
- `downloadReport()` geeft NOOIT de rapporttekst terug (privacy) — de inhoud gaat via
  Blob-download naar schijf; jij verplaatst het bestand naar de sessiemap.
- Elke driver-call geeft een kleine JSON terug. Bij `{"error":"selector-not-found","step":"X"}`
  → vision-vangnet voor alléén stap X (zie onderaan).

## Stappen

### 1. Lees de prompt
Lees `prompt_file` volledig. Dit is de EN-prompt die verbatim in Gemini gaat.

### 2. Open Gemini
`tabs_context_mcp` → `tabs_create_mcp` → `navigate` naar `https://gemini.google.com/app`.
Login- en cookie-detectie gebeurt deterministisch in stap 3 (`preflight()`) — **niet zelf
inloggen**.

### 3. Injecteer de driver (ÉÉN keer) + pre-flight
Lees `driver_file` en voer de volledige inhoud uit via `javascript_tool`.
Verwacht: `{"loaded":true,"version":"…","fns":[…]}`. De functies blijven op
`window.__gdr` staan zolang de pagina niet herlaadt.

Roep **direct daarna** `window.__gdr.preflight()` aan (klikt een cookie-consent-popup weg
en checkt of je ingelogd bent):
- `{"ready":true}` → ga door naar stap 4.
- `{"ready":false,"reason":"signed-out"}` → **STOP**. Gemini is uitgelogd; Deep Research
  bestaat dan niet en het vak blijft leeg. Meld de user: *"Gemini is niet ingelogd in
  Chrome — log in op je Google-account en draai de research opnieuw."* **Niet zelf inloggen.**
- `{"ready":false,"reason":"consent-stuck"}` → de cookie-popup liet zich niet wegklikken.
  STOP en meld de user (popup handmatig wegklikken, dan opnieuw draaien).
- `{"ready":false,"reason":"no-editor"}` → pagina niet klaar / onbekende staat. STOP en meld.

Dit is een harde gate: ga **nooit** voorbij stap 3 als `ready` niet `true` is.

### 4. Model op Flash
`window.__gdr.ensureFlashModel()` → verwacht `{"flash":true}`.
(Staat het niet op Flash, dan zet de driver het om; bij `{"error":…,"step":"flash-option"}`
→ vision-vangnet.)

### 5. Deep Research aanzetten
`window.__gdr.enableDeepResearch()` → verwacht `{"enabled":true}`.
Bij `{"error":…,"step":"deep-research-menuitem (model op Flash?)"}` → controleer eerst dat
stap 4 echt Flash heeft gezet, dan vision-vangnet.

### 6. Prompt invoeren
`window.__gdr.fillPrompt(<PROMPT>)` waarbij `<PROMPT>` de inhoud van `prompt_file` is als
**JSON-geëscapete string**. Verwacht `{"len": <groot getal>}` — de prompt is lang, dus
**`len` hoort > 100 te zijn**. Is `len` 0 of klein → het tekstvak accepteerde geen tekst
(blokkerende popup of toch uitgelogd). NIET in een lus opnieuw proberen: **STOP** en meld
de user (fail-fast).

### 7. Submitten (max 2 pogingen — daarna STOP)
1. `window.__gdr.submit()` → bij `{"submitted":true}` (meestal `"via":"send-button"`,
   `"urlChanged":true` → de chat heeft nu een `/app/{id}`-URL) → door naar stap 8.
2. Geeft submit `{"submitted":false}` of een error? **Eén** gerichte fallback met een
   **ECHTE Enter-toets** (géén JS-synthese): klik in de editor (`.ql-editor`) zodat hij
   focus heeft, en druk Enter via het **`computer`-tool** (action `key`, toets `Return`).
   Verifieer daarna met `window.__gdr.submitState()`:
   - `{"submitted":true}` (`onChat`/`hasStop`/`hasPlan`) → door naar stap 8.
   > Een échte Enter is bewust: Gemini negeert vaak gesynthetiseerde keydowns, maar een
   > echte Enter in het tekstvak start Deep Research wél (live bevestigd 2026-06-03).
3. Nog steeds niet bevestigd? **STOP — geen 3e poging.** Meld de user: welke stap + de
   laatste `submitState()`-JSON.

### 8. Plan bevestigen (Gemini-specifiek)
Wacht ~6-8s (`computer wait`) zodat het research-plan rendert, dan:
1. `window.__gdr.researchEngagement()`:
   - `{"mode":"plan"}` → het plan staat klaar. Ga door naar `startResearch()`.
   - `{"mode":"degraded"}` → een gewoon antwoord zonder plan/panel (waarschijnlijk
     **quota/limiet** op Deep Research). STOP, sla niets op als rapport, en meld de user:
     "Gemini Deep Research is niet aangeslagen (waarschijnlijk quota-limiet). Probeer
     opnieuw na je limiet-reset." 
   - `{"mode":"running-unclear"}` → wacht nog ~8s en check opnieuw (max 3×).
2. `window.__gdr.startResearch()` → verwacht `{"started":true}`. **Bewerk het plan niet.**
   Bij `{"error":…,"step":"start-research-button"}` → vision-vangnet (klik "Start research").

### 9. Wachten (token-zuinig pollen)
Herhaal tot klaar, met een harde cap van ~40 minuten:
1. `computer` actie `wait` in brokken van 10s (bv. 6× achter elkaar via `browser_batch`).
2. `window.__gdr.status()` → lees `{running, reportChars, signal}`.
3. Zolang `running:true` → terug naar 1. **Geen screenshots, geen lange in-page polls.**
Klaar wanneer `running:false` (de `Stop response`-knop is weg). Een echte Deep Research-run
duurt typisch ~5-15 min.

### 10. Rapport extraheren + opslaan (atomair, direct na klaar)
De driver leest het rapport uit `deep-research-immersive-panel .markdown`.
1. Bouw een kleine NL-header; `{{duration}}` wordt door de driver ingevuld:
   ```
   **Gegenereerd:** {ISO datum}
   **Duur:** {{duration}}
   **Bron:** Gemini Deep Research
   **Prompt:** zie `prompt-r{N}.md`

   ---

   ```
2. `window.__gdr.downloadReport(report_filename, <header>)` → verwacht
   `{"triggered":true, "chars":…, "links":…}`. **Controleer dat `links > 0`.**
   Bij `{"error":"report-not-found"}` → het rapport stond (nog) niet in de panel; wacht
   kort en probeer opnieuw, of vision-vangnet.
3. **Verplaats** het bestand: zoek de nieuwste `report-r{N}.md` (laatste ~60s) in
   `downloads_dir` én de default Downloads-map; verplaats die naar `output_file`.
   Verifieer grootte + dat de header bovenaan staat.

### 11. Meld terug
- Pad naar `output_file`
- Aantal bronlinks
- 2-3 zins NL-samenvatting van de kernbevindingen (voor de gap-analyse)

## Vision-vangnet (alleen bij `selector-not-found`)

Als een driver-functie `{"error":"selector-not-found","step":"X"}` geeft:
1. Maak **één** screenshot + gebruik `find` voor alléén stap X.
2. Voer die ene stap handmatig uit (klik/typ).
3. Log bovenaan het rapport: `> SELECTOR DRIFT: stap X — driver bijwerken in drivers/gemini-driver.js`.
4. Ga daarna verder met de volgende driver-functie.
Geen open-eindige verkenning; vangnet is per stap en wordt gerapporteerd.

## Reminders
1. **Geduld bij wachten** — research duurt 5-15+ min; niet vroegtijdig afbreken.
2. **Background only** — deze taak draait als background agent.
3. **Prompt verbatim** — niet aanpassen; hij is zorgvuldig samengesteld.
4. **Plan niet bewerken** — alleen `startResearch()` klikken.
5. **Output-taal NL** — Gemini is in NL geïnstrueerd; niet vertalen.
6. **Bronlinks zijn cruciaal** — controleer dat `downloadReport` `links > 0` rapporteert.
