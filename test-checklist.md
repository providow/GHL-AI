# End-to-End Test Checklist
## GHL Voice AI Inbound Agent — Web Call Validation

> **Tool:** Use GHL Web Call — `Sub-Account > AI Agents > Voice AI > Inbound > [Agent] > Agent Goals > Test > Start Web Call`
> Never test on a live phone number until all Web Call tests pass.
> **Phone number testing:** If you purchased a US phone number and assigned it to the agent, you can test by calling that number directly from a US line. Philippine/non-US numbers may not be testable from local SIM — use Web Call instead.

---

## PRE-TEST SETUP

- [ ] Knowledge Base was saved **at least 2 minutes ago** — if not, wait before proceeding
  > ⚠️ Testing immediately after a KB save returns stale responses. This is not a bug — propagation takes 1–2 minutes.
- [ ] Agent is saved with the current system prompt
- [ ] Calendar has at least one open slot in the next 3 business days
- [ ] Workflow is in **Active** (not Draft) status
- [ ] A2P registration status confirmed (or SMS actions disabled until approved)
- [ ] Test phone number and email are ones you can receive (to verify SMS/email delivery)

---

## TEST SCENARIO 1 — Normal Booking (Golden Path)

**Objective:** Confirm end-to-end booking works for an in-service-area caller.

**Script:**
1. Say: "Hi, I need to schedule a [service type] appointment."
2. Provide all 7 required fields when prompted:
   - Full name: use a test name (e.g., "John Tester")
   - Phone: a number you can receive SMS at
   - Email: an address you can check
   - Address: an in-service-area address with a valid ZIP code
   - Service type: pick one from your services list
   - Issue description: "Testing the system"
   - Preferred time: a slot available on the calendar
3. Confirm the booking when the agent reads it back

**Post-Test Validation:**
- [ ] Agent collected all required fields without skipping any (name, phone, email, address, service type)
- [ ] Agent used the caller-provided name (not the sub-account admin name or a default)
  > ⚠️ **Confirmed real-world bug:** GHL defaults the contact name to the sub-account admin's name if the agent doesn't explicitly ask for it. In the tutorial, the contact was created as "JHL Pinas Admin" because the prompt didn't instruct name collection. Fix: the system prompt must say "Your first task is to collect the caller's full first and last name" — the generator already includes this.
- [ ] Appointment appears in the GHL calendar
- [ ] Appointment time in calendar is correct — check for timezone offset errors
  > ⚠️ **Confirmed real-world bug:** In the tutorial, a 6 PM booking appeared as 8 AM in the calendar due to a CST timezone mismatch. If the time looks wrong, check that agent timezone, team member timezone, and sub-account timezone all match. Fix in: Agent Details timezone + `Settings > Staff > [Member] > Timezone`.
- [ ] Check `Automations > [Workflow] > Execution Logs` — confirm the workflow fired and all actions completed
- [ ] SMS confirmation received at the test phone number (only if A2P approved)
- [ ] Email notification received at the technician email
- [ ] Contact tagged `Book by AI` in GHL Contacts (verify under contact record > Tags)
- [ ] Appointment duration matches the configured duration

---

## TEST SCENARIO 2 — Out-of-Area Caller

**Objective:** Confirm the agent screens and rejects out-of-service-area callers without booking.

**Script:**
1. Say: "I need [service type] service."
2. When asked for address, provide a ZIP code that is NOT in your service area list
3. Continue the conversation to see how the agent responds

**Post-Test Validation:**
- [ ] Agent identified the ZIP code as out of service area
- [ ] Agent did NOT offer to book or ask for more booking details
- [ ] Agent offered an alternative (transfer to team member, or polite decline)
- [ ] No appointment was created in the calendar
- [ ] No contact was tagged `Booked by AI`

---

## TEST SCENARIO 3 — Human Handoff Request

**Objective:** Confirm call transfer fires correctly when caller asks for a human.

**Script:**
1. Start with a general question: "What services do you offer?"
2. After one response, say: "Can I speak to a real person?" or "I want to talk to someone on your team."

**Post-Test Validation:**
- [ ] Agent acknowledged the request without resistance
- [ ] Agent announced the transfer: "Let me connect you with one of our team members..."
- [ ] Transfer action fired (in Web Call test, this will show as a transfer event in the call log)
  > 📝 In Web Call testing mode, the actual phone transfer may not complete (no live line). Verify the transfer action triggered in the GHL call log/event trace.
- [ ] Transfer number used matches the `technician_transfer_number` from the intake form

---

## TEST SCENARIO 4 — Emergency Call

**Objective:** Confirm the agent does not book an appointment for an emergency and escalates correctly.

**Script:**
1. Say: "I have a [gas leak / active flooding / burning smell] — this is an emergency."

**Post-Test Validation:**
- [ ] Agent did NOT ask for booking details or attempt to schedule
- [ ] Agent acknowledged the emergency
- [ ] Agent instructed caller on immediate safety steps (e.g., evacuate, call 911 if applicable)
- [ ] Agent transferred to emergency/on-call number (or announced the transfer)
- [ ] No appointment was created in the calendar

---

## TEST SCENARIO 5 — After-Hours Call Handling

**Objective:** Confirm the agent handles calls outside business hours correctly.

**Script:**
1. If possible, run this test when the calendar shows no same-day availability (or manually close today's slots)
2. Say: "I need an appointment today."

**Post-Test Validation:**
- [ ] Agent acknowledged no same-day availability
- [ ] Agent offered the next available slot within business hours
- [ ] Agent did NOT suggest the caller call back during business hours (agent should handle it now)
- [ ] If caller books a future slot, all post-booking validations from Scenario 1 apply

---

## POST-TEST SYSTEM VALIDATION

After all 5 scenarios pass:

- [ ] Review GHL call logs for all test calls — confirm transcript accuracy
- [ ] Check for any calls where the agent gave incorrect service area information
- [ ] Check for any calls where the agent hallucinated pricing or specific quotes
- [ ] Verify all test contact records were created correctly (not duplicated, not using admin name)
- [ ] Delete test contact records and test appointments from the calendar (clean up before go-live)

---

## KNOWN FAILURE POINTS (Reference)

| Symptom | Root Cause | Fix |
|---|---|---|
| Contact name shows sub-account admin name | System prompt missing explicit name collection — GHL defaults to admin name | Prompt must say "Your first task is to collect the caller's full first and last name." Generator already includes this. |
| Agent books wrong time (timezone offset) | Agent timezone, team member profile timezone, or sub-account timezone are mismatched | Align: Agent Details timezone + `Settings > Staff > [Member] > Timezone` + `Settings > Business Profile > Timezone` |
| SMS not delivered after booking | A2P 10DLC not approved for sending number — fails silently | Complete A2P registration; disable SMS action until approved. Check status at `Settings > Phone System > [Number] > Compliance` |
| Agent doesn't know FAQ answers | KB saved too recently (propagation delay) | Wait 1–2 minutes after saving KB before testing |
| Transfer doesn't fire | Transfer action not added or number is empty | Add/fix transfer action in Agent Goals > During the Call > Call Transfer |
| Workflow doesn't trigger | Workflow in Draft status (not published) | Set workflow to Active/Published in Automations |
| Workflow trigger fires but no SMS | Trigger is "Appointment Status = New" but a wrong filter or missing phone field | Check execution logs in Automations; verify contact has a phone number |
| Agent accepts out-of-area caller | ZIP list missing or system prompt eligibility check too vague | Add explicit ZIP screening to system prompt; list all covered ZIPs in KB |
| Workflow fires but contact name is wrong | Contact was created before name was collected | Fix prompt to collect name first; delete test contact and re-test clean |
