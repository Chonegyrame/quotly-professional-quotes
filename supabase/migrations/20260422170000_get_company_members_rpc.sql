-- RPC for reading company members with their emails.
-- Frontend can't select from auth.users directly, so this function does the
-- join on the server with security-definer privileges and returns only what
-- members of the same company are allowed to see.

CREATE OR REPLACE FUNCTION public.get_company_members(p_company_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  role text,
  joined_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Authorization: caller must be a member of the target company.
  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'Not a member of this company' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.user_id, u.email::text, m.role, m.joined_at
  FROM public.company_memberships m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.company_id = p_company_id
  ORDER BY
    CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
    m.joined_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_members(uuid) TO authenticated;
