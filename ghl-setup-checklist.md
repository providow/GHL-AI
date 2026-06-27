# GHL Voice AI Inbound Agent — Setup Checklist
## All 7 Phases | Advanced Mode | Production-Ready

> **How to use:** Work through each phase in order. Do not skip ahead — later phases depend on earlier ones being complete. Check off each item as you go. ⚠️ callouts are known failure points; do not skip them.

---

## PHASE 1 — Agent Creation (Advanced Mode)

**Nav:** `Sub-Account > AI Agents > Voice AI > Inbound > + Create Agent > Create Custom Agent > Continue`

- [ ] Click **+ Create Agent**, then **Create Custom Agent**, then **Continue**
- [ ] Fill **Agent Details**:
  - Agent Name (e.g., "Hannah") — this is the voice persona name, not the business name
  - Business Name — your client's actual business name
  - Language: English (or client's primary language)
  - **Voice** — click the play button to preview each voice before selecting
  - **Timezone** — set to the sub-account/calendar timezone (e.g., `US/Central`)
  - **LLM Model** — use **GPT-4o** ($0.02/min). Mini models are cheaper but lower quality; GHL recommends GPT-4o for production.
    > 📝 Pricing reference: GPT-4o = $0.02/min | GPT-4o-mini = $0.002/min. Voice engine charges are currently waived for inbound calls (verify current pricing in GHL's pricing info modal).
  - **Initial Message** — customize the greeting (e.g., "Hey, you've reached [Business Name]. How can I help you today?")
- [ ] Click **Agent Goals** tab
- [ ] At the top of Agent Goals, switch from **Basic Mode** to **Advanced Mode**
  > ⚠️ **CRITICAL: Switch to Advanced Mode before entering any prompt.** Basic Mode is insufficient for production. If you saved in Basic Mode by mistake, clear the fields and switch before re-entering your prompt.
- [ ] Paste the generated `system-prompt-output.txt` content into the **System Prompt** field
- [ ] Verify word count is **under 2,000 words** (GHL displays a counter)
  > ⚠️ Exceeding 2,000 words degrades LLM performance — move overflow content to the Knowledge Base
  > ⚠️ **Timezone mismatch is a top failure point.** The agent timezone, calendar timezone, and sub-account default timezone must all be identical. Check all three before go-live.
- [ ] (Optional) Enable **Set Working Hours for the Agent** if you want the agent active only during business hours. Leave off for 24/7 coverage (recommended for service businesses).
- [ ] (Optional) Enable **Enable Agent as Backup to the Phone Number** if you want the AI to answer only when a human doesn't pick up.
- [ ] Save the agent

---

## PHASE 2 — Knowledge Base

**Nav:** `Sub-Account > AI Agents > Voice AI > Inbound > [Agent] > Agent Goals > Select Knowledge Base`

> 📝 The Knowledge Base is linked inside Agent Goals, not in a separate top-level menu.

- [ ] In **Agent Goals**, scroll to the **Knowledge Base** section and click **+ Select Knowledge Base**
- [ ] Click **Create New** to build a new KB for this client
- [ ] Name it (e.g., `[Business Name] Knowledge Base`)
- [ ] Click **Add Source > Rich Text**
- [ ] Name the entry (e.g., `[Business Name] Knowledge Base`) and paste in the content from `knowledge-base-content.md`
  > 📝 Format tip: before pasting from ChatGPT or another AI tool, ask it to wrap the output in triple backticks (` ``` `). This makes copy-paste formatting cleaner in GHL's rich text editor.
- [ ] Replace all `{{placeholder}}` values with live client data before saving
- [ ] Click **Save**
- [ ] **Wait 1–2 minutes before testing** — Knowledge Base content propagates asynchronously
  > ⚠️ Testing immediately after saving will result in the agent not knowing the content. This is not a bug — it's a propagation delay. Always wait before any test.
- [ ] Return to Agent Goals, select the newly created KB, and save
- [ ] After the wait, test one FAQ via GHL Web Call to confirm the agent pulls from it correctly

---

## PHASE 3 — Actions Setup (During the Call)

**Nav:** `Sub-Account > AI Agents > Voice AI > Inbound > [Agent] > Agent Goals > Actions (During the Call)`

> 📝 Actions are configured inside **Agent Goals**, split between **During the Call** (what the agent can do mid-conversation) and **After the Call** (post-call automations). Set up During the Call actions here; After the Call is covered in Phase 5.

### 3A — Call Transfer (Human Handoff)

- [ ] Under **During the Call**, click **+ New Action > Call Transfer**
- [ ] Name it: `Transfer to Human`
- [ ] Enter the **technician transfer number** from your intake form
- [ ] Set **When should the call transfer take place?** — example condition: *"If the user wants to talk to a human or needs clarification not present in the knowledge base"*
  > ⚠️ **Human handoff is non-negotiable.** An agent without a transfer action traps frustrated callers with no exit. If no transfer number is available, block go-live until one is provided.
- [ ] Save action

### 3B — Appointment Booking

> Complete **Phase 4 (Calendar)** before this step — you need the calendar to exist before linking it here.

- [ ] Under **During the Call**, click **+ New Action > Appointment Booking**
- [ ] **Select Calendar** — choose the calendar created in Phase 4
- [ ] Set **Days of Offering Dates**: 3 (agent will suggest slots from the next 3 available days)
- [ ] Set **Appointment Slots Per Day**: 3 (agent offers up to 3 time options per day)
- [ ] Set **Hours Between Slots**: 3 (spreads options across the day)
- [ ] Save action

### 3C — Optional: Update Contact Field / SMS / Additional Workflow Triggers

- [ ] If you need the agent to capture additional data mid-call (e.g., service type as a custom field), add **Update Contact Field** actions here
- [ ] Additional during-call SMS or workflow triggers can also be added here if needed

---

## PHASE 4 — Calendar Configuration

**Nav:** `Sub-Account > Calendars > Calendar Settings > + New Calendar`

- [ ] Click **+ New Calendar**
- [ ] Select **Personal Booking** calendar type
- [ ] Select the **team member** who owns this calendar (e.g., the assigned technician or support user)
- [ ] Set **Calendar Name** (e.g., `[Business Name] Appointments`)
- [ ] Set **Custom URL** slug if desired (optional)
- [ ] Set **Meeting Duration** — match to intake form value (1–2 hours typical for HVAC/trades)
- [ ] Set **Availability** — check the days that match operating hours from intake form (Mon–Fri is typical; add Sat/Sun if applicable)
  > ⚠️ The calendar timezone is inherited from the team member's profile. If appointments show at the wrong time, check `Sub-Account > Settings > Staff > [Member] > Timezone` and align it with the agent timezone.
- [ ] Set **Buffer Time** if technicians need travel time between jobs (recommended: 30–60 min)
- [ ] Set **Booking Window** — how far in advance callers can schedule (recommended: 2–14 days)
- [ ] Click **Confirm** / **Save**
- [ ] Click **Preview Booking Widget** to verify the calendar renders correctly
- [ ] Return to Phase 3B and link this calendar to the booking action

---

## PHASE 5 — Post-Call Automation Workflow

**Nav (build workflow):** `Sub-Account > Automations > + New Workflow > Start from Scratch`

**Nav (link to agent):** `Sub-Account > AI Agents > Voice AI > Inbound > [Agent] > Agent Goals > After the Call`

> ⚠️ **A2P 10DLC REQUIRED BEFORE SMS:** Before enabling any SMS action, confirm the sending phone number is registered and approved for A2P 10DLC. Non-approved numbers fail silently — no error in GHL, no delivery to the contact. If registration is pending, build the workflow fully but disable the SMS action until approved.

### 5A — Build the Workflow

- [ ] Go to `Automations > + New Workflow > Start from Scratch`
- [ ] Name it: `Appointment Book by AI`
- [ ] Set **Trigger: Appointment Status**
  - Add filter: **Appointment Status = New**
  > 📝 This is the correct trigger for AI-booked appointments. "Appointment Status = New" fires when a net-new appointment is created, which covers AI agent bookings.
- [ ] Add **Action 1 — SMS to Contact (Send Confirmation SMS):**
  - Type: Send SMS
  - Action Name: `Send Confirmation SMS`
  - To: Contact phone
  - Use "Write with AI" with prompt: *"Send a friendly message confirming the appointment is scheduled for [Business Name], include date/time and a note that we look forward to seeing them."*
  - Or use this template:
    ```
    Hi {{contact.first_name}}, your appointment with {{business_name}} is confirmed for {{appointment.start_time_formatted}}. Our technician will arrive at {{appointment.address}}. Questions? Call us at {{main_phone}}.
    ```
- [ ] Add **Action 2 — Email to Technician (Internal Notification):**
  - Type: Send Email
  - Action Name: `Send Notification to Technician`
  - From Name: `[Business Name] Appointments`
  - From Email: `service@[clientdomain].com` (use client's real domain)
  - To: **Custom Email** → enter the technician's email directly (or use a custom contact field for dynamic routing)
  - Subject: `New Appointment Received`
  - Use "Write with AI" with prompt: *"Send a notification saying a new booking is confirmed with [Business Name], include contact details and appointment time. Urgent tone."*
- [ ] Add **Action 3 — Tag Contact:**
  - Type: Add Contact Tag
  - Tag: `Book by AI`
  > 📝 This tag lets you filter AI-sourced contacts in GHL Contacts view and build Smart Lists for reporting.
- [ ] Click **Save** then **Publish** the workflow (toggle from Draft to Active)
  > ⚠️ A workflow left in Draft status will NOT fire. Always publish before testing.

### 5B — Link Workflow to the Agent (After the Call)

- [ ] Go back to `AI Agents > Voice AI > Inbound > [Agent] > Agent Goals`
- [ ] Scroll to **After the Call** section
- [ ] Enable **Trigger Workflow when call is completed**
- [ ] Select the `Appointment Book by AI` workflow from the dropdown
- [ ] Enable **Receive Email Notification Post Call Completion** → select **All Admins** (or specific users)
- [ ] Save

---

## PHASE 6 — Pre-Go-Live Validation

Before attaching the agent to a live phone number:

### Timezone Alignment Check
- [ ] Agent timezone: _______________ (set in Phase 1 Agent Details)
- [ ] Calendar timezone: _______________ (set in team member profile, not calendar itself)
- [ ] Sub-account default timezone: `Sub-Account > Settings > Business Profile > Timezone`
- [ ] **All three must match.** If any differ, fix now before go-live.

### Phone Number Check
- [ ] Confirm phone number is purchased and active: `Sub-Account > Settings > Phone System`
  > ⚠️ **Cost warning:** Philippine (PH) numbers cost $15–$120+/month. US numbers cost ~$0.15/month. PH numbers in the $10–$15+ range are pre-approved for A2P, which is why they're more expensive — factor this into client pricing conversations. Always default to US numbers for US-based clients.
- [ ] Confirm A2P 10DLC registration status for the sending number (required for SMS to work)
- [ ] Assign the inbound phone number to the AI agent: `Sub-Account > Settings > Phone System > [Number] > Assign to Agent`

### Knowledge Base Check
- [ ] At least 1–2 minutes have passed since last Knowledge Base save
- [ ] Spot-test via GHL Web Call: ask one FAQ — agent should answer from KB content

---

## PHASE 7 — End-to-End Testing

**Nav:** `Sub-Account > AI Agents > Voice AI > Inbound > [Agent] > Test > Start Web Call`

See `test-checklist.md` for full test scripts. Minimum required tests before go-live:

- [ ] Normal booking (in-area caller, all fields collected, appointment booked)
- [ ] Out-of-area caller (agent declines to book, does not schedule)
- [ ] Human handoff (caller asks for a person, transfer fires correctly)
- [ ] Emergency call (agent transfers instead of booking)
- [ ] Post-booking check: SMS received by contact, email received by technician, tag `Book by AI` applied, appointment appears in calendar at correct time

---

## Go-Live Checklist (Final Gate)

- [ ] All 7 phases above are complete and checked off
- [ ] Agent tested via GHL Web Call with all test scenarios passing
- [ ] Contact name in GHL record shows caller's actual name (not sub-account admin name)
  > ⚠️ If the contact record shows the admin/default name, the system prompt is missing explicit name collection. Add to prompt: "Your first task is to collect the caller's full first and last name."
- [ ] Appointment in calendar shows the correct time in the correct timezone
- [ ] SMS confirmed working (A2P approved)
- [ ] Workflow is in **Active** (not Draft) status
- [ ] Phone number assigned to agent
- [ ] Client briefed on how to update the Knowledge Base for future FAQ/promo changes
- [ ] Snapshot exported (if this sub-account is the template for multi-client scaling)

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
