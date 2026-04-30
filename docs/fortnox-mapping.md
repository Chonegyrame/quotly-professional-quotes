# Fortnox Integration — Field Mapping

## Auth flow

```
[Settings] Anslut Fortnox button
   │
   ├─ buildFortnoxConnectUrl() generates a state nonce, stores it +
   │  redirect_uri in sessionStorage, returns an OAuth URL.
   │
   ├─ Browser → https://apps.fortnox.se/oauth-v1/auth?... (Fortnox consent)
   │
   ├─ Fortnox → ${origin}/auth/fortnox/callback?code=...&state=...
   │
   ├─ FortnoxCallback page validates state, POSTs { code, redirect_uri }
   │  to fortnox-oauth-callback edge function.
   │
   ├─ Edge function exchanges code for tokens (basic-auth with
   │  CLIENT_ID:CLIENT_SECRET against apps.fortnox.se/oauth-v1/token).
   │
   └─ upsertConnection() stores access_token + refresh_token + expires_at
      in fortnox_connections (RLS deny-all; service-role only).
```

Token refresh is automatic inside `getAccessToken()` whenever a fortnox-* edge function needs to call the API. Refresh tokens rotate per refresh — both new values are persisted.

## Required env vars

| Name                       | Where      | Purpose                                                                                          |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `VITE_FORTNOX_CLIENT_ID`   | Browser    | Public Client ID, used to build the OAuth URL.                                                   |
| `FORTNOX_CLIENT_ID`        | Edge fns   | Same value, server-side, used for code exchange.                                                 |
| `FORTNOX_CLIENT_SECRET`    | Edge fns   | Server-only secret. Pair with `FORTNOX_CLIENT_ID`.                                               |
| `FORTNOX_REDIRECT_URIS`    | Edge fns   | Comma-separated allow-list of redirect URIs the OAuth callback will accept (defense in depth).   |

Set the edge-function vars via `supabase secrets set …` so they're available to deployed functions. Example for local + prod:

```
supabase secrets set FORTNOX_REDIRECT_URIS="http://localhost:8081/auth/fortnox/callback,https://quotly.se/auth/fortnox/callback"
```

## Quote → Fortnox Invoice mapping

| Quotly                                          | Fortnox `Invoice`                              | Notes                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `customer_name`                                 | `Customer.Name` (find or create)               | Lookup by email first; fall back to creating a new `Type: PRIVATE` customer.                           |
| `customer_email`                                | `Customer.Email`                               |                                                                                                        |
| `customer_phone`                                | `Customer.Phone1`                              |                                                                                                        |
| `customer_address`                              | `Customer.Address1`                            |                                                                                                        |
| `valid_until`                                   | `Invoice.DueDate`                              | Falls back to today + 30 days.                                                                         |
| `notes`                                         | `Invoice.Comments`                             |                                                                                                        |
| `quote_items[].description`                     | `InvoiceRow.Description`                       | One row per item. Empty rows (unit_price = 0 with no materials) are dropped.                            |
| `quote_items[].quantity`                        | `InvoiceRow.DeliveredQuantity`                 |                                                                                                        |
| `quote_items[].unit_price`                      | `InvoiceRow.Price`                             |                                                                                                        |
| `quote_items[].vat_rate`                        | `InvoiceRow.VAT`                               |                                                                                                        |
| `quote_items[].quote_item_materials[]`          | additional `InvoiceRow`s (one per material)    | Material rows: `HouseWork = false`. Description = material name; price = material unit_price.           |
| `rot_eligible = true` AND row is labor          | `Invoice.HouseWork = true`, row `HouseWork = true`, `HouseWorkType = …` | Type per trade: bygg → CONSTRUCTION, el → ELECTRICITY, vvs → HVAC, general → CONSTRUCTION (default). |
| —                                               | `Invoice.Sent = false`                         | Always saved as a draft. Firm reviews and sends from inside Fortnox.                                   |

`HouseWorkType` values are best-guess and need verification against Fortnox's enum once we have a live test environment. See TODO(fortnox-spike) markers in `_shared/fortnox.ts` and `create-fortnox-invoice/index.ts`.

## Heuristics & gotchas

- **Labor detection.** `isLaborDescription()` matches the substring `arbet` (case-insensitive). Same heuristic Analytics uses. Replace with a structural `is_labor` flag when one exists on `quote_items`.
- **Customer Type.** All new customers are created as `PRIVATE`. ROT-eligible work targets homeowners; corporate customers (`Type: COMPANY`) need a future toggle on the quote when we hit that case.
- **CountryCode.** Hardcoded `SE`. Quotly is Sweden-only for the foreseeable future.
- **Idempotency.** `quotes.fortnox_invoice_number` blocks re-sending. The edge function returns 409 if the quote was already pushed. To re-sync after editing, the firm must clear that column manually for now.
- **Token refresh window.** `getAccessToken()` refreshes if the access token expires within 5 min. Adjust `refreshIfExpiringWithinMs` if Fortnox's clock skew is wider than expected.

## Endpoints touched

| Method | URL                                              | When                                  |
| ------ | ------------------------------------------------ | ------------------------------------- |
| POST   | `https://apps.fortnox.se/oauth-v1/token`         | Code exchange + refresh.              |
| GET    | `https://api.fortnox.se/3/customers?email=…`     | Customer lookup before invoice POST.  |
| POST   | `https://api.fortnox.se/3/customers`             | Create customer if lookup misses.     |
| POST   | `https://api.fortnox.se/3/invoices`              | The actual draft-invoice creation.    |
