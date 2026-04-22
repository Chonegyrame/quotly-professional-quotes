-- Atomic Layer 2 pattern replacement.
--
-- Replaces the two-step DELETE-then-INSERT the recompute-user-profile edge
-- function was doing as separate PostgREST calls, which could leave the
-- user with zero patterns if the function timed out between the two calls.
-- Wrapping both in a plpgsql function gives us a single transaction: either
-- both statements commit together or neither does.

CREATE OR REPLACE FUNCTION public.replace_user_job_patterns(
  p_user_id uuid,
  p_trade text,
  p_patterns jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_job_patterns
  WHERE user_id = p_user_id AND trade = p_trade;

  IF p_patterns IS NOT NULL AND jsonb_array_length(p_patterns) > 0 THEN
    INSERT INTO public.user_job_patterns (
      user_id,
      trade,
      pattern_keywords,
      occurrence_count,
      common_materials,
      typical_line_items,
      avg_total_labor,
      member_quote_ids,
      last_updated_at
    )
    SELECT
      p_user_id,
      p_trade,
      ARRAY(SELECT jsonb_array_elements_text(elem->'pattern_keywords')),
      (elem->>'occurrence_count')::int,
      COALESCE(elem->'common_materials', '[]'::jsonb),
      COALESCE(elem->'typical_line_items', '[]'::jsonb),
      (elem->>'avg_total_labor')::numeric,
      ARRAY(SELECT jsonb_array_elements_text(elem->'member_quote_ids'))::uuid[],
      now()
    FROM jsonb_array_elements(p_patterns) elem;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_user_job_patterns(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_user_job_patterns(uuid, text, jsonb) TO service_role;
