import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { api, inr, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { EmptyState, RowSkeletons, StatusBadge } from '../../components/shared/bits';
import { ArrowLeft, Boxes, Clock, Pencil, Plus, Trash2, Wrench } from 'lucide-react';

const EMPTY_PRODUCT = { name: '', category_slug: 'grocery', price: '', mrp: '', unit: '1 pc', stock_qty: 0, image: '', is_available: true };
const EMPTY_SERVICE = { name: '', category_slug: '', description: '', base_price: '', duration_minutes: 60, image: '', is_available: true };

function readImage(file, onData) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
  if (file.size > 500 * 1024) return toast.error('Image must be 500 KB or smaller');
  const reader = new FileReader();
  reader.onload = () => onData(reader.result);
  reader.onerror = () => toast.error('Could not read that image');
  reader.readAsDataURL(file);
}

export default function VendorCatalogAdmin() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/admin/vendors/${vendorId}`)
      .then(({ data }) => setVendor(data))
      .catch((e) => {
        toast.error(errMsg(e, 'Vendor not found'));
        navigate('/admin/vendors');
      });
  }, [vendorId, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const kind = vendor?.type === 'service' ? 'service' : 'product';
    api.get('/categories', { params: { kind } }).then(({ data }) => setCats(data)).catch(() => {});
  }, [vendor?.type]);

  const isMart = vendor?.type === 'mart';
  const items = isMart ? (vendor?.products || []) : (vendor?.services || []);

  const saveProduct = async () => {
    const p = editing;
    if (!p.name.trim() || !p.price) { toast.error('Name and price are required'); return; }
    setBusy(true);
    const body = {
      name: p.name, category_slug: p.category_slug, price: Number(p.price),
      mrp: p.mrp ? Number(p.mrp) : null, unit: p.unit, stock_qty: Number(p.stock_qty || 0),
      image: p.image || null, is_available: p.is_available,
    };
    try {
      if (p.id) await api.patch(`/admin/vendors/${vendorId}/products/${p.id}`, body);
      else await api.post(`/admin/vendors/${vendorId}/products`, body);
      toast.success(p.id ? 'Product updated' : 'Product added');
      setEditing(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const saveService = async () => {
    const s = editing;
    if (!s.name.trim() || !s.base_price || !s.category_slug) { toast.error('Name, category and price are required'); return; }
    setBusy(true);
    const body = {
      name: s.name, category_slug: s.category_slug, description: s.description || null,
      base_price: Number(s.base_price), duration_minutes: Number(s.duration_minutes || 60),
      image: s.image || null, is_available: s.is_available,
    };
    try {
      if (s.id) await api.patch(`/admin/vendors/${vendorId}/services/${s.id}`, body);
      else await api.post(`/admin/vendors/${vendorId}/services`, body);
      toast.success(s.id ? 'Service updated' : 'Service added');
      setEditing(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const del = async (item) => {
    try {
      if (isMart) await api.delete(`/admin/vendors/${vendorId}/products/${item.id}`);
      else await api.delete(`/admin/vendors/${vendorId}/services/${item.id}`);
      toast.success(isMart ? 'Product removed' : 'Service removed');
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (!vendor) return <RowSkeletons />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 gap-1" onClick={() => navigate('/admin/vendors')}>
            <ArrowLeft className="h-4 w-4" /> Vendors
          </Button>
          <h1 className="font-display text-xl font-bold">{isMart ? 'Products' : 'Services'} · {vendor.name}</h1>
          <p className="text-sm text-muted-foreground">
            {vendor.city} · <StatusBadge status={vendor.kyc_status} /> · {isMart ? 'Kirana / mart' : 'Service professional'}
          </p>
        </div>
        <Button
          data-testid="admin-catalog-add-button"
          className="gap-1.5"
          onClick={() => setEditing(isMart ? { ...EMPTY_PRODUCT } : { ...EMPTY_SERVICE, category_slug: cats[0]?.slug || '' })}
        >
          <Plus className="h-4 w-4" /> {isMart ? 'Add product' : 'Add service'}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={isMart ? Boxes : Wrench}
          title={isMart ? 'No products yet' : 'No services listed'}
          subtitle={isMart ? 'Add items this store can sell on DailyCart.' : 'Add jobs this professional can take.'}
          actionLabel={isMart ? 'Add product' : 'Add service'}
          onAction={() => setEditing(isMart ? { ...EMPTY_PRODUCT } : { ...EMPTY_SERVICE, category_slug: cats[0]?.slug || '' })}
        />
      ) : isMart ? (
        <Card className="overflow-x-auto rounded-xl">
          <Table data-testid="admin-catalog-table">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} data-testid="admin-catalog-product-row">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {p.image && <img src={p.image} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.unit} · {p.category_slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{inr(p.price)}</TableCell>
                  <TableCell className={`tabular-nums ${p.stock_qty < 10 ? 'font-semibold text-amber-600' : ''}`}>{p.stock_qty}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.is_available ? 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]' : 'bg-muted text-muted-foreground'}`}>
                      {p.is_available ? 'Live' : 'Hidden'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button data-testid="admin-catalog-edit-button" variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({ ...p })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button data-testid="admin-catalog-delete-button" variant="ghost" size="icon" aria-label="Delete" className="text-destructive" onClick={() => del(p)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div data-testid="admin-catalog-services-list" className="space-y-2">
          {items.map((s) => (
            <Card key={s.id} data-testid="admin-catalog-service-row" className="flex items-center gap-3 rounded-xl p-3">
              {s.image && <img src={s.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{(s.category_slug || '').replace('-', ' ')}</span> · <Clock className="h-3 w-3" /> {s.duration_minutes} min
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.is_available ? 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]' : 'bg-muted text-muted-foreground'}`}>
                {s.is_available ? 'Live' : 'Hidden'}
              </span>
              <span className="text-sm font-bold tabular-nums">{inr(s.base_price)}</span>
              <Button data-testid="admin-catalog-edit-button" variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({ ...s })}><Pencil className="h-4 w-4" /></Button>
              <Button data-testid="admin-catalog-delete-button" variant="ghost" size="icon" aria-label="Delete" className="text-destructive" onClick={() => del(s)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? (isMart ? 'Edit product' : 'Edit service') : (isMart ? 'Add product' : 'Add service')}</DialogTitle>
          </DialogHeader>
          {editing && isMart && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" min="0" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>MRP (₹, optional)</Label><Input type="number" min="0" value={editing.mrp || ''} onChange={(e) => setEditing({ ...editing, mrp: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Unit</Label><Input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Stock qty</Label><Input type="number" min="0" value={editing.stock_qty} onChange={(e) => setEditing({ ...editing, stock_qty: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {cats.map((c) => (
                    <button type="button" key={c.slug} onClick={() => setEditing({ ...editing, category_slug: c.slug })}
                      className={`rounded-full border px-2.5 py-1 text-xs ${editing.category_slug === c.slug ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Image (optional)</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => readImage(e.target.files?.[0], (image) => setEditing({ ...editing, image }))} />
                {editing.image && (
                  <div className="flex items-center gap-3 rounded-lg border p-2">
                    <img src={editing.image} alt="" className="h-12 w-12 rounded object-cover" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing({ ...editing, image: '' })}>Remove image</Button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">Visible to customers</Label>
                <Switch checked={editing.is_available} onCheckedChange={(v) => setEditing({ ...editing, is_available: v })} />
              </div>
            </div>
          )}
          {editing && !isMart && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Service name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {cats.map((c) => (
                    <button type="button" key={c.slug} onClick={() => setEditing({ ...editing, category_slug: c.slug })}
                      className={`rounded-full border px-2.5 py-1 text-xs ${editing.category_slug === c.slug ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" min="0" value={editing.base_price} onChange={(e) => setEditing({ ...editing, base_price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Duration (min)</Label><Input type="number" min="15" step="15" value={editing.duration_minutes} onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} /></div>
              <div className="space-y-1.5">
                <Label>Image (optional)</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => readImage(e.target.files?.[0], (image) => setEditing({ ...editing, image }))} />
                {editing.image && (
                  <div className="flex items-center gap-3 rounded-lg border p-2">
                    <img src={editing.image} alt="" className="h-12 w-12 rounded object-cover" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing({ ...editing, image: '' })}>Remove image</Button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">Available for booking</Label>
                <Switch checked={editing.is_available} onCheckedChange={(v) => setEditing({ ...editing, is_available: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button data-testid="admin-catalog-save-button" onClick={isMart ? saveProduct : saveService} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
