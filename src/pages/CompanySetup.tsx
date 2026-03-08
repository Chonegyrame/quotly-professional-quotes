import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export default function CompanySetup() {
  const navigate = useNavigate();
  const { createCompany } = useCompany();
  const [name, setName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCompany.mutateAsync({
        name,
        org_number: orgNumber,
        address,
        phone,
        email,
      });
      toast.success('Company profile created!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create company');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Set up your company</h1>
          <p className="text-sm text-muted-foreground mt-1">This info appears on your quotes.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Company Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" value={name} onChange={e => setName(e.target.value)} placeholder="Lindqvist El AB" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="orgNum">Organisation Number</Label>
                <Input id="orgNum" value={orgNumber} onChange={e => setOrgNumber(e.target.value)} placeholder="556789-0123" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="addr">Address</Label>
                <Input id="addr" value={address} onChange={e => setAddress(e.target.value)} placeholder="Storgatan 12, Stockholm" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ph">Phone</Label>
                  <Input id="ph" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08-123 45 67" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="em">Email</Label>
                  <Input id="em" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@company.se" className="mt-1" />
                </div>
              </div>
              <Button type="submit" disabled={!name.trim() || createCompany.isPending} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {createCompany.isPending ? 'Creating...' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
