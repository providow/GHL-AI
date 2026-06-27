# GHL Voice AI Inbound Agent — Setup Checklist
## All 7 Phases | Advanced Mode | Production-Ready

> **How to use:** Work through each phase in order. Do not skip ahead — later phases depend on earlier ones being complete. Check off each item as you go. ⚠️ callouts are known failure points; do not skip them.

---

## PHASE 1 — Agent Creation (Advanced Mode)

**Nav:** `Sub-Account > AI Agents > Voice AI > Inbound > + Create Agent`

- [ ] Click **+ Create Agent** and name it (use the `agent_name` from your intake form)
- [ ] Select agent type: **Inbound Voice**
- [ ] **Switch to Advanced Mode immediately** — do not configure anything in Basic Mode
  > ⚠️ **CRITICAL: Never use Basic Mode for production deployments.** Basic Mode limits customization and produces poor caller experiences. If you accidentally saved in Basic Mode, delete the agent and recreate it.
- [ ] Paste the generated `system-prompt-output.txt` content into the **System Prompt** field
- [ ] Verify word count is **under 2,000 words** (GHL displays a counter)
  > ⚠️ Exceeding 2,000 words degrades LLM performance — move overflow content to the Knowledge Base
- [ ] Set **Agent Voice** to your preferred voice (test a few with the preview button)
- [ ] Set **Language** to match your client's primary caller language
- [ ] Set **Timezone** to match the sub-account and calendar timezone
  > ⚠️ **Timezone mismatch is a top failure point.** The agent timezone, calendar timezone, and sub-account default timezone must all be identical. Check all three.
- [ ] Save the agent
- [ ] Note the **Agent ID** (visible in the URL after saving) — you'll need it for workflow triggers

---

## PHASE 2 — Knowledge Base

**Nav:** `Sub-Account > AI Agents > Voice AI > Inbound > [Agent] > Knowledge Base`

- [ ] Click **+ Add Content**
- [ ] Copy each section from `knowledge-base-content.md` into the Knowledge Base
  > 📝 You can add multiple entries — one per section (Services, FAQs, etc.) keeps it organized and easier to update
- [ ] Replace all `{{placeholder}}` values with live client data before saving
- [ ] Click **Save**
- [ ] **Wait 1–2 minutes before testing** — Knowledge Base content propagates asynchronously
  > ⚠️ Testing immediately after saving will result in the agent not knowing the content. This is not a bug — it's a propagation delay. Always wait.
- [ ] After waiting, test one FAQ via GHL Web Call to confirm the agent references it correctly

---

## PHASE 3 — Actions Setup

**Nav:** `Sub-Account > AI Agents > Voice AI > Inbound > [Agent] > Actions`

### 3A — Call Transfer (Human Handoff)

- [ ] Click **+ Add Action > Transfer Call**
- [ ] Name it: `Transfer to Live Technician`
- [ ] Enter the **technician transfer number** from your intake form
- [ ] Set the trigger phrase/condition: when caller asks for a human, manager, or when agent cannot resolve
  > ⚠️ **Human handoff is non-negotiable.** An agent without a transfer action traps frustrated callers with no exit. If no transfer number is available, block go-live until one is provided.
- [ ] Save action

### 3B — Appointment Booking

- [ ] Click **+ Add Action > Book Appointment**
- [ ] Select the calendar created in Phase 4 (complete Phase 4 first if not done)
- [ ] Map calendar fields to collected data:
  - Contact Name → collected name
  - Phone → collected phone
  - Email → collected email
  - Address → collected service address
  - Notes → issue description
- [ ] Set confirmation: agent should verbally confirm the booking after the action fires
- [ ] Save action

### 3C — Workflow Trigger

- [ ] Click **+ Add Action > Trigger Workflow**
- [ ] Select the post-call workflow created in Phase 5 (complete Phase 5 first, or come back)
- [ ] Trigger condition: **after appointment is booked successfully**
- [ ] Save action

---

## PHASE 4 — Calendar Configuration

**Nav:** `Sub-Account > Calendars > + New Calendar`

- [ ] Select **Personal Booking** calendar type (or per-technician/per-service if multi-tech setup)
- [ ] Name the calendar (e.g., `[Business Name] Appointments` or `[Technician Name] - [Service]`)
- [ ] Set **Timezone** — must match agent and sub-account timezone exactly
  > ⚠️ If this timezone differs from the agent or sub-account, appointments will be booked at the wrong time.
- [ ] Set **Availability** to match operating hours from intake form
- [ ] Set **Appointment Duration** to the value from intake form (default: 60 minutes)
- [ ] Set **Buffer Time** if technicians need travel time between jobs (recommended: 30–60 min)
- [ ] Set **Booking Window** — how far in advance callers can schedule (recommended: 2–14 days)
- [ ] Add **technician email** as calendar notification recipient
- [ ] Enable **Confirmation Email** to contact (GHL sends this automatically on booking)
- [ ] Enable **Reminder SMS/Email** if desired (configure timing: 24h and 2h before recommended)
- [ ] Save calendar
- [ ] Copy the **Calendar ID** from the URL — needed for the booking action in Phase 3B
- [ ] Return to Phase 3B and link this calendar to the booking action

---

## PHASE 5 — Post-Call Automation Workflow

**Nav:** `Sub-Account > Automations > + New Workflow`

> ⚠️ **A2P 10DLC REQUIRED BEFORE SMS:** Before building any SMS action in this workflow, confirm the sending phone number is registered and approved for A2P 10DLC. Non-approved numbers will silently fail to send SMS. If registration is pending, build the workflow but disable SMS actions until approved.

- [ ] Create a new workflow named: `AI Voice - Post Booking Automation`
- [ ] Set **Trigger:** `Appointment Booked by AI Agent`
  - Filter by Agent ID (from Phase 1) to scope this workflow to only your AI agent's bookings
- [ ] Add **Action 1 — SMS to Contact:**
  - Type: Send SMS
  - To: Contact phone
  - Message template (customize):
    ```
    Hi {{contact.first_name}}, your appointment with {{business_name}} is confirmed for {{appointment.start_time}}. Our technician will arrive at {{appointment.address}}. Questions? Call us at {{main_phone}}.
    ```
- [ ] Add **Action 2 — Email to Technician:**
  - Type: Send Email
  - To: `{{technician_email}}` (use intake form value or a custom field)
  - Subject: `New AI Booking: {{contact.full_name}} — {{appointment.start_time}}`
  - Body template:
    ```
    New appointment booked via AI agent.

    Contact: {{contact.full_name}}
    Phone: {{contact.phone}}
    Email: {{contact.email}}
    Address: {{appointment.address}}
    Service: {{appointment.notes}}
    Date/Time: {{appointment.start_time}}

    Login to GHL to view or modify this appointment.
    ```
- [ ] Add **Action 3 — Tag Contact:**
  - Type: Add Tag
  - Tag value: `Booked by AI`
  > 📝 This tag enables you to filter and report on AI-sourced bookings in GHL reporting
- [ ] Add **Action 4 — Update Contact Field (optional but recommended):**
  - Set a custom field: `Last AI Booking Date` = current date
  - Useful for CRM hygiene and follow-up campaigns
- [ ] **Enable** the workflow (toggle from Draft to Active)
- [ ] Save and publish

---

## PHASE 6 — Pre-Go-Live Validation

Before attaching the agent to a live phone number:

### Timezone Alignment Check
- [ ] Agent timezone: _______________
- [ ] Calendar timezone: _______________
- [ ] Sub-account default timezone: `Sub-Account > Settings > Business Profile > Timezone`
- [ ] **All three must match.** If any differ, fix now.

### Phone Number Check
- [ ] Confirm phone number is purchased and active in sub-account
  > ⚠️ **Cost warning:** Philippine (PH) numbers cost $15–$120+/month. US numbers cost ~$0.15/month. Always use a US number unless the client is Philippines-based and understands the cost.
- [ ] Confirm A2P 10DLC registration status for the sending number (required for SMS)
- [ ] Assign the inbound phone number to the AI agent: `Sub-Account > Phone Numbers > [Number] > Assign to AI Agent`

### Knowledge Base Check
- [ ] At least 1–2 minutes have passed since last Knowledge Base save
- [ ] Spot-test: call the GHL Web Call preview and ask one FAQ — agent should answer correctly

---

## PHASE 7 — End-to-End Testing

See `test-checklist.md` for full test scripts. Minimum required tests before go-live:

- [ ] Normal booking (in-area caller, all fields collected, appointment booked)
- [ ] Out-of-area caller (agent declines to book, does not schedule)
- [ ] Human handoff (caller asks for a person, transfer fires correctly)
- [ ] Emergency call (agent transfers instead of booking)
- [ ] Post-booking check: SMS received by contact, email received by technician, tag `Booked by AI` applied

---

## Go-Live Checklist (Final Gate)

- [ ] All 7 phases above are complete and checked off
- [ ] Agent tested via GHL Web Call with all 4 test scenarios passing
- [ ] SMS confirmed working (A2P approved)
- [ ] Phone number assigned to agent
- [ ] Workflow is in Active (not Draft) status
- [ ] Client has been briefed on the Knowledge Base update process for future FAQ/promo changes
- [ ] Snapshot exported (if this sub-account is the template for multi-client scaling)
