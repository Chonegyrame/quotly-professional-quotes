import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export function useQuotes() {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['quotes', company?.id],
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*, quote_item_materials(*)), quote_events(*)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company,
  });

  const createQuote = useMutation({
    mutationFn: async (input: {
      customer_name: string;
      customer_email: string;
      customer_phone?: string;
      customer_address?: string;
      notes?: string;
      estimated_time?: string;
      valid_until?: string;
      status?: string;
      items: { description: string; quantity: number; unit_price: number; vat_rate: number }[];
    }) => {
      // Get next quote number
      const { data: numData } = await supabase.rpc('get_next_quote_number', {
        p_company_id: company!.id,
      });

      const { data: quote, error } = await supabase
        .from('quotes')
        .insert({
          company_id: company!.id,
          quote_number: numData || `Q-${Date.now()}`,
          customer_name: input.customer_name,
          customer_email: input.customer_email,
          customer_phone: input.customer_phone || '',
          customer_address: input.customer_address || '',
          notes: input.notes || '',
          estimated_time: input.estimated_time || '',
          valid_until: input.valid_until,
          status: input.status || 'draft',
          sent_at: input.status === 'sent' ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert items
      const items = input.items.map((item, idx) => ({
        quote_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        sort_order: idx,
      }));
      const { error: itemsError } = await supabase.from('quote_items').insert(items);
      if (itemsError) throw itemsError;

      // Create event
      await supabase.from('quote_events').insert({
        quote_id: quote.id,
        event_type: 'created',
      });

      if (input.status === 'sent') {
        await supabase.from('quote_events').insert({
          quote_id: quote.id,
          event_type: 'sent',
        });
      }

      return quote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const updateQuoteStatus = useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'sent') updates.sent_at = new Date().toISOString();
      if (status === 'opened') updates.opened_at = new Date().toISOString();
      if (status === 'accepted') updates.accepted_at = new Date().toISOString();

      const { error } = await supabase.from('quotes').update(updates).eq('id', quoteId);
      if (error) throw error;

      await supabase.from('quote_events').insert({
        quote_id: quoteId,
        event_type: status,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const updateQuote = useMutation({
    mutationFn: async (input: {
      quoteId: string;
      customer_name: string;
      customer_email: string;
      customer_phone?: string;
      customer_address?: string;
      notes?: string;
      estimated_time?: string;
      valid_until?: string;
      status?: string;
      items: { description: string; quantity: number; unit_price: number; vat_rate: number }[];
    }) => {
      // Determine the right status after edit
      // If previously accepted → set to "revised" (needs customer re-approval)
      // If sent/opened → reset to "draft" unless re-sending
      // Get current quote to check previous status
      const { data: currentQuote } = await supabase
        .from('quotes')
        .select('status')
        .eq('id', input.quoteId)
        .single();

      const prevStatus = currentQuote?.status;
      let finalStatus: string;

      if (prevStatus === 'accepted' || prevStatus === 'revised') {
        // Accepted quotes go to "revised" — customer must re-approve
        finalStatus = input.status === 'sent' ? 'revised' : 'revised';
      } else if (input.status === 'sent') {
        finalStatus = 'sent';
      } else {
        finalStatus = 'draft';
      }

      const updates: any = {
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone || '',
        customer_address: input.customer_address || '',
        notes: input.notes || '',
        estimated_time: input.estimated_time || '',
        valid_until: input.valid_until,
        status: finalStatus,
      };
      if (finalStatus === 'sent') updates.sent_at = new Date().toISOString();

      const { error } = await supabase.from('quotes').update(updates).eq('id', input.quoteId);
      if (error) throw error;

      // Delete old items (cascade deletes materials)
      await supabase.from('quote_items').delete().eq('quote_id', input.quoteId);

      // Insert new items
      const items = input.items.map((item, idx) => ({
        quote_id: input.quoteId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        sort_order: idx,
      }));
      const { error: itemsError } = await supabase.from('quote_items').insert(items);
      if (itemsError) throw itemsError;

      // Create event based on transition
      const eventType = (prevStatus === 'accepted' || prevStatus === 'revised') ? 'revised' : 'edited';
      await supabase.from('quote_events').insert({
        quote_id: input.quoteId,
        event_type: eventType,
      });

      return input.quoteId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const duplicateQuote = useMutation({
    mutationFn: async ({ quoteId }: { quoteId: string }) => {
      if (!company) throw new Error('No company selected');

      const { data: sourceQuote, error: sourceError } = await supabase
        .from('quotes')
        .select('*, quote_items(*, quote_item_materials(*))')
        .eq('id', quoteId)
        .eq('company_id', company.id)
        .single();

      if (sourceError || !sourceQuote) throw sourceError || new Error('Quote not found');

      const { data: numData } = await supabase.rpc('get_next_quote_number', {
        p_company_id: company.id,
      });

      let validUntil: string | null = sourceQuote.valid_until;
      if (company.default_validity_days && company.default_validity_days > 0) {
        const validDate = new Date();
        validDate.setDate(validDate.getDate() + company.default_validity_days);
        validUntil = validDate.toISOString().split('T')[0];
      }

      const { data: newQuote, error: quoteInsertError } = await supabase
        .from('quotes')
        .insert({
          company_id: company.id,
          quote_number: numData || `Q-${Date.now()}`,
          customer_name: sourceQuote.customer_name,
          customer_email: sourceQuote.customer_email || '',
          customer_phone: sourceQuote.customer_phone || '',
          customer_address: sourceQuote.customer_address || '',
          notes: sourceQuote.notes || '',
          estimated_time: sourceQuote.estimated_time || '',
          valid_until: validUntil,
          status: 'draft',
          sent_at: null,
          opened_at: null,
          accepted_at: null,
        })
        .select()
        .single();

      if (quoteInsertError || !newQuote) throw quoteInsertError || new Error('Could not create duplicated quote');

      const sourceItems = [...(sourceQuote.quote_items || [])].sort(
        (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0),
      );

      if (sourceItems.length > 0) {
        const itemsToInsert = sourceItems.map((item: any, idx: number) => ({
          quote_id: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          sort_order: item.sort_order ?? idx,
        }));

        const { data: insertedItems, error: itemInsertError } = await supabase
          .from('quote_items')
          .insert(itemsToInsert)
          .select('id, sort_order')
          .order('sort_order');

        if (itemInsertError) throw itemInsertError;

        const materialsToInsert: any[] = [];

        sourceItems.forEach((sourceItem: any, idx: number) => {
          const newItemId = insertedItems?.[idx]?.id;
          if (!newItemId) return;

          const sourceMaterials = [...(sourceItem.quote_item_materials || [])].sort(
            (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0),
          );

          sourceMaterials.forEach((material: any, materialIndex: number) => {
            materialsToInsert.push({
              quote_item_id: newItemId,
              material_id: material.material_id || null,
              name: material.name,
              quantity: material.quantity,
              unit_price: material.unit_price,
              unit: material.unit,
              sort_order: material.sort_order ?? materialIndex,
            });
          });
        });

        if (materialsToInsert.length > 0) {
          const { error: materialInsertError } = await supabase
            .from('quote_item_materials')
            .insert(materialsToInsert);

          if (materialInsertError) throw materialInsertError;
        }
      }

      await supabase.from('quote_events').insert({
        quote_id: newQuote.id,
        event_type: 'created',
      });

      return newQuote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });
  return { quotes: query.data ?? [], isLoading: query.isLoading, createQuote, updateQuote, updateQuoteStatus, duplicateQuote };
}

// Hook to get a single quote by ID (for edit mode)
export function useQuote(quoteId: string | undefined) {
  const { quotes } = useQuotes();
  return quotes.find((q: any) => q.id === quoteId) ?? null;
}

// Hook for public customer view (no auth required)
export function usePublicQuote(quoteId: string | undefined) {
  return useQuery({
    queryKey: ['public-quote', quoteId],
    queryFn: async () => {
      if (!quoteId) return null;
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*, quote_item_materials(*)), quote_events(*)')
        .eq('id', quoteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
  });
}


