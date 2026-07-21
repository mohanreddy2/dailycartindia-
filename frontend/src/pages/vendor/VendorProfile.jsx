import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/store';
import { toast } from 'sonner';
import { VerifiedBadge, RatingPill } from '../../components/shared/bits';

export default function VendorProfile() {
  const { vendor, refreshMe } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (vendor) setForm({
      name: vendor.name, description: vendor.description || '', image: vendor.image || '',
      is_open: vendor.is_open, min_order: vendor.min_order, delivery_fee: vendor.delivery_fee,
    });
  }, [vendor]);

  if (!vendor || !form) return null;

  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/vendor/profile', { ...form, min_order: Number(form.min_order), delivery_fee: Number(form.delivery_fee) });
      await refreshMe();
      toast.success('Profile updated');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-xl font-bold">Business profile</h1>
        <VerifiedBadge />
        <RatingPill rating={vendor.rating} count={vendor.review_count} />
      </div>

      <Card className="space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-semibold">{form.is_open ? 'Open for business' : 'Temporarily closed'}</Label>
            <p className="text-xs text-muted-foreground">Customers {form.is_open ? 'can' : 'cannot'} see you as open</p>
          </div>
          <Switch data-testid="profile-open-switch" checked={form.is_open} onCheckedChange={(v) => setForm({ ...form, is_open: v })} />
        </div>
        <div className="space-y-1.5">
          <Label>Business name</Label>
          <Input data-testid="profile-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Cover image URL</Label>
          <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" />
        </div>
        {vendor.type === 'mart' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Min order (₹)</Label>
              <Input type="number" min="0" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery fee (₹)</Label>
              <Input type="number" min="0" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} />
            </div>
          </div>
        )}
        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p>Registered address: {vendor.address}, {vendor.city}</p>
          <p className="mt-0.5">KYC: {vendor.kyc?.id_type?.toUpperCase()} · {vendor.kyc_status}</p>
        </div>
        <Button data-testid="profile-save-button" onClick={save} disabled={busy} className="w-full">{busy ? 'Saving…' : 'Save profile'}</Button>
      </Card>
    </div>
  );
}
