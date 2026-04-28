import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Upload, ImageIcon, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { TeamSection } from '@/components/TeamSection';
import { BusinessProfileSection } from '@/components/BusinessProfileSection';
import { FormularLanding } from '@/components/FormularLanding';
import { FormularTradeView } from '@/components/FormularTradeView';
import { FormularEditorModal } from '@/components/FormularEditorModal';
import { FormularPreviewDialog } from '@/components/FormularPreviewDialog';
import { FormTrade, FormTemplateRow } from '@/hooks/useFormTemplates';

function compressLogoImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxH = 300;
      const maxW = 600;
      const scaleH = img.height > maxH ? maxH / img.height : 1;
      const scaleW = img.width > maxW ? maxW / img.width : 1;
      const scale = Math.min(scaleH, scaleW);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        0.88,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function Settings() {
  const navigate = useNavigate();
  const { company, updateCompany } = useCompany();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Top-level view: 'settings' (current cards) or 'formular' (forms manager).
  const [view, setView] = useState<'settings' | 'formular'>('settings');
  // When inside the formular view, which trade is drilled into (null = landing).
  const [selectedTrade, setSelectedTrade] = useState<FormTrade | null>(null);

  // Modal state for the formulär editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorTemplate, setEditorTemplate] = useState<FormTemplateRow | undefined>();
  const [editorInitialTrade, setEditorInitialTrade] = useState<FormTrade | undefined>();

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplateRow | null>(null);

  function openPreview(template: FormTemplateRow) {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }

  function handleSwitchView(next: 'settings' | 'formular') {
    setView(next);
    if (next !== 'formular') setSelectedTrade(null);
  }

  function openCreate(trade: FormTrade) {
    setEditorMode('create');
    setEditorTemplate(undefined);
    setEditorInitialTrade(trade);
    setEditorOpen(true);
  }

  function openEdit(template: FormTemplateRow) {
    setEditorMode('edit');
    setEditorTemplate(template);
    setEditorInitialTrade(undefined);
    setEditorOpen(true);
  }

  function notImplemented(_template?: FormTemplateRow) {
    toast.info('Kommer snart');
  }

  async function handleToggleActive(template: FormTemplateRow) {
    if (!company) return;
    try {
      if (template.source === 'custom') {
        const { error } = await supabase
          .from('company_form_templates')
          .update({ is_active: !template.is_active })
          .eq('id', template.id);
        if (error) throw error;
      } else {
        // Lazy-copy a global into a custom row, set inactive on this firm's copy.
        // (Standard library is never modified.)
        const { error } = await supabase.from('company_form_templates').insert({
          company_id: company.id,
          based_on_template_id: template.id,
          name: template.name,
          description: template.description,
          trade: template.trade,
          sub_type: template.sub_type,
          form_schema: template.form_schema,
          red_flag_rules: template.red_flag_rules ?? [],
          trigger_keywords: template.trigger_keywords ?? [],
          is_active: false,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['form-templates', company.id] });
      toast.success(template.is_active ? 'Formulär inaktiverat' : 'Formulär aktiverat');
    } catch (err: any) {
      toast.error(err?.message || 'Kunde inte uppdatera status');
    }
  }

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
      setLogoUrl(company.logo_url || '');
      setEmailTemplate(company.email_template || 'Hej {customer_name},\n\nHär är din offert via länken nedan.\n\nVänliga hälsningar,\n{company_name}');
    }
  }, [company]);

  // Paste support — Ctrl+V anywhere on the page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleLogoUpload(file);
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [company]);

  const handleLogoUpload = async (file: File) => {
    if (!company) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Välj en bildfil (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Filen är för stor (max 10MB)');
      return;
    }

    setUploadingLogo(true);
    try {
      const compressed = await compressLogoImage(file);
      const path = `${company.id}/logo.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(path, compressed, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(path);

      await updateCompany.mutateAsync({
        id: company.id,
        logo_url: publicUrl,
      });

      // Add cache-busting only for the on-screen preview so the new image loads immediately
      setLogoUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success('Logotyp uppladdad!');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte ladda upp logotyp');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
    e.target.value = '';
  };

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
        email_template: emailTemplate,
      });
      toast.success('Inställningar sparade');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte spara');
    }
  };

  // Page header logic:
  //   - settings view → arrow goes to dashboard, heading "Inställningar", toggle shows "Formulär"
  //   - formular view + no trade selected → arrow goes back to settings view, heading "Formulär", toggle shows "Inställningar"
  //   - formular view + trade selected → no page header at all; the trade view supplies its own
  const showPageHeader = !(view === 'formular' && selectedTrade);
  const handleHeaderBack = () => {
    if (view === 'formular') handleSwitchView('settings');
    else navigate('/');
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto animate-fade-in">
      {showPageHeader && (
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleHeaderBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-heading font-bold">
            {view === 'formular' ? 'Formulär' : 'Inställningar'}
          </h1>
          {view === 'settings' && (
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSwitchView('formular')}
              >
                Formulär
              </Button>
            </div>
          )}
          {view === 'formular' && (
            <div className="ml-auto">
              <Button
                size="sm"
                onClick={() => openCreate('general')}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" />
                Skapa formulär
              </Button>
            </div>
          )}
        </div>
      )}

      {view === 'formular' ? (
        selectedTrade ? (
          <FormularTradeView
            trade={selectedTrade}
            onBack={() => setSelectedTrade(null)}
            onCreate={openCreate}
            onEdit={openEdit}
            onPreview={openPreview}
            onToggleActive={handleToggleActive}
            onAddKeyword={openEdit}
          />
        ) : (
          <FormularLanding
            onSelectTrade={(t) => setSelectedTrade(t)}
            onPreview={openPreview}
          />
        )
      ) : (
      <div className="space-y-4">

        {/* Logo upload */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Företagslogotyp</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="h-20 w-36 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logotyp"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Upload className="h-4 w-4" />}
                  {uploadingLogo ? 'Laddar upp...' : 'Välj bild'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG eller PNG, max 10MB.<br />
                  Du kan också klistra in en bild med <kbd className="px-1 py-0.5 rounded bg-muted text-xs font-mono">Ctrl+V</kbd>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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

        <BusinessProfileSection />

        <TeamSection />
      </div>
      )}

      <FormularEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        mode={editorMode}
        template={editorTemplate}
        initialTrade={editorInitialTrade}
      />

      <FormularPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={previewTemplate}
      />
    </div>
  );
}
