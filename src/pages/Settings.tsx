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
    'Hi {customer_name},\n\nPlease find your quote attached via the link below.\n\nBest regards,\n{company_name}'
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
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold">Settings</h1>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Organisation Number</Label>
              <Input value={orgNumber} onChange={e => setOrgNumber(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Bankgiro</Label>
              <Input value={bankgiro} onChange={e => setBankgiro(e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quote Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Default VAT (%)</Label>
                <Input type="number" value={defaultVat} onChange={e => setDefaultVat(parseInt(e.target.value) || 25)} className="mt-1" />
              </div>
              <div>
                <Label>Validity (days)</Label>
                <Input type="number" value={defaultValidityDays} onChange={e => setDefaultValidityDays(parseInt(e.target.value) || 30)} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Email Template</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)} rows={5} className="font-mono text-sm" />
            <p className="mt-2 text-xs text-muted-foreground">
              Variables: {'{customer_name}'}, {'{company_name}'}, {'{quote_number}'}, {'{quote_link}'}
            </p>
          </CardContent>
        </Card>

        <Button className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={updateCompany.isPending}>
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
