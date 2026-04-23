import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompany } from '@/hooks/useCompany';
import {
  useCompanyBusinessProfile,
  PrimaryTrade,
} from '@/hooks/useCompanyBusinessProfile';
import { MapServiceArea, MapServiceAreaValue } from '@/components/MapServiceArea';
import { toast } from 'sonner';

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

export default function CompanySetup() {
  const navigate = useNavigate();
  const { createCompany } = useCompany();
  const { upsertProfile } = useCompanyBusinessProfile();

  const [name, setName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

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

  const [submitting, setSubmitting] = useState(false);

  const toggleSecondary = (value: string, checked: boolean) => {
    setSecondaryTrades((prev) =>
      checked ? Array.from(new Set([...prev, value])) : prev.filter((v) => v !== value),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryTrade) {
      toast.error('Välj bransch');
      return;
    }
    setSubmitting(true);
    try {
      const newCompany = await createCompany.mutateAsync({
        name,
        org_number: orgNumber,
        address,
        phone,
        email,
      });
      await upsertProfile.mutateAsync({
        companyId: newCompany.id,
        primary_trade: primaryTrade as PrimaryTrade,
        secondary_trades: secondaryTrades.filter((t) => t !== primaryTrade),
        base_address: geo.address || null,
        base_lat: geo.lat,
        base_lng: geo.lng,
        service_radius_km: geo.lat != null && geo.lng != null ? geo.radiusKm : null,
        min_ticket_sek: minTicketSek ? parseInt(minTicketSek, 10) : null,
        specialties: splitList(specialtiesRaw),
      });
      toast.success('Företagsprofil skapad!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte skapa företag');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-xl animate-fade-in py-8">
        <div className="text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Skapa din företagsprofil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vi använder den här informationen både på dina offerter och för att filtrera
            inkommande förfrågningar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Företagsinformation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Företagsnamn *</Label>
                <Input
                  id="companyName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Lindqvist El AB"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="orgNum">Organisationsnummer</Label>
                <Input
                  id="orgNum"
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  placeholder="556789-0123"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="addr">Adress</Label>
                <Input
                  id="addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Storgatan 12, Stockholm"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ph">Telefon</Label>
                  <Input
                    id="ph"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08-123 45 67"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="em">E-post</Label>
                  <Input
                    id="em"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@foretag.se"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bransch & specialiteter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="primaryTrade">Huvudbransch *</Label>
                <Select
                  value={primaryTrade}
                  onValueChange={(v) => setPrimaryTrade(v as PrimaryTrade)}
                >
                  <SelectTrigger id="primaryTrade" className="mt-1">
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
                <Label>Andra branscher vi jobbar i</Label>
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
                <Label htmlFor="specialties">
                  Specialiteter{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    (kommaseparerat, t.ex. laddbox, äldre fastigheter)
                  </span>
                </Label>
                <Input
                  id="specialties"
                  value={specialtiesRaw}
                  onChange={(e) => setSpecialtiesRaw(e.target.value)}
                  placeholder="laddbox, solceller, gruppcentralbyte"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Serviceområde</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MapServiceArea value={geo} onChange={setGeo} />
              <div>
                <Label htmlFor="minTicket">Minsta jobb (kr)</Label>
                <Input
                  id="minTicket"
                  type="number"
                  inputMode="numeric"
                  value={minTicketSek}
                  onChange={(e) => setMinTicketSek(e.target.value)}
                  placeholder="5000"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={!name.trim() || !primaryTrade || submitting}
            className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {submitting ? 'Skapar...' : 'Skapa profil'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
