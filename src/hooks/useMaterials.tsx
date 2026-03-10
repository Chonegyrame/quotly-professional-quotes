import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { starterMaterialsByTrade, type StarterTrade } from '@/data/starterMaterials';

const starterTrades: StarterTrade[] = ['build', 'electric', 'vvs'];

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeCategory = (
  value: string | null | undefined
): StarterTrade | 'general' => {
  if (!value) return 'general';
  if (value === 'build' || value === 'electric' || value === 'vvs') return value;
  if (value === 'electrical') return 'electric';
  if (value === 'plumbing') return 'vvs';
  if (value === 'carpentry') return 'build';
  return 'general';
};

export function useMaterials() {
  const { company } = useCompany();

  const query = useQuery({
    queryKey: ['materials', company?.id],
    queryFn: async () => {
      if (!company) return [];

      const loadMaterials = async () => {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('company_id', company.id)
          .order('name');

        if (error) throw error;
        return data ?? [];
      };

      let existingMaterials = await loadMaterials();

      const starterLookup = new Map<string, { name: string; unit: string }>();
      for (const trade of starterTrades) {
        for (const starter of starterMaterialsByTrade[trade]) {
          starterLookup.set(`${trade}::${normalizeName(starter.name)}`, starter);
        }
      }

      const rowsToFix = existingMaterials.filter((material) => {
        const trade = normalizeCategory(material.category);
        if (trade === 'general') return false;

        const starter = starterLookup.get(`${trade}::${normalizeName(material.name)}`);
        if (!starter) return false;

        return (
          material.name !== starter.name ||
          (material.unit || '') !== starter.unit ||
          material.category !== trade
        );
      });

      if (rowsToFix.length > 0) {
        await Promise.all(
          rowsToFix.map(async (material) => {
            const trade = normalizeCategory(material.category) as StarterTrade;
            const starter = starterLookup.get(`${trade}::${normalizeName(material.name)}`);
            if (!starter) return;

            const { error } = await supabase
              .from('materials')
              .update({
                name: starter.name,
                unit: starter.unit,
                category: trade,
              })
              .eq('id', material.id);

            if (error) throw error;
          })
        );

        existingMaterials = await loadMaterials();
      }

      const existingKeys = new Set(
        existingMaterials.map(
          (material) =>
            `${normalizeCategory(material.category)}::${normalizeName(material.name)}`
        )
      );

      const missingStarterRows = starterTrades.flatMap((trade) =>
        starterMaterialsByTrade[trade]
          .filter(
            (starter) =>
              !existingKeys.has(`${trade}::${normalizeName(starter.name)}`)
          )
          .map((starter) => ({
            company_id: company.id,
            name: starter.name,
            unit_price: 0,
            unit: starter.unit,
            category: trade,
          }))
      );

      if (missingStarterRows.length > 0) {
        const { error: insertError } = await supabase
          .from('materials')
          .insert(missingStarterRows);

        if (insertError) throw insertError;
      }

      return await loadMaterials();
    },
    enabled: !!company,
  });

  return { materials: query.data ?? [], isLoading: query.isLoading };
}
