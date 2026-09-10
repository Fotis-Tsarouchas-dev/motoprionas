import 'server-only';
import { db } from './client';

export type Accessory = {
  id: string;
  slug: string;
  title: string;
  price_eur: number | null;
  description: string;
  status: 'active' | 'sold' | 'hidden';
  created_at: string;
  updated_at: string;
  published_at: string | null;
  cover: string | null;
};

export type AccessoryImage = {
  id: string;
  display_blob_key: string;
  thumbnail_blob_key: string;
  sort_order: number;
  is_cover: boolean;
};

export async function getPublicAccessories() {
  const sql = db();

  return sql<Accessory[]>`
    SELECT
      a.*,
      (
        SELECT thumbnail_blob_key
        FROM accessory_images i
        WHERE i.accessory_id = a.id
        ORDER BY is_cover DESC, sort_order
        LIMIT 1
      ) cover
    FROM accessories a
    WHERE status = 'active'
    ORDER BY published_at DESC NULLS LAST, created_at DESC
  `;
}

export async function getPublicAccessoryBySlug(slug: string) {
  const sql = db();
  const rows = await sql<Accessory[]>`
    SELECT
      a.*,
      (
        SELECT thumbnail_blob_key
        FROM accessory_images i
        WHERE i.accessory_id = a.id
        ORDER BY is_cover DESC, sort_order
        LIMIT 1
      ) cover
    FROM accessories a
    WHERE slug = ${slug}
      AND status = 'active'
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getAccessoryImages(accessoryId: string) {
  const sql = db();

  return sql<AccessoryImage[]>`
    SELECT
      id,
      display_blob_key,
      thumbnail_blob_key,
      sort_order,
      is_cover
    FROM accessory_images
    WHERE accessory_id = ${accessoryId}
    ORDER BY sort_order
  `;
}
