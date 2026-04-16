import { supabase } from '@/integrations/supabase/client';

export async function downloadQuotePdf(quoteId: string, customerName: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-pdf', {
    body: { quoteId },
  });

  if (error) throw new Error('Kunde inte generera PDF');

  // When the edge function returns application/pdf, supabase-js gives us a Blob
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });

  const safeName = customerName.replace(/[^a-zA-Z0-9åäöÅÄÖ _-]/g, '').trim() || 'Offert';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Offert-${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
