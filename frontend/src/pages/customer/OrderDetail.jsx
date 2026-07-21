import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { api, inr, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { Star, AlertTriangle } from 'lucide-react';
import { StatusBadge, StatusTimeline, EmptyState } from '../../components/shared/bits';

const FLOW = ['placed', 'accepted', 'picking', 'ready', 'out_for_delivery', 'delivered'];

export function ReviewDialog({ refId, kind, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [open, setOpen] = useState(false);
  const submit = async () => {
    try {
      await api.post('/reviews', { [kind === 'order' ? 'order_id' : 'booking_id']: refId, rating, comment: comment || null });
      toast.success('Thanks for your review!');
      setOpen(false);
      onDone?.();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="open-review-dialog-button" variant="outline" className="gap-1.5"><Star className="h-4 w-4" /> Rate this {kind}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>How was it?</DialogTitle></DialogHeader>
        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} data-testid="review-star-button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
              <Star className={`h-8 w-8 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
        <Textarea data-testid="review-comment-input" placeholder="Tell others about your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <DialogFooter>
          <Button data-testid="submit-review-button" onClick={submit}>Submit review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DisputeDialog({ refId, kind, onDone }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);
  const submit = async () => {
    if (!subject.trim()) { toast.error('Enter a subject'); return; }
    try {
      await api.post('/disputes', { [kind === 'order' ? 'order_id' : 'booking_id']: refId, subject, description: description || null });
      toast.success('Dispute raised. Our team will review it.');
      setOpen(false);
      onDone?.();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="open-dispute-dialog-button" variant="ghost" className="gap-1.5 text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Report an issue</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report an issue</DialogTitle></DialogHeader>
        <Input data-testid="dispute-subject-input" placeholder="Subject (e.g., items missing)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea data-testid="dispute-description-input" placeholder="Describe what went wrong" value={description} onChange={(e) => setDescription(e.target.value)} />
        <DialogFooter>
          <Button data-testid="submit-dispute-button" onClick={submit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(() => {
    api.get(`/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .catch((e) => setError(errMsg(e, 'Order not found')));
  }, [id]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 5000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const cancel = async () => {
    try {
      await api.post(`/orders/${id}/cancel`);
      toast.success('Order cancelled');
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (error) return <div className="py-8"><EmptyState title={error} /></div>;
  if (!order) return <div className="space-y-4 py-5"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  const terminalBad = ['cancelled', 'rejected'].includes(order.status);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{order.store_name}</h1>
          <p className="text-xs text-muted-foreground">Order {order.order_no} · {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <Card className="rounded-xl p-4">
        <h2 className="mb-3 font-display text-base font-semibold">Order progress</h2>
        <StatusTimeline flow={FLOW} history={order.status_history} current={order.status} />
        {order.status === 'placed' && (
          <Button data-testid="cancel-order-button" variant="outline" size="sm" className="mt-3 text-destructive" onClick={cancel}>Cancel order</Button>
        )}
      </Card>

      <Card className="rounded-xl p-4">
        <h2 className="mb-2 font-display text-base font-semibold">Items</h2>
        {order.items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5">
            {it.image && <img src={it.image} alt="" className="h-9 w-9 rounded-lg object-cover" />}
            <span className="flex-1 text-sm">{it.name} × {it.qty}</span>
            <span className="text-sm tabular-nums">{inr(it.price * it.qty)}</span>
          </div>
        ))}
        <Separator className="my-2" />
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{inr(order.subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery</span><span className="tabular-nums">{inr(order.delivery_fee)}</span></div>
        <div className="mt-1 flex justify-between font-semibold"><span>Total (COD)</span><span data-testid="order-total-text" className="tabular-nums">{inr(order.total)}</span></div>
      </Card>

      <Card className="rounded-xl p-4 text-sm">
        <h2 className="mb-1 font-display text-base font-semibold">Delivery address</h2>
        <p className="text-muted-foreground">{order.address?.line}, {order.address?.city}</p>
      </Card>

      {!terminalBad && (
        <div className="flex flex-wrap items-center gap-2">
          {order.status === 'delivered' && !order.review && <ReviewDialog refId={order.id} kind="order" onDone={load} />}
          {order.review && (
            <p data-testid="existing-review-text" className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> You rated {order.review.rating}/5
            </p>
          )}
          {!order.dispute && <DisputeDialog refId={order.id} kind="order" onDone={load} />}
          {order.dispute && <StatusBadge status={order.dispute.status === 'open' ? 'pending' : 'resolved'} />}
        </div>
      )}
    </div>
  );
}
