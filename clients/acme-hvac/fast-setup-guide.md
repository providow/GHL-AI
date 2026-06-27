# Acme HVAC United — GHL Fast Setup Guide
## Complete in Under 24 Hours | Workflows · Calendar · Pipeline

> **How this guide works:** Each section is one task. Follow them in order — each one takes 10–20 minutes. By the end, your AI agent will be booking appointments, sending confirmations, and tracking leads automatically.

---

## ⏱ Time Estimate

| Task | Time |
|---|---|
| Step 1 — Create the Calendar | ~10 min |
| Step 2 — Build the Automation Workflow | ~20 min |
| Step 3 — Create the Pipeline | ~10 min |
| Step 4 — Link Everything to the AI Agent | ~10 min |
| Step 5 — Test | ~15 min |
| **Total** | **~1 hour** |

---

## STEP 1 — Create the Calendar

**Where to go:** Left sidebar → **Calendars** → **Calendar Settings** → **+ New Calendar**

1. Click **+ New Calendar**
2. Select **Personal Booking** (use this for a single technician; use Round Robin if you have multiple)
3. Fill in the fields:

   | Field | What to enter |
   |---|---|
   | Calendar Name | `Acme HVAC Appointments` |
   | Team Member | Select the technician or staff member who owns this calendar |
   | Meeting Duration | `90 minutes` |
   | Availability | Check: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday |
   | Buffer Time | `30 minutes` (gives technicians travel time between jobs) |
   | Minimum Booking Notice | `24 hours` |
   | Maximum Booking Window | `60 days` |

4. Click **Confirm** to save
5. Click **Preview Booking Widget** — make sure it loads and shows available slots

> ⚠️ **Timezone note:** The calendar timezone comes from the team member's profile — not the calendar itself. To check or fix it: **Settings → Staff → [Team Member Name] → Timezone** — set it to `America/Chicago`. This must match the AI agent timezone or appointments will show at the wrong time.

| Day        | Hours              |
|------------|--------------------|
| Monday     | 08:00 – 18:00      |
| Tuesday    | 08:00 – 18:00      |
| Wednesday  | 08:00 – 18:00      |
| Thursday   | 08:00 – 18:00      |
| Friday     | 08:00 – 18:00      |
| Saturday   | 09:00 – 14:00      |
| Sunday     | Closed             |

---

## STEP 2 — Build the Automation Workflow

**Where to go:** Left sidebar → **Automation** → **+ Create New Workflow** → **Start from Scratch**

### 2A — Name and Trigger

1. Name the workflow: **`Appointment Book by AI`**
2. Click **+ Add Trigger**
3. Search for and select: **Appointment Status**
4. Under filters, set:
   - **Appointment Status** = `New`
5. Click **Save Trigger**

> This trigger fires every time the AI agent books a new appointment. "New" means it just got created — not confirmed, not cancelled, just created.

---

### 2B — Action 1: Send SMS Confirmation to the Customer

> ⚠️ **Before enabling SMS:** Your sending phone number must be approved for A2P 10DLC registration. If it is not yet approved, add this action but **turn it off** (toggle the action off) until registration is complete. Unapproved numbers fail silently — no error shows, the SMS just never arrives.

1. Click **+ Add Action**
2. Select **Send SMS**
3. Fill in:

   | Field | What to enter |
   |---|---|
   | Action Name | `Send Confirmation SMS` |
   | To | `Contact Phone` |
   | From Number | Select your business number from the dropdown |
   | Message | Copy and paste the text below |

   **Copy this message:**

   > Hi {{contact.first_name}}, your appointment with Acme HVAC United is confirmed for {{appointment.start_time_formatted}}. Our technician will arrive at {{appointment.address}}. Questions? Call us at (256) 555-0100.

4. Click **Save Action**

---

### 2C — Action 2: Email the Technician

1. Click **+ Add Action**
2. Select **Send Email**
3. Fill in:

   | Field | What to enter |
   |---|---|
   | Action Name | `Notify Technician` |
   | From Name | `Acme HVAC United Appointments` |
   | From Email | Your business email (e.g., `service@yourdomain.com`) |
   | To | Select **Custom Email** → enter `tech@acmehvacunited.com` |
   | Subject | `New Appointment Received – {{contact.full_name}}` |
   | Email Body | Copy and paste the text below |

   **Copy this email body:**

   > Hi,
   > 
   > A new appointment has been booked via the AI agent.
   > 
   > Customer: {{contact.full_name}}
   > Phone: {{contact.phone}}
   > Email: {{contact.email}}
   > Service Address: {{appointment.address}}
   > Service Requested: {{appointment.notes}}
   > Date & Time: {{appointment.start_time_formatted}}
   > 
   > Please log in to GHL to view or modify this appointment.
   > 
   > — Acme HVAC United Booking System

4. Click **Save Action**

---

### 2D — Action 3: Tag the Contact

1. Click **+ Add Action**
2. Select **Add Contact Tag**
3. Fill in:

   | Field | What to enter |
   |---|---|
   | Action Name | `Tag as Booked by AI` |
   | Tag | Type `Book by AI` and press Enter to create it |

4. Click **Save Action**

> This tag lets you filter and report on AI-sourced bookings later. In GHL Contacts, filter by tag "Book by AI" to see every lead the AI has booked.

---

### 2E — Action 4: Add to Pipeline (come back after Step 3)

> After you create the pipeline in Step 3, come back and add one more action:
> - Click **+ Add Action → Create/Update Opportunity**
> - Pipeline: `Acme HVAC United Service Pipeline`
> - Stage: `Booked`
> - Click **Save Action**

---

### 2F — Publish the Workflow

1. Click **Save** at the top right
2. Click **Publish** (switches from Draft → Active)

> ⚠️ **Critical:** A workflow left as Draft will never fire. You must hit Publish. The status indicator should turn green and say "Active."

---

## STEP 3 — Create the Pipeline

**Where to go:** Left sidebar → **Opportunities** → **Pipelines** → **Create New Pipeline**

1. Click **Create New Pipeline**
2. Name it: **`Acme HVAC United Service Pipeline`**
3. Add these stages in order (click **+ Add Stage** for each):

   | # | Stage Name | What it means |
   |---|---|---|
   | 1 | New Lead | Someone called but hasn't booked yet |
   | 2 | Qualified | Caller is in the service area and interested |
   | 3 | Booked | AI agent booked the appointment ← workflow puts leads here automatically |
   | 4 | Confirmed | Customer confirmed they're coming |
   | 5 | Completed | Service was delivered |
   | – | Won | *(auto-added by GHL)* Paid and closed |
   | – | Lost | *(auto-added by GHL)* Cancelled or no-show |

4. Click **Save Pipeline**
5. Now go back to your workflow (Step 2E above) and add the **Create/Update Opportunity** action

Every time the AI books a call, the contact will automatically appear as a card in the **Booked** column of your pipeline. Your team drags it through stages as the job progresses.

---

## STEP 4 — Link Everything to the AI Agent

**Where to go:** Left sidebar → **AI Agents** → **Voice AI** → **Inbound** → **[Your Agent]** → **Agent Goals**

### 4A — Link the Calendar (During the Call)

1. Scroll to **Actions (During the Call)**
2. Click **+ New Action → Appointment Booking**
3. Select Calendar: `Acme HVAC Appointments`
4. Set:
   - Days of Offering Dates: `3`
   - Appointment Slots Per Day: `3`
   - Hours Between Slots: `3`
5. Click **Save**

### 4B — Link the Workflow (After the Call)

1. Scroll down to **After the Call**
2. Enable **Trigger Workflow when call is completed**
3. Select: `Appointment Book by AI`
4. Enable **Receive Email Notification Post Call Completion** → select **All Admins**
5. Click **Save**

### 4C — Verify Timezone (Do Not Skip)

Confirm these three match before testing — even one mismatch causes appointments to show at the wrong time:

| What to check | Where to check it | Must equal |
|---|---|---|
| Agent timezone | AI Agents → [Agent] → Agent Details | `America/Chicago` |
| Team member timezone | Settings → Staff → [Member] → Timezone | `America/Chicago` |
| Sub-account timezone | Settings → Business Profile → Timezone | `America/Chicago` |

---

## STEP 5 — Test Before Going Live

**Where to go:** AI Agents → Voice AI → Inbound → [Agent] → **Test → Start Web Call**

Run this call script:

> "Hi, I'd like to book a service appointment."

When the agent asks for your details, provide:
- **Name:** Test Customer
- **Phone:** your real mobile number (so you receive the SMS)
- **Email:** your real email (so you can verify the confirmation)
- **Address:** an in-service-area address
- **Preferred time:** pick a slot the agent offers

**After the call, check these 6 things:**

- [ ] Contact was created with the name **Test Customer** (not the GHL admin account name)
- [ ] Appointment appears in **Acme HVAC Appointments** at the correct time and timezone
- [ ] SMS arrived on your phone with the correct details
- [ ] Email arrived at `tech@acmehvacunited.com`
- [ ] Contact appears in the **Booked** column of **Acme HVAC United Service Pipeline**
- [ ] Contact has the tag **Book by AI**

> ⚠️ If the contact name shows your GHL admin name instead of "Test Customer," the system prompt is missing the name collection instruction. The generated system prompt already fixes this — make sure you pasted the full generated prompt into the agent.

> ⚠️ If the appointment time is wrong (e.g., shows 8 AM when you said 6 PM), it's a timezone mismatch. Go back to Step 4C and align all three timezone settings.

---

## Quick Reference — Key Details for Acme HVAC United

| Item | Value |
|---|---|
| Transfer Number | `+12565550101` |
| Technician Email | `tech@acmehvacunited.com` |
| Business Phone | `(256) 555-0100` |
| Calendar Name | `Acme HVAC Appointments` |
| Timezone | `America/Chicago` |
| Appointment Duration | `90 min` |
| Workflow Name | `Appointment Book by AI` |
| Pipeline Name | `Acme HVAC United Service Pipeline` |
| Contact Tag | `Book by AI` |

---

*Generated by GHL Voice AI Setup System · June 27, 2026*