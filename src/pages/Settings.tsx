import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { company, updateCompany } = useCompany();

  const [name, setName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bankgiro, setBankgiro] = useState('');
  const [defaultVat, setDefaultVat] = useState(25);
  const [defaultValidityDays, setDefaultValidityDays] = useState(30);
  const [emailTemplate, setEmailTemplate] = useState(
    'Hej {customer_name},\n\nHär är din offert via länken nedan.\n\nVänliga hälsningar,\n{company_name}'
  );

  useEffect(() => {
    if (company) {
      setName(company.name);
      setOrgNumber(company.org_number || '');
      setAddress(company.address || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setBankgiro(company.bankgiro || '');
      setDefaultVat(company.default_vat);
      setDefaultValidityDays(company.default_validity_days);
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        name,
        org_number: orgNumber,
        address,
        phone,
        email,
        bankgiro,
        default_vat: defaultVat,
        default_validity_days: defaultValidityDays,
      });
      toast.success('Inställningar sparade');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte spara');
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold">Inställningar</h1>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Företagsinformation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Företagsnamn</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Organisationsnummer</Label>
              <Input value={orgNumber} onChange={(e) => setOrgNumber(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Adress</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefon</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>E-post</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Bankgiro</Label>
              <Input value={bankgiro} onChange={(e) => setBankgiro(e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Standard för offerter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Standardmoms (%)</Label>
                <Input type="number" value={defaultVat} onChange={(e) => setDefaultVat(parseInt(e.target.value) || 25)} className="mt-1" />
              </div>
              <div>
                <Label>Giltighet (dagar)</Label>
                <Input type="number" value={defaultValidityDays} onChange={(e) => setDefaultValidityDays(parseInt(e.target.value) || 30)} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">E-postmall</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)} rows={5} className="font-mono text-sm" />
            <p className="mt-2 text-xs text-muted-foreground">
              Variabler: {'{customer_name}'}, {'{company_name}'}, {'{quote_number}'}, {'{quote_link}'}
            </p>
          </CardContent>
        </Card>

        <Button className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={updateCompany.isPending}>
          <Save className="h-4 w-4" /> Spara inställningar
        </Button>
      </div>
    </div>
  );
}
