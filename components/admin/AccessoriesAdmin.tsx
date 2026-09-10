'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/formatting';

type AccessoryStatus = 'active' | 'sold' | 'hidden';

type Accessory = {
  id: string;
  title: string;
  price_eur: number | null;
  description: string;
  status: AccessoryStatus;
  created_at: string;
  cover?: string;
};

function statusLabel(status: AccessoryStatus) {
  if (status === 'active') return 'Ενεργό';
  if (status === 'sold') return 'Πουλήθηκε';
  return 'Κρυφό';
}

export default function AccessoriesAdmin() {
  const router = useRouter();
  const [items, setItems] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/accessories', {
        cache: 'no-store',
      });

      if (response.status === 401 || response.status === 403) {
        router.replace('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error(
          'Τα αξεσουάρ και ανταλλακτικά δεν μπόρεσαν να φορτωθούν.',
        );
      }

      setItems(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Παρουσιάστηκε κάποιο πρόβλημα.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(
    item: Accessory,
    status: AccessoryStatus,
  ) {
    setBusyId(item.id);
    setError('');

    try {
      const response = await fetch(
        `/api/admin/accessories/${item.id}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            price_eur: item.price_eur,
            description: item.description,
            status,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || 'Η αλλαγή κατάστασης απέτυχε.',
        );
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Παρουσιάστηκε κάποιο πρόβλημα.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Οριστική διαγραφή είδους;')) return;

    setBusyId(id);
    setError('');

    try {
      const response = await fetch(
        `/api/admin/accessories/${id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Η διαγραφή απέτυχε.');
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Παρουσιάστηκε κάποιο πρόβλημα.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-shell">
      <div className="admin-toolbar">
        <div>
          <h1>Αξεσουάρ & Ανταλλακτικά</h1>
          <p className="muted">
            Ξεχωριστή διαχείριση ειδών από τις αγγελίες
            μοτοσυκλετών.
          </p>
        </div>

        <div className="admin-toolbar-actions">
          <Link
            className="button"
            href="/admin/axesouar-antallaktika/neo"
          >
            + Νέο είδος
          </Link>

          <Link className="button secondary" href="/admin">
            Πίνακας ελέγχου
          </Link>
        </div>
      </div>

      {error && (
        <p className="error admin-message" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Φόρτωση…</p>
      ) : items.length ? (
        <div className="admin-list">
          {items.map((item) => {
            const busy = busyId === item.id;

            return (
              <article
                className="admin-listing-card"
                key={item.id}
              >
                <div className="admin-listing-thumb">
                  {item.cover ? (
                    <img
                      src={`/media/${encodeURIComponent(
                        item.cover,
                      )}`}
                      alt=""
                    />
                  ) : (
                    <span>Χωρίς φωτογραφία</span>
                  )}
                </div>

                <div className="admin-listing-info">
                  <div className="admin-listing-title-row">
                    <strong>{item.title}</strong>

                    <span
                      className={`status-badge status-${item.status}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div className="admin-listing-meta">
                    <span>{formatPrice(item.price_eur)}</span>
                    {item.created_at && (
                      <span>
                        {new Date(
                          item.created_at,
                        ).toLocaleDateString('el-GR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-actions">
                  {item.status === 'active' ? (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        setStatus(item, 'hidden')
                      }
                    >
                      Απόκρυψη
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        setStatus(item, 'active')
                      }
                    >
                      Ενεργοποίηση
                    </button>
                  )}

                  {item.status !== 'sold' && (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setStatus(item, 'sold')}
                    >
                      Πουλήθηκε
                    </button>
                  )}

                  <button
                    type="button"
                    className="button danger"
                    disabled={busy}
                    onClick={() => remove(item.id)}
                  >
                    Διαγραφή
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="content-card">
          <p>Δεν υπάρχουν αξεσουάρ ή ανταλλακτικά ακόμη.</p>
          <Link
            className="button"
            href="/admin/axesouar-antallaktika/neo"
          >
            Δημιουργία πρώτου είδους
          </Link>
        </div>
      )}
    </main>
  );
}
