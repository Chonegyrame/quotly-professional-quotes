import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface CustomerViewPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
}

export function CustomerViewPreviewDialog({ open, onOpenChange, quoteId }: CustomerViewPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-3 border-b shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Förhandsgranskning av kundvyn
          </DialogTitle>
          <DialogDescription className="text-xs">
            Så här ser offerten ut för kunden. Inga ändringar sparas.
          </DialogDescription>
        </DialogHeader>
        <iframe
          title="Kundvy förhandsgranskning"
          src={`/q/${quoteId}?preview=true`}
          className="w-full flex-1 border-0 bg-white"
        />
      </DialogContent>
    </Dialog>
  );
}
