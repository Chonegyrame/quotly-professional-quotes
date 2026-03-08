import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mockCompany } from '@/data/mockData';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(mockCompany);
  const [emailTemplate, setEmailTemplate] = useState(
    'Hi {customer_name},\n\nPlease find your quote attached via the link below.\n\nBest regards,\n{company_name}'
  );

  const updateField = (field: string, value: string | number) => {
    setCompany({ ...company, [field]: value });
  };

  const handleSave = () => {
    toast.success('Settings saved');
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
          <CardHeader>
            <CardTitle className="text-lg">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input value={company.name} onChange={e => updateField('name', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Organisation Number</Label>
              <Input value={company.orgNumber} onChange={e => updateField('orgNumber', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={company.address} onChange={e => updateField('address', e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={company.phone} onChange={e => updateField('phone', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={company.email} onChange={e => updateField('email', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Bankgiro</Label>
              <Input value={company.bankgiro} onChange={e => updateField('bankgiro', e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quote Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Default VAT (%)</Label>
                <Input type="number" value={company.defaultVat} onChange={e => updateField('defaultVat', parseInt(e.target.value) || 25)} className="mt-1" />
              </div>
              <div>
                <Label>Validity (days)</Label>
                <Input type="number" value={company.defaultValidityDays} onChange={e => updateField('defaultValidityDays', parseInt(e.target.value) || 30)} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Template</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={emailTemplate}
              onChange={e => setEmailTemplate(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Variables: {'{customer_name}'}, {'{company_name}'}, {'{quote_number}'}, {'{quote_link}'}
            </p>
          </CardContent>
        </Card>

        <Button className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave}>
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
