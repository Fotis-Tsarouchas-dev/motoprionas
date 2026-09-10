import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MotorcycleGallery from '@/components/public/MotorcycleGallery';
import PublicListingAdminActions from '@/components/admin/PublicListingAdminActions';
import {
  getImages,
  getPublicListingBySlug,
} from '@/lib/db/listings';
import {
  formatCc,
  formatKm,
  formatPrice,
} from '@/lib/formatting';
import { siteConfig } from '@/lib/config/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListingBySlug(slug);

  if (!listing) return {};

  const images = await getImages(listing.id);
  const cover = (
    images.find((image) => image.is_cover) ?? images[0]
  )?.display_blob_key;

  return {
    title: `${listing.title} προς πώληση`,
    description: `${listing.title}, ${formatPrice(
      listing.price_eur,
    )}, ${listing.registration_year}, ${formatKm(
      listing.kilometers,
    )}, ${formatCc(listing.engine_cc)}. ${listing.description.slice(
      0,
      120,
    )}`,
    alternates: {
      canonical: `/aggelies/${listing.slug}`,
    },
    openGraph: {
      title: `${listing.title} | Moto Prionas`,
      description: listing.description.slice(0, 160),
      images: cover
        ? [`/media/${encodeURIComponent(cover)}`]
        : [],
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getPublicListingBySlug(slug);

  if (!listing) notFound();

  const images = await getImages(listing.id);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    image: images.map(
      (image) =>
        `${siteConfig.domain}/media/${encodeURIComponent(
          image.display_blob_key,
        )}`,
    ),
    description: listing.description,
    ...(listing.price_eur !== null
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: listing.price_eur,
            availability: 'https://schema.org/InStock',
            url: `${siteConfig.domain}/aggelies/${listing.slug}`,
          },
        }
      : {}),
  };

  return (
    <main className="page">
      <div className="container">
        <div className="detail-head">
          <div>
            <h1>{listing.title}</h1>
            <span className="price">
              {formatPrice(listing.price_eur)}
            </span>
          </div>

          <a
            className="call detail-call"
            href={`tel:${siteConfig.phoneE164}`}
          >
            ☎ ΚΛΗΣΗ ΤΩΡΑ
          </a>
        </div>

        <PublicListingAdminActions listingId={listing.id} />

        <div className="specbar">
          <div className="specbox">
            <small>ΤΙΜΗ ΠΩΛΗΣΗΣ</small>
            <strong>{formatPrice(listing.price_eur)}</strong>
          </div>

          <div className="specbox">
            <small>ΕΤΟΣ</small>
            <strong>{listing.registration_year}</strong>
          </div>

          <div className="specbox">
            <small>ΧΛΜ</small>
            <strong>{formatKm(listing.kilometers)}</strong>
          </div>

          <div className="specbox">
            <small>CC</small>
            <strong>{formatCc(listing.engine_cc)}</strong>
          </div>

          {listing.fuel && (
            <div className="specbox">
              <small>ΚΑΥΣΙΜΟ</small>
              <strong>{listing.fuel}</strong>
            </div>
          )}
        </div>

        <MotorcycleGallery
          images={images}
          title={listing.title}
        />

        <section className="content-card">
          <h2>Περιγραφή Αγγελίας</h2>

          <p>
            <strong>{siteConfig.sellerName}</strong> ·{' '}
            <a href={`tel:${siteConfig.phoneE164}`}>
              {siteConfig.phoneDisplay}
            </a>
          </p>

          <div style={{ whiteSpace: 'pre-wrap' }}>
            {listing.description}
          </div>

          <div className="cta-row" style={{ marginTop: 20 }}>
            <a
              className="call"
              href={`tel:${siteConfig.phoneE164}`}
            >
              ΚΛΗΣΗ ΤΩΡΑ
            </a>

            <a
              className="button"
              href={`viber://chat?number=${encodeURIComponent(
                siteConfig.viberNumber,
              )}`}
            >
              Viber
            </a>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema),
          }}
        />
      </div>
    </main>
  );
}
