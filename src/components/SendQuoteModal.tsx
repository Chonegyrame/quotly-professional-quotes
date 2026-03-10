import { useEffect, useState } from 'react';
import { Mail, Phone, Send, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SendQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerEmail: string;
  quoteNumber: string;
  quoteId: string;
  total: string;
  validUntil: string;
  onSentSuccess?: () => Promise<void> | void;
}

function detectMethod(value: string): 'email' | 'phone' | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Email pattern
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  // Swedish phone: starts with 0 or +46, digits/spaces/dashes, 7+ digits
  const digits = trimmed.replace(/[\s\-\(\)]/g, '');
  if (/^(\+46|0)\d{7,}$/.test(digits)) return 'phone';
  return null;
}

function getErrorMessage(err: unknown): string {
  if (!err) return 'Kunde inte skicka offerten';

  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = String((err as { message?: unknown }).message ?? '');

    try {
      const parsed = JSON.parse(msg);
      if (typeof parsed?.error === 'string') return parsed.error;
      if (typeof parsed?.message === 'string') return parsed.message;
    } catch {
      // Keep original message if not JSON
    }

    return msg || 'Kunde inte skicka offerten';
  }

  return String(err);
}

export function SendQuoteModal({ open, onOpenChange, customerEmail, quoteNumber, quoteId, total, validUntil, onSentSuccess }: SendQuoteModalProps) {
  const [recipient, setRecipient] = useState(customerEmail);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setRecipient(customerEmail || '');
    setError('');
  }, [open, customerEmail]);

  const method = detectMethod(recipient);

  const handleSend = async () => {
    if (!method) {
      setError('Ange en giltig e-postadress eller telefonnummer (t.ex. 070-123 45 67)');
      return;
    }
    setError('');
    setSending(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-quote', {
        body: {
          quoteId,
          recipient: recipient.trim(),
          method: method === 'phone' ? 'sms' : 'email',
        },
      });

      if (fnError) {
        throw new Error(getErrorMessage(fnError));
      }

      if (data?.error) {
        throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      }

      if (onSentSuccess) {
        await onSentSuccess();
      }

      toast.success('Offerten har skickats!');
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Send error:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Skicka offert {quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Ange kundens e-postadress eller telefonnummer för att skicka offerten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="send-recipient" className="text-muted-foreground text-xs">
              E-post eller telefonnummer
            </Label>
            <div className="relative mt-1">
              <Input
                id="send-recipient"
                type="text"
                placeholder="anna@example.com eller 070-123 45 67"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setError('');
                }}
                autoFocus
              />
              {method && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {method === 'email' ? (
                    <Mail className="h-4 w-4 text-primary" />
                  ) : (
                    <Phone className="h-4 w-4 text-primary" />
                  )}
                </div>
              )}
            </div>
            {error && <p className="text-destructive text-xs mt-1">{error}</p>}
            {method && (
              <p className="text-muted-foreground text-xs mt-1">
                {method === 'email' ? 'Skickas via e-post' : 'Skickas via SMS'}
              </p>
            )}
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

          <Button
            className="w-full gap-2"
            onClick={handleSend}
            disabled={sending || !recipient.trim()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sending ? 'Skickar...' : 'Skicka'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


