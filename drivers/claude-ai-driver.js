// claude-ai-driver.js — deterministische claude.ai Research-driver (v3, API-extractie)
// Injecteer dit bestand ÉÉN KEER via javascript_tool. Het zet window.__wrt.
// Roep daarna window.__wrt.<fn>() aan in losse javascript_tool-calls.
//
// ARCHITECTUUR (background-proof, geverifieerd live 2026-05-29):
//   - INPUT (research aanzetten, prompt vullen, submit) gaat via de UI/DOM —
//     dat is de enige betrouwbare manier om een Research-run te STARTEN.
//   - STATUS, ENGAGEMENT en EXTRACTIE gaan via claude.ai's eigen conversatie-API
//     (fetch met sessie-cookie, ín de pagina). Dat vereist GEEN klik, GEEN
//     voorgrond-focus en GEEN openen van het artifact-paneel — cruciaal voor
//     een background-agent. Het rapport zit als pure markdown in een
//     `artifacts` tool_use-blok (input.content).
//
// API-signalen (op de laatste assistant-message van de conversatie):
//   - stop_reason == null            -> nog bezig (running)
//   - tool_use name 'launch_extended_search_task' aanwezig -> écht deep research
//   - tool_use name 'artifacts' -> input.content = volledige rapport-markdown
//
// Elke functie geeft een KLEINE JSON-string terug; bij een missende UI-selector:
//   {"error":"selector-not-found","step":"<naam>"} -> agent gebruikt vision-vangnet.
// downloadReport() geeft NOOIT de rapporttekst terug; de inhoud gaat via Blob-download
// naar schijf (en wordt daarna door de agent naar de sessiemap verplaatst).

(() => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const q  = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const SEL = {
    editor:     '[data-testid="chat-input"]',
    plus:       'button[aria-label="Add files, connectors, and more"]',
    send:       'button[aria-label="Send message"]',  // NIET gebruiken om te submitten (.click() werkt niet) — Enter-keydown op editor
    stop:       'button[aria-label="Stop response"]', // alleen DOM-fallback voor status
    report:     '.font-claude-response',              // alleen DOM-fallback voor extractie
  };

  // ---- DOM-helpers (input-acties) ----
  const menuResearch = () =>
    qa('[role="menuitemcheckbox"]').find(e => (e.innerText || '').trim().startsWith('Research'));

  // Sluit een open Radix-menu: Escape-keydown op een element ÍN het menu
  // (bubbelt naar Radix' onKeyDown). Een Escape op `document` werkt NIET.
  const closeMenu = async () => {
    const item = qa('[role="menuitemcheckbox"]')[0] || qa('[role="menuitem"]')[0];
    if (item) item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
    await delay(350);
    return qa('[role="menuitemcheckbox"]').length === 0;
  };

  // Dispatch een echte Enter-keydown op de editor (ProseMirror verwerkt synthetische
  // keydown wél, anders dan Radix/React-onClick). Dit submit zonder voorgrond-focus.
  const pressEnter = (el) => {
    const o = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    el.dispatchEvent(new KeyboardEvent('keydown', o));
    el.dispatchEvent(new KeyboardEvent('keypress', o));
    el.dispatchEvent(new KeyboardEvent('keyup', o));
  };

  const findByText = (text, sels = 'button,[role="button"],a') =>
    qa(sels).find(e => (e.innerText || '').trim().toLowerCase().includes(text.toLowerCase()));

  const biggestReport = () =>
    qa(SEL.report).sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)[0] || null;

  // ---- HTML -> Markdown (alleen DOM-fallback voor extractie) ----
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

  // ---- claude.ai conversatie-API (status/engagement/extractie) ----
  const convId = () => (location.pathname.match(/\/chat\/([0-9a-f-]{36})/) || [])[1] || null;
  const orgId  = () => (document.cookie.match(/lastActiveOrg=([^;]+)/) || [])[1] || null;

  async function fetchConv() {
    const conv = convId(), org = orgId();
    if (!conv) return { error: 'no-conversation-id (nog op /new? submit eerst)' };
    if (!org)  return { error: 'no-org-cookie' };
    const url = `/api/organizations/${org}/chat_conversations/${conv}?tree=True&rendering_mode=messages&render_all_tools=true`;
    const res = await fetch(url, { headers: { accept: 'application/json' }, credentials: 'include' });
    if (!res.ok) return { error: 'api-' + res.status };
    return { data: await res.json() };
  }
  const lastAssistant = data => [...((data && data.chat_messages) || [])].reverse().find(m => m.sender === 'assistant') || null;
  const firstHuman    = data => (((data && data.chat_messages) || []).find(m => m.sender === 'human')) || null;
  const artifactOf = asst => {
    let best = null;
    ((asst && asst.content) || []).forEach(c => {
      if (c.type === 'tool_use' && c.name === 'artifacts' && c.input && typeof c.input.content === 'string'
          && (!best || c.input.content.length > best.content.length)) best = c.input;
    });
    return best;
  };
  const hasExtendedSearch = asst =>
    ((asst && asst.content) || []).some(c => c.type === 'tool_use' && c.name === 'launch_extended_search_task');

  window.__wrt = {
    version: '2026-05-29c', // c: API-gebaseerde status/engagement/extractie (geen artifact-klik / voorgrond nodig)

    // ---------- INPUT (UI/DOM) ----------

    // Zet Research-mode aan. Verifieer via aria-checked op het menu-item. -> {enabled, menuClosed}
    async enableResearch() {
      try {
        const plus = q(SEL.plus);
        if (!plus) return JSON.stringify({ error: 'selector-not-found', step: 'plus-button' });
        plus.click();
        await delay(450);
        let r = menuResearch();
        if (!r) { await closeMenu(); return JSON.stringify({ error: 'selector-not-found', step: 'research-menuitem' }); }
        if (r.getAttribute('aria-checked') !== 'true') { r.click(); await delay(400); r = menuResearch(); }
        const enabled = !!(r && r.getAttribute('aria-checked') === 'true');
        const menuClosed = await closeMenu();
        return JSON.stringify({ enabled, menuClosed, step: enabled ? null : 'verify-research-aria-checked' });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'enableResearch' }); }
    },

    // Vul de editor. Geef text als JSON-geëscapete string mee. -> {len}
    async fillPrompt(text) {
      try {
        const ed = q(SEL.editor);
        if (!ed) return JSON.stringify({ error: 'selector-not-found', step: 'editor' });
        ed.click(); ed.focus(); await delay(120);
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
        await delay(200);
        return JSON.stringify({ len: (ed.innerText || '').length });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'fillPrompt' }); }
    },

    // Submit via een echte Enter-keydown op de editor (NIET via send-knop-.click()).
    // Sluit eerst een eventueel open menu (dat vangt Enter af). -> {submitted, urlChanged}
    async submit() {
      try {
        const ed = q(SEL.editor);
        if (!ed) return JSON.stringify({ error: 'selector-not-found', step: 'editor' });
        if ((ed.innerText || '').trim().length < 5) return JSON.stringify({ error: 'editor-empty', step: 'submit' });
        if (qa('[role="menuitemcheckbox"]').length) await closeMenu(); // open menu vangt Enter af
        ed.click(); ed.focus(); await delay(150);
        const urlBefore = location.href;
        pressEnter(ed);
        await delay(1200);
        const cleared = (q(SEL.editor)?.innerText || '').trim().length === 0;
        const urlChanged = location.href !== urlBefore;
        return JSON.stringify({ submitted: urlChanged || cleared, urlChanged });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'submit' }); }
    },

    // ---------- STATUS / ENGAGEMENT / EXTRACTIE (API) ----------

    // Controleer of deep-Research ÉCHT aanslaat i.p.v. een gedegradeerd web-search-antwoord.
    // mode: 'deep' | 'web-search-degraded' | 'running-unclear'
    async researchEngagement() {
      try {
        const r = await fetchConv();
        if (r.error) return JSON.stringify({ mode: 'running-unclear', note: r.error });
        const asst = lastAssistant(r.data);
        const ext = hasExtendedSearch(asst);
        const art = artifactOf(asst);
        const done = !!(asst && asst.stop_reason);
        let mode = 'running-unclear';
        if (ext || art) mode = 'deep';
        else if (done) mode = 'web-search-degraded';
        return JSON.stringify({ mode, extendedSearch: !!ext, hasArtifact: !!art, stopReason: asst ? asst.stop_reason : null });
      } catch (e) { return JSON.stringify({ mode: 'running-unclear', error: String(e).slice(0, 120) }); }
    },

    // Voortgang via API. running:true zolang stop_reason null is (of er nog geen
    // assistant-message is). Valt terug op de DOM stop-knop als de API faalt.
    // -> {running, stopReason, sources, reportChars, source}
    async status() {
      try {
        const r = await fetchConv();
        if (r.error) {
          const stop = q(SEL.stop) || qa('button').find(b => /stop/i.test(b.getAttribute('aria-label') || ''));
          return JSON.stringify({ running: !!stop, source: 'dom-fallback', note: r.error });
        }
        const asst = lastAssistant(r.data);
        const art = artifactOf(asst);
        return JSON.stringify({
          running: !asst || !asst.stop_reason,
          stopReason: asst ? asst.stop_reason : null,
          sources: asst && asst.sync_sources ? asst.sync_sources.length : null,
          reportChars: art ? art.content.length : 0,
          source: 'api',
        });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 120), step: 'status' }); }
    },

    // Haal het rapport uit het `artifacts` tool_use-blok (pure markdown) en trigger
    // een Blob-download. Valt terug op DOM-scraping (HTML->markdown) als de API geen
    // artifact geeft. Geeft NOOIT de rapporttekst terug.
    // header mag een `{{duration}}`-placeholder bevatten (vervangen door de gemeten duur).
    // -> {triggered, via, chars, links, duration}
    async downloadReport(filename, header) {
      try {
        let content = null, durStr = null, via = 'api';
        const r = await fetchConv();
        if (!r.error) {
          const asst = lastAssistant(r.data), human = firstHuman(r.data);
          const art = artifactOf(asst);
          if (art && art.content.length >= 2000) {
            content = art.content;
            try {
              const t0 = new Date(human.created_at).getTime();
              const t1 = new Date(asst.updated_at || asst.created_at).getTime();
              const s = Math.round((t1 - t0) / 1000);
              durStr = Math.floor(s / 60) + 'm ' + (s % 60) + 's';
            } catch (e) {}
          }
        }
        if (!content) { // DOM-fallback
          const el = biggestReport();
          if (el && (el.innerText || '').length >= 2000) { content = blk(el); via = 'dom-fallback'; }
        }
        if (!content) return JSON.stringify({ error: 'report-not-found', step: 'downloadReport', apiNote: r.error || null });
        const hdr = (header || '').replace('{{duration}}', durStr || 'onbekend');
        const full = hdr + content.trim() + '\n';
        const blob = new Blob([full], { type: 'text/markdown' });
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = filename || 'report.md';
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 1500);
        return JSON.stringify({ triggered: true, via, chars: full.length, links: (content.match(/\]\(https?:/g) || []).length, duration: durStr });
      } catch (e) { return JSON.stringify({ error: String(e).slice(0, 140), step: 'downloadReport' }); }
    },
  };

  return JSON.stringify({ loaded: true, version: window.__wrt.version, fns: Object.keys(window.__wrt) });
})()
