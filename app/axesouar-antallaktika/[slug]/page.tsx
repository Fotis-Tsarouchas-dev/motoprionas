import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MotorcycleGallery from '@/components/public/MotorcycleGallery';
import PublicAccessoryAdminActions from '@/components/admin/PublicAccessoryAdminActions';
import {
  getAccessoryImages,
  getPublicAccessoryBySlug,
} from '@/lib/db/accessories';
import { formatPrice } from '@/lib/formatting';
import { siteConfig } from '@/lib/config/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicAccessoryBySlug(slug);

  if (!item) return {};

  const images = await getAccessoryImages(item.id);
  const cover = (images.find((image) => image.is_cover) ?? images[0])
    ?.display_blob_key;
  const description = item.description.trim()
    ? item.description.slice(0, 160)
    : `${item.title} από το Moto Prionas.`;

  return {
    title: item.title,
    description,
    alternates: {
      canonical: `/axesouar-antallaktika/${item.slug}`,
    },
    openGraph: {
      title: `${item.title} | Moto Prionas`,
      description,
      images: cover ? [`/media/${encodeURIComponent(cover)}`] : [],
    },
  };
}

export default async function AccessoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getPublicAccessoryBySlug(slug);

  if (!item) notFound();

  const images = await getAccessoryImages(item.id);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.title,
    image: images.map(
      (image) =>
        `${siteConfig.domain}/media/${encodeURIComponent(image.display_blob_key)}`,
    ),
    ...(item.description.trim() ? { description: item.description } : {}),
    ...(item.price_eur !== null
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: item.price_eur,
            availability: 'https://schema.org/InStock',
            url: `${siteConfig.domain}/axesouar-antallaktika/${item.slug}`,
          },
        }
      : {}),
  };

  return (
    <main className="page">
      <div className="container">
        <div className="detail-head">
          <div>
            <h1>{item.title}</h1>
            <span className="price">{formatPrice(item.price_eur)}</span>
          </div>

          <a className="call detail-call" href={`tel:${siteConfig.phoneE164}`}>
            ☎ ΚΛΗΣΗ ΤΩΡΑ
          </a>
        </div>

        <PublicAccessoryAdminActions accessoryId={item.id} />

        <MotorcycleGallery images={images} title={item.title} />

        <section className="content-card">
          <h2>Περιγραφή</h2>

          {item.description.trim() ? (
            <div
              style={{
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                maxWidth: '100%',
              }}
            >
              {item.description}
            </div>
          ) : (
            <p className="muted">Δεν έχει προστεθεί περιγραφή για αυτό το είδος.</p>
          )}

          <div className="cta-row" style={{ marginTop: 20 }}>
            <a className="call" href={`tel:${siteConfig.phoneE164}`}>
              ΚΛΗΣΗ ΤΩΡΑ
            </a>
            <a
              className="button"
              href={`viber://chat?number=${encodeURIComponent(siteConfig.viberNumber)}`}
            >
              Viber
            </a>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </div>
    </main>
  );
}
