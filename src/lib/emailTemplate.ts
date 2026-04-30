export const DEFAULT_EMAIL_TEMPLATE =
  'Hej {customer_name},\n\nHär är din offert via länken nedan.\n\nVänliga hälsningar,\n{company_name}';

export const DEFAULT_REMINDER_TEMPLATE =
  'Hej {customer_name},\n\nHär kommer en vänlig påminnelse om offerten du fick. Den är giltig till {valid_until}.\n\nHör av dig om du har några frågor!\n\nVänliga hälsningar,\n{company_name}';

export function resolveEmailTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}
