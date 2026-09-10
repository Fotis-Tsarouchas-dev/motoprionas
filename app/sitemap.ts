import type { MetadataRoute } from 'next';
import { getPublicListings } from '@/lib/db/listings';
import { siteConfig } from '@/lib/config/site';

// Netlify applies database migrations immediately before publishing a deploy.
// Keeping the sitemap dynamic prevents Next.js from querying a newly
// provisioned (but not-yet-migrated) database during `next build`.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await getPublicListings(1000, 0);

  return [
    { url: siteConfig.domain },
    { url: `${siteConfig.domain}/axesouar-antallaktika` },
    { url: `${siteConfig.domain}/epikoinonia` },
    ...listings.map((listing) => ({
      url: `${siteConfig.domain}/aggelies/${listing.slug}`,
      lastModified: listing.published_at ?? listing.created_at,
    })),
  ];
}