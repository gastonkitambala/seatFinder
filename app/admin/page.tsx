import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/admin/Dashboard';
import { hasValidSession } from '@/lib/session';
import { getHeroPhotoVersion, getSettings, listGuests } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guest list | Seat finder',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Middleware only checks that a cookie exists; this verifies the signature.
  if (!(await hasValidSession())) {
    redirect('/admin/login');
  }

  return (
    <Dashboard
      initialGuests={listGuests()}
      settings={getSettings()}
      photoVersion={getHeroPhotoVersion()}
    />
  );
}
