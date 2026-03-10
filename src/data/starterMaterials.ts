export type StarterTrade = 'build' | 'electric' | 'vvs';

export type StarterMaterial = {
  name: string;
  unit: string;
};

export const starterTradeMeta: Record<
  StarterTrade,
  { label: string; subtitle: string }
> = {
  build: { label: 'Bygg', subtitle: 'Virke, skivor, isolering, betong' },
  electric: { label: 'El', subtitle: 'Kabel, rör, central, dosor' },
  vvs: { label: 'VVS', subtitle: 'Rör, ventiler, avlopp, kopplingar' },
};

export const starterMaterialsByTrade: Record<StarterTrade, StarterMaterial[]> = {
  build: [
    { name: 'Konstruktionsvirke 45x95mm (regel)', unit: 'm' },
    { name: 'Konstruktionsvirke 45x220mm (balk)', unit: 'm' },
    { name: 'Gipsskiva 13mm 1200x2400mm', unit: 'skiva' },
    { name: 'Stenull isolering 95mm', unit: 'm2' },
    { name: 'OSB-skiva 18mm 1220x2440mm', unit: 'skiva' },
    { name: 'Finbetong 25kg säck (plintar, mindre gjutningar)', unit: 'säck' },
    { name: 'Betong C25/30 färdigblandad', unit: 'm3' },
    { name: 'Armering B500B 10mm', unit: 'm' },
    { name: 'Ytterväggsskruv 4,2x75mm', unit: 'förpackning' },
    { name: 'Ångspärrsfolie 0,2mm', unit: 'm2' },
  ],
  electric: [
    { name: 'Installationskabel 3G1,5mm2', unit: 'm' },
    { name: 'Installationskabel 3G2,5mm2', unit: 'm' },
    { name: 'Elrör FRZ 16mm', unit: 'm' },
    { name: 'Elcentral 16-vägs', unit: 'styck' },
    { name: 'Jordfelsbrytare 25A/30mA', unit: 'styck' },
    { name: 'Automatsäkring 10A C-karaktär', unit: 'styck' },
    { name: 'Infälldosa rund 60mm', unit: 'styck' },
    { name: 'Kabelkanal 25x16mm', unit: 'm' },
    { name: 'Skarvdosa IP55', unit: 'styck' },
    { name: 'Vägguttag Schuko vit', unit: 'styck' },
  ],
  vvs: [
    { name: 'Kopparrör 15mm', unit: 'm' },
    { name: 'Kopparrör 22mm', unit: 'm' },
    { name: 'PEX-rör 16x2mm', unit: 'm' },
    { name: 'Kulventil 15mm', unit: 'styck' },
    { name: 'Golvbrunn rostfri 150x150mm', unit: 'styck' },
    { name: 'Avloppsrör PVC 110mm', unit: 'm' },
    { name: 'Radiatorventil termostatisk', unit: 'styck' },
    { name: 'Varmvattenberedare 200L', unit: 'styck' },
    { name: 'Tätskikt badrum flytspackel 10kg', unit: 'säck' },
    { name: 'Press-koppling T-stycke 15mm', unit: 'styck' },
  ],
};
