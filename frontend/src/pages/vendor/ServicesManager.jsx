import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { api, inr, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { EmptyState, RowSkeletons } from '../../components/shared/bits';
import { Wrench, Pencil, Plus, Trash2, Clock } from 'lucide-react';

const EMPTY = { name: '', category_slug: '', description: '', base_price: '', duration_minutes: 60, image: '', is_available: true };

export default function ServicesManager() {
  const [services, setServices] = useState(null);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/vendor/services').then(({ data }) => setServices(data)).catch(() => setServices([]));
  }, []);

  useEffect(() => {
    load();
    api.get('/categories', { params: { kind: 'service' } }).then(({ data }) => setCats(data)).catch(() => {});
  }, [load]);

  const save = async () => {
    const s = editing;
    if (!s.name.trim() || !s.base_price || !s.category_slug) { toast.error('Name, category and price are required'); return; }
    setBusy(true);
    const body = { name: s.name, category_slug: s.category_slug, description: s.description || null, base_price: Number(s.base_price), duration_minutes: Number(s.duration_minutes || 60), image: s.image || null, is_available: s.is_available };
    try {
      if (s.id) await api.patch(`/vendor/services/${s.id}`, body);
      else await api.post('/vendor/services', body);
      toast.success(s.id ? 'Service updated' : 'Service added');
      setEditing(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const del = async (id) => {
    try {
      await api.delete(`/vendor/services/${id}`);
      toast.success('Service removed');
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
        <h1 className="font-display text-xl font-bold">My services</h1>
        <Button data-testid="services-add-button" className="gap-1.5" onClick={() => setEditing({ ...EMPTY, category_slug: cats[0]?.slug || '' })}>
          <Plus className="h-4 w-4" /> Add service
        </Button>
      </div>

      {!services ? <RowSkeletons /> : services.length === 0 ? (
        <EmptyState icon={Wrench} title="No services listed" subtitle="Add the services you offer so customers can book you." actionLabel="Add service" onAction={() => setEditing({ ...EMPTY, category_slug: cats[0]?.slug || '' })} />
      ) : (
        <div data-testid="vendor-services-list" className="space-y-2">
          {services.map((s) => (
            <Card key={s.id} data-testid="vendor-service-row" className="flex items-center gap-3 rounded-xl p-3">
              {s.image && <img src={s.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{s.category_slug.replace('-', ' ')}</span> · <Clock className="h-3 w-3" /> {s.duration_minutes} min
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.is_available ? 'bg-[hsl(var(--serve-soft))] text-[hsl(var(--serve-soft-foreground))]' : 'bg-muted text-muted-foreground'}`}>
                {s.is_available ? 'Live' : 'Hidden'}
              </span>
              <span className="text-sm font-bold tabular-nums">{inr(s.base_price)}</span>
              <Button data-testid="services-edit-button" variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({ ...s })}><Pencil className="h-4 w-4" /></Button>
              <Button data-testid="services-delete-button" variant="ghost" size="icon" aria-label="Delete" className="text-destructive" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit service' : 'Add service'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Service name</Label>
                <Input data-testid="services-form-name-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g., AC Gas Refill & Service" />
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price (₹)</Label>
                  <Input data-testid="services-form-price-input" type="number" min="0" value={editing.base_price} onChange={(e) => setEditing({ ...editing, base_price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (min)</Label>
                  <Input type="number" min="15" step="15" value={editing.duration_minutes} onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
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
                <Label className="text-sm">Available for booking</Label>
                <Switch checked={editing.is_available} onCheckedChange={(v) => setEditing({ ...editing, is_available: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button data-testid="services-save-button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save service'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
