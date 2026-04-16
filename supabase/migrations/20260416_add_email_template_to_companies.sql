-- Add email_template column for customizable quote email messages
ALTER TABLE public.companies ADD COLUMN email_template TEXT DEFAULT NULL;
