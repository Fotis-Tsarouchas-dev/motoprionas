import 'server-only';
import { db } from './client';
export type ListingStatus = 'active'|'sold'|'hidden';
export type Listing = {
  id:string; slug:string; title:string; price_eur:number|null; registration_year:number;
  kilometers:number; engine_cc:number; fuel:string|null; description:string; status:ListingStatus;
  created_at:string; published_at:string|null;
};
export async function getPublicListings(limit=24, offset=0) {
  const sql=db();
  return sql<Listing[]>`SELECT * FROM listings WHERE status='active' ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT ${limit} OFFSET ${offset}`;
}
export async function getPublicListingBySlug(slug:string) {
  const sql=db();
  const rows=await sql<Listing[]>`SELECT * FROM listings WHERE slug=${slug} AND status='active' LIMIT 1`;
  return rows[0] ?? null;
}
export async function getImages(listingId:string) {
  const sql=db();
  return sql<{id:string;display_blob_key:string;thumbnail_blob_key:string;sort_order:number;is_cover:boolean}[]>`
    SELECT id,display_blob_key,thumbnail_blob_key,sort_order,is_cover FROM listing_images WHERE listing_id=${listingId} ORDER BY sort_order ASC`;
}
export async function getAdminListings() {
  const sql=db();
  return sql<Listing[]>`SELECT * FROM listings ORDER BY created_at DESC`;
}
