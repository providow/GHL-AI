'use strict';

const { formatHoursTable } = require('./helpers');

function generateFastSetupGuide(b) {
  const biz   = b.business_name;
  const cal   = b.calendar_name || (biz + ' Appointments');
  const tz    = b.timezone || 'America/Chicago';
  const dur   = b.appointment_duration_minutes || 60;
  const tech  = b.technician_email || 'your-technician@email.com';
  const phone = b.main_phone || '[your business phone]';
  const xfer  = b.technician_transfer_number || '[transfer number]';
  const CV    = (s) => '{{' + s + '}}';

  const satOpen = b.operating_hours && b.operating_hours.saturday && b.operating_hours.saturday.open !== 'closed';
  const sunOpen = b.operating_hours && b.operating_hours.sunday   && b.operating_hours.sunday.open   !== 'closed';
  const availDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    .concat(satOpen ? ['Saturday'] : [])
    .concat(sunOpen ? ['Sunday']   : [])
    .join(', ');

  const phWarning = b.phone_number_country === 'PH'
    ? '\n> ⚠️ **Phone number cost reminder:** Philippine numbers cost $15–$120+/month. US numbers are ~$0.15/month. Make sure your client is aware before purchasing.\n'
    : '';

  const smsMsg =
    'Hi ' + CV('contact.first_name') + ', your appointment with ' + biz +
    ' is confirmed for ' + CV('appointment.start_time_formatted') +
    '. Our technician will arrive at ' + CV('appointment.address') +
    '. Questions? Call us at ' + phone + '.';

  const emailSubj = 'New Appointment Received – ' + CV('contact.full_name');

  const emailBody = [
    'Hi,',
    '',
    'A new appointment has been booked via the AI agent.',
    '',
    'Customer: ' + CV('contact.full_name'),
    'Phone: '    + CV('contact.phone'),
    'Email: '    + CV('contact.email'),
    'Service Address: ' + CV('appointment.address'),
    'Service Requested: ' + CV('appointment.notes'),
    'Date & Time: ' + CV('appointment.start_time_formatted'),
    '',
    'Please log in to GHL to view or modify this appointment.',
    '',
    '— ' + biz + ' Booking System',
  ].join('\n');

  const hoursTable = b.operating_hours ? formatHoursTable(b.operating_hours) : '';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const lines = [];
  const L = (s) => lines.push(s === undefined ? '' : s);

  L('# ' + biz + ' — GHL Fast Setup Guide');
  L('## Complete in Under 24 Hours | Workflows · Calendar · Pipeline');
  L();
  L('> **How this guide works:** Each section is one task. Follow them in order — each one takes 10–20 minutes. By the end, your AI agent will be booking appointments, sending confirmations, and tracking leads automatically.');
  L();
  L('---');
  L();
  L('## ⏱ Time Estimate');
  L();
  L('| Task | Time |');
  L('|---|---|');
  L('| Step 1 — Create the Calendar | ~10 min |');
  L('| Step 2 — Build the Automation Workflow | ~20 min |');
  L('| Step 3 — Create the Pipeline | ~10 min |');
  L('| Step 4 — Link Everything to the AI Agent | ~10 min |');
  L('| Step 5 — Test | ~15 min |');
  L('| **Total** | **~1 hour** |');
  L();
  L('---');
  L();

  // ── STEP 1 ──────────────────────────────────────────────────────────────────
  L('## STEP 1 — Create the Calendar');
  L();
  L('**Where to go:** Left sidebar → **Calendars** → **Calendar Settings** → **+ New Calendar**');
  L();
  L('1. Click **+ New Calendar**');
  L('2. Select **Personal Booking** (use this for a single technician; use Round Robin if you have multiple)');
  L('3. Fill in the fields:');
  L();
  L('   | Field | What to enter |');
  L('   |---|---|');
  L('   | Calendar Name | `' + cal + '` |');
  L('   | Team Member | Select the technician or staff member who owns this calendar |');
  L('   | Meeting Duration | `' + dur + ' minutes` |');
  L('   | Availability | Check: ' + availDays + ' |');
  L('   | Buffer Time | `30 minutes` (gives technicians travel time between jobs) |');
  L('   | Minimum Booking Notice | `24 hours` |');
  L('   | Maximum Booking Window | `60 days` |');
  L();
  L('4. Click **Confirm** to save');
  L('5. Click **Preview Booking Widget** — make sure it loads and shows available slots');
  L();
  L('> ⚠️ **Timezone note:** The calendar timezone comes from the team member\'s profile — not the calendar itself. To check or fix it: **Settings → Staff → [Team Member Name] → Timezone** — set it to `' + tz + '`. This must match the AI agent timezone or appointments will show at the wrong time.');
  L();
  if (hoursTable) {
    L(hoursTable);
    L();
  }
  L('---');
  L();

  // ── STEP 2 ──────────────────────────────────────────────────────────────────
  L('## STEP 2 — Build the Automation Workflow');
  L();
  L('**Where to go:** Left sidebar → **Automation** → **+ Create New Workflow** → **Start from Scratch**');
  L();
  L('### 2A — Name and Trigger');
  L();
  L('1. Name the workflow: **`Appointment Book by AI`**');
  L('2. Click **+ Add Trigger**');
  L('3. Search for and select: **Appointment Status**');
  L('4. Under filters, set:');
  L('   - **Appointment Status** = `New`');
  L('5. Click **Save Trigger**');
  L();
  L('> This trigger fires every time the AI agent books a new appointment. "New" means it just got created — not confirmed, not cancelled, just created.');
  L();
  L('---');
  L();
  L('### 2B — Action 1: Send SMS Confirmation to the Customer');
  L();
  L('> ⚠️ **Before enabling SMS:** Your sending phone number must be approved for A2P 10DLC registration. If it is not yet approved, add this action but **turn it off** (toggle the action off) until registration is complete. Unapproved numbers fail silently — no error shows, the SMS just never arrives.');
  L(phWarning);
  L('1. Click **+ Add Action**');
  L('2. Select **Send SMS**');
  L('3. Fill in:');
  L();
  L('   | Field | What to enter |');
  L('   |---|---|');
  L('   | Action Name | `Send Confirmation SMS` |');
  L('   | To | `Contact Phone` |');
  L('   | From Number | Select your business number from the dropdown |');
  L('   | Message | Copy and paste the text below |');
  L();
  L('   **Copy this message:**');
  L();
  L('   > ' + smsMsg);
  L();
  L('4. Click **Save Action**');
  L();
  L('---');
  L();
  L('### 2C — Action 2: Email the Technician');
  L();
  L('1. Click **+ Add Action**');
  L('2. Select **Send Email**');
  L('3. Fill in:');
  L();
  L('   | Field | What to enter |');
  L('   |---|---|');
  L('   | Action Name | `Notify Technician` |');
  L('   | From Name | `' + biz + ' Appointments` |');
  L('   | From Email | Your business email (e.g., `service@yourdomain.com`) |');
  L('   | To | Select **Custom Email** → enter `' + tech + '` |');
  L('   | Subject | `' + emailSubj + '` |');
  L('   | Email Body | Copy and paste the text below |');
  L();
  L('   **Copy this email body:**');
  L();
  emailBody.split('\n').forEach((row) => L('   > ' + row));
  L();
  L('4. Click **Save Action**');
  L();
  L('---');
  L();
  L('### 2D — Action 3: Tag the Contact');
  L();
  L('1. Click **+ Add Action**');
  L('2. Select **Add Contact Tag**');
  L('3. Fill in:');
  L();
  L('   | Field | What to enter |');
  L('   |---|---|');
  L('   | Action Name | `Tag as Booked by AI` |');
  L('   | Tag | Type `Book by AI` and press Enter to create it |');
  L();
  L('4. Click **Save Action**');
  L();
  L('> This tag lets you filter and report on AI-sourced bookings later. In GHL Contacts, filter by tag "Book by AI" to see every lead the AI has booked.');
  L();
  L('---');
  L();
  L('### 2E — Action 4: Add to Pipeline (come back after Step 3)');
  L();
  L('> After you create the pipeline in Step 3, come back and add one more action:');
  L('> - Click **+ Add Action → Create/Update Opportunity**');
  L('> - Pipeline: `' + biz + ' Service Pipeline`');
  L('> - Stage: `Booked`');
  L('> - Click **Save Action**');
  L();
  L('---');
  L();
  L('### 2F — Publish the Workflow');
  L();
  L('1. Click **Save** at the top right');
  L('2. Click **Publish** (switches from Draft → Active)');
  L();
  L('> ⚠️ **Critical:** A workflow left as Draft will never fire. You must hit Publish. The status indicator should turn green and say "Active."');
  L();
  L('---');
  L();

  // ── STEP 3 ──────────────────────────────────────────────────────────────────
  L('## STEP 3 — Create the Pipeline');
  L();
  L('**Where to go:** Left sidebar → **Opportunities** → **Pipelines** → **Create New Pipeline**');
  L();
  L('1. Click **Create New Pipeline**');
  L('2. Name it: **`' + biz + ' Service Pipeline`**');
  L('3. Add these stages in order (click **+ Add Stage** for each):');
  L();
  L('   | # | Stage Name | What it means |');
  L('   |---|---|---|');
  L('   | 1 | New Lead | Someone called but hasn\'t booked yet |');
  L('   | 2 | Qualified | Caller is in the service area and interested |');
  L('   | 3 | Booked | AI agent booked the appointment ← workflow puts leads here automatically |');
  L('   | 4 | Confirmed | Customer confirmed they\'re coming |');
  L('   | 5 | Completed | Service was delivered |');
  L('   | – | Won | *(auto-added by GHL)* Paid and closed |');
  L('   | – | Lost | *(auto-added by GHL)* Cancelled or no-show |');
  L();
  L('4. Click **Save Pipeline**');
  L('5. Now go back to your workflow (Step 2E above) and add the **Create/Update Opportunity** action');
  L();
  L('Every time the AI books a call, the contact will automatically appear as a card in the **Booked** column of your pipeline. Your team drags it through stages as the job progresses.');
  L();
  L('---');
  L();

  // ── STEP 4 ──────────────────────────────────────────────────────────────────
  L('## STEP 4 — Link Everything to the AI Agent');
  L();
  L('**Where to go:** Left sidebar → **AI Agents** → **Voice AI** → **Inbound** → **[Your Agent]** → **Agent Goals**');
  L();
  L('### 4A — Link the Calendar (During the Call)');
  L();
  L('1. Scroll to **Actions (During the Call)**');
  L('2. Click **+ New Action → Appointment Booking**');
  L('3. Select Calendar: `' + cal + '`');
  L('4. Set:');
  L('   - Days of Offering Dates: `3`');
  L('   - Appointment Slots Per Day: `3`');
  L('   - Hours Between Slots: `3`');
  L('5. Click **Save**');
  L();
  L('### 4B — Link the Workflow (After the Call)');
  L();
  L('1. Scroll down to **After the Call**');
  L('2. Enable **Trigger Workflow when call is completed**');
  L('3. Select: `Appointment Book by AI`');
  L('4. Enable **Receive Email Notification Post Call Completion** → select **All Admins**');
  L('5. Click **Save**');
  L();
  L('### 4C — Verify Timezone (Do Not Skip)');
  L();
  L('Confirm these three match before testing — even one mismatch causes appointments to show at the wrong time:');
  L();
  L('| What to check | Where to check it | Must equal |');
  L('|---|---|---|');
  L('| Agent timezone | AI Agents → [Agent] → Agent Details | `' + tz + '` |');
  L('| Team member timezone | Settings → Staff → [Member] → Timezone | `' + tz + '` |');
  L('| Sub-account timezone | Settings → Business Profile → Timezone | `' + tz + '` |');
  L();
  L('---');
  L();

  // ── STEP 5 ──────────────────────────────────────────────────────────────────
  L('## STEP 5 — Test Before Going Live');
  L();
  L('**Where to go:** AI Agents → Voice AI → Inbound → [Agent] → **Test → Start Web Call**');
  L();
  L('Run this call script:');
  L();
  L('> "Hi, I\'d like to book a service appointment."');
  L();
  L('When the agent asks for your details, provide:');
  L('- **Name:** Test Customer');
  L('- **Phone:** your real mobile number (so you receive the SMS)');
  L('- **Email:** your real email (so you can verify the confirmation)');
  L('- **Address:** an in-service-area address');
  L('- **Preferred time:** pick a slot the agent offers');
  L();
  L('**After the call, check these 6 things:**');
  L();
  L('- [ ] Contact was created with the name **Test Customer** (not the GHL admin account name)');
  L('- [ ] Appointment appears in **' + cal + '** at the correct time and timezone');
  L('- [ ] SMS arrived on your phone with the correct details');
  L('- [ ] Email arrived at `' + tech + '`');
  L('- [ ] Contact appears in the **Booked** column of **' + biz + ' Service Pipeline**');
  L('- [ ] Contact has the tag **Book by AI**');
  L();
  L('> ⚠️ If the contact name shows your GHL admin name instead of "Test Customer," the system prompt is missing the name collection instruction. The generated system prompt already fixes this — make sure you pasted the full generated prompt into the agent.');
  L();
  L('> ⚠️ If the appointment time is wrong (e.g., shows 8 AM when you said 6 PM), it\'s a timezone mismatch. Go back to Step 4C and align all three timezone settings.');
  L();
  L('---');
  L();

  // ── Quick Reference ──────────────────────────────────────────────────────────
  L('## Quick Reference — Key Details for ' + biz);
  L();
  L('| Item | Value |');
  L('|---|---|');
  L('| Transfer Number | `' + xfer + '` |');
  L('| Technician Email | `' + tech + '` |');
  L('| Business Phone | `' + phone + '` |');
  L('| Calendar Name | `' + cal + '` |');
  L('| Timezone | `' + tz + '` |');
  L('| Appointment Duration | `' + dur + ' min` |');
  L('| Workflow Name | `Appointment Book by AI` |');
  L('| Pipeline Name | `' + biz + ' Service Pipeline` |');
  L('| Contact Tag | `Book by AI` |');
  L();
  L('---');
  L();
  L('*Generated by GHL Voice AI Setup System · ' + date + '*');

  return lines.join('\n');
}

module.exports = { generateFastSetupGuide };
