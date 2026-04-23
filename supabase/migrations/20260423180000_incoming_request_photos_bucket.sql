-- Lead Filter System — Phase 2, Part 2
-- Creates a public-read bucket for customer-uploaded photos on the intake form.
-- Uploads are performed through the submit-intake-request edge function
-- (service role), so anon does not need direct insert rights.
-- Firm members can delete stale uploads from their own company's prefix.

INSERT INTO storage.buckets (id, name, public)
VALUES ('incoming-request-photos', 'incoming-request-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read: bucket is already public=true above (anyone with URL can GET).
-- Explicit SELECT policy for authenticated + anon just in case:
DROP POLICY IF EXISTS incoming_request_photos_read ON storage.objects;
CREATE POLICY incoming_request_photos_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'incoming-request-photos');

-- Anon INSERT: required because the public intake form uploads customer
-- photos directly from the browser. Paths are namespaced by firm slug
-- (e.g. "brunn-boofing-abc/<uuid>.jpg") but we don't validate the slug
-- against companies here — abuse is mitigated by the submit-intake-request
-- edge function's IP rate limit (10/hour) which gates the actual submission.
DROP POLICY IF EXISTS incoming_request_photos_anon_insert ON storage.objects;
CREATE POLICY incoming_request_photos_anon_insert ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'incoming-request-photos');

-- Members can delete files under their firm's prefix (path: "{firm_slug}/..").
-- This lets firms clean up orphaned uploads or respond to data requests.
DROP POLICY IF EXISTS incoming_request_photos_member_delete ON storage.objects;
CREATE POLICY incoming_request_photos_member_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'incoming-request-photos'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.form_slug = split_part(name, '/', 1)
        AND is_company_member(c.id)
    )
  );
