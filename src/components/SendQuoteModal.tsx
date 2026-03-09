import { useState } from 'react';
import { Copy, Check, Mail, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SendQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerEmail: string;
  quoteNumber: string;
  quoteId: string;
  total: string;
  validUntil: string;
}

export function SendQuoteModal({ open, onOpenChange, customerEmail, quoteNumber, quoteId, total, validUntil }: SendQuoteModalProps) {
  const [copied, setCopied] = useState(false);
  const publicLink = `${window.location.origin}/q/${quoteId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast.success('Länk kopierad!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Skicka offert {quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Kopiera länken nedan och skicka den till kunden via e-post eller SMS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-muted-foreground text-xs">Kundens e-post</Label>
            <Input value={customerEmail} readOnly className="mt-1 bg-muted/50" />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Offertlänk</Label>
            <div className="flex gap-2 mt-1">
              <Input value={publicLink} readOnly className="bg-muted/50 text-sm" />
              <Button variant="outline" size="icon" className="shrink-0" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totalbelopp</span>
              <span className="font-medium">{total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Giltig till</span>
              <span className="font-medium">{validUntil}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1 gap-2" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Kopierad!' : 'Kopiera länk'}
            </Button>
            <a href={publicLink} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="icon">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
