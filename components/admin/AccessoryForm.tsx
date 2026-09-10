'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Status = 'active' | 'hidden' | 'sold';

async function preprocess(file: File) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  ) {
    throw new Error('Μη υποστηριζόμενος τύπος φωτογραφίας.');
  }

  const bitmap = await createImageBitmap(file);
  const max = 2560;
  const scale = Math.min(
    1,
    max / Math.max(bitmap.width, bitmap.height),
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close();
    throw new Error('Αδυναμία επεξεργασίας φωτογραφίας.');
  }

  context.drawImage(
    bitmap,
    0,
    0,
    canvas.width,
    canvas.height,
  );
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
    throw new Error(
      'Η φωτογραφία παραμένει πολύ μεγάλη μετά τη συμπίεση.',
    );
  }

  return blob;
}

export default function AccessoryForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('active');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    setFiles((current) =>
      [...current, ...Array.from(fileList)].slice(0, 20),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!files.length) {
      setError('Προσθέστε τουλάχιστον μία φωτογραφία.');
      return;
    }

    setBusy(true);
    let createdId: string | null = null;

    try {
      setProgress('Δημιουργία είδους…');

      const createResponse = await fetch(
        '/api/admin/accessories',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title,
            price_eur: price.trim() ? Number(price) : null,
            description,
            status: 'hidden',
          }),
        },
      );

      if (!createResponse.ok) {
        const data = await createResponse
          .json()
          .catch(() => ({}));

        throw new Error(
          data.error || 'Το είδος δεν αποθηκεύτηκε.',
        );
      }

      const created = await createResponse.json();
      createdId = created.id;

      for (let index = 0; index < files.length; index++) {
        setProgress(
          `Μεταφόρτωση φωτογραφίας ${index + 1}/${files.length}…`,
        );

        const blob = await preprocess(files[index]);

        const uploadResponse = await fetch(
          `/api/admin/accessories/${created.id}/images`,
          {
            method: 'POST',
            headers: { 'content-type': 'image/jpeg' },
            body: blob,
          },
        );

        if (!uploadResponse.ok) {
          const data = await uploadResponse
            .json()
            .catch(() => ({}));

          throw new Error(
            data.error || 'Η μεταφόρτωση απέτυχε.',
          );
        }
      }

      if (status !== 'hidden') {
        setProgress('Δημοσίευση…');

        const publishResponse = await fetch(
          `/api/admin/accessories/${created.id}`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              title,
              price_eur: price.trim()
                ? Number(price)
                : null,
              description,
              status,
            }),
          },
        );

        if (!publishResponse.ok) {
          const data = await publishResponse
            .json()
            .catch(() => ({}));

          throw new Error(
            data.error || 'Η δημοσίευση απέτυχε.',
          );
        }
      }

      router.replace('/admin/axesouar-antallaktika');
      router.refresh();
    } catch (err) {
      if (createdId) {
        await fetch(`/api/admin/accessories/${createdId}`, {
          method: 'DELETE',
        }).catch(() => {});
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Παρουσιάστηκε κάποιο πρόβλημα.',
      );
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <main className="admin-shell admin-form-page">
      <div className="admin-toolbar">
        <div>
          <h1>Νέο Αξεσουάρ / Ανταλλακτικό</h1>
          <p className="muted">
            Δημιουργήστε νέο είδος ανεξάρτητα από τις
            αγγελίες μοτοσυκλετών.
          </p>
        </div>
      </div>

      <form className="admin-form" onSubmit={submit}>
        <label className="field">
          Τίτλος
          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            required
            maxLength={140}
          />
        </label>

        <label className="field">
          Τιμή (€) — αφήστε κενό για «Ρωτήστε μας»
          <input
            inputMode="numeric"
            value={price}
            onChange={(event) =>
              setPrice(event.target.value)
            }
          />
        </label>

        <label className="field">
          Περιγραφή
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            maxLength={10000}
          />
        </label>

        <label className="field">
          Κατάσταση
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as Status)
            }
          >
            <option value="active">Ενεργό</option>
            <option value="hidden">Κρυφό</option>
            <option value="sold">Πουλήθηκε</option>
          </select>
        </label>

        <div className="field">
          <strong>Φωτογραφίες ({files.length}/20)</strong>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={files.length >= 20}
            onChange={(event) =>
              addFiles(event.target.files)
            }
          />
        </div>

        {previews.length > 0 && (
          <div className="upload-preview-grid">
            {previews.map(({ file, url }, index) => (
              <div
                className="upload-preview-card"
                key={`${file.name}-${index}`}
              >
                <img src={url} alt="Προεπισκόπηση" />

                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setFiles((current) =>
                      current.filter(
                        (_, fileIndex) =>
                          fileIndex !== index,
                      ),
                    )
                  }
                >
                  Αφαίρεση
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="error" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        {progress && (
          <p aria-live="polite">{progress}</p>
        )}

        <div className="admin-form-actions">
          <button className="button" disabled={busy}>
            {busy ? 'Αποθήκευση…' : 'Αποθήκευση είδους'}
          </button>

          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() =>
              router.push('/admin/axesouar-antallaktika')
            }
          >
            Ακύρωση
          </button>
        </div>
      </form>
    </main>
  );
}
