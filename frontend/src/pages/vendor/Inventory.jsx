import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { api, inr, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { EmptyState, RowSkeletons } from '../../components/shared/bits';
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react';

const EMPTY = { name: '', category_slug: 'grocery', price: '', mrp: '', unit: '1 pc', stock_qty: 0, image: '', is_available: true };

export default function Inventory() {
  const [products, setProducts] = useState(null);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null); // null | {product or EMPTY}
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/vendor/products').then(({ data }) => setProducts(data)).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    load();
    api.get('/categories', { params: { kind: 'product' } }).then(({ data }) => setCats(data)).catch(() => {});
  }, [load]);

  const save = async () => {
    const p = editing;
    if (!p.name.trim() || !p.price) { toast.error('Name and price are required'); return; }
    setBusy(true);
    const body = { name: p.name, category_slug: p.category_slug, price: Number(p.price), mrp: p.mrp ? Number(p.mrp) : null, unit: p.unit, stock_qty: Number(p.stock_qty || 0), image: p.image || null, is_available: p.is_available };
    try {
      if (p.id) await api.patch(`/vendor/products/${p.id}`, body);
      else await api.post('/vendor/products', body);
      toast.success(p.id ? 'Product updated' : 'Product added');
      setEditing(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const del = async (id) => {
    try {
      await api.delete(`/vendor/products/${id}`);
      toast.success('Product removed');
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const uploadImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > 500 * 1024) return toast.error('Image must be 500 KB or smaller');
    const reader = new FileReader();
    reader.onload = () => setEditing((current) => ({ ...current, image: reader.result }));
    reader.onerror = () => toast.error('Could not read that image');
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Inventory</h1>
        <Button data-testid="inventory-add-product-button" className="gap-1.5" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </div>

      {!products ? <RowSkeletons /> : products.length === 0 ? (
        <EmptyState icon={Boxes} title="No products yet" subtitle="Add your first product so customers can start ordering." actionLabel="Add product" onAction={() => setEditing({ ...EMPTY })} />
      ) : (
        <Card className="overflow-x-auto rounded-xl">
          <Table data-testid="vendor-inventory-table">
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
              {products.map((p) => (
                <TableRow key={p.id} data-testid="inventory-product-row">
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
                  <TableCell>
                    <span className={`tabular-nums ${p.stock_qty < 10 ? 'font-semibold text-amber-600' : ''}`}>{p.stock_qty}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.is_available ? 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]' : 'bg-muted text-muted-foreground'}`}>
                      {p.is_available ? 'Live' : 'Hidden'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button data-testid="inventory-edit-product-button" variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({ ...p })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button data-testid="inventory-delete-product-button" variant="ghost" size="icon" aria-label="Delete" className="text-destructive" onClick={() => del(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit product' : 'Add product'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input data-testid="inventory-form-name-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price (₹)</Label>
                  <Input data-testid="inventory-form-price-input" type="number" min="0" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>MRP (₹, optional)</Label>
                  <Input type="number" min="0" value={editing.mrp || ''} onChange={(e) => setEditing({ ...editing, mrp: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="1 kg / 500 ml" />
                </div>
                <div className="space-y-1.5">
                  <Label>Stock qty</Label>
                  <Input data-testid="inventory-form-stock-input" type="number" min="0" value={editing.stock_qty} onChange={(e) => setEditing({ ...editing, stock_qty: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {cats.map((c) => (
                    <button key={c.slug} onClick={() => setEditing({ ...editing, category_slug: c.slug })}
                      className={`rounded-full border px-2.5 py-1 text-xs ${editing.category_slug === c.slug ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Image (optional)</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadImage(e.target.files?.[0])} />
                <p className="text-xs text-muted-foreground">JPG, PNG or WebP up to 500 KB.</p>
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
          <DialogFooter>
            <Button data-testid="inventory-save-button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save product'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
