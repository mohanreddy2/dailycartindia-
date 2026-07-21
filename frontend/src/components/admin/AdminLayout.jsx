import React from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Store, Users, Package, CalendarClock, MessageSquareWarning, LogOut, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../lib/store';
import { cn } from '../../lib/utils';

export default function AdminLayout() {
  const { user, loaded, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!loaded) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!user.capabilities?.includes('admin')) {
    return (
      <div className="portal-admin flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">Admin access required</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Your account doesn’t have admin permissions. Login with an admin account to continue.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/')}>Go to customer app</Button>
          <Button type="button" onClick={() => { logout(); navigate('/admin/login'); }}>Login as admin</Button>
        </div>
      </div>
    );
  }

  const nav = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/kyc', icon: ShieldCheck, label: 'KYC queue' },
    { to: '/admin/vendors', icon: Store, label: 'Vendors' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/orders', icon: Package, label: 'Orders' },
    { to: '/admin/bookings', icon: CalendarClock, label: 'Bookings' },
    { to: '/admin/disputes', icon: MessageSquareWarning, label: 'Disputes' },
  ];

  return (
    <div className="portal-admin min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-1.5 font-display text-lg font-bold tracking-tight">
            <Shield className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden />
            DailyCart <span className="text-[hsl(var(--primary))]">Ops</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">{user.name}</span>
            <Button type="button" data-testid="admin-logout-button" variant="outline" size="sm" className="gap-1.5" onClick={() => { logout(); navigate('/admin/login'); }}>
              <LogOut className="h-4 w-4" aria-hidden /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-48 shrink-0 border-r bg-card md:block">
          <nav aria-label="Admin" className="space-y-0.5 p-2">
            {nav.map(({ to, icon: Icon, label, end }) => {
              const active = end ? pathname === to : pathname.startsWith(to);
              return (
                <Link key={to} to={to} data-testid={`admin-nav-${label.toLowerCase().replace(' ', '-')}`} aria-current={active ? 'page' : undefined}
                  className={cn('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'text-muted-foreground hover:bg-muted')}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <nav aria-label="Admin sections" className="mb-4 flex gap-2 overflow-x-auto no-scrollbar md:hidden">
            {nav.map(({ to, label, end }) => {
              const active = end ? pathname === to : pathname.startsWith(to);
              return (
                <Link key={to} to={to} aria-current={active ? 'page' : undefined}
                  className={cn('shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium', active ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'bg-card')}>
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
