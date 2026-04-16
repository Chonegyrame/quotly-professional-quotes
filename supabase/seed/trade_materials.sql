-- Global trade materials seed
-- Run once via Supabase Dashboard → SQL Editor → Run
-- Expand this list with data from industry contacts via the Supabase table editor

INSERT INTO public.trade_materials (name, category, unit, unit_price, purchase_price, markup_percent) VALUES

-- ============================================================
-- VVS
-- ============================================================
('Kopparrör 15mm', 'vvs', 'm', 95, 48, 98),
('Kopparrör 22mm', 'vvs', 'm', 145, 72, 101),
('Kopparrör 28mm', 'vvs', 'm', 210, 105, 100),
('PEX-rör 16x2mm', 'vvs', 'm', 55, 28, 96),
('PEX-rör 20x2mm', 'vvs', 'm', 75, 38, 97),
('Avloppsrör PVC 50mm', 'vvs', 'm', 85, 42, 102),
('Avloppsrör PVC 110mm', 'vvs', 'm', 165, 82, 101),
('Kulventil 15mm', 'vvs', 'st', 195, 89, 119),
('Kulventil 22mm', 'vvs', 'st', 285, 130, 119),
('Koppling 15mm', 'vvs', 'st', 55, 24, 129),
('Koppling 22mm', 'vvs', 'st', 85, 38, 124),
('T-koppling 15mm', 'vvs', 'st', 75, 32, 134),
('Radiator 600x600mm', 'vvs', 'st', 1450, 750, 93),
('Radiator 600x1000mm', 'vvs', 'st', 2200, 1100, 100),
('Termostatventil', 'vvs', 'st', 395, 189, 109),
('Golvbrunn rostfri 110mm', 'vvs', 'st', 850, 420, 102),
('Vattenlås 32mm', 'vvs', 'st', 195, 89, 119),
('Blandare tvättställ engreppsblandare', 'vvs', 'st', 1250, 620, 102),
('Blandare dusch engreppsblandare', 'vvs', 'st', 1650, 820, 101),
('Tätskikt badrum (membran + tejp)', 'vvs', 'm2', 320, 155, 106),
('Expansionskärl 18L', 'vvs', 'st', 650, 320, 103),
('Säkerhetsventil 3 bar', 'vvs', 'st', 285, 138, 107),
('Cirkulationspump', 'vvs', 'st', 2800, 1400, 100),
('Varmvattenberedare 150L', 'vvs', 'st', 8500, 4200, 102),

-- ============================================================
-- EL
-- ============================================================
('Installationskabel 3G1,5mm2', 'el', 'm', 22, 11, 100),
('Installationskabel 3G2,5mm2', 'el', 'm', 32, 16, 100),
('Installationskabel 5G2,5mm2', 'el', 'm', 48, 24, 100),
('Installationskabel 5G6mm2', 'el', 'm', 95, 47, 102),
('Elrör FRZ 16mm', 'el', 'm', 18, 8, 125),
('Elrör FRZ 20mm', 'el', 'm', 24, 11, 118),
('Vägguttag 1-vägs', 'el', 'st', 95, 42, 126),
('Vägguttag 2-vägs', 'el', 'st', 145, 65, 123),
('Strömbrytare enkel', 'el', 'st', 85, 38, 124),
('Strömbrytare dubbel', 'el', 'st', 145, 65, 123),
('Elcentral 16-vägs', 'el', 'st', 2800, 1380, 103),
('Jordfelsbrytare 25A 30mA', 'el', 'st', 650, 320, 103),
('Säkringsautomat 16A', 'el', 'st', 185, 88, 110),
('Säkringsautomat 20A', 'el', 'st', 195, 92, 112),
('LED-downlight 7W', 'el', 'st', 185, 88, 110),
('LED panel 60x60cm 40W', 'el', 'st', 395, 195, 103),
('Kabelkanal 40x25mm', 'el', 'm', 45, 20, 125),
('Dosa infälld rund', 'el', 'st', 25, 10, 150),
('Dosa utanpåliggande', 'el', 'st', 35, 15, 133),
('Varmvattenberedare anslutningssats', 'el', 'st', 650, 320, 103),
('Laddbox elbil 11kW', 'el', 'st', 8500, 4200, 102),
('Elmätare 3-fas', 'el', 'st', 1200, 590, 103),

-- ============================================================
-- BYGG
-- ============================================================
('Konstruktionsvirke 45x95mm (regel)', 'bygg', 'm', 42, 21, 100),
('Konstruktionsvirke 45x120mm', 'bygg', 'm', 58, 29, 100),
('Konstruktionsvirke 45x145mm', 'bygg', 'm', 72, 36, 100),
('Gipsskiva 13mm standard', 'bygg', 'm2', 85, 42, 102),
('Gipsskiva 13mm brandskydd', 'bygg', 'm2', 115, 57, 102),
('Gipsskiva 12,5mm våtrum', 'bygg', 'm2', 145, 72, 101),
('Stenull isolering 95mm', 'bygg', 'm2', 145, 72, 101),
('Stenull isolering 145mm', 'bygg', 'm2', 195, 97, 101),
('Stenull isolering 200mm', 'bygg', 'm2', 265, 132, 101),
('OSB-skiva 18mm', 'bygg', 'm2', 195, 97, 101),
('Plywood 12mm', 'bygg', 'm2', 245, 122, 101),
('Spikplåt 47x47mm', 'bygg', 'st', 8, 3, 167),
('Skruv 4,2x75mm (fp 200st)', 'bygg', 'fp', 95, 42, 126),
('Betong C25/30 färdigblandad', 'bygg', 'm3', 1850, 920, 101),
('Armeringsjärn 12mm', 'bygg', 'm', 38, 18, 111),
('Armeringsnät 150x150mm', 'bygg', 'm2', 85, 42, 102),
('Murbruk 25kg säck', 'bygg', 'säck', 145, 72, 101),
('Puts kalkcement 25kg', 'bygg', 'säck', 165, 82, 101),
('Takpannor betong (10 st/m2)', 'bygg', 'm2', 385, 190, 103),
('Underlagstak 145g', 'bygg', 'm2', 45, 21, 114),
('Läkt 25x38mm', 'bygg', 'm', 18, 8, 125),
('Ströläkt 45x70mm', 'bygg', 'm', 28, 13, 115),
('Takryggslist', 'bygg', 'm', 145, 72, 101),
('Hängränna PVC 125mm', 'bygg', 'm', 95, 47, 102),
('Stupränna PVC 75mm', 'bygg', 'm', 75, 37, 103),
('Fönster 3-glas 100x120cm', 'bygg', 'st', 4500, 2200, 105),
('Ytterdörr standard 90x200cm', 'bygg', 'st', 8500, 4200, 102),
('Innerdörr 9x21 vit', 'bygg', 'st', 1850, 920, 101),
('Karm+foder innerdörr', 'bygg', 'st', 850, 420, 102),
('Kakel 200x600mm (m2)', 'bygg', 'm2', 385, 190, 103),
('Klinker 600x600mm (m2)', 'bygg', 'm2', 495, 245, 102),
('Kakellim C2 25kg', 'bygg', 'säck', 195, 97, 101),
('Fog epoxy grå 2kg', 'bygg', 'kg', 165, 82, 101),

-- ============================================================
-- GENERAL (cross-trade)
-- ============================================================
('Silikon neutral transparent', 'general', 'st', 95, 42, 126),
('Silikon vit', 'general', 'st', 85, 38, 124),
('Expanderskum 750ml', 'general', 'st', 125, 55, 127),
('Tejp armerad 50mm', 'general', 'rulle', 75, 32, 134),
('Skyddsmatta PE 3mm', 'general', 'm2', 35, 15, 133),
('Byggfolie 0,2mm', 'general', 'm2', 12, 5, 140),
('Rengöringsmedel avfettning', 'general', 'st', 95, 42, 126);
