-- Lead Filter System — Phase 2, Part 3 (security hardening)
-- Replaces the loose anon-INSERT policy on incoming-request-photos with a
-- service-role-only policy. Uploads from the public form now go through
-- the create-intake-upload-url edge function, which signs short-lived
-- upload URLs per request. This closes the abuse vector where bots could
-- write arbitrary files into the bucket without passing any rate limit.

DROP POLICY IF EXISTS incoming_request_photos_anon_insert ON storage.objects;
