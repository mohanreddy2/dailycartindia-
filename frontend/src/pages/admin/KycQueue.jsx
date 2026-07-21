import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { api, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { EmptyState, RowSkeletons, StatusBadge } from '../../components/shared/bits';
import { ShieldCheck, Check, X, Store, Wrench, MapPin, FileText, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react';

function VendorDetailRow({ label, value, mono }) {
  if (!value) return null;
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{label}:</span>{' '}
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </p>
  );
}

function KycCard({ v, onDecide, busyId }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card key={v.id} data-testid="admin-kyc-row" className="rounded-xl overflow-hidden">
      {/* Main row */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
            {v.type === 'mart'
              ? <Store className="h-5 w-5 text-muted-foreground" />
              : <Wrench className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-bold">{v.name}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {v.type === 'mart' ? 'Kirana / Mart store' : 'Service provider'} · {v.city}
            </p>
            <p className="text-xs text-muted-foreground">
              {v.kyc?.id_type?.toUpperCase()}: <span className="font-mono">{v.kyc?.id_number}</span>
              {' · '}submitted {v.kyc?.submitted_at
                ? new Date(v.kyc.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : '—'}
            </p>
            {/* Owner contact — enriched by backend join */}
            {v.owner_email && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> {v.owner_email}
              </p>
            )}
            {v.owner_phone && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {v.owner_phone}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Categories: {(v.category_slugs || []).join(', ') || '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {v.kyc_status === 'pending' ? (
            <div className="flex gap-2">
              <Button
                data-testid="admin-kyc-approve-button"
                size="sm"
                className="gap-1"
                disabled={busyId === v.id}
                onClick={() => onDecide(v.id, 'approved')}
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                data-testid="admin-kyc-reject-button"
                size="sm"
                variant="outline"
                className="gap-1 text-destructive"
                disabled={busyId === v.id}
                onClick={() => onDecide(v.id, 'rejected')}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </div>
          ) : (
            <StatusBadge status={v.kyc_status} />
          )}
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? 'Less' : 'More details'}
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t bg-muted/30 px-4 py-3 space-y-1.5">
          <VendorDetailRow label="Address" value={v.address} />
          <VendorDetailRow label="City" value={v.city} />
          <VendorDetailRow label="Min order" value={v.min_order != null ? `₹${v.min_order}` : null} />
          <VendorDetailRow label="Delivery fee" value={v.delivery_fee != null ? `₹${v.delivery_fee}` : null} />
          <VendorDetailRow label="ID type" value={v.kyc?.id_type?.toUpperCase()} />
          <VendorDetailRow label="ID number" value={v.kyc?.id_number} mono />
          <VendorDetailRow label="Submitted" value={v.kyc?.submitted_at ? new Date(v.kyc.submitted_at).toLocaleString('en-IN') : null} />
          {v.kyc?.decision_note && <VendorDetailRow label="Decision note" value={v.kyc.decision_note} />}
          <VendorDetailRow label="Lat/Lng" value={v.location?.coordinates ? `${v.location.coordinates[1].toFixed(4)}, ${v.location.coordinates[0].toFixed(4)}` : null} />
        </div>
      )}
    </Card>
  );
}

export default function KycQueue() {
  const [vendors, setVendors] = useState(null);
  const [status, setStatus] = useState('pending');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setVendors(null);
    api.get('/admin/kyc', { params: { status } })
      .then(({ data }) => setVendors(data))
      .catch(() => setVendors([]));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const decide = async (vendorId, decision) => {
    const note = decision === 'rejected'
      ? window.prompt('Tell the vendor why verification was rejected (optional):')
      : null;
    if (note === null && decision === 'rejected') return;
    setBusyId(vendorId);
    try {
      await api.patch(`/admin/kyc/${vendorId}`, { decision, note: note || null });
      toast.success(`KYC ${decision}`);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">KYC review queue</h1>
      <Tabs value={status} onValueChange={setStatus} data-testid="admin-kyc-tabs">
        <TabsList>
          <TabsTrigger data-testid="kyc-tab-pending" value="pending">Pending</TabsTrigger>
          <TabsTrigger data-testid="kyc-tab-approved" value="approved">Approved</TabsTrigger>
          <TabsTrigger data-testid="kyc-tab-rejected" value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {!vendors ? <RowSkeletons /> : vendors.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={`No ${status} KYC applications`}
          subtitle={status === 'pending' ? 'New vendor registrations will appear here for verification.' : ''}
        />
      ) : (
        <div data-testid="admin-kyc-table" className="space-y-3">
          {vendors.map((v) => (
            <KycCard key={v.id} v={v} onDecide={decide} busyId={busyId} />
          ))}
        </div>
      )}
    </div>
  );
}
