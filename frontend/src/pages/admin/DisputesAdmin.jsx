import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { api, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { EmptyState, RowSkeletons, StatusBadge } from '../../components/shared/bits';
import { MessageSquareWarning } from 'lucide-react';

export default function DisputesAdmin() {
  const [disputes, setDisputes] = useState(null);
  const [status, setStatus] = useState('open');
  const [resolving, setResolving] = useState(null);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setDisputes(null);
    api.get('/admin/disputes', { params: status === 'all' ? {} : { status } }).then(({ data }) => setDisputes(data)).catch(() => setDisputes([]));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const resolve = async () => {
    if (!resolution.trim()) { toast.error('Enter a resolution note'); return; }
    setBusy(true);
    try {
      await api.patch(`/admin/disputes/${resolving.id}/resolve`, { resolution });
      toast.success('Dispute resolved');
      setResolving(null);
      setResolution('');
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Disputes</h1>
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          <TabsTrigger data-testid="disputes-tab-open" value="open">Open</TabsTrigger>
          <TabsTrigger data-testid="disputes-tab-resolved" value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {!disputes ? <RowSkeletons /> : disputes.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title={`No ${status === 'all' ? '' : status} disputes`} subtitle="Customer issues raised on orders or bookings will appear here." />
      ) : (
        <div data-testid="admin-disputes-table" className="space-y-3">
          {disputes.map((d) => (
            <Card key={d.id} data-testid="admin-dispute-row" className="rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{d.subject}</p>
                  <p className="text-xs text-muted-foreground">{d.ref_no} · {d.customer_name} vs {d.vendor_name} · {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
                  {d.resolution && <p className="mt-1 rounded-lg bg-[hsl(var(--serve-soft))] p-2 text-xs text-[hsl(var(--serve-soft-foreground))]">Resolution: {d.resolution}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={d.status} />
                  {d.status === 'open' && (
                    <Button data-testid="admin-dispute-resolve-button" size="sm" onClick={() => setResolving(d)}>Resolve</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent data-testid="admin-dispute-resolve-dialog">
          <DialogHeader><DialogTitle>Resolve dispute</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{resolving?.subject} — {resolving?.ref_no}</p>
          <Textarea data-testid="dispute-resolution-input" placeholder="Resolution outcome (e.g., refund issued, vendor warned…)" value={resolution} onChange={(e) => setResolution(e.target.value)} />
          <DialogFooter>
            <Button data-testid="dispute-resolve-submit-button" onClick={resolve} disabled={busy}>{busy ? 'Resolving…' : 'Mark resolved'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
