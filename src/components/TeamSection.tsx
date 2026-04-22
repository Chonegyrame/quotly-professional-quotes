import { useState } from 'react';
import { UserPlus, Trash2, Mail, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompany, type CompanyRole } from '@/hooks/useCompany';
import { useCompanyMembers } from '@/hooks/useCompanyMembers';
import { useCompanyInvites } from '@/hooks/useCompanyInvites';
import { getPermissions } from '@/lib/permissions';
import { useQueryClient } from '@tanstack/react-query';

type InviteRole = Exclude<CompanyRole, 'owner'>;

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'owner') return 'default';
  if (role === 'admin') return 'secondary';
  return 'outline';
}

function roleLabel(role: string): string {
  if (role === 'owner') return 'Ägare';
  if (role === 'admin') return 'Administratör';
  return 'Medlem';
}

export function TeamSection() {
  const queryClient = useQueryClient();
  const { company, role: currentRole } = useCompany();
  const { data: members, isLoading: membersLoading } = useCompanyMembers();
  const {
    data: invites,
    isLoading: invitesLoading,
    sendInvite,
    cancelInvite,
  } = useCompanyInvites();
  const permissions = getPermissions(currentRole);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('member');

  const extractEdgeFunctionError = async (err: unknown): Promise<string> => {
    // supabase-js throws FunctionsHttpError on non-2xx and stores the original
    // Response on the `context` field. Pull the JSON body so we surface our
    // Swedish error strings instead of "Edge Function returned a non-2xx status code".
    if (err instanceof Error) {
      const ctx = (err as Error & { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const body = await ctx.json();
          if (body?.error) return body.error;
        } catch {
          // fall through
        }
      }
      return err.message;
    }
    return 'Okänt fel';
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error('Ange en e-postadress');
      return;
    }
    try {
      const result = await sendInvite.mutateAsync({ email, role: inviteRole });
      if (result?.warning) {
        toast.warning(result.warning);
      } else {
        toast.success('Inbjudan skickad');
      }
      setInviteEmail('');
      setInviteRole('member');
    } catch (err) {
      toast.error(await extractEdgeFunctionError(err));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!company) return;
    try {
      const { error } = await supabase
        .from('company_memberships')
        .delete()
        .eq('company_id', company.id)
        .eq('user_id', userId);
      if (error) throw error;
      toast.success('Medlem borttagen');
      queryClient.invalidateQueries({ queryKey: ['company-members'] });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Kunde inte ta bort medlem';
      toast.error(message);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite.mutateAsync(inviteId);
      toast.success('Inbjudan avbruten');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Kunde inte avbryta inbjudan';
      toast.error(message);
    }
  };

  if (!company) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Members */}
        <div>
          <Label className="text-sm font-medium">Medlemmar</Label>
          <div className="mt-2 space-y-2">
            {membersLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Laddar medlemmar…
              </div>
            )}
            {members?.map((m) => {
              const canRemove =
                permissions.canRemoveMembers && m.role !== 'owner';
              return (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Gick med {new Date(m.joined_at).toLocaleDateString('sv-SE')}
                    </div>
                  </div>
                  <Badge variant={roleBadgeVariant(m.role)}>
                    {roleLabel(m.role)}
                  </Badge>
                  {canRemove && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ta bort medlem"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ta bort medlem?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {m.email} kommer att förlora åtkomst till {company.name}. Denna åtgärd kan inte ångras.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(m.user_id)}
                          >
                            Ta bort
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite form */}
        {permissions.canInviteMembers && (
          <div className="border-t border-border pt-4">
            <Label className="text-sm font-medium">Bjud in medlem</Label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Input
                type="email"
                placeholder="namn@exempel.se"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as InviteRole)}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Medlem</SelectItem>
                  <SelectItem value="admin">Administratör</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleSendInvite}
                disabled={sendInvite.isPending}
                className="gap-2"
              >
                {sendInvite.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Bjud in
              </Button>
            </div>
          </div>
        )}

        {/* Pending invites */}
        {permissions.canInviteMembers &&
          !invitesLoading &&
          (invites?.length ?? 0) > 0 && (
            <div className="border-t border-border pt-4">
              <Label className="text-sm font-medium">Väntande inbjudningar</Label>
              <div className="mt-2 space-y-2">
                {invites?.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {inv.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Går ut {new Date(inv.expires_at).toLocaleDateString('sv-SE')}
                        </div>
                      </div>
                    </div>
                    <Badge variant={roleBadgeVariant(inv.role)}>
                      {roleLabel(inv.role)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Avbryt inbjudan"
                      onClick={() => handleCancelInvite(inv.id)}
                      disabled={cancelInvite.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
