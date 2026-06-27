# End-to-End Test Checklist
## GHL Voice AI Inbound Agent — Web Call Validation

> **Tool:** Use GHL Web Call (`Sub-Account > AI Agents > Voice AI > Inbound > [Agent] > Test`) for all tests.
> Never test on a live phone number until all Web Call tests pass.

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
- [ ] Agent collected all 7 fields without skipping any
- [ ] Agent used the caller-provided name (not the sub-account admin name or a default)
  > ⚠️ If the contact record shows the sub-account admin name instead of "John Tester," the system prompt is missing the explicit name collection instruction. Fix: ensure the prompt says to collect full name as the FIRST data point.
- [ ] Appointment appears in the GHL calendar at the correct date and time
- [ ] Appointment timezone matches what the caller requested (verify in calendar view)
- [ ] SMS confirmation received at the test phone number
- [ ] Email notification received at the technician email
- [ ] Contact tagged `Booked by AI` in GHL Contacts
- [ ] Appointment duration matches the configured duration (e.g., 60 minutes)

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
| Contact name shows sub-account admin name | System prompt missing explicit name collection instruction | Add to prompt: "Your first task is to collect the caller's full first and last name." |
| Agent books wrong time (timezone offset) | Agent/calendar/sub-account timezones don't match | Align all three in Phase 1 and Phase 4 settings |
| SMS not delivered after booking | A2P 10DLC not approved for sending number | Complete A2P registration; disable SMS action until approved |
| Agent doesn't know FAQ answers | KB saved too recently (propagation delay) | Wait 2 minutes and re-test |
| Transfer doesn't fire | Transfer action not added or number is empty | Add/fix transfer action in Phase 3A |
| Workflow doesn't trigger | Workflow in Draft status or wrong trigger agent ID | Set workflow to Active; check agent ID filter |
| Agent accepts out-of-area caller | ZIP list missing or system prompt eligibility check too vague | Verify ZIP list in prompt and KB; make eligibility check an explicit conditional |
