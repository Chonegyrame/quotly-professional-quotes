import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MoreHorizontal, Copy, Send, Archive, RotateCcw, Trash2, BookTemplate } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { useQuotes } from '@/hooks/useQuotes';
import { type Quote, getQuoteTotal, formatCurrency, formatDate, isReminderDue } from '@/data/mockData';
import { toast } from 'sonner';

interface Props {
  quote: Quote;
  isArchived?: boolean;
  onSendReminder?: (quote: Quote) => void;
}

export function QuoteCard({ quote, isArchived = false, onSendReminder }: Props) {
  const navigate = useNavigate();
  const { duplicateQuote, archiveQuote, restoreQuote, deleteQuote } = useQuotes();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const total = getQuoteTotal(quote.items);
  const reminderDue = isReminderDue(quote);

  // Skicka påminnelse only fits sent/opened quotes that haven't been accepted/declined.
  const canSendReminder = !isArchived && (quote.status === 'sent' || quote.status === 'opened');

  const handleArchive = async () => {
    try {
      await archiveQuote.mutateAsync({ quoteId: quote.id });
      toast.success('Offert arkiverad', {
        action: {
          label: 'Återställ',
          onClick: () => {
            restoreQuote.mutateAsync({ quoteId: quote.id })
              .then(() => toast.success('Offert återställd'))
              .catch((err) => toast.error(err.message || 'Kunde inte återställa'));
          },
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte arkivera');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreQuote.mutateAsync({ quoteId: quote.id });
      toast.success('Offert återställd');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte återställa');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteQuote.mutateAsync({ quoteId: quote.id });
      toast.success('Offert borttagen permanent');
      setConfirmDeleteOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte ta bort');
    }
  };

  // Guard so a fast double-click on Duplicera doesn't create two duplicates
  // (mutation.isPending is async-flipped via re-render).
  const duplicatingRef = useRef(false);
  const handleDuplicate = async () => {
    if (duplicatingRef.current) return;
    duplicatingRef.current = true;
    try {
      const newQuote = await duplicateQuote.mutateAsync({ quoteId: quote.id });
      toast.success('Offert duplicerad');
      navigate(`/quotes/${newQuote.id}/edit`);
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte duplicera');
    } finally {
      duplicatingRef.current = false;
    }
  };

  return (
    <>
      <Card
        onClick={() => navigate(`/quotes/${quote.id}`)}
        className="p-4 hover:shadow-md transition-shadow active:bg-secondary/50 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate mb-1">{quote.customerName}</div>
            <div className="text-xs text-muted-foreground">
              <span>{formatDate(quote.createdAt)}</span>
            </div>
          </div>
          {reminderDue && !isArchived && onSendReminder && (
            <div
              className="flex items-center gap-2 rounded border border-warning/30 bg-warning/10 px-3 py-1.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-warning text-xs font-medium whitespace-nowrap">
                Ingen respons efter 48h
              </span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs border-warning/40 text-warning hover:bg-warning/20 hover:text-warning"
                onClick={(e) => {
                  e.stopPropagation();
                  onSendReminder(quote);
                }}
              >
                <Send className="h-3.5 w-3.5" /> Skicka påminnelse
              </Button>
            </div>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="font-semibold text-sm">{formatCurrency(total)}</div>
              <StatusBadge status={quote.status} className="mt-1" />
            </div>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" /> Duplicera
              </DropdownMenuItem>
              {!isArchived && (
                <DropdownMenuItem onClick={() => navigate(`/templates/from-quote/${quote.id}`)}>
                  <BookTemplate className="h-4 w-4 mr-2" /> Spara som mall
                </DropdownMenuItem>
              )}
              {canSendReminder && onSendReminder && (
                <DropdownMenuItem onClick={() => onSendReminder(quote)}>
                  <Send className="h-4 w-4 mr-2" /> Skicka påminnelse
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {isArchived ? (
                <>
                  <DropdownMenuItem onClick={handleRestore}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Återställ
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Ta bort permanent
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={handleArchive}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive className="h-4 w-4 mr-2" /> Arkivera
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Card>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort offert permanent?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta tar bort offerten <strong>{quote.customerName}</strong> permanent.
              Åtgärden kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ta bort permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
