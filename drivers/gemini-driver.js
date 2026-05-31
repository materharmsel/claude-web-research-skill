// gemini-driver.js — deterministische Gemini Deep Research-driver (v1)
// Injecteer dit bestand ÉÉN KEER via javascript_tool. Het zet window.__gdr.
// Roep daarna window.__gdr.<fn>() aan in losse javascript_tool-calls.
//
// ARCHITECTUUR (vergelijk drivers/claude-ai-driver.js):
//   - Gemini Deep Research heeft GEEN schone conversatie-API zoals claude.ai
//     (daar zat het rapport als markdown in een `artifacts` tool_use-blok). Bij
//     Gemini gaat ALLES via de UI/DOM:
//       * model op Flash zetten (anders ontbreekt "Deep research" in het menu),
//       * Deep Research aanzetten, prompt vullen, submitten,
//       * de research-PLAN bevestigen met "Start research" (extra stap; geen
//         claude.ai-equivalent),
//       * status pollen via DOM-signalen,
//       * het rapport uit de DOM scrapen (HTML->markdown) en via Blob downloaden.
//
//   - Net als de claude-driver geeft elke functie een KLEINE JSON-string terug en
//     geeft downloadReport() NOOIT de rapporttekst terug (privacy → Blob-download
//     naar schijf; de agent verplaatst het bestand naar de sessiemap).
//
// Bij een missende UI-selector: {"error":"selector-not-found","step":"<naam>"}
//   -> de agent gebruikt het vision-vangnet voor alléén die stap.

(() => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const q  = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const SEL = {
    modelPicker: 'button[aria-label^="Open mode picker"]',
    tools:       'button[aria-label="Upload & tools"]',
    editor:      '.ql-editor',
    send:        'button[aria-label="Send message"]',
    closeDeep:   'button[aria-label="close Deep research"]',
    stop:        'button[aria-label="Stop response"]',  // aanwezig zolang Gemini genereert/onderzoekt
    panel:       'deep-research-immersive-panel',         // de immersive/canvas-panel met het eindrapport
    // Fallback-containers als de immersive-panel ontbreekt.
    reportCandidates: '.markdown, message-content, model-response',
  };

  const findMenuItem = (re, roles = '[role="menuitemcheckbox"],[role="menuitem"],[role="menuitemradio"],[role="option"]') =>
    qa(roles).find(e => re.test((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || '')));
  const findByText = (re, sels = 'button,[role="button"],a') =>
    qa(sels).find(e => re.test((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || '')));

  // Sluit een open overlay/menu met Escape op een element ín het menu (Angular CDK overlay).
  const closeMenu = async () => {
    const item = qa('[role="menuitemcheckbox"],[role="menuitem"],[role="menuitemradio"],[role="option"]')[0];
    if (item) item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
    await delay(300);
  };

  const pressEnter = (el) => {
    const o = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    el.dispatchEvent(new KeyboardEvent('keydown', o));
    el.dispatchEvent(new KeyboardEvent('keypress', o));
    el.dispatchEvent(new KeyboardEvent('keyup', o));
  };

  // ---- HTML -> Markdown (overgenomen uit claude-ai-driver.js) ----
  function inl(node) {
    let s = '';
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { s += n.textContent; return; }
      if (n.nodeType !== 1) return;
      const t = n.tagName.toLowerCase();
      if (t === 'strong' || t === 'b') s += '**' + inl(n) + '**';
      else if (t === 'em' || t === 'i') s += '*' + inl(n) + '*';
      else if (t === 'code') s += '`' + n.textContent + '`';
      else if (t === 'a') s += '[' + inl(n) + '](' + n.getAttribute('href') + ')';
      else if (t === 'br') s += '\n';
      else s += inl(n);
    });
    return s;
  }
  function blk(node) {
    const out = [];
    node.childNodes.forEach(n => {
      if (n.nodeType !== 1) { if (n.nodeType === 3 && n.textContent.trim()) out.push(n.textContent.trim()); return; }
      const t = n.tagName.toLowerCase();
      if (t === 'h1') out.push('# ' + inl(n));
      else if (t === 'h2') out.push('## ' + inl(n));
      else if (t === 'h3') out.push('### ' + inl(n));
      else if (t === 'h4') out.push('#### ' + inl(n));
      else if (t === 'p') out.push(inl(n));
      else if (t === 'ul') n.querySelectorAll(':scope>li').forEach(li => out.push('- ' + inl(li)));
      else if (t === 'ol') { let i = 1; n.querySelectorAll(':scope>li').forEach(li => out.push((i++) + '. ' + inl(li))); }
      else if (t === 'table') {
        const rows = [...n.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(c => inl(c).replace(/\n/g, ' ').trim()));
        if (rows.length) {
          // Bouw de hele tabel als ÉÉN blok (regels met enkele \n) — anders breekt out.join('\n\n')
          // de tabel met lege regels tussen de rijen en rendert markdown hem niet.
          const lines = ['| ' + rows[0].join(' | ') + ' |', '| ' + rows[0].map(() => '---').join(' | ') + ' |'];
          rows.slice(1).forEach(r => lines.push('| ' + r.join(' | ') + ' |'));
          out.push(lines.join('\n'));
        }
      }
      else if (t === 'pre') out.push('```\n' + n.textContent + '\n```');
      else if (t === 'blockquote') out.push('> ' + inl(n));
      else { const inner = blk(n); if (inner) out.push(inner); }
    });
    return out.join('\n\n');
  }

  // Het eindrapport is de `.markdown` (of `message-content`) ÍN de deep-research-immersive-panel.
  // (Live geverifieerd 2026-05-31: panel-body = schone HTML met h1-h4/p/table + inline bronlinks.)
  // Fallback: grootste markdown-container op de pagina.
  const biggestReport = () => {
    const panel = q(SEL.panel);
    if (panel) {
      const md = panel.querySelector('.markdown') || panel.querySelector('message-content');
      if (md && (md.innerText || '').length > 800) return md;
    }
    const els = qa(SEL.reportCandidates);
    return els.sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)[0] || null;
  };

  window.__gdr = {
    version: '2026-05-31b', // b: live geverifieerd — Stop-response-signaal + immersive-panel .markdown-extractie

    // ---------- MODEL (UI/DOM) ----------

    // Zorg dat het model op Flash staat (anders verschijnt "Deep research" niet in het menu).
    // -> {flash:true} of {flash:true, switched:true} of {error,step}
    async ensureFlashModel() {
      try {
        const btn = q(SEL.modelPicker);
        if (!btn) return JSON.stringify({ error: 'selector-not-found', step: 'model-picker' });
        const label = btn.getAttribute('aria-label') || btn.innerText || '';
        // Flash maar NIET Flash-Lite (Deep Research vereist het reguliere Flash-model).
        if (/flash/i.test(label) && !/lite/i.test(label)) return JSON.stringify({ flash: true, switched: false });
        // Niet (correct) op Flash → open picker en kies het reguliere Flash (geen Lite, geen Pro).
        btn.click();
        await delay(500);
        const opts = qa('[role="menuitem"],[role="menuitemradio"],[role="option"]');
        const flash = opts.find(e => /flash/i.test(e.innerText || '') && !/lite/i.test(e.innerText || '')) || opts.find(e => /flash/i.test(e.innerText || ''));
        if (!flash) { await closeMenu(); return JSON.stringify({ error: 'selector-not-found', step: 'flash-option' }); }
        flash.click();
        await delay(500);
        const after = (q(SEL.modelPicker)?.getAttribute('aria-label') || '');
        return JSON.stringify({ flash: /flash/i.test(after), switched: true });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'ensureFlashModel' }); }
    },

    // ---------- INPUT (UI/DOM) ----------

    // Zet Deep Research aan via "Upload & tools" → "Deep research". Verifieer via de close-chip.
    // -> {enabled} of {error,step}
    async enableDeepResearch() {
      try {
        if (q(SEL.closeDeep)) return JSON.stringify({ enabled: true, already: true });
        const tools = q(SEL.tools);
        if (!tools) return JSON.stringify({ error: 'selector-not-found', step: 'tools-button' });
        tools.click();
        await delay(500);
        const item = findMenuItem(/deep research/i);
        if (!item) { await closeMenu(); return JSON.stringify({ error: 'selector-not-found', step: 'deep-research-menuitem (model op Flash?)' }); }
        item.click();
        await delay(500);
        const enabled = !!q(SEL.closeDeep);
        if (!enabled) await closeMenu();
        return JSON.stringify({ enabled, step: enabled ? null : 'verify-deep-research-chip' });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'enableDeepResearch' }); }
    },

    // Vul de Quill-editor. Geef text als JSON-geëscapete string mee. -> {len}
    async fillPrompt(text) {
      try {
        const ed = q(SEL.editor);
        if (!ed) return JSON.stringify({ error: 'selector-not-found', step: 'editor' });
        ed.focus(); await delay(120);
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
        await delay(200);
        return JSON.stringify({ len: (ed.innerText || '').length });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'fillPrompt' }); }
    },

    // Submit via de send-knop; fallback Enter-keydown op de editor. -> {submitted, via}
    async submit() {
      try {
        const ed = q(SEL.editor);
        if (!ed) return JSON.stringify({ error: 'selector-not-found', step: 'editor' });
        if ((ed.innerText || '').trim().length < 5) return JSON.stringify({ error: 'editor-empty', step: 'submit' });
        const urlBefore = location.href;
        const send = q(SEL.send);
        let via = 'send-button';
        if (send && !send.disabled) { send.click(); }
        else { ed.focus(); pressEnter(ed); via = 'enter-keydown'; }
        await delay(1500);
        let cleared = (q(SEL.editor)?.innerText || '').trim().length === 0;
        let urlChanged = location.href !== urlBefore;
        if (!cleared && !urlChanged) { // fallback proberen
          ed.focus(); pressEnter(ed); via = 'enter-keydown-fallback';
          await delay(1200);
          cleared = (q(SEL.editor)?.innerText || '').trim().length === 0;
          urlChanged = location.href !== urlBefore;
        }
        window.__gdrT0 = Date.now();
        return JSON.stringify({ submitted: cleared || urlChanged, via, urlChanged });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'submit' }); }
    },

    // Bevestig het research-plan: klik "Start research" (plan NIET bewerken). -> {started}
    // (Exacte knop-selector wordt live vastgelegd; nu via tekst-match.)
    async startResearch() {
      try {
        const btn = findByText(/start research|begin research|onderzoek starten/i);
        if (!btn) return JSON.stringify({ error: 'selector-not-found', step: 'start-research-button' });
        btn.click();
        window.__gdrT0 = Date.now();
        await delay(1200);
        return JSON.stringify({ started: true });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'startResearch' }); }
    },

    // ---------- STATUS / EXTRACTIE (DOM) ----------

    // Is Deep Research écht aangeslagen (plan/run) of gedegradeerd tot een gewoon antwoord?
    // mode: 'plan' | 'deep' | 'degraded' | 'running-unclear'
    // Live geverifieerd: bij Deep Research verschijnt eerst een PLAN met "Start research" +
    // "Edit plan" + "Try again without Deep Research". Daarna een immersive-panel + Stop-knop.
    async researchEngagement() {
      try {
        const planBtn = findByText(/start research|begin research|onderzoek starten/i);
        if (planBtn) return JSON.stringify({ mode: 'plan', note: 'plan-getoond, klik startResearch' });
        const running = !!q(SEL.stop);
        const panel = q(SEL.panel);
        const report = biggestReport();
        const big = report && (report.innerText || '').length > 1500;
        if (running || panel) return JSON.stringify({ mode: 'deep', running, hasReport: big });
        if (big) return JSON.stringify({ mode: 'deep', running: false, hasReport: true });
        // Een gewoon antwoord zonder plan/panel = waarschijnlijk gedegradeerd (quota/limiet).
        const anyAnswer = qa('model-response, message-content').some(e => (e.innerText || '').length > 200);
        if (anyAnswer) return JSON.stringify({ mode: 'degraded', note: 'geen plan/panel — gewoon antwoord' });
        return JSON.stringify({ mode: 'running-unclear' });
      } catch (e) { return JSON.stringify({ mode: 'running-unclear', error: String(e).slice(0, 120) }); }
    },

    // Voortgang via DOM-signaal: `Stop response`-knop = bezig. -> {running, reportChars, signal}
    async status() {
      try {
        const stop = q(SEL.stop);
        const report = biggestReport();
        const chars = report ? (report.innerText || '').length : 0;
        return JSON.stringify({ running: !!stop, reportChars: chars, signal: stop ? 'stop-response-button' : 'done' });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'status' }); }
    },

    // Scrape het rapport uit de grootste kandidaat-container → HTML→md → Blob-download.
    // Geeft NOOIT de rapporttekst terug. header mag {{duration}} bevatten. -> {triggered, chars, links, duration}
    async downloadReport(filename, header) {
      try {
        const el = biggestReport();
        if (!el || (el.innerText || '').length < 1500) return JSON.stringify({ error: 'report-not-found', step: 'downloadReport' });
        const content = blk(el);
        let durStr = null;
        if (window.__gdrT0) { const s = Math.round((Date.now() - window.__gdrT0) / 1000); durStr = Math.floor(s / 60) + 'm ' + (s % 60) + 's'; }
        const hdr = (header || '').replace('{{duration}}', durStr || 'onbekend');
        const full = hdr + content.trim() + '\n';
        const blob = new Blob([full], { type: 'text/markdown' });
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = filename || 'report.md';
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 1500);
        return JSON.stringify({ triggered: true, chars: full.length, links: (content.match(/\]\(https?:/g) || []).length, duration: durStr });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 140), step: 'downloadReport' }); }
    },
  };

  return JSON.stringify({ loaded: true, version: window.__gdr.version, fns: Object.keys(window.__gdr) });
})()
