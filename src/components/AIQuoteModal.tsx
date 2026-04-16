import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, X, FileText, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

type Trade = 'bygg' | 'el' | 'vvs' | 'general';

const TRADES: { value: Trade; label: string }[] = [
  { value: 'bygg', label: 'Bygg' },
  { value: 'el', label: 'El' },
  { value: 'vvs', label: 'VVS' },
  { value: 'general', label: 'Allmänt' },
];

interface AIQuoteModalProps {
  open: boolean;
  onClose: () => void;
}

// Compress and resize an image file to JPEG, max 800px wide, quality 0.75
// Returns base64 string without the data URI prefix
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxWidth = 800;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      // Strip "data:image/jpeg;base64," prefix
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function AIQuoteModal({ open, onClose }: AIQuoteModalProps) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [trade, setTrade] = useState<Trade>('bygg');
  const [generating, setGenerating] = useState(false);

  const resetState = () => {
    setText('');
    setImageFile(null);
    setImagePreview(null);
    setTrade('bygg');
    setTab('text');
    setGenerating(false);
  };

  const handleClose = () => {
    if (generating) return;
    resetState();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Välj en bildfil (JPG, PNG, etc.)');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleGenerate = async () => {
    if (!company) {
      toast.error('Inget företag hittat');
      return;
    }

    if (tab === 'text' && !text.trim()) {
      toast.error('Ange kundens förfrågan');
      return;
    }
    if (tab === 'image' && !imageFile) {
      toast.error('Välj en bild att ladda upp');
      return;
    }

    setGenerating(true);
    try {
      let base64Image: string | undefined;
      if (tab === 'image' && imageFile) {
        base64Image = await compressImage(imageFile);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke('generate-quote', {
        body: {
          text: tab === 'text' ? text.trim() : undefined,
          image: base64Image,
          company_id: company.id,
          trade,
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (error) {
        // Handle rate limit
        if (error.context?.status === 429) {
          toast.error('Daglig gräns nådd (20 genereringar per dag)');
          return;
        }
        throw new Error(error.message || 'Okänt fel');
      }

      if (!data?.items || data.items.length === 0) {
        toast.error('AI kunde inte tolka förfrågan — försök med mer detaljer');
        return;
      }

      toast.success('Offert genererad!');
      resetState();
      onClose();
      navigate('/quotes/new', { state: { aiData: data, trade } });
    } catch (err: any) {
      toast.error(err.message || 'Något gick fel, försök igen');
    } finally {
      setGenerating(false);
    }
  };

  const canSubmit = tab === 'text' ? text.trim().length > 0 : imageFile !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Skapa offert med AI</DialogTitle>
          <DialogDescription>
            Klistra in kundens förfrågan eller ladda upp en skärmbild — AI genererar ett offertförslag åt dig.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab toggle */}
          <div className="flex rounded-lg border p-1 gap-1">
            <button
              onClick={() => setTab('text')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'text'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Skriv text
            </button>
            <button
              onClick={() => setTab('image')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'image'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="h-4 w-4" />
              Ladda upp bild
            </button>
          </div>

          {/* Text input */}
          {tab === 'text' && (
            <div>
              <Label htmlFor="customer-request">Kundens förfrågan</Label>
              <textarea
                id="customer-request"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="T.ex. &quot;Hej, vi behöver byta ut radiatorn i sovrummet och dra om rören. Vi bor på Storgatan 12 i Stockholm.&quot;"
                rows={6}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          )}

          {/* Image upload */}
          {tab === 'image' && (
            <div>
              <Label>Skärmbild eller foto</Label>
              {imagePreview ? (
                <div className="relative mt-1">
                  <img
                    src={imagePreview}
                    alt="Förhandsvisning"
                    className="max-h-48 w-full rounded-md border object-contain bg-muted"
                  />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 rounded-full bg-background border p-1 hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
                >
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Dra och släpp en bild här</p>
                    <p className="text-xs text-muted-foreground">eller klicka för att välja fil</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Trade selector */}
          <div>
            <Label>Typ av arbete</Label>
            <div className="mt-1 flex gap-2 flex-wrap">
              {TRADES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTrade(t.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                    trade === t.value
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-background text-muted-foreground border-input hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} disabled={generating} className="flex-1">
              Avbryt
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !canSubmit}
              className="flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyserar förfrågan...
                </>
              ) : (
                'Generera offert'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
