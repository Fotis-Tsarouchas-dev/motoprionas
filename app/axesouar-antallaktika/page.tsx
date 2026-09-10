import Link from 'next/link';
import { getPublicAccessories } from '@/lib/db/accessories';
import { formatPrice } from '@/lib/formatting';

export const metadata = { title: 'Αξεσουάρ - Ανταλλακτικά' };
export const dynamic = 'force-dynamic';

const DESCRIPTION_LIMIT = 150;

function previewDescription(description: string) {
  const normalized = description.replace(/\s+/g, ' ').trim();
  const truncated = normalized.length > DESCRIPTION_LIMIT;

  return {
    text: truncated
      ? normalized.slice(0, DESCRIPTION_LIMIT).trimEnd()
      : normalized,
    truncated,
  };
}

export default async function Accessories() {
  const items = await getPublicAccessories();

  return (
    <main className="page">
      <div className="container">
        <h1>ΑΞΕΣΟΥΑΡ - ΑΝΤΑΛΛΑΚΤΙΚΑ</h1>
        <p className="muted">
          Διαθέσιμα αξεσουάρ και ανταλλακτικά. Για πληροφορίες καλέστε μας.
        </p>

        <div className="grid">
          {items.length ? (
            items.map((item) => {
              const preview = previewDescription(item.description);

              return (
                <Link
                  className="card listing-card"
                  href={`/axesouar-antallaktika/${item.slug}`}
                  key={item.id}
                >
                  <div className="card-media">
                    {item.cover ? (
                      <img
                        loading="lazy"
                        src={`/media/${encodeURIComponent(item.cover)}`}
                        alt={`${item.title} - κύρια φωτογραφία`}
                      />
                    ) : (
                      <span className="muted">Χωρίς φωτογραφία</span>
                    )}
                  </div>

                  <div className="card-body">
                    <h2>{item.title}</h2>
                    <span className="price">{formatPrice(item.price_eur)}</span>

                    {preview.text && (
                      <p className="muted card-description" style={{ marginTop: 16 }}>
                        {preview.text}
                        {preview.truncated && (
                          <>
                            … <span className="read-more">Δείτε περισσότερα</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="content-card">
              Δεν υπάρχουν διαθέσιμα είδη αυτή τη στιγμή.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
