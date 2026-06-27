#!/usr/bin/env node
/**
 * GHL Voice AI — Web UI Server
 * Usage: node server.js
 * Opens at: http://localhost:3000
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const { generateSystemPrompt } = require('./lib/generate-system-prompt');
const { generateKnowledgeBase } = require('./lib/generate-knowledge-base');
const { generateFastSetupGuide } = require('./lib/generate-fast-setup-guide');

const PORT       = 3000;
const ROOT       = __dirname;
const CLIENTS_DIR = path.join(ROOT, 'clients');
const TEMPLATE   = path.join(ROOT, 'intake-form.json');

// ── Helpers ───────────────────────────────────────────────────────────────────
const readJSON  = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeFile = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
};
const clientDir  = (slug) => path.join(CLIENTS_DIR, slug);
const intakePath = (slug) => path.join(clientDir(slug), 'intake-form.json');
const artifacts  = (slug) => ({
  systemPrompt:  path.join(clientDir(slug), 'system-prompt-output.txt'),
  knowledgeBase: path.join(clientDir(slug), 'knowledge-base-content.md'),
  setupGuide:    path.join(clientDir(slug), 'fast-setup-guide.md'),
});

const json = (res, data, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
};

const listClients = () => {
  if (!fs.existsSync(CLIENTS_DIR)) return [];
  return fs.readdirSync(CLIENTS_DIR)
    .filter(f => fs.statSync(path.join(CLIENTS_DIR, f)).isDirectory())
    .map(slug => {
      const ip = intakePath(slug);
      const b  = fs.existsSync(ip) ? readJSON(ip) : {};
      const a  = artifacts(slug);
      return {
        slug,
        business_name: b.business_name || '',
        has_intake:    fs.existsSync(ip),
        has_prompt:    fs.existsSync(a.systemPrompt),
        has_kb:        fs.existsSync(a.knowledgeBase),
        has_workflow:  fs.existsSync(a.setupGuide),
      };
    });
};

// ── Route handler ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  // ── Static HTML ─────────────────────────────────────────────────────────────
  if (method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHTML());
    return;
  }

  // ── API: list clients ────────────────────────────────────────────────────────
  if (method === 'GET' && url.pathname === '/api/clients') {
    json(res, listClients());
    return;
  }

  // ── API: get template ────────────────────────────────────────────────────────
  if (method === 'GET' && url.pathname === '/api/template') {
    json(res, readJSON(TEMPLATE));
    return;
  }

  // ── API: get client intake ───────────────────────────────────────────────────
  if (method === 'GET' && url.pathname.startsWith('/api/client/')) {
    const slug = url.pathname.replace('/api/client/', '');
    const ip   = intakePath(slug);
    if (!fs.existsSync(ip)) { json(res, { error: 'Client not found' }, 404); return; }
    json(res, readJSON(ip));
    return;
  }

  // ── API: get artifact ────────────────────────────────────────────────────────
  if (method === 'GET' && url.pathname.startsWith('/api/artifact/')) {
    const [, , , slug, type] = url.pathname.split('/');
    const a = artifacts(slug);
    const filePath = { prompt: a.systemPrompt, kb: a.knowledgeBase, workflow: a.setupGuide }[type];
    if (!filePath || !fs.existsSync(filePath)) { json(res, { error: 'Not found' }, 404); return; }
    const content = fs.readFileSync(filePath, 'utf8');
    json(res, { content });
    return;
  }

  // ── Guide PDF page ────────────────────────────────────────────────────────────
  if (method === 'GET' && url.pathname.startsWith('/guide/')) {
    const slug = url.pathname.replace('/guide/', '').replace(/\/$/, '');
    const guidePath = artifacts(slug).setupGuide;
    const intakefile = intakePath(slug);
    if (!fs.existsSync(guidePath)) { res.writeHead(404); res.end('Guide not found. Run generate first.'); return; }
    const md = fs.readFileSync(guidePath, 'utf8');
    const b  = fs.existsSync(intakefile) ? readJSON(intakefile) : {};
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getGuideHTML(md, b.business_name || slug));
    return;
  }

  // ── API: save & generate ─────────────────────────────────────────────────────
  if (method === 'POST' && url.pathname === '/api/generate') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { slug, intake } = JSON.parse(body);
        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
          json(res, { error: 'Invalid slug. Use lowercase letters, numbers, and hyphens only.' }, 400);
          return;
        }

        writeFile(intakePath(slug), intake);

        const results = {};
        const errors  = {};

        try {
          const { prompt, wordCount } = generateSystemPrompt(intake);
          writeFile(artifacts(slug).systemPrompt, prompt);
          results.prompt = { wordCount };
        } catch (e) { errors.prompt = e.message; }

        try {
          const kb = generateKnowledgeBase(intake);
          writeFile(artifacts(slug).knowledgeBase, kb);
          results.kb = true;
        } catch (e) { errors.kb = e.message; }

        try {
          const guide = generateFastSetupGuide(intake);
          writeFile(artifacts(slug).setupGuide, guide);
          results.workflow = true;
        } catch (e) { errors.workflow = e.message; }

        json(res, { slug, results, errors });
      } catch (e) {
        json(res, { error: e.message }, 500);
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

// ── Markdown → HTML renderer (no deps) ───────────────────────────────────────
function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const inlineFormat = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  const lines  = md.split('\n');
  const out    = [];
  let inTable  = false;
  let inList   = false;
  let inChecks = false;
  let inBlock  = false;
  let blockLines = [];

  const flushTable = () => { if (inTable) { out.push('</tbody></table>'); inTable = false; } };
  const flushList  = () => {
    if (inList)   { out.push('</ul>'); inList = false; }
    if (inChecks) { out.push('</ul>'); inChecks = false; }
  };
  const flushBlock = () => {
    if (inBlock) {
      out.push('<pre><code>' + esc(blockLines.join('\n')) + '</code></pre>');
      inBlock = false; blockLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // code blocks
    if (line.startsWith('```')) {
      if (!inBlock) { flushTable(); flushList(); inBlock = true; }
      else { flushBlock(); }
      continue;
    }
    if (inBlock) { blockLines.push(raw); continue; }

    // blockquotes
    if (line.startsWith('> ') || line === '>') {
      flushTable(); flushList();
      out.push('<blockquote>' + inlineFormat(esc(line.replace(/^>\s?/, ''))) + '</blockquote>');
      continue;
    }

    // headings
    const h4 = line.match(/^####\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h4) { flushTable(); flushList(); out.push('<h4>' + inlineFormat(esc(h4[1])) + '</h4>'); continue; }
    if (h3) { flushTable(); flushList(); out.push('<h3>' + inlineFormat(esc(h3[1])) + '</h3>'); continue; }
    if (h2) { flushTable(); flushList(); out.push('<h2>' + inlineFormat(esc(h2[1])) + '</h2>'); continue; }
    if (h1) { flushTable(); flushList(); out.push('<h1>' + inlineFormat(esc(h1[1])) + '</h1>'); continue; }

    // hr
    if (line.match(/^---+$/)) { flushTable(); flushList(); out.push('<hr>'); continue; }

    // tables
    if (line.startsWith('|')) {
      flushList();
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (line.match(/^\|[\s\-|]+\|$/)) { out.push('</thead><tbody>'); continue; }
      if (!inTable) {
        out.push('<table><thead>');
        out.push('<tr>' + cells.map(c => '<th>' + inlineFormat(esc(c)) + '</th>').join('') + '</tr>');
        inTable = true;
      } else {
        out.push('<tr>' + cells.map(c => '<td>' + inlineFormat(esc(c)) + '</td>').join('') + '</tr>');
      }
      continue;
    } else { flushTable(); }

    // checkbox list items
    const chk = line.match(/^- \[([ x])\] (.*)/);
    if (chk) {
      if (!inChecks) { flushList(); out.push('<ul class="checklist">'); inChecks = true; }
      const checked = chk[1] === 'x' ? ' checked' : '';
      out.push('<li><input type="checkbox" disabled' + checked + '> ' + inlineFormat(esc(chk[2])) + '</li>');
      continue;
    }

    // numbered list
    const num = line.match(/^(\d+)\. (.*)/);
    if (num) {
      if (!inList || out[out.length-1] === '</ul>') {
        flushList(); out.push('<ol' + (num[1] !== '1' ? ' start="'+num[1]+'"' : '') + '>'); inList = true;
      }
      out.push('<li>' + inlineFormat(esc(num[2])) + '</li>');
      continue;
    }

    // bullet list (including indented)
    const bul = line.match(/^(\s*)[-*] (.*)/);
    if (bul) {
      if (!inList) { flushTable(); out.push('<ul>'); inList = true; }
      const indent = bul[1].length > 0 ? ' class="sub"' : '';
      out.push('<li' + indent + '>' + inlineFormat(esc(bul[2])) + '</li>');
      continue;
    }

    // flush list on non-list line
    flushList();

    // blank line
    if (line.trim() === '') { out.push('<div class="spacer"></div>'); continue; }

    // italic line (em)
    if (line.startsWith('*') && line.endsWith('*')) {
      out.push('<p class="meta">' + inlineFormat(esc(line)) + '</p>'); continue;
    }

    // paragraph
    out.push('<p>' + inlineFormat(esc(line)) + '</p>');
  }
  flushTable(); flushList(); flushBlock();
  return out.join('\n');
}

// ── Guide PDF page ────────────────────────────────────────────────────────────
function getGuideHTML(md, title) {
  const body = mdToHtml(md);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — GHL Fast Setup Guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    line-height: 1.65;
    color: #1a1a2e;
    background: #f4f6fb;
  }

  .toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: #1a1d2e; border-bottom: 2px solid #2563eb;
    padding: 12px 32px; display: flex; align-items: center; justify-content: space-between;
  }
  .toolbar-title { color: #fff; font-size: 14px; font-weight: 600; }
  .toolbar-sub   { color: #64748b; font-size: 12px; margin-top: 2px; }
  .btn-pdf {
    background: #2563eb; color: #fff; border: none; border-radius: 8px;
    padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; gap: 8px;
  }
  .btn-pdf:hover { background: #1d4ed8; }
  .btn-pdf svg  { width: 16px; height: 16px; fill: #fff; }

  .page {
    max-width: 820px; margin: 80px auto 60px;
    background: #fff; border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,.08);
    padding: 56px 64px;
  }

  h1 { font-size: 22px; color: #1e3a5f; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 6px; }
  h2 { font-size: 16px; color: #1e3a5f; background: #eef3fb; border-left: 4px solid #2563eb; padding: 8px 14px; border-radius: 0 6px 6px 0; margin: 28px 0 14px; }
  h3 { font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: .05em; margin: 20px 0 10px; }
  h4 { font-size: 13px; font-weight: 600; color: #374151; margin: 14px 0 6px; }
  p  { margin-bottom: 8px; color: #374151; }
  p.meta { font-style: italic; color: #94a3b8; font-size: 11px; margin-top: 16px; }

  strong { color: #1e3a5f; }
  code   { background: #f1f5f9; color: #0f4c81; border-radius: 4px; padding: 1px 5px; font-family: 'Consolas', monospace; font-size: 12px; }
  pre    { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 10px 0; overflow-x: auto; }
  pre code { background: none; padding: 0; color: #1e3a5f; }

  hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  .spacer { height: 6px; }

  blockquote {
    background: #fff8e1; border-left: 4px solid #f59e0b;
    border-radius: 0 6px 6px 0; padding: 10px 14px; margin: 12px 0;
    color: #78350f; font-size: 12px;
  }
  blockquote strong { color: #78350f; }

  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  th { background: #1e3a5f; color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; }
  td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  tr:hover td { background: #eef3fb; }

  ol, ul { padding-left: 22px; margin: 8px 0 10px; }
  li { margin-bottom: 5px; color: #374151; }
  li.sub { margin-left: 16px; }

  ul.checklist { list-style: none; padding-left: 4px; }
  ul.checklist li { display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
  ul.checklist input[type=checkbox] { margin-top: 3px; accent-color: #2563eb; transform: scale(1.2); flex-shrink: 0; }

  /* ── Print styles ── */
  @media print {
    body { background: #fff; font-size: 11px; }
    .toolbar { display: none !important; }
    .page { margin: 0; box-shadow: none; border-radius: 0; padding: 28px 36px; max-width: 100%; }
    h1 { font-size: 18px; }
    h2 { font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    blockquote { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    a { color: inherit; text-decoration: none; }
    pre { white-space: pre-wrap; }
    @page { margin: 16mm 14mm; size: A4; }
    h2, h3 { page-break-after: avoid; }
    table, blockquote { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="toolbar">
  <div>
    <div class="toolbar-title">${title} — Fast Setup Guide</div>
    <div class="toolbar-sub">GHL Voice AI Inbound Agent</div>
  </div>
  <button class="btn-pdf" onclick="window.print()">
    <svg viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
    Download PDF
  </button>
</div>

<div class="page">
  ${body}
</div>

<script>
// Auto-trigger print if ?print=1 is in the URL (for automation)
if (new URLSearchParams(location.search).get('print') === '1') {
  window.addEventListener('load', () => setTimeout(() => window.print(), 500));
}
</script>
</body>
</html>`;
}

// ── HTML UI ───────────────────────────────────────────────────────────────────
function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GHL Voice AI Setup</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; }
  header { background: #1a1d2e; border-bottom: 1px solid #2d3748; padding: 16px 32px; display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 18px; font-weight: 600; color: #fff; }
  header span { font-size: 12px; background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 4px; }
  .layout { display: grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 57px); }
  .sidebar { background: #1a1d2e; border-right: 1px solid #2d3748; padding: 20px 16px; }
  .sidebar h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 12px; }
  .client-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
  .client-item:hover { background: #2d3748; }
  .client-item.active { background: #1e3a5f; }
  .client-name { font-size: 13px; font-weight: 500; }
  .client-slug { font-size: 11px; color: #64748b; }
  .dots { display: flex; gap: 3px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #374151; }
  .dot.on { background: #22c55e; }
  .btn-new { width: 100%; padding: 9px; border: 1px dashed #374151; border-radius: 8px; background: none; color: #64748b; font-size: 13px; cursor: pointer; margin-top: 8px; }
  .btn-new:hover { border-color: #2563eb; color: #2563eb; }
  .main { padding: 32px; overflow-y: auto; }
  .welcome { text-align: center; padding: 80px 20px; color: #4b5563; }
  .welcome h2 { font-size: 20px; margin-bottom: 8px; color: #64748b; }
  .section { background: #1a1d2e; border: 1px solid #2d3748; border-radius: 12px; margin-bottom: 20px; overflow: hidden; }
  .section-header { padding: 14px 20px; background: #141620; border-bottom: 1px solid #2d3748; display: flex; align-items: center; justify-content: space-between; }
  .section-header h3 { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; }
  .section-body { padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .section-body.single { grid-template-columns: 1fr; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field.full { grid-column: 1 / -1; }
  label { font-size: 12px; color: #94a3b8; font-weight: 500; }
  label .req { color: #ef4444; margin-left: 2px; }
  input, select, textarea { background: #0f1117; border: 1px solid #2d3748; border-radius: 6px; color: #e2e8f0; font-size: 13px; padding: 8px 10px; width: 100%; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #2563eb; }
  textarea { resize: vertical; font-family: inherit; }
  .array-field { grid-column: 1 / -1; }
  .array-item { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
  .array-item input, .array-item textarea { flex: 1; }
  .btn-remove { background: none; border: none; color: #4b5563; cursor: pointer; font-size: 16px; padding: 8px 6px; line-height: 1; }
  .btn-remove:hover { color: #ef4444; }
  .btn-add { background: none; border: 1px dashed #374151; border-radius: 6px; color: #64748b; cursor: pointer; font-size: 12px; padding: 6px 12px; margin-top: 2px; }
  .btn-add:hover { border-color: #2563eb; color: #2563eb; }
  .actions-bar { display: flex; gap: 10px; margin-bottom: 24px; align-items: center; }
  .slug-input-wrap { display: flex; gap: 8px; align-items: center; flex: 1; }
  .slug-label { font-size: 12px; color: #64748b; white-space: nowrap; }
  .slug-input { background: #1a1d2e; border: 1px solid #2d3748; border-radius: 6px; color: #e2e8f0; font-size: 13px; padding: 8px 10px; }
  .btn-generate { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .btn-generate:hover { background: #1d4ed8; }
  .btn-generate:disabled { background: #374151; cursor: not-allowed; }
  .results { background: #1a1d2e; border: 1px solid #2d3748; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .results h3 { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 14px; }
  .result-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #2d3748; }
  .result-item:last-child { border-bottom: none; }
  .result-label { font-size: 13px; display: flex; align-items: center; gap: 8px; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
  .badge.ok { background: #14532d; color: #86efac; }
  .badge.err { background: #450a0a; color: #fca5a5; }
  .badge.warn { background: #451a03; color: #fdba74; }
  .btn-copy { background: #2d3748; border: none; border-radius: 6px; color: #94a3b8; cursor: pointer; font-size: 12px; padding: 6px 12px; }
  .btn-copy:hover { background: #374151; color: #e2e8f0; }
  .artifact-preview { background: #0f1117; border: 1px solid #2d3748; border-radius: 8px; padding: 16px; margin-top: 10px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; max-height: 320px; overflow-y: auto; color: #94a3b8; display: none; }
  .toast { position: fixed; bottom: 24px; right: 24px; background: #22c55e; color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 999; }
  .toast.show { opacity: 1; }
  .error-msg { color: #f87171; font-size: 12px; margin-top: 4px; }
  .hours-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; grid-column: 1 / -1; }
  .day-block { background: #0f1117; border: 1px solid #2d3748; border-radius: 6px; padding: 8px; }
  .day-label { font-size: 11px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; }
  .day-block input { font-size: 11px; padding: 5px 6px; margin-bottom: 4px; }
  .day-block .closed-toggle { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #64748b; cursor: pointer; margin-top: 4px; }
</style>
</head>
<body>

<header>
  <h1>GHL Voice AI Setup</h1>
  <span>Inbound Agent Generator</span>
</header>

<div class="layout">
  <div class="sidebar">
    <h2>Clients</h2>
    <div id="client-list"></div>
    <button class="btn-new" onclick="newClient()">+ New Client</button>
  </div>
  <div class="main" id="main">
    <div class="welcome">
      <h2>Select a client or create a new one</h2>
      <p>Fill in the intake form and generate all GHL setup artifacts in one click.</p>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let clients = [];
let currentSlug = null;

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await loadClients();
}

async function loadClients() {
  const r = await fetch('/api/clients');
  clients = await r.json();
  renderSidebar();
}

function renderSidebar() {
  const el = document.getElementById('client-list');
  el.innerHTML = clients.map(c => \`
    <div class="client-item \${c.slug === currentSlug ? 'active' : ''}" onclick="loadClient('\${c.slug}')">
      <div>
        <div class="client-name">\${c.business_name || c.slug}</div>
        <div class="client-slug">\${c.slug}</div>
      </div>
      <div class="dots">
        <div class="dot \${c.has_prompt ? 'on' : ''}"></div>
        <div class="dot \${c.has_kb ? 'on' : ''}"></div>
        <div class="dot \${c.has_workflow ? 'on' : ''}"></div>
      </div>
    </div>
  \`).join('');
}

// ── New client ────────────────────────────────────────────────────────────────
async function newClient() {
  const r = await fetch('/api/template');
  const template = await r.json();
  currentSlug = null;
  renderForm(template, '');
}

// ── Load existing client ──────────────────────────────────────────────────────
async function loadClient(slug) {
  currentSlug = slug;
  renderSidebar();
  const r = await fetch(\`/api/client/\${slug}\`);
  const data = await r.json();
  renderForm(data, slug);

  // Show artifacts if they exist
  const client = clients.find(c => c.slug === slug);
  if (client?.has_prompt) loadArtifacts(slug);
}

// ── Form renderer ─────────────────────────────────────────────────────────────
function renderForm(b, slug) {
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const hoursHTML = days.map(d => {
    const h = b.operating_hours?.[d] || { open: '08:00', close: '18:00' };
    const closed = h.open === 'closed';
    return \`
      <div class="day-block" id="day-\${d}">
        <div class="day-label">\${d.slice(0,3)}</div>
        <input type="time" id="open-\${d}" value="\${closed ? '' : h.open}" \${closed ? 'disabled' : ''}>
        <input type="time" id="close-\${d}" value="\${closed ? '' : h.close}" \${closed ? 'disabled' : ''}>
        <label class="closed-toggle">
          <input type="checkbox" id="closed-\${d}" \${closed ? 'checked' : ''} onchange="toggleDay('\${d}')"> Closed
        </label>
      </div>
    \`;
  }).join('');

  const servicesHTML = (b.services || [{ name:'', description:'', typical_duration_minutes:60 }]).map((s,i) => \`
    <div class="array-item" id="svc-\${i}">
      <div style="flex:1;display:grid;grid-template-columns:1fr 2fr 100px;gap:6px">
        <input placeholder="Service name" value="\${s.name||''}" oninput="updateService(\${i},'name',this.value)">
        <input placeholder="Description" value="\${s.description||''}" oninput="updateService(\${i},'description',this.value)">
        <input type="number" placeholder="Min" value="\${s.typical_duration_minutes||60}" oninput="updateService(\${i},'typical_duration_minutes',+this.value)">
      </div>
      <button class="btn-remove" onclick="removeService(\${i})">×</button>
    </div>
  \`).join('');

  const faqsHTML = (b.faqs || [{ question:'', answer:'' }]).map((f,i) => \`
    <div class="array-item" id="faq-\${i}">
      <div style="flex:1;display:grid;gap:6px">
        <input placeholder="Question" value="\${f.question||''}" oninput="updateFaq(\${i},'question',this.value)">
        <textarea placeholder="Answer" rows="2" oninput="updateFaq(\${i},'answer',this.value)">\${f.answer||''}</textarea>
      </div>
      <button class="btn-remove" onclick="removeFaq(\${i})">×</button>
    </div>
  \`).join('');

  document.getElementById('main').innerHTML = \`
    <div class="actions-bar">
      <div class="slug-input-wrap">
        <span class="slug-label">Client slug:</span>
        <input class="slug-input" id="slug-input" placeholder="e.g. acme-hvac" value="\${slug}" \${slug ? 'readonly' : ''}>
      </div>
      <button class="btn-generate" onclick="generate()">Generate All Artifacts</button>
    </div>

    <div id="results-area"></div>

    <div class="section">
      <div class="section-header"><h3>Business Info</h3></div>
      <div class="section-body">
        <div class="field"><label>Business Name <span class="req">*</span></label><input id="f-business_name" value="\${b.business_name||''}"></div>
        <div class="field"><label>Agent Name <span class="req">*</span></label><input id="f-agent_name" placeholder="e.g. Hannah" value="\${b.agent_name||''}"></div>
        <div class="field"><label>Industry <span class="req">*</span></label><input id="f-industry" placeholder="e.g. HVAC" value="\${b.industry||''}"></div>
        <div class="field"><label>Brand Voice</label><input id="f-brand_voice" value="\${b.brand_voice||'friendly, professional, and efficient'}"></div>
        <div class="field"><label>Main Phone</label><input id="f-main_phone" placeholder="(555) 555-0100" value="\${b.main_phone||''}"></div>
        <div class="field"><label>Website URL</label><input id="f-website_url" placeholder="https://example.com" value="\${b.website_url||''}"></div>
        <div class="field"><label>Year Founded</label><input id="f-year_founded" value="\${b.year_founded||''}"></div>
        <div class="field"><label>License #</label><input id="f-license_number" value="\${b.license_number||''}"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h3>Services <span class="req">*</span></h3></div>
      <div class="section-body single">
        <div style="font-size:11px;color:#64748b;margin-bottom:8px">Name · Description · Duration (min)</div>
        <div id="services-list">\${servicesHTML}</div>
        <button class="btn-add" onclick="addService()">+ Add Service</button>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h3>Service Areas</h3></div>
      <div class="section-body">
        <div class="field full"><label>Cities (comma-separated)</label><input id="f-cities" value="\${(b.service_areas?.cities||[]).join(', ')}"></div>
        <div class="field full"><label>ZIP Codes (comma-separated)</label><input id="f-zip_codes" value="\${(b.service_areas?.zip_codes||[]).join(', ')}"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h3>Operating Hours</h3></div>
      <div class="section-body">
        <div class="hours-grid">\${hoursHTML}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h3>Booking & Calendar</h3></div>
      <div class="section-body">
        <div class="field"><label>Calendar Name</label><input id="f-calendar_name" value="\${b.calendar_name||''}"></div>
        <div class="field"><label>Timezone <span class="req">*</span></label><input id="f-timezone" value="\${b.timezone||'America/Chicago'}"></div>
        <div class="field"><label>Appointment Duration (min)</label><input id="f-appointment_duration_minutes" type="number" value="\${b.appointment_duration_minutes||60}"></div>
        <div class="field"><label>Phone Number Country</label>
          <select id="f-phone_number_country">
            <option value="US" \${b.phone_number_country==='US'?'selected':''}>US (~$0.15/mo)</option>
            <option value="PH" \${b.phone_number_country==='PH'?'selected':''}>Philippines ($15–$120+/mo ⚠)</option>
            <option value="other" \${b.phone_number_country==='other'?'selected':''}>Other</option>
          </select>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h3>Technician / Handoff</h3></div>
      <div class="section-body">
        <div class="field"><label>Transfer Number <span class="req">*</span></label><input id="f-technician_transfer_number" placeholder="+15550000000" value="\${b.technician_transfer_number||''}"></div>
        <div class="field"><label>Technician Email</label><input id="f-technician_email" type="email" value="\${b.technician_email||''}"></div>
        <div class="field"><label>Payment Methods</label><input id="f-payment_methods" value="\${b.payment_methods||'cash, credit card, check'}"></div>
        <div class="field"><label>GHL Location ID</label><input id="f-ghl_location_id" value="\${b.ghl_location_id||''}"></div>
        <div class="field full"><label>Emergency Policy</label><textarea id="f-emergency_policy" rows="3">\${b.emergency_policy||''}</textarea></div>
        <div class="field full"><label>Pricing Policy</label><textarea id="f-pricing_policy" rows="2">\${b.pricing_policy||''}</textarea></div>
        <div class="field full"><label>Warranty Info</label><textarea id="f-warranty_info" rows="2">\${b.warranty_info||''}</textarea></div>
        <div class="field full"><label>Maintenance Plan Info</label><textarea id="f-maintenance_plan_info" rows="2">\${b.maintenance_plan_info||''}</textarea></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h3>FAQs</h3></div>
      <div class="section-body single">
        <div id="faqs-list">\${faqsHTML}</div>
        <button class="btn-add" onclick="addFaq()">+ Add FAQ</button>
      </div>
    </div>
  \`;

  window._services = JSON.parse(JSON.stringify(b.services || [{ name:'', description:'', typical_duration_minutes:60 }]));
  window._faqs     = JSON.parse(JSON.stringify(b.faqs || [{ question:'', answer:'' }]));
}

// ── Dynamic arrays ────────────────────────────────────────────────────────────
function updateService(i, key, val) { window._services[i][key] = val; }
function updateFaq(i, key, val)     { window._faqs[i][key] = val; }

function addService() {
  window._services.push({ name:'', description:'', typical_duration_minutes:60 });
  rerenderServices();
}
function removeService(i) {
  window._services.splice(i, 1);
  rerenderServices();
}
function rerenderServices() {
  document.getElementById('services-list').innerHTML = window._services.map((s,i) => \`
    <div class="array-item">
      <div style="flex:1;display:grid;grid-template-columns:1fr 2fr 100px;gap:6px">
        <input placeholder="Service name" value="\${s.name||''}" oninput="updateService(\${i},'name',this.value)">
        <input placeholder="Description" value="\${s.description||''}" oninput="updateService(\${i},'description',this.value)">
        <input type="number" placeholder="Min" value="\${s.typical_duration_minutes||60}" oninput="updateService(\${i},'typical_duration_minutes',+this.value)">
      </div>
      <button class="btn-remove" onclick="removeService(\${i})">×</button>
    </div>
  \`).join('');
}

function addFaq() {
  window._faqs.push({ question:'', answer:'' });
  rerenderFaqs();
}
function removeFaq(i) {
  window._faqs.splice(i, 1);
  rerenderFaqs();
}
function rerenderFaqs() {
  document.getElementById('faqs-list').innerHTML = window._faqs.map((f,i) => \`
    <div class="array-item">
      <div style="flex:1;display:grid;gap:6px">
        <input placeholder="Question" value="\${f.question||''}" oninput="updateFaq(\${i},'question',this.value)">
        <textarea placeholder="Answer" rows="2" oninput="updateFaq(\${i},'answer',this.value)">\${f.answer||''}</textarea>
      </div>
      <button class="btn-remove" onclick="removeFaq(\${i})">×</button>
    </div>
  \`).join('');
}

function toggleDay(d) {
  const closed = document.getElementById(\`closed-\${d}\`).checked;
  document.getElementById(\`open-\${d}\`).disabled  = closed;
  document.getElementById(\`close-\${d}\`).disabled = closed;
}

// ── Collect form data ─────────────────────────────────────────────────────────
function collectIntake() {
  const g = (id) => (document.getElementById(id)||{}).value || '';
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const hours = {};
  days.forEach(d => {
    const closed = document.getElementById(\`closed-\${d}\`)?.checked;
    hours[d] = closed ? { open: 'closed', close: 'closed' } : {
      open:  document.getElementById(\`open-\${d}\`)?.value  || '08:00',
      close: document.getElementById(\`close-\${d}\`)?.value || '18:00',
    };
  });

  const cities   = g('f-cities').split(',').map(s=>s.trim()).filter(Boolean);
  const zip_codes = g('f-zip_codes').split(',').map(s=>s.trim()).filter(Boolean);

  return {
    business_name:               g('f-business_name'),
    agent_name:                  g('f-agent_name'),
    industry:                    g('f-industry'),
    brand_voice:                 g('f-brand_voice'),
    main_phone:                  g('f-main_phone'),
    website_url:                 g('f-website_url'),
    year_founded:                g('f-year_founded'),
    license_number:              g('f-license_number'),
    services:                    window._services || [],
    pricing_policy:              g('f-pricing_policy'),
    service_areas:               { cities, zip_codes },
    operating_hours:             hours,
    calendar_name:               g('f-calendar_name'),
    timezone:                    g('f-timezone'),
    appointment_duration_minutes: +(g('f-appointment_duration_minutes') || 60),
    phone_number_country:        g('f-phone_number_country'),
    technician_transfer_number:  g('f-technician_transfer_number'),
    technician_email:            g('f-technician_email'),
    payment_methods:             g('f-payment_methods'),
    ghl_location_id:             g('f-ghl_location_id'),
    emergency_policy:            g('f-emergency_policy'),
    warranty_info:               g('f-warranty_info'),
    maintenance_plan_info:       g('f-maintenance_plan_info'),
    faqs:                        window._faqs || [],
  };
}

// ── Generate ──────────────────────────────────────────────────────────────────
async function generate() {
  const slug = document.getElementById('slug-input').value.trim().toLowerCase().replace(/\\s+/g,'-');
  if (!slug) { alert('Enter a client slug first (e.g. acme-hvac)'); return; }

  const intake = collectIntake();
  const btn = document.querySelector('.btn-generate');
  btn.disabled = true; btn.textContent = 'Generating…';

  try {
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, intake }),
    });
    const data = await r.json();

    if (data.error) { alert(data.error); return; }

    currentSlug = slug;
    await loadClients();
    renderResults(slug, data);
    showToast('Artifacts generated!');
  } catch(e) {
    alert('Error: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Generate All Artifacts';
  }
}

function renderResults(slug, data) {
  const items = [
    { key: 'prompt',   label: 'System Prompt',  type: 'prompt',   note: data.results?.prompt ? \`\${data.results.prompt.wordCount} words\` : '' },
    { key: 'kb',       label: 'Knowledge Base',  type: 'kb' },
    { key: 'workflow', label: 'Fast Setup Guide', type: 'workflow' },
  ];

  document.getElementById('results-area').innerHTML = \`
    <div class="results">
      <h3>Generated Artifacts</h3>
      \${items.map(item => {
        const ok  = !data.errors?.[item.key];
        const err = data.errors?.[item.key] || '';
        const wordWarn = item.key === 'prompt' && data.results?.prompt?.wordCount > 2000
          ? '<span class="badge warn">⚠ Over 2,000 words</span>' : '';
        return \`
          <div class="result-item">
            <div class="result-label">
              <span class="badge \${ok ? 'ok' : 'err'}">\${ok ? '✔' : '✖'}</span>
              \${item.label}
              \${ok && item.note ? \`<span style="font-size:11px;color:#64748b">\${item.note}</span>\` : ''}
              \${wordWarn}
              \${!ok ? \`<span class="error-msg">\${err}</span>\` : ''}
            </div>
            \${ok ? (item.type === 'workflow'
              ? \`<div style="display:flex;gap:8px">
                  <a class="btn-copy" href="/guide/\${slug}" target="_blank" style="text-decoration:none">Open Guide ↗</a>
                </div>\`
              : \`<div style="display:flex;gap:8px">
                  <button class="btn-copy" onclick="togglePreview('\${slug}','\${item.type}',this)">View</button>
                  <button class="btn-copy" onclick="copyArtifact('\${slug}','\${item.type}')">Copy</button>
                </div>\`) : ''}
          </div>
          <div class="artifact-preview" id="preview-\${item.type}"></div>
        \`;
      }).join('')}
    </div>
  \`;
}

async function loadArtifacts(slug) {
  renderResults(slug, {
    results: { prompt: { wordCount: '…' }, kb: true, workflow: true },
    errors: {}
  });
}

async function togglePreview(slug, type, btn) {
  const el = document.getElementById(\`preview-\${type}\`);
  if (el.style.display === 'block') {
    el.style.display = 'none'; btn.textContent = 'View'; return;
  }
  const r = await fetch(\`/api/artifact/\${slug}/\${type}\`);
  const d = await r.json();
  el.textContent = d.content || d.error;
  el.style.display = 'block';
  btn.textContent = 'Hide';
}

async function copyArtifact(slug, type) {
  const r = await fetch(\`/api/artifact/\${slug}/\${type}\`);
  const d = await r.json();
  await navigator.clipboard.writeText(d.content || '');
  showToast('Copied to clipboard!');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

init();
</script>
</body>
</html>`;
}

process.stdout.write('Starting server...\n');

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write('\n====================================\n');
  process.stdout.write('GHL Voice AI Setup UI is RUNNING\n');
  process.stdout.write('Open this in your browser:\n');
  process.stdout.write('http://127.0.0.1:' + PORT + '\n');
  process.stdout.write('====================================\n');
  process.stdout.write('Press Ctrl+C to stop.\n\n');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Kill the other process or change PORT in server.js.\n`);
  } else {
    console.error('\nServer error:', e.message, '\n');
  }
  process.exit(1);
});
