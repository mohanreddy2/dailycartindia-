import React, { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, CalendarClock, Boxes, Wrench,
  Clock3, Wallet, UserCog, LogOut, Store, Hourglass, ShieldX,
  RefreshCw, MapPin, FileText,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAuth } from '../../lib/store';
import { cn } from '../../lib/utils';

/**
 * KycGate — shown when vendor's KYC is pending or rejected.
 * Auto-polls every 30 s so the vendor sees approval without manually refreshing.
 */
function KycGate({ vendor }) {
  const { logout, refreshMe } = useAuth();
  const navigate = useNavigate();
  const rejected = vendor.kyc_status === 'rejected';

  // Auto-poll for approval every 30 seconds
  useEffect(() => {
    if (rejected) return;
    const id = setInterval(() => { refreshMe(); }, 30_000);
    return () => clearInterval(id);
  }, [rejected, refreshMe]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card data-testid="vendor-kyc-pending" className="max-w-md w-full rounded-2xl p-6 space-y-5">
        {/* Icon */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {rejected
              ? <ShieldX className="h-8 w-8 text-destructive" />
              : <Hourglass className="h-8 w-8 text-amber-500 animate-pulse" />}
          </div>
          <h1 className="font-display text-xl font-bold">
            {rejected ? 'KYC Rejected' : 'Verification in progress'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {rejected
              ? `Your verification for "${vendor.name}" was rejected${vendor.kyc?.decision_note ? `: ${vendor.kyc.decision_note}` : '.'} Please contact support.`
              : `Thanks for registering. Our ops team is reviewing your details and will approve you within 24 hours.`}
          </p>
        </div>

        {/* Submission details */}
        <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
          <p className="font-semibold text-foreground">{vendor.name}</p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span className="capitalize">{vendor.type === 'mart' ? 'Kirana / Mart store' : 'Service professional'}</span>
          </div>
          {vendor.city && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{vendor.city}</span>
            </div>
          )}
          {vendor.kyc?.id_type && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="uppercase">{vendor.kyc.id_type}:</span>
              <span className="font-mono">{vendor.kyc.id_number}</span>
            </div>
          )}
          {vendor.kyc?.submitted_at && (
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(vendor.kyc.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {!rejected && (
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Checking for approval every 30 seconds…
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
            Browse as customer
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-1.5 text-muted-foreground"
            onClick={() => { logout(); navigate('/vendor/auth'); }}
          >
            <LogOut className="h-4 w-4" aria-hidden /> Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function VendorLayout() {
  const { user, vendor, loaded, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!loaded) return null;
  if (!user) return <Navigate to="/vendor/auth" replace />;
  if (!vendor) return <Navigate to="/vendor/onboarding" replace />;
  if (vendor.kyc_status !== 'approved') {
    return (
      <div className="portal-vendor min-h-screen bg-background">
        <KycGate vendor={vendor} />
      </div>
    );
  }

  const isMart = vendor.type === 'mart';
  const nav = [
    { to: '/vendor', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ...(isMart
      ? [
          { to: '/vendor/orders', icon: Package, label: 'Orders' },
          { to: '/vendor/inventory', icon: Boxes, label: 'Inventory' },
        ]
      : [
          { to: '/vendor/jobs', icon: CalendarClock, label: 'Jobs' },
          { to: '/vendor/services', icon: Wrench, label: 'Services' },
          { to: '/vendor/availability', icon: Clock3, label: 'Availability' },
        ]),
    { to: '/vendor/earnings', icon: Wallet, label: 'Earnings' },
    { to: '/vendor/profile', icon: UserCog, label: 'Profile' },
  ];

  return (
    <div className="portal-vendor min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/vendor" className="flex items-center gap-1.5 font-display text-lg font-bold tracking-tight">
            <Store className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden />
            Daily<span className="text-[hsl(var(--primary))]">Pro</span>
          </Link>
          <span
            className="hidden max-w-[200px] truncate rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-block"
            title={vendor.name}
          >
            {vendor.name}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/')}>
              Customer app
            </Button>
            <Button
              type="button"
              data-testid="vendor-logout-button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { logout(); navigate('/vendor/auth'); }}
            >
              <LogOut className="h-4 w-4" aria-hidden /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-48 shrink-0 border-r bg-card md:block">
          <nav aria-label="Vendor" className="space-y-0.5 p-2">
            {nav.map(({ to, icon: Icon, label, end }) => {
              const active = end ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  data-testid={`vendor-nav-${label.toLowerCase()}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          {/* Mobile nav */}
          <nav aria-label="Vendor sections" className="mb-4 flex gap-2 overflow-x-auto no-scrollbar md:hidden">
            {nav.map(({ to, label, end }) => {
              const active = end ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium',
                    active ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
