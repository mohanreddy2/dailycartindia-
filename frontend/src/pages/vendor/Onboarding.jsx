import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { api, errMsg } from '../../lib/api';
import { useAuth, useLocationCtx } from '../../lib/store';
import { toast } from 'sonner';
import { Store, Wrench, Crosshair, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Onboarding() {
  const { user, vendor, loaded, refreshMe } = useAuth();
  const { location } = useLocationCtx();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState('');
  const [cities, setCities] = useState([]);
  const [cats, setCats] = useState([]);

  const [form, setForm] = useState({
    type: 'mart', name: '', description: '', category_slugs: [],
    address: '', city: location.name, lat: location.lat, lng: location.lng,
    min_order: 0, delivery_fee: 25, kyc_id_type: 'aadhaar', kyc_id_number: '',
  });

  useEffect(() => {
    api.get('/cities').then(({ data }) => setCities(data)).catch(() => {});
    api.get('/categories').then(({ data }) => setCats(data)).catch(() => {});
  }, []);

  if (!loaded) return null;
  if (!user) return <Navigate to="/vendor/auth" replace />;
  if (vendor) return <Navigate to="/vendor" replace />;

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const relevantCats = cats.filter((c) => (form.type === 'mart' ? c.kind === 'product' : c.kind === 'service'));

  const toggleCat = (slug) => {
    upd('category_slugs', form.category_slugs.includes(slug)
      ? form.category_slugs.filter((s) => s !== slug)
      : [...form.category_slugs, slug]);
  };

  const useGps = () => {
    if (!navigator.geolocation) return toast.error('GPS not available');
    navigator.geolocation.getCurrentPosition(
      (pos) => { upd('lat', pos.coords.latitude); upd('lng', pos.coords.longitude); toast.success('Location captured from GPS'); },
      () => toast.error('Could not read GPS. Pick your city instead.')
    );
  };

  const canNext = step === 0 ? !!form.type
    : step === 1 ? form.name.trim().length >= 2 && form.category_slugs.length > 0
    : step === 2 ? form.address.trim().length >= 3 && form.city
    : form.kyc_id_number.trim().length >= 4;

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/vendor/onboarding', form);
      await refreshMe();
      setSubmittedName(form.name);
      setSubmitted(true);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const steps = ['Business type', 'Business details', 'Location', 'KYC verification'];

  // ── Success screen ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="portal-vendor min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-md w-full space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold">Registration submitted!</h1>
            <p className="text-muted-foreground text-sm">
              <span className="font-semibold text-foreground">{submittedName}</span> has been submitted for KYC verification.
              Our ops team reviews applications within <strong>24 hours</strong>.
            </p>
          </div>

          <Card className="rounded-2xl p-5 text-left space-y-3">
            <p className="text-sm font-semibold">What happens next?</p>
            <ol className="space-y-2.5 text-sm text-muted-foreground">
              {[
                { icon: Clock, text: 'Our team verifies your submitted ID and store details.' },
                { icon: CheckCircle2, text: 'Once approved, you\'ll see your full vendor dashboard.' },
                { icon: Store, text: 'Customers in your area can start discovering and ordering from you.' },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              data-testid="go-to-vendor-after-onboarding"
              className="w-full gap-2"
              onClick={() => navigate('/vendor')}
            >
              Go to vendor portal <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Browse as customer meanwhile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Multi-step form ─────────────────────────────────────────────
  return (
    <div className="portal-vendor min-h-screen bg-background px-4 py-8">
      <div data-testid="vendor-onboarding" className="mx-auto max-w-lg">
        <h1 className="font-display text-2xl font-bold">Set up your business</h1>
        <p className="mt-1 text-sm text-muted-foreground">Step {step + 1} of 4 — {steps[step]}</p>
        <Progress value={(step + 1) * 25} className="mt-3 h-2" />

        <Card className="mt-5 rounded-2xl p-5">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: 'mart', icon: Store, t: 'Kirana / Mart store', d: 'Sell groceries & essentials for delivery' },
                { v: 'service', icon: Wrench, t: 'Service professional', d: 'Plumbing, electrical, cleaning, beauty…' },
              ].map(({ v, icon: Icon, t, d }) => (
                <button key={v} data-testid={`onboarding-type-${v}`}
                  onClick={() => { upd('type', v); upd('category_slugs', []); }}
                  className={cn('rounded-xl border-2 p-4 text-left transition-colors', form.type === v ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))]' : 'hover:bg-muted')}>
                  <Icon className="mb-2 h-6 w-6 text-[hsl(var(--primary))]" />
                  <p className="text-sm font-semibold">{t}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{d}</p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Business name</Label>
                <Input data-testid="onboarding-name-input" value={form.name} onChange={(e) => upd('name', e.target.value)}
                  placeholder={form.type === 'mart' ? 'e.g., Sri Lakshmi Kirana' : 'e.g., Ravi Home Services'} />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea data-testid="onboarding-description-input" value={form.description} onChange={(e) => upd('description', e.target.value)}
                  rows={2} placeholder="Tell customers what makes you great" />
              </div>
              <div className="space-y-1.5">
                <Label>Categories ({form.type === 'mart' ? 'what you sell' : 'what you do'})</Label>
                <div className="flex flex-wrap gap-2">
                  {relevantCats.map((c) => (
                    <button key={c.slug} data-testid="onboarding-category-chip" onClick={() => toggleCat(c.slug)}
                      className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors',
                        form.category_slugs.includes(c.slug) ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card hover:bg-muted')}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {form.type === 'mart' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Min order (₹)</Label>
                    <Input type="number" min="0" value={form.min_order} onChange={(e) => upd('min_order', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Delivery fee (₹)</Label>
                    <Input type="number" min="0" value={form.delivery_fee} onChange={(e) => upd('delivery_fee', Number(e.target.value))} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Shop / base address</Label>
                <Input data-testid="onboarding-address-input" value={form.address} onChange={(e) => upd('address', e.target.value)}
                  placeholder="Shop no, street, area" />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <div className="flex flex-wrap gap-2">
                  {cities.map((c) => (
                    <button key={c.id} data-testid="onboarding-city-chip"
                      onClick={() => { upd('city', c.name); upd('lat', c.lat); upd('lng', c.lng); }}
                      className={cn('rounded-full border px-3 py-1.5 text-sm', form.city === c.name ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card hover:bg-muted')}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={useGps}>
                <Crosshair className="h-4 w-4" /> Use exact GPS location
              </Button>
              <p className="text-xs text-muted-foreground">
                Customers within ~15 km of this pin will discover you. Current pin: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>ID type</Label>
                <div className="flex gap-2">
                  {['aadhaar', 'pan', 'gstin'].map((t) => (
                    <button key={t} onClick={() => upd('kyc_id_type', t)}
                      className={cn('rounded-full border px-3 py-1.5 text-sm uppercase',
                        form.kyc_id_type === t ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card hover:bg-muted')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>ID number</Label>
                <Input data-testid="onboarding-kyc-input" value={form.kyc_id_number} onChange={(e) => upd('kyc_id_number', e.target.value)}
                  placeholder={form.kyc_id_type === 'gstin' ? '15-char GSTIN' : form.kyc_id_type === 'pan' ? '10-char PAN' : '12-digit Aadhaar'} />
              </div>
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Your details are verified by our ops team before your business goes live. This usually takes under 24 hours.
              </p>
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 3 ? (
              <Button data-testid="vendor-onboarding-next-button" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</Button>
            ) : (
              <Button data-testid="vendor-onboarding-submit-button" disabled={!canNext || busy} onClick={submit}>
                {busy ? 'Submitting…' : 'Submit for verification'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
