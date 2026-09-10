'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  acceptInvite,
  hydrateSession,
  updateUser,
} from '@netlify/identity';
import { useRouter } from 'next/navigation';

type Mode = 'invite' | 'recovery';

export default function SetPassword() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get('mode');

    if (requestedMode !== 'invite' && requestedMode !== 'recovery') {
      setError('Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.');
      return;
    }

    setMode(requestedMode);

    if (requestedMode === 'invite') {
      const token = sessionStorage.getItem('netlify-invite-token');

      if (!token) {
        setError('Η πρόσκληση δεν είναι πλέον διαθέσιμη. Ζητήστε νέα πρόσκληση.');
        return;
      }

      setReady(true);
      return;
    }

    hydrateSession()
      .then((user) => {
        if (!user) {
          setError(
            'Η επαναφορά κωδικού έχει λήξει. Ζητήστε νέο email επαναφοράς.',
          );
          return;
        }

        setReady(true);
      })
      .catch(() => {
        setError(
          'Η επαναφορά κωδικού δεν μπόρεσε να ολοκληρωθεί. Ζητήστε νέο email.',
        );
      });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
      return;
    }

    if (password !== confirmation) {
      setError('Οι δύο κωδικοί δεν ταιριάζουν.');
      return;
    }

    if (!mode) {
      setError('Ο σύνδεσμος δεν είναι έγκυρος.');
      return;
    }

    setBusy(true);

    try {
      if (mode === 'invite') {
        const token = sessionStorage.getItem('netlify-invite-token');

        if (!token) {
          throw new Error(
            'Η πρόσκληση δεν είναι πλέον διαθέσιμη. Ζητήστε νέα πρόσκληση.',
          );
        }

        await acceptInvite(token, password);
        sessionStorage.removeItem('netlify-invite-token');
      } else {
        await hydrateSession();
        await updateUser({ password });
      }

      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ο κωδικός δεν μπόρεσε να αποθηκευτεί. Δοκιμάστε ξανά.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-shell">
      <h1>
        {mode === 'invite'
          ? 'Δημιουργία Κωδικού Πρόσβασης'
          : 'Νέος Κωδικός Πρόσβασης'}
      </h1>

      <form className="admin-form" onSubmit={submit}>
        <p className="muted">
          {mode === 'invite'
            ? 'Ορίστε τον κωδικό που θα χρησιμοποιείτε για τη σύνδεση στη διαχείριση.'
            : 'Ορίστε έναν νέο κωδικό πρόσβασης για τον λογαριασμό διαχειριστή.'}
        </p>

        <label className="field">
          Νέος κωδικός πρόσβασης
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            required
            disabled={!ready || busy}
          />
        </label>

        <label className="field">
          Επιβεβαίωση κωδικού
          <input
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            required
            disabled={!ready || busy}
          />
        </label>

        {error && (
          <p className="error" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        <button className="button" disabled={!ready || busy}>
          {busy ? 'Αποθήκευση…' : 'Αποθήκευση Κωδικού'}
        </button>
      </form>
    </main>
  );
}
