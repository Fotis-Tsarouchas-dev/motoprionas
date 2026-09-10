'use client';

import { useEffect, useState } from 'react';
import { handleAuthCallback } from '@netlify/identity';
import { useRouter } from 'next/navigation';

const AUTH_HASH_PATTERN =
  /^#(?:confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;

export default function IdentityCallbackHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!AUTH_HASH_PATTERN.test(window.location.hash)) {
      return;
    }

    let active = true;
    setProcessing(true);

    handleAuthCallback()
      .then((result) => {
        if (!active) return;

        if (!result) {
          setProcessing(false);
          return;
        }

        if (result.type === 'invite') {
          if (!result.token) {
            throw new Error('Η πρόσκληση δεν περιέχει έγκυρο token.');
          }

          sessionStorage.setItem('netlify-invite-token', result.token);
          router.replace('/admin/set-password?mode=invite');
          return;
        }

        if (result.type === 'recovery') {
          router.replace('/admin/set-password?mode=recovery');
          return;
        }

        router.replace('/admin');
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Ο σύνδεσμος σύνδεσης δεν μπόρεσε να ολοκληρωθεί.',
        );
        setProcessing(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (processing) {
    return (
      <main className="auth-callback-state">
        <div className="content-card">
          <h1>Επιβεβαίωση λογαριασμού</h1>
          <p>Παρακαλώ περιμένετε…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="auth-callback-state">
        <div className="content-card">
          <h1>Ο σύνδεσμος δεν είναι έγκυρος</h1>
          <p className="error">{error}</p>
          <a className="button" href="/admin/login">
            Μετάβαση στη σύνδεση
          </a>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
