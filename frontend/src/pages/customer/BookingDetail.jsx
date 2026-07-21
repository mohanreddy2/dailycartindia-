import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { api, inr, errMsg } from '../../lib/api';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { StatusBadge, StatusTimeline, EmptyState } from '../../components/shared/bits';
import { ReviewDialog, DisputeDialog } from './OrderDetail';

const FLOW = ['requested', 'accepted', 'en_route', 'in_progress', 'completed'];

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(() => {
    api.get(`/bookings/${id}`)
      .then(({ data }) => setBooking(data))
      .catch((e) => setError(errMsg(e, 'Booking not found')));
  }, [id]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 5000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const cancel = async () => {
    try {
      await api.post(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled');
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (error) return <div className="py-8"><EmptyState title={error} /></div>;
  if (!booking) return <div className="space-y-4 py-5"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  const terminalBad = ['cancelled', 'declined'].includes(booking.status);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{booking.service_name}</h1>
          <p className="text-xs text-muted-foreground">Booking {booking.booking_no} · {booking.vendor_name}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <Card className="rounded-xl p-4">
        <h2 className="mb-3 font-display text-base font-semibold">Booking progress</h2>
        <StatusTimeline flow={FLOW} history={booking.status_history} current={booking.status} />
        {['requested', 'accepted'].includes(booking.status) && (
          <Button data-testid="cancel-booking-button" variant="outline" size="sm" className="mt-3 text-destructive" onClick={cancel}>Cancel booking</Button>
        )}
      </Card>

      <Card className="space-y-1.5 rounded-xl p-4 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span className="font-medium">{new Date(booking.slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {booking.slot_time}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{booking.duration_minutes} min</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="max-w-[60%] text-right">{booking.address?.line}, {booking.address?.city}</span></div>
        <div className="flex justify-between font-semibold"><span>To pay after service</span><span data-testid="booking-price-text" className="tabular-nums">{inr(booking.price)}</span></div>
        {booking.notes && <p className="pt-1 text-xs text-muted-foreground">Notes: {booking.notes}</p>}
      </Card>

      {!terminalBad && (
        <div className="flex flex-wrap items-center gap-2">
          {booking.status === 'completed' && !booking.review && <ReviewDialog refId={booking.id} kind="booking" onDone={load} />}
          {booking.review && (
            <p data-testid="existing-review-text" className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> You rated {booking.review.rating}/5
            </p>
          )}
          {!booking.dispute && <DisputeDialog refId={booking.id} kind="booking" onDone={load} />}
          {booking.dispute && <StatusBadge status={booking.dispute.status === 'open' ? 'pending' : 'resolved'} />}
        </div>
      )}
    </div>
  );
}
