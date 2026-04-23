import { useEffect, useState } from 'react';
import { Copy, Check, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCompany } from '@/hooks/useCompany';
import {
  useCompanyBusinessProfile,
  PrimaryTrade,
} from '@/hooks/useCompanyBusinessProfile';
import { MapServiceArea, MapServiceAreaValue } from '@/components/MapServiceArea';

const TRADES: { value: PrimaryTrade; label: string }[] = [
  { value: 'bygg', label: 'Bygg' },
  { value: 'el', label: 'El' },
  { value: 'vvs', label: 'VVS' },
  { value: 'general', label: 'Allmänt' },
];

const splitList = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function BusinessProfileSection() {
  const { company } = useCompany();
  const { profile, isLoading, upsertProfile } = useCompanyBusinessProfile();

  const [primaryTrade, setPrimaryTrade] = useState<PrimaryTrade | ''>('');
  const [secondaryTrades, setSecondaryTrades] = useState<string[]>([]);
  const [geo, setGeo] = useState<MapServiceAreaValue>({
    address: '',
    lat: null,
    lng: null,
    radiusKm: 30,
  });
  const [minTicketSek, setMinTicketSek] = useState('');
  const [specialtiesRaw, setSpecialtiesRaw] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) {
      setPrimaryTrade(profile.primary_trade);
      setSecondaryTrades(profile.secondary_trades ?? []);
      setGeo({
        address: profile.base_address ?? '',
        lat: profile.base_lat,
        lng: profile.base_lng,
        radiusKm: profile.service_radius_km ?? 30,
      });
      setMinTicketSek(profile.min_ticket_sek?.toString() ?? '');
      setSpecialtiesRaw((profile.specialties ?? []).join(', '));
    }
  }, [profile]);

  const toggleSecondary = (value: string, checked: boolean) => {
    setSecondaryTrades((prev) =>
      checked ? Array.from(new Set([...prev, value])) : prev.filter((v) => v !== value),
    );
  };

  const handleSave = async () => {
    if (!primaryTrade) {
      toast.error('Välj huvudbransch');
      return;
    }
    try {
      await upsertProfile.mutateAsync({
        primary_trade: primaryTrade as PrimaryTrade,
        secondary_trades: secondaryTrades.filter((t) => t !== primaryTrade),
        base_address: geo.address || null,
        base_lat: geo.lat,
        base_lng: geo.lng,
        service_radius_km: geo.lat != null && geo.lng != null ? geo.radiusKm : null,
        min_ticket_sek: minTicketSek ? parseInt(minTicketSek, 10) : null,
        specialties: splitList(specialtiesRaw),
      });
      toast.success('Företagsprofil sparad');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte spara profil');
    }
  };

  const publicUrl = company?.form_slug
    ? `${window.location.origin}/offert/${company.form_slug}`
    : null;

  const handleCopy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Företagsprofil</CardTitle>
        <p className="text-sm text-muted-foreground">
          Styr vilka förfrågningar som passar er. Används av AI:n för att filtrera inkommande
          leads.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {publicUrl && (
          <div>
            <Label>Din publika förfrågningslänk</Label>
            <div className="mt-1 flex gap-2">
              <Input value={publicUrl} readOnly className="font-mono text-sm" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Formuläret är inte aktivt än. Tillgängliggörs när lead-flödet lanseras.
            </p>
          </div>
        )}

        <div>
          <Label>Huvudbransch *</Label>
          <Select
            value={primaryTrade}
            onValueChange={(v) => setPrimaryTrade(v as PrimaryTrade)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Välj bransch" />
            </SelectTrigger>
            <SelectContent>
              {TRADES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Andra branscher</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TRADES.filter((t) => t.value !== primaryTrade).map((t) => (
              <label
                key={t.value}
                className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer"
              >
                <Checkbox
                  checked={secondaryTrades.includes(t.value)}
                  onCheckedChange={(c) => toggleSecondary(t.value, !!c)}
                />
                <span className="text-sm">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>
            Specialiteter{' '}
            <span className="text-xs text-muted-foreground font-normal">(kommaseparerat)</span>
          </Label>
          <Input
            value={specialtiesRaw}
            onChange={(e) => setSpecialtiesRaw(e.target.value)}
            placeholder="laddbox, solceller, äldre fastigheter"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Serviceområde</Label>
          <div className="mt-2">
            <MapServiceArea value={geo} onChange={setGeo} />
          </div>
        </div>

        <div>
          <Label>Minsta jobb (kr)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={minTicketSek}
            onChange={(e) => setMinTicketSek(e.target.value)}
            placeholder="5000"
            className="mt-1"
          />
        </div>

        <Button
          type="button"
          className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={handleSave}
          disabled={upsertProfile.isPending || isLoading}
        >
          <Save className="h-4 w-4" />
          {upsertProfile.isPending ? 'Sparar...' : 'Spara företagsprofil'}
        </Button>
      </CardContent>
    </Card>
  );
}
