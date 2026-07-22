import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Skeleton } from '../../components/ui/skeleton';
import { api, inr, errMsg } from '../../lib/api';
import { openRazorpayCheckout } from '../../lib/razorpay';
import { useAuth, useLocationCtx } from '../../lib/store';
import { toast } from 'sonner';
import { Clock, CheckCircle2, CalendarDays, Banknote, CreditCard } from 'lucide-react';
import { EmptyState } from '../../components/shared/bits';
import { Thumb } from '../../components/shared/thumb';

function localISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextDays(n = 7) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setHours(12, 0, 0, 0); // noon local — avoid UTC day skew
    d.setDate(d.getDate() + i);
    out.push({
      iso: localISO(d),
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.getDate(),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : null,
    });
  }
  return out;
}

export default function BookService() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location } = useLocationCtx();
  const days = useMemo(() => nextDays(7), []);
  const [data, setData] = useState(null);
  // Default tomorrow — today often has past slots; clearer first paint for booking
  const [date, setDate] = useState(days[1]?.iso || days[0].iso);
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState(null);
  const [addressLine, setAddressLine] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [razorpayOn, setRazorpayOn] = useState(false);

  useEffect(() => {
    api.get(`/services/${serviceId}`)
      .then(({ data }) => setData(data))
      .catch(() => setError('Service not found'));
  }, [serviceId]);

  useEffect(() => {
    api.get('/payments/methods')
      .then(({ data }) => {
        setRazorpayOn(Boolean(data.razorpay));
        if (data.razorpay) setPaymentMethod('razorpay');
      })
      .catch(() => setRazorpayOn(false));
  }, []);

  useEffect(() => {
    setSlots(null);
    setTime(null);
    api.get(`/services/${serviceId}/slots`, { params: { date } })
      .then(({ data }) => setSlots(data.slots))
      .catch(() => setSlots([]));
  }, [serviceId, date]);

  const submit = async () => {
    if (!user) { toast.info('Login to book this service'); navigate('/auth?next=' + encodeURIComponent(`/book/${serviceId}`)); return; }
    if (!time) { toast.error('Pick a time slot'); return; }
    if (!addressLine.trim()) { toast.error('Enter your address'); return; }
    setSubmitting(true);
    try {
      const address = { label: 'Home', line: addressLine, city: location.name, lat: location.lat, lng: location.lng };
      const bookingPayload = {
        service_id: serviceId,
        slot_date: date,
        slot_time: time,
        address,
        notes: notes || null,
      };

      if (paymentMethod === 'razorpay') {
        const { data: session } = await api.post('/payments/razorpay/create', {
          purpose: 'booking',
          booking: bookingPayload,
        });
        const payment = await openRazorpayCheckout(session);
        const { data } = await api.post('/payments/razorpay/confirm', {
          intent_id: session.intent_id,
          ...payment,
        });
        setConfirmed(data.booking);
        return;
      }

      const { data: bk } = await api.post('/bookings', bookingPayload);
      setConfirmed(bk);
    } catch (e) {
      if (e?.message === 'Payment cancelled') toast.info('Payment cancelled');
      else toast.error(errMsg(e) || e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="py-8"><EmptyState icon={CalendarDays} title={error} /></div>;
  if (!data) return <div className="space-y-4 py-5"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  if (confirmed) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <CheckCircle2 className="h-14 w-14 text-[hsl(var(--serve))]" />
        <h1 data-testid="booking-confirmed-heading" className="mt-3 text-xl font-bold">Booking confirmed!</h1>
        <p className="mt-1 text-sm text-muted-foreground">Booking <span className="font-semibold">{confirmed.booking_no}</span> · {confirmed.service_name}</p>
        <p className="text-sm text-muted-foreground">{new Date(confirmed.slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {confirmed.slot_time} · {confirmed.payment_method === 'razorpay' ? `Paid ${inr(confirmed.price)}` : `Pay ${inr(confirmed.price)} after service`}</p>
        <div className="mt-5 flex gap-2">
          <Button data-testid="view-booking-button" onClick={() => navigate(`/bookings/${confirmed.id}`)}>Track booking</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Back home</Button>
        </div>
      </div>
    );
  }

  const { service, vendor } = data;

  return (
    <div className="mx-auto max-w-lg space-y-5 py-5">
      <Card className="flex items-center gap-3 rounded-xl p-3">
        <Thumb src={service.image} alt={service.name} className="h-16 w-16 shrink-0 rounded-lg" tone="serve" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{service.name}</p>
          <p className="text-xs text-muted-foreground">{vendor?.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {service.duration_minutes} min</p>
        </div>
        <p className="text-base font-bold tabular-nums">{inr(service.base_price)}</p>
      </Card>

      <section>
        <h2 className="mb-2 font-display text-base font-semibold">Pick a date</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {days.map((d) => (
            <button key={d.iso} data-testid="service-booking-date-chip" onClick={() => setDate(d.iso)}
              className={`flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition-colors ${date === d.iso ? 'border-transparent bg-[hsl(var(--serve))] text-white' : 'bg-card hover:bg-accent'}`}>
              <span className="text-xs">{d.label || d.day}</span>
              <span className="text-lg font-bold">{d.date}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-display text-base font-semibold">Pick a time</h2>
        {!slots ? <Skeleton className="h-20 rounded-xl" /> : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No slots available this day.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  data-testid="service-booking-slot-chip"
                  data-available={s.available ? 'true' : 'false'}
                  disabled={!s.available}
                  onClick={() => s.available && setTime(s.time)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${time === s.time ? 'border-transparent bg-[hsl(var(--serve))] text-white' : 'bg-card hover:bg-accent'}`}
                >
                  {s.time}
                  {!s.available && <span className="mt-0.5 block text-[10px] font-normal opacity-80">Booked</span>}
                </button>
              ))}
            </div>
            {slots.every((s) => !s.available) && (
              <p className="mt-2 text-sm text-muted-foreground">All slots taken this day — try another date.</p>
            )}
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-base font-semibold">Service address</h2>
        <Input data-testid="booking-address-input" placeholder="House / flat, street, landmark" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
        <p className="text-xs text-muted-foreground">City: {location.name}</p>
        <Textarea data-testid="booking-notes-input" placeholder="Notes for the professional (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </section>

      <Card className="space-y-2 rounded-xl p-4">
        <h2 className="font-display text-base font-semibold">Payment</h2>
        {razorpayOn && (
          <button
            type="button"
            data-testid="booking-razorpay-option"
            onClick={() => setPaymentMethod('razorpay')}
            className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left ${paymentMethod === 'razorpay' ? 'border-[hsl(var(--serve))] bg-[hsl(var(--accent))]' : 'border-border bg-card'}`}
          >
            <CreditCard className="h-5 w-5 text-[hsl(var(--serve))]" />
            <div>
              <p className="text-sm font-semibold">Pay online (Razorpay)</p>
              <p className="text-xs text-muted-foreground">UPI, cards, netbanking</p>
            </div>
          </button>
        )}
        <button
          type="button"
          data-testid="booking-cod-option"
          onClick={() => setPaymentMethod('cod')}
          className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left ${paymentMethod === 'cod' ? 'border-[hsl(var(--serve))] bg-[hsl(var(--accent))]' : 'border-border bg-card'}`}
        >
          <Banknote className="h-5 w-5 text-[hsl(var(--serve))]" />
          <div>
            <p className="text-sm font-semibold">Pay after service</p>
            <p className="text-xs text-muted-foreground">Cash / UPI to the professional</p>
          </div>
        </button>
      </Card>

      <Button data-testid="service-booking-confirm-button" size="lg" className="w-full bg-[hsl(var(--serve))] hover:bg-[hsl(var(--serve))]/90"
        disabled={submitting} onClick={submit}>
        {submitting
          ? (paymentMethod === 'razorpay' ? 'Opening payment…' : 'Booking…')
          : (paymentMethod === 'razorpay'
            ? `Pay & book · ${inr(service.base_price)}`
            : `Confirm booking · ${inr(service.base_price)} (pay after service)`)}
      </Button>
    </div>
  );
}
