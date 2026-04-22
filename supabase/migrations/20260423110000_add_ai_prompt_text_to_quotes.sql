-- Dev observability: persist the full prompt text sent to Claude
-- alongside each AI-generated quote. Populated only when generate-quote
-- produces the quote. Null for manually-created quotes.
-- Used by a "Visa AI-prompt" collapsible on QuoteDetail for prompt
-- debugging during the learning-system development phase.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS ai_prompt_text text;
