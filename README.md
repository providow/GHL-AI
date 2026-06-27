# GHL Voice AI Inbound Agent — Setup Workflow System

A repeatable, code-driven system for deploying a production-ready GHL Inbound AI Voice Agent for any local service business. Run once per client, swap the intake form, get fresh artifacts every time.

---

## System Overview

| File | Purpose |
|---|---|
| `intake-form.json` | Business-specific inputs — fill this out first |
| `system-prompt-generator.js` | Generates the GHL Advanced Mode system prompt from intake data |
| `system-prompt-output.txt` | Generated output — paste into GHL (created on first run) |
| `knowledge-base-content.md` | Template for KB content — fill placeholders, paste into GHL |
| `ghl-setup-checklist.md` | Phase-by-phase GHL setup guide with all 7 phases |
| `post-call-workflow-spec.json` | Automation workflow spec — reference when building in GHL |
| `test-checklist.md` | End-to-end test scripts for all call scenarios |

---

## Quick Start (Single Client)

### Step 1 — Fill Out the Intake Form

Edit `intake-form.json` with the client's data:

```bash
# Open and edit
nano intake-form.json  # or use your editor of choice
```

Required fields before generating:
- `business_name`, `agent_name`, `industry`
- `services` (array with at least one entry)
- `technician_transfer_number` ← **blocker if missing**
- `timezone` (must match calendar and sub-account)
- `service_areas` (cities and/or ZIP codes)

### Step 2 — Generate the System Prompt

```bash
node system-prompt-generator.js
# or specify a custom intake file:
node system-prompt-generator.js ./clients/client-name/intake-form.json
```

Output: `system-prompt-output.txt`
- Check the word count warning — must stay under 2,000 words
- Copy the contents and paste into: `GHL > AI Agents > Voice AI > Inbound > [Agent] > Advanced Mode > System Prompt`

### Step 3 — Prepare Knowledge Base Content

Open `knowledge-base-content.md` and replace all `{{placeholder}}` values with client data. Paste each section into GHL Knowledge Base entries. **Wait 1–2 minutes after saving before testing.**

### Step 4 — Follow the Setup Checklist

Work through `ghl-setup-checklist.md` Phase 1 through 7 in order. Do not skip phases — later phases depend on earlier ones.

### Step 5 — Build the Post-Call Workflow

Reference `post-call-workflow-spec.json` when building the automation in GHL. Key reminder: **do not enable SMS actions until A2P 10DLC registration is approved** for the sending number.

### Step 6 — Test Before Go-Live

Run all 5 scenarios in `test-checklist.md` using GHL Web Call. All scenarios must pass before assigning the agent to a live phone number.

---

## Multi-Client Scaling

### Per-Client Directory Structure (Recommended)

```
GHL-AI/
├── clients/
│   ├── client-acme-hvac/
│   │   ├── intake-form.json          ← client-specific
│   │   ├── system-prompt-output.txt  ← generated per client
│   │   └── knowledge-base-content.md ← filled in per client
│   └── client-xyz-plumbing/
│       ├── intake-form.json
│       ├── system-prompt-output.txt
│       └── knowledge-base-content.md
├── intake-form.json                  ← master template (don't edit)
├── system-prompt-generator.js        ← shared generator
├── ghl-setup-checklist.md            ← shared checklist
├── post-call-workflow-spec.json      ← shared workflow spec
└── test-checklist.md                 ← shared test scripts
```

### Workflow for New Client

```bash
# 1. Copy the template intake form for the new client
cp intake-form.json clients/new-client-name/intake-form.json

# 2. Fill in client data
nano clients/new-client-name/intake-form.json

# 3. Generate system prompt
node system-prompt-generator.js clients/new-client-name/intake-form.json
# Output goes to system-prompt-output.txt in the same directory as the intake form

# 4. Copy and fill KB template
cp knowledge-base-content.md clients/new-client-name/knowledge-base-content.md
nano clients/new-client-name/knowledge-base-content.md
```

### GHL Snapshot Strategy

Once you've set up and tested a complete sub-account:

1. **Export a Snapshot:** `Agency View > Snapshots > Create Snapshot > Select the sub-account`
2. The Snapshot captures: workflows, pipelines, tags, custom fields, and calendars
3. What it does NOT capture: AI agent system prompts, Knowledge Base content, phone numbers
4. **For new client onboarding:** Apply the Snapshot to a new sub-account, then run this generator system to populate the AI-specific content

> 📝 GHL does not expose a public write API for AI Agent configuration as of this writing. The generator produces artifacts for manual UI copy-paste. If GHL exposes this endpoint in future, this system can be extended to automate it.

---

## Key Constraints (Encoded in This System)

| Rule | Why |
|---|---|
| Always Advanced Mode | Basic Mode limits system prompt customization — not suitable for production |
| System prompt < 2,000 words | GHL's LLM performance degrades past this limit |
| Human handoff is required | No transfer action = callers are trapped; this is a blocker |
| A2P 10DLC before SMS | Unregistered numbers fail silently — no error, no delivery |
| Explicit name collection | GHL defaults contact name to sub-account admin if the agent doesn't ask |
| Timezone triple-check | Agent + calendar + sub-account must all match |
| KB propagation delay | Always wait 1–2 min after saving before testing |
| US vs PH phone cost | PH numbers cost $15–$120+/month vs ~$0.15 for US — always flag to clients |

---

## Requirements

- Node.js v16+
- GHL sub-account with AI Agents feature enabled (Voice AI)
- A2P 10DLC registered phone number (for SMS workflows)
- GHL calendar configured before linking to the agent booking action
