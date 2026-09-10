import Link from 'next/link';
import { formatCc, formatKm, formatPrice } from '@/lib/formatting';
import type { Listing } from '@/lib/db/listings';

const DESCRIPTION_LIMIT = 150;

function descriptionPreview(description: string) {
  const normalized = description.replace(/\s+/g, ' ').trim();
  const truncated = normalized.length > DESCRIPTION_LIMIT;

  return {
    text: truncated
      ? normalized.slice(0, DESCRIPTION_LIMIT).trimEnd()
      : normalized,
    truncated,
  };
}

export default function ListingCard({
  listing,
  cover,
}: {
  listing: Listing;
  cover?: string;
}) {
  const preview = descriptionPreview(listing.description);

  return (
    <Link className="card listing-card" href={`/aggelies/${listing.slug}`}>
      <div className="card-media">
        {cover ? (
          <img
            loading="lazy"
            src={`/media/${encodeURIComponent(cover)}`}
            alt={`${listing.title} - κύρια φωτογραφία`}
          />
        ) : (
          <span className="muted">Χωρίς φωτογραφία</span>
        )}
      </div>

      <div className="card-body">
        <h2>{listing.title}</h2>

        <span className="price">{formatPrice(listing.price_eur)}</span>

        <div className="spec-row">
          <span className="spec">{listing.registration_year}</span>
          <span className="spec">{formatKm(listing.kilometers)}</span>
          <span className="spec">{formatCc(listing.engine_cc)}</span>
        </div>

        {preview.text && (
          <p className="muted card-description">
            {preview.text}
            {preview.truncated && (
              <>
                …{' '}
                <span className="read-more">
                  Δείτε περισσότερα
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </Link>
  );
}
