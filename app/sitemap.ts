import type { MetadataRoute } from 'next';
import { getPublicListings } from '@/lib/db/listings';
import { siteConfig } from '@/lib/config/site';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const listings=await getPublicListings(1000,0);return [{url:siteConfig.domain},{url:`${siteConfig.domain}/axesouar-antallaktika`},{url:`${siteConfig.domain}/epikoinonia`},...listings.map(l=>({url:`${siteConfig.domain}/aggelies/${l.slug}`,lastModified:l.published_at??l.created_at}))]}
