-- Lead Filter System — Phase 0, Part 3
-- Replaces text-based service_areas + max_travel_km with a geocoded
-- base point + radius. Scoring can now compute exact Haversine distance
-- at runtime instead of asking the AI to fuzzy-reason about Swedish geography.
--
-- Safe to drop the old columns: table had 0 rows at migration time.

ALTER TABLE public.company_business_profile
  DROP COLUMN IF EXISTS service_areas,
  DROP COLUMN IF EXISTS max_travel_km;

ALTER TABLE public.company_business_profile
  ADD COLUMN base_address text,
  ADD COLUMN base_lat numeric(10, 7),
  ADD COLUMN base_lng numeric(10, 7),
  ADD COLUMN service_radius_km integer;

-- Sanity constraint: if coords are set, radius must be set too.
ALTER TABLE public.company_business_profile
  ADD CONSTRAINT chk_geo_consistency CHECK (
    (base_lat IS NULL AND base_lng IS NULL)
    OR (base_lat IS NOT NULL AND base_lng IS NOT NULL AND service_radius_km IS NOT NULL)
  );
