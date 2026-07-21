import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { api, errMsg } from '../../lib/api';
import { EmptyState, RowSkeletons } from '../../components/shared/bits';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';

export default function UsersAdmin() {
  const [users, setUsers] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/admin/users').then(({ data }) => setUsers(data)).catch(() => setUsers([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setSelected(null);
    setForm({ name: '', email: '', phone: '', password: '' });
  };
  const openEdit = async (user) => {
    setBusy(true);
    try {
      const { data } = await api.get(`/admin/users/${user.id}`);
      setSelected(data);
      setForm({ name: data.name || '', email: data.email || '', phone: data.phone || '', password: '' });
    } catch (error) { toast.error(errMsg(error)); } finally { setBusy(false); }
  };
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (selected) {
        await api.patch(`/admin/users/${selected.id}`, { name: form.name, email: form.email, phone: form.phone || null });
        toast.success('User details updated');
      } else {
        await api.post('/admin/users', form);
        toast.success('User created');
      }
      setForm(null);
      load();
    } catch (error) { toast.error(errMsg(error)); } finally { setBusy(false); }
  };
  const remove = async (user) => {
    if (!window.confirm(`Remove ${user.name}? Their account and any vendor profile will be deactivated.`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast.success(`${user.name} removed`);
      load();
    } catch (error) { toast.error(errMsg(error)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage customer accounts and contact details.</p>
        </div>
        <Button data-testid="admin-user-add-button" size="sm" className="gap-1" onClick={openCreate}><Plus className="h-4 w-4" /> Add user</Button>
      </div>
      {!users ? <RowSkeletons /> : users.length === 0 ? (
        <EmptyState icon={Users} title="No users" />
      ) : (
        <Card className="overflow-x-auto rounded-xl">
          <Table data-testid="admin-users-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} data-testid="admin-user-row">
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email || '—'}</TableCell>
                  <TableCell>{u.phone || '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(u.capabilities || []).map((c) => (
                        <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{c.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {u.is_active === false ? 'Removed' : 'Active'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Edit user" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                      {u.is_active !== false && <Button size="icon" variant="ghost" className="text-destructive" title="Remove user" disabled={busy} onClick={() => remove(u)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit user' : 'Add user'}</DialogTitle>
            <DialogDescription>{selected ? 'Review account activity and update contact information.' : 'Create a customer account that can later apply to become a partner.'}</DialogDescription>
          </DialogHeader>
          {form && (
            <form className="space-y-3" onSubmit={save}>
              {selected && <p className="rounded-md bg-muted px-3 py-2 text-xs">
                {selected.vendor ? `Partner: ${selected.vendor.name} (${selected.vendor.kyc_status})` : 'No partner application'} · {selected.orders?.length || 0} orders · {selected.bookings?.length || 0} bookings
              </p>}
              <div className="space-y-1"><Label htmlFor="admin-user-name">Name</Label><Input id="admin-user-name" required value={form.name} onChange={(e) => change('name', e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="admin-user-email">Email</Label><Input id="admin-user-email" type="email" required value={form.email} onChange={(e) => change('email', e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="admin-user-phone">Phone</Label><Input id="admin-user-phone" value={form.phone} onChange={(e) => change('phone', e.target.value)} /></div>
              {!selected && <div className="space-y-1"><Label htmlFor="admin-user-password">Temporary password</Label><Input id="admin-user-password" type="password" minLength="6" required value={form.password} onChange={(e) => change('password', e.target.value)} /></div>}
              <DialogFooter><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save user'}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
