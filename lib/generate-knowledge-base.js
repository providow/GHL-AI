'use strict';

const { formatHoursTable, formatServiceDescriptions, formatFaqs } = require('./helpers');

function generateKnowledgeBase(b) {
  const cityList = b.service_areas?.cities?.join(', ') || '_Not specified_';
  const zipList = b.service_areas?.zip_codes?.join(', ') || '_Not specified_';
  const faqs = formatFaqs(b.faqs || []);

  return `# ${b.business_name} — Knowledge Base
## GHL Voice AI Agent Reference

---

## 1. Company Overview

**${b.business_name}** is a locally owned and operated ${b.industry} company serving ${cityList} and surrounding areas. We are licensed, insured, and committed to honest, on-time service.${b.year_founded ? ` Our team has been serving the community since ${b.year_founded}.` : ''}

${b.main_phone ? `**Phone:** ${b.main_phone}` : ''}
${b.website_url ? `**Website:** ${b.website_url}` : ''}
${b.license_number ? `**License #:** ${b.license_number}` : ''}

---

## 2. Services

${formatServiceDescriptions(b.services)}

---

## 3. Pricing Policy

${b.business_name} provides **free on-site estimates** for all services. Final pricing depends on job scope, parts required, and labor time — we never quote firm prices over the phone without a technician assessment.

${b.pricing_policy}

We accept: ${b.payment_methods || 'cash, credit card, check'}.

---

## 4. Service Area Coverage

We currently serve the following locations:

**Cities:** ${cityList}

**ZIP Codes:** ${zipList}

Callers outside these areas cannot be booked through this system. The AI agent is instructed to screen for service area eligibility before scheduling.

---

## 5. Operating Hours

${formatHoursTable(b.operating_hours)}

**Timezone:** ${b.timezone}

After-hours calls are handled by our AI agent, which can book next-available appointments during business hours. Emergency situations are transferred to our on-call technician.

---

## 6. Frequently Asked Questions

${faqs || '_No FAQs provided. Add question/answer pairs to the intake form._'}

**Q: Can I get a price over the phone?**
A: We provide free on-site estimates — pricing depends on the scope of work and cannot be quoted accurately without a technician assessment.

**Q: Are your technicians licensed and insured?**
A: Yes. ${b.business_name} is fully licensed and insured.${b.license_number ? ` License #${b.license_number}.` : ''}

---

## 7. Warranty & Maintenance Plans

${b.warranty_info || '_No warranty information provided._'}

${b.maintenance_plan_info ? `### Maintenance Plan\n\n${b.maintenance_plan_info}` : ''}

---

## 8. Seasonal Promotions

_Update this section whenever active promotions exist. Remove if no current promotions._

---

## 9. Emergency Protocol (AI Reference)

If a caller reports any of the following, the AI agent must NOT book an appointment — it must transfer immediately:
- Gas leak or smell of gas
- Active flooding or burst pipe
- Electrical sparking, burning smell, or power outage affecting safety
- Any situation the caller describes as a danger to health or safety

**Emergency Transfer Number:** ${b.technician_transfer_number || '_Not set — add to intake form_'}

${b.emergency_policy || ''}
`;
}

module.exports = { generateKnowledgeBase };
