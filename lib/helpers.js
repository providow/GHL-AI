'use strict';

const formatHours = (hours) =>
  Object.entries(hours)
    .map(([day, h]) => {
      const label = day.charAt(0).toUpperCase() + day.slice(1);
      return h.open === 'closed' ? `${label}: Closed` : `${label}: ${h.open} – ${h.close}`;
    })
    .join('\n');

const formatHoursTable = (hours) => {
  const rows = Object.entries(hours).map(([day, h]) => {
    const label = day.charAt(0).toUpperCase() + day.slice(1);
    const val = h.open === 'closed' ? 'Closed' : `${h.open} – ${h.close}`;
    return `| ${label.padEnd(10)} | ${val.padEnd(18)} |`;
  });
  return `| Day        | Hours              |\n|------------|--------------------|\n${rows.join('\n')}`;
};

const formatServiceList = (services) =>
  services.map(s => `  - ${s.name}`).join('\n');

const formatServiceDescriptions = (services) =>
  services
    .map(s => `### ${s.name}\n${s.description || '_No description provided._'}${s.typical_duration_minutes ? `\n\nTypical duration: ${s.typical_duration_minutes} minutes` : ''}`)
    .join('\n\n');

const formatAreas = (areas) => {
  const parts = [];
  if (areas.cities?.length) parts.push(`Cities: ${areas.cities.join(', ')}`);
  if (areas.zip_codes?.length) parts.push(`ZIP Codes: ${areas.zip_codes.join(', ')}`);
  return parts.join(' | ') || '_No service areas defined_';
};

const formatFaqs = (faqs) =>
  faqs
    .filter(f => f.question && f.answer)
    .map(f => `**Q: ${f.question}**\nA: ${f.answer}`)
    .join('\n\n');

const countWords = (str) => str.trim().split(/\s+/).length;

const validate = (b, required) => {
  const missing = required.filter(f => {
    const val = b[f];
    return !val || (Array.isArray(val) && val.length === 0) ||
      (Array.isArray(val) && val.every(item => !item.name && !item.question));
  });
  return missing;
};

module.exports = {
  formatHours,
  formatHoursTable,
  formatServiceList,
  formatServiceDescriptions,
  formatAreas,
  formatFaqs,
  countWords,
  validate,
};
