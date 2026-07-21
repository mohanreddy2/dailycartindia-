import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/store';
import AuthPage from '../customer/AuthPage';
import { ShieldCheck } from 'lucide-react';

/**
 * AdminLogin — standalone admin authentication page.
 * Uses the shared AuthPage component in admin portal mode.
 * Redirects to /admin if already authenticated as admin.
 */
export default function AdminLogin() {
  const { user, loaded } = useAuth();

  if (!loaded) return null;

  if (loaded && user) {
    const isAdmin = user.capabilities?.includes('admin');
    if (isAdmin) return <Navigate to="/admin" replace />;
    // Logged in but not admin — show error inside the portal skin
    return (
      <div className="portal-admin min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldCheck className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-display text-xl font-bold">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            Your account ({user.email || user.phone}) does not have admin privileges.
          </p>
          <a href="/" className="text-sm text-[hsl(var(--primary))] underline">Back to customer app</a>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-admin min-h-screen bg-background px-4">
      <AuthPage portal="admin" />
    </div>
  );
}
