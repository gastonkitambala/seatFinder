import type { Metadata } from 'next';
import LoginForm from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Organizer sign in',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-lilac-50 px-5 py-12">
      <div className="w-full max-w-[380px]">
        <div className="animate-rise text-center">
          <p className="eyebrow">Deborah &amp; Itaka</p>
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-ink">
            Organizer sign in
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            This area manages the guest list. Guests never see it.
          </p>
        </div>

        <div className="animate-rise mt-8" style={{ animationDelay: '80ms' }}>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
