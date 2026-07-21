import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { api, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { EmptyState, RowSkeletons, StatusBadge, RatingPill } from '../../components/shared/bits';
import { Pencil, Plus, Store } from 'lucide-react';

export default function VendorsAdmin() {
  const [vendors, setVendors] = useState(null);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get('/admin/vendors').then(({ data }) => setVendors(data)).catch(() => setVendors([]));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/admin/users').then(({ data }) => setUsers(data.filter((u) => u.is_active !== false))).catch(() => setUsers([])); }, []);

  const toggle = async (v) => {
    setBusyId(v.id);
    try {
      await api.patch(`/admin/vendors/${v.id}/active`, { is_active: !v.is_active });
      toast.success(v.is_active ? `${v.name} deactivated` : `${v.name} activated`);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusyId(null); }
  };
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const openCreate = () => {
    setSelected(null);
    setForm({ user_id: '', type: 'mart', name: '', description: '', category_slugs: '', address: '', city: '', lat: '', lng: '', min_order: 0, delivery_fee: 25, kyc_id_type: 'aadhaar', kyc_id_number: '' });
  };
  const openEdit = async (vendor) => {
    setBusyId(vendor.id);
    try {
      const { data } = await api.get(`/admin/vendors/${vendor.id}`);
      setSelected(data);
      setForm({ name: data.name || '', description: data.description || '', category_slugs: (data.category_slugs || []).join(', '), address: data.address || '', city: data.city || '', lat: data.location?.coordinates?.[1] ?? '', lng: data.location?.coordinates?.[0] ?? '', min_order: data.min_order ?? 0, delivery_fee: data.delivery_fee ?? 0, is_open: data.is_open !== false });
    } catch (error) { toast.error(errMsg(error)); } finally { setBusyId(null); }
  };
  const save = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      category_slugs: form.category_slugs.split(',').map((item) => item.trim()).filter(Boolean),
      lat: Number(form.lat), lng: Number(form.lng), min_order: Number(form.min_order), delivery_fee: Number(form.delivery_fee),
    };
    setBusyId(selected?.id || 'new');
    try {
      if (selected) {
        delete payload.user_id; delete payload.type; delete payload.kyc_id_type; delete payload.kyc_id_number;
        await api.patch(`/admin/vendors/${selected.id}`, payload);
        toast.success('Vendor details updated');
      } else {
        await api.post('/admin/vendors', payload);
        toast.success('Vendor profile created and queued for KYC review');
      }
      setForm(null);
      load();
    } catch (error) { toast.error(errMsg(error)); } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-display text-xl font-bold">Vendors</h1><p className="text-sm text-muted-foreground">Review submitted business details, edit profiles, or deactivate listings.</p></div>
        <Button data-testid="admin-vendor-add-button" size="sm" className="gap-1" onClick={openCreate}><Plus className="h-4 w-4" /> Add vendor</Button>
      </div>
      {!vendors ? <RowSkeletons /> : vendors.length === 0 ? (
        <EmptyState icon={Store} title="No vendors registered" />
      ) : (
        <Card className="overflow-x-auto rounded-xl">
          <Table data-testid="admin-vendors-table">
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id} data-testid="admin-vendor-row">
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="capitalize">{v.type}</TableCell>
                  <TableCell>{v.city}</TableCell>
                  <TableCell><RatingPill rating={v.rating} count={v.review_count} /></TableCell>
                  <TableCell><StatusBadge status={v.kyc_status} /></TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.is_active ? 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]' : 'bg-red-100 text-red-700'}`}>
                      {v.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="View or edit vendor" disabled={busyId === v.id} onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      <Button data-testid="admin-vendor-toggle-button" size="sm" variant={v.is_active ? 'outline' : 'default'}
                        className={v.is_active ? 'text-destructive' : ''} disabled={busyId === v.id} onClick={() => toggle(v)}>
                        {v.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Review and edit vendor' : 'Add vendor'}</DialogTitle>
            <DialogDescription>{selected ? 'These are the business details supplied through the partner onboarding flow.' : 'Select an existing customer account, then create a vendor profile for KYC verification.'}</DialogDescription>
          </DialogHeader>
          {form && (
            <form className="space-y-3" onSubmit={save}>
              {!selected && <div className="space-y-1"><Label htmlFor="vendor-owner">Owner</Label><select id="vendor-owner" required className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.user_id} onChange={(e) => change('user_id', e.target.value)}><option value="">Select a user</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email || user.phone}</option>)}</select></div>}
              {!selected && <div className="space-y-1"><Label>Business type</Label><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => change('type', e.target.value)}><option value="mart">Mart / store</option><option value="service">Service professional</option></select></div>}
              {selected && <>
                <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-1">
                  <p>Owner: {selected.owner?.name || 'Unknown'} · {selected.owner?.email || selected.owner?.phone || 'No contact'}</p>
                  <p>KYC: <span className="font-medium capitalize">{selected.kyc_status}</span> · {selected.kyc?.id_type?.toUpperCase()}: <span className="font-mono">{selected.kyc?.id_number}</span></p>
                  {selected.kyc?.decision_note && <p>Review note: {selected.kyc.decision_note}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border p-2"><p className="mb-1 font-medium">Products ({selected.products?.length || 0})</p>{selected.products?.slice(0, 4).map((item) => <p key={item.id} className="truncate text-muted-foreground">{item.name}</p>) || null}</div>
                  <div className="rounded-md border p-2"><p className="mb-1 font-medium">Services ({selected.services?.length || 0})</p>{selected.services?.slice(0, 4).map((item) => <p key={item.id} className="truncate text-muted-foreground">{item.name}</p>) || null}</div>
                </div>
              </>}
              <div className="space-y-1"><Label htmlFor="vendor-name">Business name</Label><Input id="vendor-name" required value={form.name} onChange={(e) => change('name', e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="vendor-description">Description</Label><Textarea id="vendor-description" value={form.description} onChange={(e) => change('description', e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="vendor-categories">Categories</Label><Input id="vendor-categories" placeholder="groceries, dairy" value={form.category_slugs} onChange={(e) => change('category_slugs', e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="vendor-address">Address</Label><Input id="vendor-address" required value={form.address} onChange={(e) => change('address', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-2"><div className="space-y-1"><Label>City</Label><Input required value={form.city} onChange={(e) => change('city', e.target.value)} /></div><div className="space-y-1"><Label>Latitude</Label><Input type="number" step="any" required value={form.lat} onChange={(e) => change('lat', e.target.value)} /></div><div className="space-y-1"><Label>Longitude</Label><Input type="number" step="any" required value={form.lng} onChange={(e) => change('lng', e.target.value)} /></div></div>
              <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Min. order (₹)</Label><Input type="number" min="0" value={form.min_order} onChange={(e) => change('min_order', e.target.value)} /></div><div className="space-y-1"><Label>Delivery fee (₹)</Label><Input type="number" min="0" value={form.delivery_fee} onChange={(e) => change('delivery_fee', e.target.value)} /></div></div>
              {!selected && <><div className="space-y-1"><Label>ID type</Label><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.kyc_id_type} onChange={(e) => change('kyc_id_type', e.target.value)}><option value="aadhaar">Aadhaar</option><option value="pan">PAN</option><option value="gstin">GSTIN</option></select></div><div className="space-y-1"><Label>ID number</Label><Input required minLength="4" value={form.kyc_id_number} onChange={(e) => change('kyc_id_number', e.target.value)} /></div></>}
              <DialogFooter><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" disabled={Boolean(busyId)}>{busyId ? 'Saving…' : 'Save vendor'}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
