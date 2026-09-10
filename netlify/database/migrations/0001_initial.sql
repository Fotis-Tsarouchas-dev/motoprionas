CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  price_eur INTEGER NULL CHECK (price_eur IS NULL OR price_eur >= 0),
  registration_year INTEGER NOT NULL CHECK (registration_year BETWEEN 1900 AND 2100),
  kilometers INTEGER NOT NULL CHECK (kilometers >= 0),
  engine_cc INTEGER NOT NULL CHECK (engine_cc > 0),
  fuel TEXT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NULL
);

CREATE INDEX listings_status_idx ON listings(status);
CREATE INDEX listings_public_order_idx ON listings(published_at DESC, created_at DESC);
CREATE INDEX listings_slug_idx ON listings(slug);

CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  original_blob_key TEXT NOT NULL,
  display_blob_key TEXT NOT NULL,
  thumbnail_blob_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  width INTEGER NULL,
  height INTEGER NULL,
  mime_type TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX listing_images_listing_idx ON listing_images(listing_id);
CREATE INDEX listing_images_order_idx ON listing_images(listing_id, sort_order);
CREATE UNIQUE INDEX listing_images_one_cover_idx
  ON listing_images(listing_id)
  WHERE is_cover = TRUE;

CREATE TABLE accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  price_eur INTEGER NULL CHECK (price_eur IS NULL OR price_eur >= 0),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NULL
);

CREATE INDEX accessories_status_idx ON accessories(status);
CREATE INDEX accessories_public_order_idx
  ON accessories(published_at DESC, created_at DESC);

CREATE TABLE accessory_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  original_blob_key TEXT NOT NULL,
  display_blob_key TEXT NOT NULL,
  thumbnail_blob_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  width INTEGER NULL,
  height INTEGER NULL,
  mime_type TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX accessory_images_accessory_idx
  ON accessory_images(accessory_id);

CREATE INDEX accessory_images_order_idx
  ON accessory_images(accessory_id, sort_order);

CREATE UNIQUE INDEX accessory_images_one_cover_idx
  ON accessory_images(accessory_id)
  WHERE is_cover = TRUE;
