import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/hooks/useCompany';
import { useIncomingRequests, IncomingRequest } from '@/hooks/useIncomingRequests';

interface Props {
  open: boolean;
  onClose: () => void;
  request: IncomingRequest;
}

const FALLBACK_TEMPLATE =
  'Hej {customer_name},\n\nTack för din förfrågan. Tyvärr har vi inte möjlighet att ta oss an detta uppdrag.\n\nVänliga hälsningar,\n{company_name}';

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function DeclineRequestDialog({ open, onClose, request }: Props) {
  const { company } = useCompany();
  const { declineRequest } = useIncomingRequests();
  const [message, setMessage] = useState('');

  // Reset message to interpolated template each time the dialog opens.
  useEffect(() => {
    if (!open || !company) return;
    const template = company.decline_template || FALLBACK_TEMPLATE;
    setMessage(
      interpolate(template, {
        customer_name: request.submitter_name ?? '',
        company_name: company.name ?? '',
      }),
    );
  }, [open, company, request.submitter_name]);

  const recipient = request.submitter_email?.trim() ?? '';
  const canSend = !!recipient && message.trim().length > 0 && !declineRequest.isPending;

  function handleSend() {
    if (!canSend) return;
    declineRequest.mutate(
      { requestId: request.id, recipient, message: message.trim() },
      {
        onSuccess: () => {
          toast.success('Avböjande skickat');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Kunde inte skicka avböjande');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Avböj kund</DialogTitle>
          <DialogDescription>
            {recipient
              ? `Skickas till ${recipient}. Du kan justera texten innan du skickar.`
              : 'Kunden har inte angett en e-postadress.'}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={10}
          className="font-mono text-sm"
          disabled={!recipient}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={declineRequest.isPending}>
            Avbryt
          </Button>
          <Button onClick={handleSend} disabled={!canSend} className="gap-1.5">
            {declineRequest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Skicka avböjande
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
