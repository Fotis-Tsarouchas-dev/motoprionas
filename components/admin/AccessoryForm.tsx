'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Status = 'active' | 'hidden' | 'sold';
type ExistingImage = {
  id: string;
  display_blob_key: string;
  thumbnail_blob_key: string;
  sort_order: number;
  is_cover: boolean;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

async function preprocess(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Μη υποστηριζόμενος τύπος φωτογραφίας.');
  }

  const bitmap = await createImageBitmap(file);
  const max = 2560;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close();
    throw new Error('Αδυναμία επεξεργασίας φωτογραφίας.');
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.9;
  let blob: Blob | null = null;

  while (quality >= 0.68) {
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (blob && blob.size < 4 * 1024 * 1024) break;
    quality -= 0.06;
  }

  if (!blob || blob.size >= 4 * 1024 * 1024) {
    throw new Error('Η φωτογραφία παραμένει πολύ μεγάλη μετά τη συμπίεση.');
  }

  return blob;
}

export default function AccessoryForm({ id }: { id?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('active');
  const [files, setFiles] = useState<File[]>([]);
  const [existing, setExisting] = useState<ExistingImage[]>([]);
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    fetch(`/api/admin/accessories/${id}`, { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          router.replace('/admin/login');
          return;
        }
        if (!response.ok) throw new Error();

        const item = await response.json();
        setTitle(item.title ?? '');
        setPrice(item.price_eur === null ? '' : String(item.price_eur));
        setDescription(item.description ?? '');
        setStatus(item.status);
        setExisting(item.images ?? []);
        setLoaded(true);
      })
      .catch(() => {
        setError('Το είδος δεν μπόρεσε να φορτωθεί.');
        setLoaded(true);
      });
  }, [id, router]);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => previews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [previews]);

  const totalImages = existing.length + files.length;

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const available = Math.max(0, 20 - existing.length);
    setFiles((current) => [...current, ...Array.from(fileList)].slice(0, available));
  }

  function moveFile(index: number, direction: number) {
    setFiles((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function upload(accessoryId: string, file: File, index: number) {
    setProgress(`Μεταφόρτωση φωτογραφίας ${index + 1}/${files.length}…`);
    const blob = await preprocess(file);
    const response = await fetch(`/api/admin/accessories/${accessoryId}/images`, {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg' },
      body: blob,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Η μεταφόρτωση απέτυχε.');
    }
  }

  async function persistOrder(next: ExistingImage[]) {
    if (!id) return;
    setExisting(next);
    const coverId = (next.find((image) => image.is_cover) ?? next[0])?.id;

    const response = await fetch(`/api/admin/accessories/${id}/images/order`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: next.map((image) => image.id), coverId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Η σειρά φωτογραφιών δεν αποθηκεύτηκε.');
    }
  }

  function moveExisting(index: number, direction: number) {
    const next = [...existing];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  function setCover(imageId: string) {
    void persistOrder(
      existing.map((image) => ({ ...image, is_cover: image.id === imageId })),
    );
  }

  async function deleteImage(imageId: string) {
    if (!id || !window.confirm('Αφαίρεση φωτογραφίας;')) return;

    const response = await fetch(`/api/admin/accessories/${id}/images/${imageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Η φωτογραφία δεν αφαιρέθηκε.');
      return;
    }

    const next = existing.filter((image) => image.id !== imageId);
    setExisting(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (status === 'active' && totalImages < 1) {
      setError('Ένα ενεργό είδος πρέπει να έχει τουλάχιστον μία φωτογραφία.');
      return;
    }

    setBusy(true);
    let accessoryId = id;
    let createdHere = false;

    try {
      const data = {
        title,
        price_eur: price.trim() ? Number(price) : null,
        description,
        status,
      };

      if (!accessoryId) {
        setProgress('Δημιουργία είδους…');
        const response = await fetch('/api/admin/accessories', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...data, status: 'hidden' }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Το είδος δεν αποθηκεύτηκε.');
        }

        const created = await response.json();
        accessoryId = created.id;
        createdHere = true;
      }

      for (let index = 0; index < files.length; index++) {
        await upload(accessoryId!, files[index], index);
      }

      setProgress('Αποθήκευση…');
      const response = await fetch(`/api/admin/accessories/${accessoryId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Οι αλλαγές δεν αποθηκεύτηκαν.');
      }

      router.replace('/admin/axesouar-antallaktika');
      router.refresh();
    } catch (err) {
      if (createdHere && accessoryId) {
        await fetch(`/api/admin/accessories/${accessoryId}`, {
          method: 'DELETE',
        }).catch(() => {});
      }

      setError(
        err instanceof Error ? err.message : 'Παρουσιάστηκε κάποιο πρόβλημα.',
      );
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  if (!loaded) {
    return (
      <main className="admin-shell">
        <p>Φόρτωση…</p>
      </main>
    );
  }

  return (
    <main className="admin-shell admin-form-page">
      <div className="admin-toolbar">
        <div>
          <h1>{id ? 'Επεξεργασία Αξεσουάρ / Ανταλλακτικού' : 'Νέο Αξεσουάρ / Ανταλλακτικό'}</h1>
          <p className="muted">
            {id ? 'Επεξεργαστείτε τα στοιχεία και τις φωτογραφίες του είδους.' : 'Δημιουργήστε νέο είδος ανεξάρτητα από τις αγγελίες μοτοσυκλετών.'}
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={submit}>
        <label className="field">
          Τίτλος
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={140} />
        </label>

        <label className="field">
          Τιμή (€) — αφήστε κενό για «Ρωτήστε μας»
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={price}
            onChange={(event) => setPrice(digitsOnly(event.target.value))}
            placeholder="π.χ. 5000"
          />
        </label>

        <label className="field">
          Περιγραφή (προαιρετική)
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={10000}
          />
        </label>

        <label className="field">
          Κατάσταση
          <select value={status} onChange={(event) => setStatus(event.target.value as Status)}>
            <option value="active">Ενεργό</option>
            <option value="hidden">Κρυφό</option>
            <option value="sold">Πουλήθηκε</option>
          </select>
        </label>

        <div className="field">
          <strong>Φωτογραφίες ({totalImages}/20)</strong>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={totalImages >= 20}
            onChange={(event) => addFiles(event.target.files)}
          />
        </div>

        {existing.length > 0 && (
          <div className="admin-list">
            <strong>Υπάρχουσες φωτογραφίες</strong>
            {existing.map((image, index) => (
              <div className="admin-row" key={image.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={`/media/${encodeURIComponent(image.thumbnail_blob_key)}`}
                    alt=""
                    style={{ width: 90, height: 70, objectFit: 'cover', borderRadius: 8 }}
                  />
                  <span>{image.is_cover ? 'Κύρια φωτογραφία' : `Φωτογραφία ${index + 1}`}</span>
                </div>

                <div className="cta-row">
                  <button type="button" className="button secondary" onClick={() => moveExisting(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" className="button secondary" onClick={() => moveExisting(index, 1)} disabled={index === existing.length - 1}>↓</button>
                  {!image.is_cover && (
                    <button type="button" className="button secondary" onClick={() => setCover(image.id)}>Ορισμός ως κύρια</button>
                  )}
                  <button type="button" className="button danger" onClick={() => deleteImage(image.id)}>Αφαίρεση</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {previews.length > 0 && (
          <div className="admin-list">
            <strong>Νέες φωτογραφίες</strong>
            {previews.map(({ file, url }, index) => (
              <div className="admin-row" key={`${file.name}-${index}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <img
                    src={url}
                    alt="Προεπισκόπηση"
                    style={{ width: 90, height: 70, objectFit: 'cover', borderRadius: 8 }}
                  />
                  <span style={{ overflowWrap: 'anywhere' }}>{file.name}</span>
                </div>

                <div className="cta-row">
                  <button type="button" className="button secondary" onClick={() => moveFile(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" className="button secondary" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1}>↓</button>
                  <button type="button" className="button danger" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>Αφαίρεση</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        {progress && <p aria-live="polite">{progress}</p>}

        <div className="admin-form-actions">
          <button className="button" disabled={busy}>{busy ? 'Αποθήκευση…' : 'Αποθήκευση είδους'}</button>
          <button type="button" className="button secondary" disabled={busy} onClick={() => router.push('/admin/axesouar-antallaktika')}>Ακύρωση</button>
        </div>
      </form>
    </main>
  );
}
