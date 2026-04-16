export const DEFAULT_EMAIL_TEMPLATE =
  'Hej {customer_name},\n\nHär är din offert via länken nedan.\n\nVänliga hälsningar,\n{company_name}';

export function resolveEmailTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}
