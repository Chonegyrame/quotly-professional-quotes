-- Lead Filter System — Phase 1, Part 2
-- Seeds 16 form templates: 5 per trade (el, bygg, vvs) + 1 generic fallback.
--
-- Design principles (per plan):
--   * Budget always includes "vet_ej"
--   * Single-select with 4–6 buckets beats free text for screenable signals
--   * Photo required where visual info matters
--   * 7–11 questions per form
--   * property_type gates downstream logic (ROT eligibility, BRF consent, bygglov)
--   * red_flag_rules is prose for the scoring AI to reason about — not machine-enforced
--   * Swedish throughout
--
-- On re-run, INSERT ... ON CONFLICT (trade, sub_type) DO NOTHING keeps seeds stable.

-- =========================================================================
-- EL — 5 templates
-- =========================================================================

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Laddbox / EV-laddare',
  'el',
  'laddbox',
  'Installation av elbilsladdare vid hem eller arbetsplats.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"huvudsakring","label":"Storlek på huvudsäkring","type":"single_select","required":true,"options":[
        {"value":"16A","label":"16A"},
        {"value":"20A","label":"20A"},
        {"value":"25A","label":"25A"},
        {"value":"35A","label":"35A eller större"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"laddeffekt","label":"Önskad laddeffekt","type":"single_select","required":true,"options":[
        {"value":"3_7kw","label":"3,7 kW (enfas)"},
        {"value":"11kw","label":"11 kW (trefas)"},
        {"value":"22kw","label":"22 kW (trefas)"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"avstand_elcentral_m","label":"Avstånd elcentral till laddplats (meter)","type":"number","required":false},
      {"id":"photo_elcentral","label":"Bild på elcentral","type":"file_upload","required":true},
      {"id":"timeframe","label":"När vill ni ha det klart?","type":"single_select","required":true,"options":[
        {"value":"akut","label":"Akut (inom 2 veckor)"},
        {"value":"snart","label":"Snart (1–2 månader)"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_20k","label":"Under 20 000 kr"},
        {"value":"20k_40k","label":"20 000–40 000 kr"},
        {"value":"40k_plus","label":"40 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress för arbetsplatsen","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Kräver säkringshöjning","severity":"medium","description":"Om huvudsäkring är 16A eller mindre och önskad laddeffekt är 11 kW eller högre krävs troligen uppgradering av huvudsäkring — merkostnad och samordning med nätägaren."},
    {"label":"BRF-styrelsens godkännande krävs","severity":"medium","description":"Om fastighetstyp är bostadsrätt måste styrelsen godkänna installationen. Leads utan nämnt godkännande är osäkra."},
    {"label":"Lång kabeldragning","severity":"low","description":"Om avstånd elcentral till laddplats överstiger 20 m stiger kabel- och arbetskostnad betydligt."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Gruppcentralbyte / ny elcentral',
  'el',
  'gruppcentralbyte',
  'Byte av elcentral, proppskåp eller uppgradering till jordfelsbrytare.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"alder_fastighet","label":"Fastighetens ålder","type":"single_select","required":true,"options":[
        {"value":"pre_1975","label":"Före 1975"},
        {"value":"1975_1995","label":"1975–1995"},
        {"value":"1995_plus","label":"1995 eller senare"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"aktuell_central","label":"Nuvarande elcentral","type":"single_select","required":true,"options":[
        {"value":"proppskap","label":"Proppskåp (smältsäkringar)"},
        {"value":"dvarg","label":"Dvärgbrytare utan jordfel"},
        {"value":"modern_jordfel","label":"Modern med jordfelsbrytare"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"huvudsakring","label":"Storlek på huvudsäkring","type":"single_select","required":true,"options":[
        {"value":"16A","label":"16A"},
        {"value":"20A","label":"20A"},
        {"value":"25A","label":"25A"},
        {"value":"35A","label":"35A eller större"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"photo_elcentral","label":"Bild på nuvarande elcentral","type":"file_upload","required":true},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"akut","label":"Akut"},
        {"value":"snart","label":"Snart (1–2 månader)"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_15k","label":"Under 15 000 kr"},
        {"value":"15k_30k","label":"15 000–30 000 kr"},
        {"value":"30k_plus","label":"30 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Äldre fastighet med proppskåp","severity":"medium","description":"Om fastigheten byggdes före 1975 och nuvarande central är proppskåp kan hela gruppkabelnätet behöva granskas — flagga för högre arbetsbelastning."},
    {"label":"BRF-styrelsens godkännande","severity":"medium","description":"För bostadsrätter krävs styrelsegodkännande vid ändringar i elcentralen."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Solceller',
  'el',
  'solceller',
  'Installation av solpaneler och växelriktare.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"lantbruk","label":"Lantbruks- eller ekonomibyggnad"},
        {"value":"kommersiell","label":"Kommersiell fastighet"}
      ]},
      {"id":"tak_riktning","label":"Takets huvudriktning","type":"single_select","required":true,"options":[
        {"value":"soder","label":"Söder"},
        {"value":"ost_vast","label":"Öster eller väster"},
        {"value":"norr","label":"Norr"},
        {"value":"varierat","label":"Varierat / flera riktningar"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"tak_yta_kvm","label":"Ungefärlig takyta (kvm)","type":"number","required":true},
      {"id":"tak_material","label":"Takmaterial","type":"single_select","required":true,"options":[
        {"value":"tegel","label":"Tegelpannor"},
        {"value":"plat","label":"Plåt"},
        {"value":"papp","label":"Papp"},
        {"value":"betong","label":"Betongpannor"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"hushalls_forbrukning_kwh","label":"Årsförbrukning elektricitet (kWh)","type":"number","required":false},
      {"id":"photo_tak","label":"Bild av taket","type":"file_upload","required":true},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"snart","label":"Snart (1–3 månader)"},
        {"value":"sasong","label":"Till nästa säsong"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_100k","label":"Under 100 000 kr"},
        {"value":"100k_200k","label":"100 000–200 000 kr"},
        {"value":"200k_plus","label":"200 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Tak i norr","severity":"medium","description":"Om takets huvudriktning är norr är solcellsutbytet markant lägre — kunden bör informeras om förväntad produktion innan offert."},
    {"label":"Äldre papptak","severity":"medium","description":"Om takmaterial är papp kan takytan behöva renoveras innan installation — separat kostnad och tid."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Felsökning el',
  'el',
  'felsokning',
  'Akut eller plötsligt uppstått elfel.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Beskriv felet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"},
        {"value":"kommersiell","label":"Kommersiell lokal"}
      ]},
      {"id":"symptom","label":"Vad händer?","type":"single_select","required":true,"options":[
        {"value":"stromlost","label":"Hela fastigheten strömlös"},
        {"value":"delvis_stromlost","label":"Delvis strömlös (vissa rum/uttag)"},
        {"value":"trippar_sakring","label":"Säkringen går gång på gång"},
        {"value":"elektrisk_ljudbrand","label":"Brandvarning, gnistor eller brandlukt"},
        {"value":"annat","label":"Annat"}
      ]},
      {"id":"narhet","label":"Hur bråttom är det?","type":"single_select","required":true,"options":[
        {"value":"akut_farligt","label":"Akut — farligt/brand risk"},
        {"value":"idag_imorgon","label":"Idag eller imorgon"},
        {"value":"nagra_dagar","label":"Inom några dagar"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"photo","label":"Bild (om möjligt)","type":"file_upload","required":false},
      {"id":"budget","label":"Hur vill ni debiteras?","type":"single_select","required":true,"options":[
        {"value":"timbaserat","label":"Timpris är ok"},
        {"value":"takbelopp_5k","label":"Tak på 5 000 kr"},
        {"value":"takbelopp_15k","label":"Tak på 15 000 kr"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"contact_now","label":"Telefonnummer för akutkontakt","type":"short_text","required":true},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Brand- eller säkerhetsrisk","severity":"high","description":"Om kunden anger brandlukt, gnistor eller akut risk — ring kunden omedelbart eller vidarebefordra till jour innan besök."},
    {"label":"Akut ärende","severity":"medium","description":"Akut tidsram kräver snabb respons — om ni inte har ledig kapacitet idag/imorgon är detta troligen fel firma."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Allmän el-installation',
  'el',
  'allman',
  'Mindre elarbeten: uttag, strömställare, belysning, kabeldragning.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"kategori","label":"Typ av jobb","type":"single_select","required":true,"options":[
        {"value":"eluttag_stromstallare","label":"Eluttag eller strömställare"},
        {"value":"belysning","label":"Belysning (taklampor, spotar)"},
        {"value":"kabeldragning","label":"Kabeldragning"},
        {"value":"mindre_jobb","label":"Flera mindre jobb samtidigt"},
        {"value":"annat","label":"Annat"}
      ]},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"antal_punkter","label":"Antal punkter/uttag/lampor","type":"number","required":false},
      {"id":"photo","label":"Bild (om möjligt)","type":"file_upload","required":false},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"akut","label":"Akut (inom 2 veckor)"},
        {"value":"snart","label":"Snart (1 månad)"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_5k","label":"Under 5 000 kr"},
        {"value":"5k_15k","label":"5 000–15 000 kr"},
        {"value":"15k_plus","label":"15 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

-- =========================================================================
-- BYGG — 5 templates
-- =========================================================================

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Badrumsrenovering',
  'bygg',
  'badrum',
  'Ytskikt, halv- eller helrenovering av badrum.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om renoveringen","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"storlek_kvm","label":"Badrummets yta (kvm)","type":"number","required":true},
      {"id":"omfattning","label":"Omfattning","type":"single_select","required":true,"options":[
        {"value":"ytskikt","label":"Endast ytskikt (kakel, klinker, måla)"},
        {"value":"halvrenovering","label":"Halvrenovering (ytskikt + sanitet)"},
        {"value":"helrenovering","label":"Helrenovering (rivning till stomme)"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"alder_badrum","label":"Ungefärlig ålder på nuvarande badrum","type":"single_select","required":false,"options":[
        {"value":"under_5","label":"Under 5 år"},
        {"value":"5_15","label":"5–15 år"},
        {"value":"15_30","label":"15–30 år"},
        {"value":"30_plus","label":"Över 30 år"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"photos","label":"Bilder på nuvarande badrum","type":"file_upload","required":true},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"snart","label":"Snart (1–3 månader)"},
        {"value":"halvar","label":"Inom halvåret"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_100k","label":"Under 100 000 kr"},
        {"value":"100k_200k","label":"100 000–200 000 kr"},
        {"value":"200k_350k","label":"200 000–350 000 kr"},
        {"value":"350k_plus","label":"350 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Helrenovering i BRF","severity":"medium","description":"Helrenovering av badrum i bostadsrätt kräver styrelsens godkännande och våtrumsintyg (GVK eller BKR) — kunden bör ha godkännande innan byggstart."},
    {"label":"Äldre badrum","severity":"low","description":"Badrum äldre än 30 år kan ha dolda skador eller kräva stambyte-samordning med föreningen."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Köksrenovering',
  'bygg',
  'kok',
  'Ny köksinredning, flytt av vägg eller installation.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om renoveringen","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"storlek_kvm","label":"Kökets yta (kvm)","type":"number","required":true},
      {"id":"omfattning","label":"Omfattning","type":"single_select","required":true,"options":[
        {"value":"inredning_endast","label":"Endast ny inredning (luckor, bänkskiva)"},
        {"value":"helrenovering","label":"Helrenovering (nytt kök på befintlig planlösning)"},
        {"value":"planlosning_andras","label":"Ändra planlösning (flytt av vägg)"}
      ]},
      {"id":"flytta_vvs_el","label":"Flytta VVS eller el?","type":"single_select","required":true,"options":[
        {"value":"nej","label":"Nej"},
        {"value":"el_bara","label":"Bara el"},
        {"value":"el_och_vvs","label":"Både el och VVS"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"photos","label":"Bilder på nuvarande kök","type":"file_upload","required":true},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"snart","label":"Snart (1–3 månader)"},
        {"value":"halvar","label":"Inom halvåret"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_100k","label":"Under 100 000 kr"},
        {"value":"100k_200k","label":"100 000–200 000 kr"},
        {"value":"200k_400k","label":"200 000–400 000 kr"},
        {"value":"400k_plus","label":"400 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Flytta VVS i BRF","severity":"medium","description":"Flytt av VVS i bostadsrätt kräver styrelsens godkännande och eventuell samordning med stambyte."},
    {"label":"Ändra planlösning","severity":"medium","description":"Om kunden vill flytta vägg — verifiera att det inte är bärande. Kan kräva konstruktör/bygglovanmälan."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Altan / uteplats',
  'bygg',
  'altan',
  'Bygga ny eller renovera befintlig altan eller uteplats.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"}
      ]},
      {"id":"storlek_kvm","label":"Ungefärlig yta (kvm)","type":"number","required":true},
      {"id":"undergrund","label":"Undergrund","type":"single_select","required":true,"options":[
        {"value":"platta","label":"Gjuten platta"},
        {"value":"plintar","label":"Plintar"},
        {"value":"direkt_pa_mark","label":"Direkt på mark"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"material","label":"Materialval","type":"single_select","required":true,"options":[
        {"value":"tryckimpregnerat","label":"Tryckimpregnerat trä"},
        {"value":"komposit","label":"Komposit"},
        {"value":"linoljebehandlat","label":"Linoljebehandlat / obehandlat trä"},
        {"value":"sten","label":"Sten eller klinker"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"bygglov","label":"Bygglov","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, har bygglov"},
        {"value":"nej","label":"Nej, ej ansökt"},
        {"value":"ej_behovs","label":"Bygglov behövs inte"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"photos","label":"Bilder på platsen","type":"file_upload","required":true},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"innan_sommar","label":"Innan sommaren"},
        {"value":"sasong","label":"Under säsongen"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_50k","label":"Under 50 000 kr"},
        {"value":"50k_100k","label":"50 000–100 000 kr"},
        {"value":"100k_200k","label":"100 000–200 000 kr"},
        {"value":"200k_plus","label":"200 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Kontrollera bygglovsbehov","severity":"medium","description":"För altaner större än ca 15 kvm eller över 1,2 m höjd kan bygglov krävas. Om kunden ej ansökt bör detta klaras innan byggstart."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Tillbyggnad / utbyggnad',
  'bygg',
  'tillbyggnad',
  'Bygga till: uterum, nytt rum, Attefallshus, tak över altan.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om projektet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"}
      ]},
      {"id":"typ","label":"Typ av tillbyggnad","type":"single_select","required":true,"options":[
        {"value":"inbyggt_uterum","label":"Inbyggt uterum"},
        {"value":"tak_pa_altan","label":"Tak över altan"},
        {"value":"utbyggnad_rum","label":"Utbyggnad med nytt rum"},
        {"value":"attefall","label":"Attefallshus eller friggebod"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"storlek_kvm","label":"Ungefärlig yta (kvm)","type":"number","required":true},
      {"id":"bygglov","label":"Bygglov","type":"single_select","required":true,"options":[
        {"value":"beviljat","label":"Beviljat"},
        {"value":"ansokt","label":"Ansökt, väntar beslut"},
        {"value":"ej_ansokt","label":"Ej ansökt"},
        {"value":"attefall_anmalan","label":"Attefallsanmälan gjord"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"photos","label":"Bilder / ritningar","type":"file_upload","required":true},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"snart","label":"Snart (1–3 månader)"},
        {"value":"halvar","label":"Inom halvåret"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_200k","label":"Under 200 000 kr"},
        {"value":"200k_500k","label":"200 000–500 000 kr"},
        {"value":"500k_1m","label":"500 000–1 000 000 kr"},
        {"value":"1m_plus","label":"1 miljon och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Inget bygglov ännu","severity":"high","description":"Om bygglov ej är ansökt (och projektet inte är Attefall/friggebod) kan projektet inte starta. Svårt att lämna bindande offert innan beslut."},
    {"label":"Attefall för stort","severity":"high","description":"Attefallshus får inte överstiga 30 kvm. Om storlek > 30 kvm krävs vanligt bygglov."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Allmän renovering',
  'bygg',
  'allman',
  'Mindre byggjobb: målning, golv, dörr, fönster, innerväggar.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"kategori","label":"Typ av jobb","type":"single_select","required":true,"options":[
        {"value":"malning_tapetser","label":"Målning eller tapetsering"},
        {"value":"golv","label":"Golv (nytt eller renovering)"},
        {"value":"dorr_fonster","label":"Dörrar eller fönster"},
        {"value":"innervaggar","label":"Innerväggar (bygga eller riva)"},
        {"value":"fasad","label":"Fasadarbete"},
        {"value":"annat","label":"Annat"}
      ]},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"storlek_kvm","label":"Ungefärlig yta (kvm)","type":"number","required":false},
      {"id":"photos","label":"Bilder","type":"file_upload","required":false},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"snart","label":"Snart (1 månad)"},
        {"value":"halvar","label":"Inom halvåret"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_20k","label":"Under 20 000 kr"},
        {"value":"20k_50k","label":"20 000–50 000 kr"},
        {"value":"50k_150k","label":"50 000–150 000 kr"},
        {"value":"150k_plus","label":"150 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

-- =========================================================================
-- VVS — 5 templates
-- =========================================================================

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Värmepumpsinstallation',
  'vvs',
  'varmepump',
  'Luft-luft, luft-vatten, bergvärme eller frånluftsvärmepump.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"fritidshus","label":"Fritidshus"}
      ]},
      {"id":"typ_pump","label":"Typ av värmepump","type":"single_select","required":true,"options":[
        {"value":"luft_luft","label":"Luft-luft"},
        {"value":"luft_vatten","label":"Luft-vatten"},
        {"value":"bergvarme","label":"Bergvärme"},
        {"value":"franluft","label":"Frånluft"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"nuvarande_system","label":"Nuvarande uppvärmning","type":"single_select","required":true,"options":[
        {"value":"elpanna","label":"Elpanna / direktverkande el"},
        {"value":"olja","label":"Oljepanna"},
        {"value":"pellets","label":"Pelletspanna"},
        {"value":"annan_varmepump","label":"Annan värmepump"},
        {"value":"fjarrvarme","label":"Fjärrvärme"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"uppvarmt_yta_kvm","label":"Uppvärmd yta (kvm)","type":"number","required":true},
      {"id":"photo_befintligt_system","label":"Bild på befintligt system","type":"file_upload","required":false},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"akut","label":"Akut (befintligt system trasigt)"},
        {"value":"snart","label":"Snart (1–3 månader)"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_50k","label":"Under 50 000 kr"},
        {"value":"50k_100k","label":"50 000–100 000 kr"},
        {"value":"100k_200k","label":"100 000–200 000 kr"},
        {"value":"200k_plus","label":"200 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"gront_avdrag","label":"Grönt avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Bytt från olja","severity":"low","description":"Om kunden byter från oljepanna kan bidrag finnas att söka — värt att nämna i offerten som mervärde."},
    {"label":"Akut byte","severity":"medium","description":"Akut tidsram (trasigt system) kräver snabb leveranstid — kontrollera lagerstatus innan offert."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Vattenskada / läckage',
  'vvs',
  'vattenskada',
  'Pågående eller nyligen uppstått vattenläckage eller vattenskada.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Beskriv skadan","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"narhet","label":"Hur bråttom är det?","type":"single_select","required":true,"options":[
        {"value":"akut_vattenlackage","label":"Akut — pågående läckage"},
        {"value":"torrlagt_men_skadat","label":"Torrlagt men skador finns"},
        {"value":"kontrollbehov","label":"Misstänker fel, behöver kontroll"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"plats","label":"Var är skadan?","type":"single_select","required":true,"options":[
        {"value":"badrum","label":"Badrum"},
        {"value":"kok","label":"Kök"},
        {"value":"kallare","label":"Källare"},
        {"value":"ovanbjalklag","label":"Ovanbjälklag / vind"},
        {"value":"annat","label":"Annat"}
      ]},
      {"id":"forsakring_anmald","label":"Försäkringsärende anmält?","type":"single_select","required":true,"options":[
        {"value":"ja","label":"Ja"},
        {"value":"nej","label":"Nej, inte än"},
        {"value":"ingen_forsakring","label":"Ingen hemförsäkring"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"photos","label":"Bilder på skadan","type":"file_upload","required":true},
      {"id":"contact_now","label":"Telefonnummer för snabb kontakt","type":"short_text","required":true},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Akut läckage","severity":"high","description":"Vid pågående läckage — ring kunden omedelbart och hänvisa till vattenavstängning innan besök."},
    {"label":"Ej försäkringsanmält","severity":"medium","description":"Om försäkring inte är anmäld — uppmana kunden att kontakta försäkringsbolaget först innan åtgärd (annars risk att ersättning uteblir)."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'VVS i kök',
  'vvs',
  'kok',
  'Vatten- och avloppsanslutningar för köksrenovering.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"omfattning","label":"Omfattning","type":"single_select","required":true,"options":[
        {"value":"enkelt_utbyte","label":"Enkelt utbyte (kran, diskmaskin)"},
        {"value":"flytta_anslutning","label":"Flytta anslutning"},
        {"value":"helomdragning","label":"Helomdragning (nytt kök)"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"antal_anslutningar","label":"Antal anslutningar (diskbänk, diskmaskin, kran)","type":"number","required":false},
      {"id":"photo_befintligt","label":"Bild på befintlig installation","type":"file_upload","required":true},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"snart","label":"Snart (1 månad)"},
        {"value":"halvar","label":"Inom halvåret"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_10k","label":"Under 10 000 kr"},
        {"value":"10k_25k","label":"10 000–25 000 kr"},
        {"value":"25k_plus","label":"25 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Flytta anslutning i BRF","severity":"medium","description":"Förflyttning av vattenanslutningar i bostadsrätt kräver styrelsens godkännande."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'VVS i badrum',
  'vvs',
  'badrum',
  'Vatten- och avloppsarbeten för badrumsrenovering.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"omfattning","label":"Omfattning","type":"single_select","required":true,"options":[
        {"value":"enkelt_utbyte","label":"Enkelt utbyte (kran, wc, handfat)"},
        {"value":"flytta_anslutning","label":"Flytta anslutning"},
        {"value":"helomdragning","label":"Helomdragning (nytt badrum)"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"photo_befintligt","label":"Bild på befintlig installation","type":"file_upload","required":true},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"snart","label":"Snart (1 månad)"},
        {"value":"halvar","label":"Inom halvåret"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_15k","label":"Under 15 000 kr"},
        {"value":"15k_40k","label":"15 000–40 000 kr"},
        {"value":"40k_plus","label":"40 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[
    {"label":"Helomdragning i BRF","severity":"medium","description":"Helomdragning av VVS i bostadsrätt kräver styrelsens godkännande och samordning med våtrumsintyg."}
  ]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Allmän VVS',
  'vvs',
  'allman',
  'Mindre VVS-jobb: läckage, byte av kran, underhåll.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Kort om jobbet","type":"long_text","required":true},
      {"id":"kategori","label":"Typ av jobb","type":"single_select","required":true,"options":[
        {"value":"laeckage","label":"Läckage eller dropp"},
        {"value":"installation","label":"Installation (kran, tvättmaskin, wc)"},
        {"value":"underhall","label":"Underhåll (spolning, rensning)"},
        {"value":"varmesystem","label":"Värmesystem (radiator, golvvärme)"},
        {"value":"annat","label":"Annat"}
      ]},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"}
      ]},
      {"id":"photos","label":"Bild (om möjligt)","type":"file_upload","required":false},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"akut","label":"Akut"},
        {"value":"snart","label":"Snart (1–2 veckor)"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_5k","label":"Under 5 000 kr"},
        {"value":"5k_15k","label":"5 000–15 000 kr"},
        {"value":"15k_plus","label":"15 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;

-- =========================================================================
-- GENERIC — 1 template
-- =========================================================================

INSERT INTO public.form_templates (name, trade, sub_type, description, form_schema, red_flag_rules)
VALUES (
  'Allmän förfrågan',
  'general',
  'allman',
  'När ingen specifik mall passar. Fångar grundläggande information.',
  $json${
    "fields": [
      {"id":"job_desc","label":"Beskriv jobbet","type":"long_text","required":true},
      {"id":"typ_jobb","label":"Vilken typ av jobb?","type":"single_select","required":true,"options":[
        {"value":"el","label":"El"},
        {"value":"bygg","label":"Bygg / renovering"},
        {"value":"vvs","label":"VVS"},
        {"value":"mark","label":"Mark / trädgård"},
        {"value":"malning","label":"Målning"},
        {"value":"annat","label":"Annat"}
      ]},
      {"id":"property_type","label":"Fastighetstyp","type":"single_select","required":true,"options":[
        {"value":"villa","label":"Villa"},
        {"value":"radhus","label":"Radhus"},
        {"value":"brf","label":"Lägenhet i bostadsrättsförening"},
        {"value":"hyresratt","label":"Hyresrätt"},
        {"value":"kommersiell","label":"Kommersiell / annat"}
      ]},
      {"id":"photos","label":"Bilder (om möjligt)","type":"file_upload","required":false},
      {"id":"timeframe","label":"Tidsram","type":"single_select","required":true,"options":[
        {"value":"akut","label":"Akut"},
        {"value":"snart","label":"Snart (1 månad)"},
        {"value":"halvar","label":"Inom halvåret"},
        {"value":"flexibel","label":"Flexibel"}
      ]},
      {"id":"budget","label":"Ungefärlig budget","type":"single_select","required":true,"options":[
        {"value":"under_10k","label":"Under 10 000 kr"},
        {"value":"10k_50k","label":"10 000–50 000 kr"},
        {"value":"50k_200k","label":"50 000–200 000 kr"},
        {"value":"200k_plus","label":"200 000 kr och uppåt"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"rot","label":"ROT-avdrag","type":"single_select","required":false,"options":[
        {"value":"ja","label":"Ja, jag uppfyller kraven"},
        {"value":"nej","label":"Nej"},
        {"value":"vet_ej","label":"Vet ej"}
      ]},
      {"id":"address","label":"Gatuadress","type":"short_text","required":true}
    ]
  }$json$::jsonb,
  $json$[]$json$::jsonb
) ON CONFLICT (trade, sub_type) DO NOTHING;
