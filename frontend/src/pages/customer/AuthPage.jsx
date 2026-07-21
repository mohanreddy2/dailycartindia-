import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/store';
import { toast } from 'sonner';
import { KeyRound, Smartphone } from 'lucide-react';

export default function AuthPage({ portal = 'customer' }) {
  const { login, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || (portal === 'vendor' ? '/vendor' : portal === 'admin' ? '/admin' : '/');

  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const done = async (data) => {
    login(data.access_token, data.user);
    await refreshMe();
    toast.success(`Welcome, ${data.user.name}!`);
    navigate(next);
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = mode === 'login'
        ? await api.post('/auth/login', { email, password })
        : await api.post('/auth/register', { name, email, password, phone: phone || null });
      await done(data);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const sendOtp = async () => {
    if (phone.replace(/\D/g, '').length < 10) { toast.error('Enter a valid 10-digit phone'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/otp/send', { phone });
      setOtpSent(true);
      setDevOtp(data.dev_otp);
      toast.success('OTP generated');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { phone, otp, name: name || null });
      await done(data);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const demoHint = portal === 'admin'
    ? { email: 'admin@dailycart.in', password: 'Admin@123', note: 'Ops console' }
    : portal === 'vendor'
      ? { email: 'vendor.mart@dailycart.in', password: 'Demo@123', note: 'Mart partner (or vendor.service@…)' }
      : { email: 'customer@dailycart.in', password: 'Demo@123', note: 'Customer app' };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold">
          {portal === 'vendor' ? 'DailyPro Partner' : portal === 'admin' ? 'DailyCart Ops' : 'Welcome to DailyCart'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {portal === 'vendor' ? 'Login or create an account to manage your business' : portal === 'admin' ? 'Sign in with an admin account' : 'Local stores & services, one account'}
        </p>
      </div>

      <Card className="rounded-2xl p-5">
        <Tabs defaultValue="email" data-testid="auth-tabs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger data-testid="auth-email-tab" value="email" className="gap-1.5"><KeyRound className="h-4 w-4" /> Email</TabsTrigger>
            <TabsTrigger data-testid="auth-otp-tab" value="otp" className="gap-1.5"><Smartphone className="h-4 w-4" /> Phone OTP</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <form onSubmit={submitEmail} className="space-y-3">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" data-testid="auth-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required minLength={2} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" data-testid="auth-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" data-testid="auth-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" data-testid="auth-phone-optional-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
                </div>
              )}
              <Button data-testid="auth-submit-button" type="submit" className="w-full" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
              </Button>
            </form>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {mode === 'login' ? "New to DailyCart?" : 'Already have an account?'}{' '}
              <button type="button" data-testid="auth-switch-mode-button" className="font-semibold text-[hsl(var(--primary))]" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Create account' : 'Login'}
              </button>
            </p>
          </TabsContent>

          <TabsContent value="otp" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="otp-phone">Phone number</Label>
              <Input id="otp-phone" data-testid="auth-phone-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" disabled={otpSent} />
            </div>
            {!otpSent ? (
              <Button type="button" data-testid="auth-send-otp-button" className="w-full" onClick={sendOtp} disabled={busy}>Send OTP</Button>
            ) : (
              <>
                {devOtp && (
                  <Alert data-testid="auth-dev-otp-alert" className="border-[hsl(var(--trust))] bg-[hsl(var(--trust-soft))]">
                    <AlertTitle className="text-sm text-[hsl(var(--trust-soft-foreground))]">Dev mode — your OTP: <span className="font-mono text-base font-bold tabular-nums">{devOtp}</span></AlertTitle>
                    <AlertDescription className="text-xs text-[hsl(var(--trust-soft-foreground))]/80">SMS delivery isn’t enabled yet, so we show the code here.</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="otp-code">Enter OTP</Label>
                  <Input id="otp-code" data-testid="auth-otp-input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} className="text-center font-mono text-lg tracking-[0.5em]" />
                </div>
                <Button type="button" data-testid="auth-verify-otp-button" className="w-full" onClick={verifyOtp} disabled={busy || otp.length !== 6}>Verify & continue</Button>
                <button type="button" className="w-full text-center text-xs text-muted-foreground underline" onClick={() => { setOtpSent(false); setOtp(''); setDevOtp(null); }}>Change number</button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      <div data-testid="auth-demo-hint" className="mt-4 rounded-xl border border-dashed bg-muted/40 px-3 py-2.5 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Demo · {demoHint.note}</p>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-foreground">
          {demoHint.email} <span className="text-muted-foreground">/</span> {demoHint.password}
        </p>
      </div>
    </div>
  );
}
