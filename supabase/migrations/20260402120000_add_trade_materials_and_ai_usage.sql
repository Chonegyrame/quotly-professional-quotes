-- Global material catalog (owned by Quotly, not per-user)
CREATE TABLE public.trade_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bygg', 'el', 'vvs', 'general')),
  unit TEXT NOT NULL DEFAULT 'st',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  markup_percent NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read trade_materials"
  ON public.trade_materials FOR SELECT
  TO authenticated
  USING (true);

-- Rate limiting: track AI usage per user per day
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai_usage"
  ON public.ai_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ai_usage"
  ON public.ai_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
