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

      const loadAllMaterials = async () => {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('company_id', company.id)
          .order('name');

        if (error) throw error;
        return data ?? [];
      };

      let allMaterials = await loadAllMaterials();

      const starterLookup = new Map<string, { name: string; unit: string }>();
      for (const trade of starterTrades) {
        for (const starter of starterMaterialsByTrade[trade]) {
          starterLookup.set(`${trade}::${normalizeName(starter.name)}`, starter);
        }
      }

      // Normalize canonical starter naming for active starter rows only.
      const rowsToFix = allMaterials.filter((material) => {
        if (material.is_deleted) return false;

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

        allMaterials = await loadAllMaterials();
      }

      // Include both active and hidden starter rows to avoid re-creating removed starters.
      const existingKeys = new Set(
        allMaterials.map(
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
            purchase_price: 0,
            markup_percent: 0,
            unit: starter.unit,
            category: trade,
            is_deleted: false,
          }))
      );

      if (missingStarterRows.length > 0) {
        const { error: insertError } = await supabase
          .from('materials')
          .insert(missingStarterRows);

        if (insertError) throw insertError;
        allMaterials = await loadAllMaterials();
      }

      return allMaterials.filter((material) => !material.is_deleted);
    },
    enabled: !!company,
  });

  return { materials: query.data ?? [], isLoading: query.isLoading };
}
