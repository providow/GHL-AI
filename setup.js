#!/usr/bin/env node
/**
 * GHL Voice AI — One-Command Setup CLI
 *
 * Usage:
 *   node setup.js init <client-slug>       Scaffold a new client directory
 *   node setup.js generate <client-slug>   Generate all artifacts for a client
 *   node setup.js list                     Show all clients and artifact status
 *
 * Examples:
 *   node setup.js init acme-hvac
 *   node setup.js generate acme-hvac
 *   node setup.js list
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CLIENTS_DIR = path.join(ROOT, 'clients');
const TEMPLATE_INTAKE = path.join(ROOT, 'intake-form.json');

// ── Colour helpers (no dependencies) ─────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ── File helpers ──────────────────────────────────────────────────────────────
const exists = (p) => fs.existsSync(p);
const write  = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
};
const read   = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const clientDir  = (slug) => path.join(CLIENTS_DIR, slug);
const intakePath = (slug) => path.join(clientDir(slug), 'intake-form.json');

// ── Artifact paths ────────────────────────────────────────────────────────────
const artifacts = (slug) => ({
  intake:        intakePath(slug),
  systemPrompt:  path.join(clientDir(slug), 'system-prompt-output.txt'),
  knowledgeBase: path.join(clientDir(slug), 'knowledge-base-content.md'),
  workflowSpec:  path.join(clientDir(slug), 'post-call-workflow-spec.json'),
});

// ── Validation ────────────────────────────────────────────────────────────────
function validateIntake(b) {
  const errors = [];
  const warn   = [];

  if (!b.business_name)          errors.push('business_name is empty');
  if (!b.agent_name)             errors.push('agent_name is empty');
  if (!b.industry)               errors.push('industry is empty');
  if (!b.technician_transfer_number) errors.push('technician_transfer_number is empty — human handoff is non-negotiable');
  if (!b.timezone)               errors.push('timezone is empty');
  if (!b.services?.length || !b.services[0]?.name) errors.push('services array is empty or missing names');

  if (!b.main_phone)             warn.push('main_phone not set — will use placeholder in templates');
  if (!b.technician_email)       warn.push('technician_email not set — workflow email will use placeholder');
  if (!b.service_areas?.zip_codes?.length && !b.service_areas?.cities?.length)
                                 warn.push('service_areas has no cities or ZIP codes — agent cannot screen callers');
  if (!b.faqs?.length || !b.faqs[0]?.question)
                                 warn.push('no FAQs defined — knowledge base FAQ section will be empty');

  return { errors, warn };
}

// ── Commands ──────────────────────────────────────────────────────────────────

function cmdInit(slug) {
  if (!slug) { console.error(c.red('Usage: node setup.js init <client-slug>')); process.exit(1); }

  const dir    = clientDir(slug);
  const intake = intakePath(slug);

  if (exists(intake)) {
    console.log(c.yellow(`Client "${slug}" already exists at ${dir}`));
    console.log(c.dim('Edit the intake form and run: node setup.js generate ' + slug));
    return;
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(TEMPLATE_INTAKE, intake);

  console.log(c.green(`✔ Client scaffolded: ${dir}`));
  console.log('');
  console.log(c.bold('Next steps:'));
  console.log(`  1. Fill in ${c.bold(`clients/${slug}/intake-form.json`)}`);
  console.log(`  2. Run: ${c.bold(`node setup.js generate ${slug}`)}`);
}

function cmdGenerate(slug) {
  if (!slug) { console.error(c.red('Usage: node setup.js generate <client-slug>')); process.exit(1); }

  const intake = intakePath(slug);
  if (!exists(intake)) {
    console.error(c.red(`No intake form found for "${slug}". Run: node setup.js init ${slug}`));
    process.exit(1);
  }

  const b = read(intake);
  const { errors, warn } = validateIntake(b);

  if (errors.length) {
    console.error(c.red('\n✖ Intake form has blocking errors:\n'));
    errors.forEach(e => console.error(c.red(`  • ${e}`)));
    console.error(c.dim(`\nFix these in: clients/${slug}/intake-form.json`));
    process.exit(1);
  }

  if (warn.length) {
    console.log(c.yellow('\n⚠ Warnings (non-blocking):\n'));
    warn.forEach(w => console.log(c.yellow(`  • ${w}`)));
    console.log('');
  }

  const { generateSystemPrompt } = require('./lib/generate-system-prompt');
  const { generateKnowledgeBase } = require('./lib/generate-knowledge-base');
  const { generateWorkflowSpec }  = require('./lib/generate-workflow-spec');

  const paths = artifacts(slug);
  const results = [];

  // 1 — System prompt
  try {
    const { prompt, wordCount } = generateSystemPrompt(b);
    write(paths.systemPrompt, prompt);
    const warnWords = wordCount > 2000 ? c.red(` ⚠ ${wordCount} words — EXCEEDS 2,000 limit`) : c.dim(` (${wordCount} words)`);
    results.push({ label: 'System Prompt', path: paths.systemPrompt, ok: true, note: warnWords });
  } catch (e) {
    results.push({ label: 'System Prompt', path: paths.systemPrompt, ok: false, note: e.message });
  }

  // 2 — Knowledge base
  try {
    const kb = generateKnowledgeBase(b);
    write(paths.knowledgeBase, kb);
    results.push({ label: 'Knowledge Base', path: paths.knowledgeBase, ok: true });
  } catch (e) {
    results.push({ label: 'Knowledge Base', path: paths.knowledgeBase, ok: false, note: e.message });
  }

  // 3 — Workflow spec
  try {
    const spec = generateWorkflowSpec(b);
    write(paths.workflowSpec, spec);
    results.push({ label: 'Workflow Spec', path: paths.workflowSpec, ok: true });
  } catch (e) {
    results.push({ label: 'Workflow Spec', path: paths.workflowSpec, ok: false, note: e.message });
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('');
  console.log(c.bold(`Generated artifacts for: ${b.business_name} (${slug})`));
  console.log('');
  results.forEach(r => {
    const icon = r.ok ? c.green('✔') : c.red('✖');
    const rel  = path.relative(ROOT, r.path);
    console.log(`  ${icon}  ${r.label.padEnd(18)} → ${c.dim(rel)}${r.note ? r.note : ''}`);
  });

  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.log(c.red(`\n${failed.length} artifact(s) failed to generate. Fix the errors above and re-run.`));
    process.exit(1);
  }

  console.log('');
  console.log(c.bold('Next steps:'));
  console.log(`  1. Copy ${c.dim(`clients/${slug}/system-prompt-output.txt`)} → GHL Agent Goals > Advanced Mode > System Prompt`);
  console.log(`  2. Copy ${c.dim(`clients/${slug}/knowledge-base-content.md`)} → GHL Agent Goals > Knowledge Base (wait 1–2 min after saving)`);
  console.log(`  3. Reference ${c.dim(`clients/${slug}/post-call-workflow-spec.json`)} when building the Automations workflow`);
  console.log(`  4. Follow ${c.dim('ghl-setup-checklist.md')} for the remaining phases`);
  console.log('');
  if (b.phone_number_country === 'PH') {
    console.log(c.yellow('⚠ phone_number_country is PH — remind client that PH numbers cost $15–$120+/month vs ~$0.15 for US numbers.'));
    console.log('');
  }
}

function cmdList() {
  if (!exists(CLIENTS_DIR)) {
    console.log(c.dim('No clients directory found. Run: node setup.js init <client-slug>'));
    return;
  }

  const slugs = fs.readdirSync(CLIENTS_DIR).filter(f =>
    fs.statSync(path.join(CLIENTS_DIR, f)).isDirectory()
  );

  if (!slugs.length) {
    console.log(c.dim('No clients found. Run: node setup.js init <client-slug>'));
    return;
  }

  console.log('');
  console.log(c.bold('Clients:\n'));
  console.log(`  ${'Slug'.padEnd(28)} ${'Intake'.padEnd(8)} ${'Prompt'.padEnd(8)} ${'KB'.padEnd(8)} ${'Workflow'.padEnd(8)}`);
  console.log(`  ${'-'.repeat(28)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(8)} ${'-'.repeat(8)}`);

  slugs.forEach(slug => {
    const paths = artifacts(slug);
    const intake = exists(paths.intake);
    const b = intake ? read(paths.intake) : null;
    const name = b?.business_name ? ` ${c.dim('('+ b.business_name +')')}` : '';

    const check = (p) => exists(p) ? c.green('✔') : c.dim('–');

    console.log(
      `  ${(slug + name).padEnd(28 + (name ? name.length - name.replace(/\x1b\[[0-9;]*m/g, '').length : 0))} ` +
      `${check(paths.intake).padEnd(8 + 9)}` +
      `${check(paths.systemPrompt).padEnd(8 + 9)}` +
      `${check(paths.knowledgeBase).padEnd(8 + 9)}` +
      `${check(paths.workflowSpec)}`
    );
  });
  console.log('');
}

// ── Router ────────────────────────────────────────────────────────────────────
const [,, command, slug] = process.argv;

const help = `
${c.bold('GHL Voice AI Setup CLI')}

Commands:
  ${c.bold('node setup.js init <client-slug>')}       Scaffold new client directory
  ${c.bold('node setup.js generate <client-slug>')}   Generate all artifacts from intake form
  ${c.bold('node setup.js list')}                     Show all clients and artifact status

Examples:
  node setup.js init acme-hvac
  node setup.js generate acme-hvac
  node setup.js list
`;

switch (command) {
  case 'init':     cmdInit(slug);     break;
  case 'generate': cmdGenerate(slug); break;
  case 'list':     cmdList();         break;
  default:         console.log(help); break;
}
