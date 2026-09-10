'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type AdminAccessory = {
  id: string;
  title: string;
  price_eur: number | null;
  description: string;
  status: 'active' | 'sold' | 'hidden';
};

export default function PublicAccessoryAdminActions({
  accessoryId,
}: {
  accessoryId: string;
}) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!active || !response.ok) return;

        const data = (await response.json()) as {
          user?: { roles?: string[] };
        };

        setIsAdmin(Boolean(data.user?.roles?.includes('admin')));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  if (!isAdmin) return null;

  async function getAccessory(): Promise<AdminAccessory> {
    const response = await fetch(`/api/admin/accessories/${accessoryId}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Το είδος δεν μπόρεσε να φορτωθεί.');
    }

    return response.json();
  }

  async function changeStatus(status: 'hidden' | 'sold') {
    setBusy(true);
    setError('');

    try {
      const item = await getAccessory();
      const response = await fetch(`/api/admin/accessories/${accessoryId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          price_eur: item.price_eur,
          description: item.description,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Η αλλαγή κατάστασης απέτυχε.');
      }

      router.replace('/admin/axesouar-antallaktika');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Παρουσιάστηκε κάποιο πρόβλημα.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccessory() {
    if (!window.confirm('Οριστική διαγραφή είδους;')) return;

    setBusy(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/accessories/${accessoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Η διαγραφή απέτυχε.');

      router.replace('/admin/axesouar-antallaktika');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Παρουσιάστηκε κάποιο πρόβλημα.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="admin-public-actions" aria-label="Ενέργειες διαχειριστή">
      <div className="admin-public-actions-head">
        <strong>Ενέργειες διαχειριστή</strong>
        <span>Η περιοχή αυτή εμφανίζεται μόνο στον διαχειριστή.</span>
      </div>

      <div className="admin-public-actions-buttons">
        <Link className="button secondary" href="/admin/axesouar-antallaktika">
          Διαχείριση ειδών
        </Link>

        <Link
          className="button secondary"
          href={`/admin/axesouar-antallaktika/${accessoryId}/epexergasia`}
        >
          Επεξεργασία
        </Link>

        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => changeStatus('hidden')}
        >
          Απόκρυψη
        </button>

        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => changeStatus('sold')}
        >
          Πουλήθηκε
        </button>

        <button
          type="button"
          className="button danger"
          disabled={busy}
          onClick={deleteAccessory}
        >
          Διαγραφή
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}
