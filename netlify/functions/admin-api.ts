import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { getConnectionString } from '@netlify/database';
import postgres from 'postgres';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { requireAdmin, AuthError } from '../../lib/auth/require-admin';
import { verifyRequestOrigin } from '@netlify/identity';
import { listingSchema, accessorySchema } from '../../lib/validation';

const sql = postgres(getConnectionString(), { prepare: true });
const mediaStore = () => getStore('listing-media');
const json = (data: unknown, status = 200) => Response.json(data, { status });

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const result = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(result).set(buffer);
  return result;
}

function slugify(s: string) {
  return (
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'aggelia'
  );
}

async function uniqueSlug(title: string, table: 'listings' | 'accessories') {
  const base = slugify(title);
  let candidate = base;

  for (let i = 0; i < 20; i++) {
    const rows =
      table === 'listings'
        ? await sql`SELECT 1 FROM listings WHERE slug=${candidate} LIMIT 1`
        : await sql`SELECT 1 FROM accessories WHERE slug=${candidate} LIMIT 1`;

    if (!rows.length) return candidate;

    candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }

  throw new Error('slug');
}

async function listingHasImage(id: string) {
  const r = await sql`
    SELECT 1
    FROM listing_images
    WHERE listing_id=${id}
    LIMIT 1
  `;
  return !!r.length;
}

async function accessoryHasImage(id: string) {
  const r = await sql`
    SELECT 1
    FROM accessory_images
    WHERE accessory_id=${id}
    LIMIT 1
  `;
  return !!r.length;
}

async function cleanup(keys: string[]) {
  await Promise.allSettled(keys.map((k) => mediaStore().delete(k)));
}

async function uploadListingImage(id: string, req: Request) {
  const count = await sql`
    SELECT COUNT(*)::int AS n
    FROM listing_images
    WHERE listing_id=${id}
  `;

  if ((count[0]?.n ?? 0) >= 20) {
    return json({ error: 'Έχετε φτάσει το όριο των 20 φωτογραφιών.' }, 400);
  }

  const buf = Buffer.from(await req.arrayBuffer());

  if (!buf.length || buf.length > 4.5 * 1024 * 1024) {
    return json({ error: 'Η φωτογραφία είναι πολύ μεγάλη.' }, 413);
  }

  let img;

  try {
    img = sharp(buf, {
      limitInputPixels: 40_000_000,
      failOn: 'error',
    }).rotate();

    const inputMeta = await img.metadata();

    if (
      !inputMeta.format ||
      !['jpeg', 'png', 'webp'].includes(inputMeta.format)
    ) {
      return json(
        { error: 'Υποστηρίζονται μόνο JPEG, PNG και WebP.' },
        400,
      );
    }
  } catch {
    return json(
      {
        error:
          'Η φωτογραφία δεν μπόρεσε να μεταφορτωθεί. Δοκιμάστε ξανά ή επιλέξτε διαφορετικό αρχείο.',
      },
      400,
    );
  }

  const imageId = randomUUID();
  const prefix = `listings/${id}/${imageId}`;
  const original = `${prefix}/original`;
  const display = `${prefix}/display.webp`;
  const thumb = `${prefix}/thumb.webp`;
  const created: string[] = [];

  try {
    const originalBuf = await img.clone().jpeg({ quality: 92 }).toBuffer();

    const displayBuf = await img
      .clone()
      .resize({
        width: 2200,
        height: 2200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();

    const thumbBuf = await img
      .clone()
      .resize({
        width: 520,
        height: 390,
        fit: 'cover',
      })
      .webp({ quality: 80 })
      .toBuffer();

    await mediaStore().set(
      original,
      toArrayBuffer(originalBuf),
      { metadata: { private: true } },
    );
    created.push(original);

    await mediaStore().set(display, toArrayBuffer(displayBuf));
    created.push(display);

    await mediaStore().set(thumb, toArrayBuffer(thumbBuf));
    created.push(thumb);

    const meta = await sharp(displayBuf).metadata();

    const order = await sql`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS n
      FROM listing_images
      WHERE listing_id=${id}
    `;

    const sort = Number(order[0].n);
    const isCover = sort === 0;

    await sql`
      INSERT INTO listing_images(
        id,
        listing_id,
        original_blob_key,
        display_blob_key,
        thumbnail_blob_key,
        sort_order,
        is_cover,
        width,
        height,
        mime_type
      )
      VALUES(
        ${imageId},
        ${id},
        ${original},
        ${display},
        ${thumb},
        ${sort},
        ${isCover},
        ${meta.width ?? null},
        ${meta.height ?? null},
        'image/webp'
      )
    `;

    return json(
      {
        id: imageId,
        display_blob_key: display,
        thumbnail_blob_key: thumb,
        sort_order: sort,
        is_cover: isCover,
      },
      201,
    );
  } catch (e) {
    await cleanup(created);
    throw e;
  }
}

async function uploadAccessoryImage(id: string, req: Request) {
  const count = await sql`
    SELECT COUNT(*)::int AS n
    FROM accessory_images
    WHERE accessory_id=${id}
  `;

  if ((count[0]?.n ?? 0) >= 20) {
    return json({ error: 'Έχετε φτάσει το όριο των 20 φωτογραφιών.' }, 400);
  }

  const buf = Buffer.from(await req.arrayBuffer());

  if (!buf.length || buf.length > 4.5 * 1024 * 1024) {
    return json({ error: 'Η φωτογραφία είναι πολύ μεγάλη.' }, 413);
  }

  let img;

  try {
    img = sharp(buf, {
      limitInputPixels: 40_000_000,
      failOn: 'error',
    }).rotate();

    const inputMeta = await img.metadata();

    if (
      !inputMeta.format ||
      !['jpeg', 'png', 'webp'].includes(inputMeta.format)
    ) {
      return json(
        { error: 'Υποστηρίζονται μόνο JPEG, PNG και WebP.' },
        400,
      );
    }
  } catch {
    return json(
      { error: 'Η φωτογραφία δεν μπόρεσε να μεταφορτωθεί.' },
      400,
    );
  }

  const imageId = randomUUID();
  const prefix = `accessories/${id}/${imageId}`;
  const original = `${prefix}/original`;
  const display = `${prefix}/display.webp`;
  const thumb = `${prefix}/thumb.webp`;
  const created: string[] = [];

  try {
    const originalBuf = await img.clone().jpeg({ quality: 92 }).toBuffer();

    const displayBuf = await img
      .clone()
      .resize({
        width: 1800,
        height: 1800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();

    const thumbBuf = await img
      .clone()
      .resize({
        width: 600,
        height: 450,
        fit: 'cover',
      })
      .webp({ quality: 80 })
      .toBuffer();

    await mediaStore().set(
      original,
      toArrayBuffer(originalBuf),
      { metadata: { private: true } },
    );
    created.push(original);

    await mediaStore().set(display, toArrayBuffer(displayBuf));
    created.push(display);

    await mediaStore().set(thumb, toArrayBuffer(thumbBuf));
    created.push(thumb);

    const meta = await sharp(displayBuf).metadata();

    const order = await sql`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS n
      FROM accessory_images
      WHERE accessory_id=${id}
    `;

    const sort = Number(order[0].n);
    const isCover = sort === 0;

    await sql`
      INSERT INTO accessory_images(
        id,
        accessory_id,
        original_blob_key,
        display_blob_key,
        thumbnail_blob_key,
        sort_order,
        is_cover,
        width,
        height,
        mime_type
      )
      VALUES(
        ${imageId},
        ${id},
        ${original},
        ${display},
        ${thumb},
        ${sort},
        ${isCover},
        ${meta.width ?? null},
        ${meta.height ?? null},
        'image/webp'
      )
    `;

    return json(
      {
        id: imageId,
        thumbnail_blob_key: thumb,
      },
      201,
    );
  } catch (e) {
    await cleanup(created);
    throw e;
  }
}

export default async function handler(req: Request, _context: Context) {
  try {
    await requireAdmin();

    if (req.method !== 'GET') {
      verifyRequestOrigin(req);
    }

    const u = new URL(req.url);
    const p = u.pathname
      .replace(/^\/api\/admin\//, '')
      .split('/')
      .filter(Boolean);

    if (p[0] === 'listings') {
      if (p.length === 1 && req.method === 'GET') {
        return json(
          await sql`
            SELECT
              l.*,
              (
                SELECT thumbnail_blob_key
                FROM listing_images i
                WHERE i.listing_id=l.id
                ORDER BY is_cover DESC, sort_order
                LIMIT 1
              ) cover
            FROM listings l
            ORDER BY created_at DESC
          `,
        );
      }

      if (p.length === 1 && req.method === 'POST') {
        const parsed = listingSchema.safeParse(await req.json());

        if (!parsed.success) {
          return json(
            { error: parsed.error.issues[0]?.message },
            400,
          );
        }

        const d = parsed.data;
        const slug = await uniqueSlug(d.title, 'listings');

        // If the admin wants to publish immediately, create it hidden first.
        // The form uploads photos and then PATCHes it to active.
        const initialStatus =
          d.status === 'active' ? 'hidden' : d.status;

        const r = await sql`
          INSERT INTO listings(
            slug,
            title,
            price_eur,
            registration_year,
            kilometers,
            engine_cc,
            fuel,
            description,
            status,
            published_at
          )
          VALUES(
            ${slug},
            ${d.title},
            ${d.price_eur},
            ${d.registration_year},
            ${d.kilometers},
            ${d.engine_cc},
            ${d.fuel ?? null},
            ${d.description},
            ${initialStatus},
            ${null}
          )
          RETURNING *
        `;

        return json(
          {
            ...r[0],
            requested_status: d.status,
          },
          201,
        );
      }

      const id = p[1];

      if (!id) {
        return new Response('Not found', { status: 404 });
      }

      if (p.length === 2 && req.method === 'GET') {
        const rows = await sql`
          SELECT *
          FROM listings
          WHERE id=${id}
          LIMIT 1
        `;

        if (!rows[0]) {
          return new Response('Not found', { status: 404 });
        }

        const images = await sql`
          SELECT
            id,
            display_blob_key,
            thumbnail_blob_key,
            sort_order,
            is_cover
          FROM listing_images
          WHERE listing_id=${id}
          ORDER BY sort_order
        `;

        return json({
          ...rows[0],
          images,
        });
      }

      if (
        p[2] === 'images' &&
        p.length === 3 &&
        req.method === 'POST'
      ) {
        return uploadListingImage(id, req);
      }

      if (
        p[2] === 'images' &&
        p[3] === 'order' &&
        req.method === 'PATCH'
      ) {
        const body = (await req.json()) as {
          ids?: string[];
          coverId?: string;
        };

        if (!Array.isArray(body.ids)) {
          return json({ error: 'Μη έγκυρη σειρά.' }, 400);
        }

        await sql.begin(async (tx) => {
          for (let i = 0; i < body.ids!.length; i++) {
            await tx`
              UPDATE listing_images
              SET
                sort_order=${i},
                is_cover=${body.ids![i] === body.coverId}
              WHERE id=${body.ids![i]}
                AND listing_id=${id}
            `;
          }

          if (!body.coverId && body.ids!.length) {
            await tx`
              UPDATE listing_images
              SET is_cover=TRUE
              WHERE id=${body.ids![0]}
                AND listing_id=${id}
            `;
          }
        });

        return json({ ok: true });
      }

      if (
        p[2] === 'images' &&
        p[3] &&
        req.method === 'DELETE'
      ) {
        const imageId = p[3];

        const rows = await sql`
          SELECT *
          FROM listing_images
          WHERE id=${imageId}
            AND listing_id=${id}
        `;

        if (!rows.length) {
          return new Response('Not found', { status: 404 });
        }

        const row = rows[0];

        const total = await sql`
          SELECT COUNT(*)::int n
          FROM listing_images
          WHERE listing_id=${id}
        `;

        const listing = await sql`
          SELECT status
          FROM listings
          WHERE id=${id}
        `;

        if (
          total[0].n <= 1 &&
          listing[0]?.status === 'active'
        ) {
          return json(
            {
              error:
                'Μια ενεργή αγγελία πρέπει να έχει τουλάχιστον μία φωτογραφία.',
            },
            400,
          );
        }

        await sql`
          DELETE FROM listing_images
          WHERE id=${imageId}
        `;

        await cleanup([
          row.original_blob_key,
          row.display_blob_key,
          row.thumbnail_blob_key,
        ]);

        if (row.is_cover) {
          const n = await sql`
            SELECT id
            FROM listing_images
            WHERE listing_id=${id}
            ORDER BY sort_order
            LIMIT 1
          `;

          if (n[0]) {
            await sql`
              UPDATE listing_images
              SET is_cover=TRUE
              WHERE id=${n[0].id}
            `;
          }
        }

        return json({ ok: true });
      }

      if (p.length === 2 && req.method === 'PATCH') {
        const parsed = listingSchema.safeParse(await req.json());

        if (!parsed.success) {
          return json(
            { error: parsed.error.issues[0]?.message },
            400,
          );
        }

        const d = parsed.data;

        if (
          d.status === 'active' &&
          !(await listingHasImage(id))
        ) {
          return json(
            { error: 'Προσθέστε τουλάχιστον μία φωτογραφία.' },
            400,
          );
        }

        const r = await sql`
          UPDATE listings
          SET
            title=${d.title},
            price_eur=${d.price_eur},
            registration_year=${d.registration_year},
            kilometers=${d.kilometers},
            engine_cc=${d.engine_cc},
            fuel=${d.fuel ?? null},
            description=${d.description},
            status=${d.status},
            published_at=CASE
              WHEN ${d.status}='active'
                AND published_at IS NULL
              THEN NOW()
              ELSE published_at
            END,
            updated_at=NOW()
          WHERE id=${id}
          RETURNING *
        `;

        return r[0]
          ? json(r[0])
          : new Response('Not found', { status: 404 });
      }

      if (p.length === 2 && req.method === 'DELETE') {
        const imgs = await sql`
          SELECT
            original_blob_key,
            display_blob_key,
            thumbnail_blob_key
          FROM listing_images
          WHERE listing_id=${id}
        `;

        await sql`
          DELETE FROM listings
          WHERE id=${id}
        `;

        await cleanup(
          imgs.flatMap((x: any) => [
            x.original_blob_key,
            x.display_blob_key,
            x.thumbnail_blob_key,
          ]),
        );

        return json({ ok: true });
      }
    }

    if (p[0] === 'accessories') {
      if (p.length === 1 && req.method === 'GET') {
        return json(
          await sql`
            SELECT
              a.*,
              (
                SELECT thumbnail_blob_key
                FROM accessory_images i
                WHERE i.accessory_id=a.id
                ORDER BY is_cover DESC, sort_order
                LIMIT 1
              ) cover
            FROM accessories a
            ORDER BY created_at DESC
          `,
        );
      }

      if (p.length === 1 && req.method === 'POST') {
        const parsed = accessorySchema.safeParse(await req.json());

        if (!parsed.success) {
          return json(
            { error: parsed.error.issues[0]?.message },
            400,
          );
        }

        const d = parsed.data;
        const slug = await uniqueSlug(d.title, 'accessories');
        const initialStatus = d.status === 'active' ? 'hidden' : d.status;

        const r = await sql`
          INSERT INTO accessories(
            slug,
            title,
            price_eur,
            description,
            status,
            published_at
          )
          VALUES(
            ${slug},
            ${d.title},
            ${d.price_eur},
            ${d.description},
            ${initialStatus},
            ${null}
          )
          RETURNING *
        `;

        return json({ ...r[0], requested_status: d.status }, 201);
      }

      const id = p[1];

      if (!id) {
        return new Response('Not found', { status: 404 });
      }

      if (p.length === 2 && req.method === 'GET') {
        const rows = await sql`
          SELECT *
          FROM accessories
          WHERE id=${id}
          LIMIT 1
        `;

        if (!rows[0]) {
          return new Response('Not found', { status: 404 });
        }

        const images = await sql`
          SELECT
            id,
            display_blob_key,
            thumbnail_blob_key,
            sort_order,
            is_cover
          FROM accessory_images
          WHERE accessory_id=${id}
          ORDER BY sort_order
        `;

        return json({ ...rows[0], images });
      }

      if (
        p[2] === 'images' &&
        p.length === 3 &&
        req.method === 'POST'
      ) {
        return uploadAccessoryImage(id, req);
      }

      if (
        p[2] === 'images' &&
        p[3] === 'order' &&
        req.method === 'PATCH'
      ) {
        const body = (await req.json()) as {
          ids?: string[];
          coverId?: string;
        };

        if (!Array.isArray(body.ids)) {
          return json({ error: 'Μη έγκυρη σειρά.' }, 400);
        }

        await sql.begin(async (tx) => {
          for (let i = 0; i < body.ids!.length; i++) {
            await tx`
              UPDATE accessory_images
              SET
                sort_order=${i},
                is_cover=${body.ids![i] === body.coverId}
              WHERE id=${body.ids![i]}
                AND accessory_id=${id}
            `;
          }

          if (!body.coverId && body.ids!.length) {
            await tx`
              UPDATE accessory_images
              SET is_cover=TRUE
              WHERE id=${body.ids![0]}
                AND accessory_id=${id}
            `;
          }
        });

        return json({ ok: true });
      }

      if (
        p[2] === 'images' &&
        p[3] &&
        req.method === 'DELETE'
      ) {
        const imageId = p[3];
        const rows = await sql`
          SELECT *
          FROM accessory_images
          WHERE id=${imageId}
            AND accessory_id=${id}
        `;

        if (!rows.length) {
          return new Response('Not found', { status: 404 });
        }

        const row = rows[0];
        const total = await sql`
          SELECT COUNT(*)::int n
          FROM accessory_images
          WHERE accessory_id=${id}
        `;
        const item = await sql`
          SELECT status
          FROM accessories
          WHERE id=${id}
        `;

        if (
          total[0].n <= 1 &&
          item[0]?.status === 'active'
        ) {
          return json(
            { error: 'Ένα ενεργό είδος πρέπει να έχει τουλάχιστον μία φωτογραφία.' },
            400,
          );
        }

        await sql`
          DELETE FROM accessory_images
          WHERE id=${imageId}
        `;

        await cleanup([
          row.original_blob_key,
          row.display_blob_key,
          row.thumbnail_blob_key,
        ]);

        if (row.is_cover) {
          const next = await sql`
            SELECT id
            FROM accessory_images
            WHERE accessory_id=${id}
            ORDER BY sort_order
            LIMIT 1
          `;

          if (next[0]) {
            await sql`
              UPDATE accessory_images
              SET is_cover=TRUE
              WHERE id=${next[0].id}
            `;
          }
        }

        return json({ ok: true });
      }

      if (p.length === 2 && req.method === 'PATCH') {
        const parsed = accessorySchema.safeParse(await req.json());

        if (!parsed.success) {
          return json(
            { error: parsed.error.issues[0]?.message },
            400,
          );
        }

        const d = parsed.data;

        if (
          d.status === 'active' &&
          !(await accessoryHasImage(id))
        ) {
          return json(
            { error: 'Προσθέστε τουλάχιστον μία φωτογραφία.' },
            400,
          );
        }

        const r = await sql`
          UPDATE accessories
          SET
            title=${d.title},
            price_eur=${d.price_eur},
            description=${d.description},
            status=${d.status},
            published_at=CASE
              WHEN ${d.status}='active'
                AND published_at IS NULL
              THEN NOW()
              ELSE published_at
            END,
            updated_at=NOW()
          WHERE id=${id}
          RETURNING *
        `;

        return r[0]
          ? json(r[0])
          : new Response('Not found', { status: 404 });
      }

      if (p.length === 2 && req.method === 'DELETE') {
        const imgs = await sql`
          SELECT
            original_blob_key,
            display_blob_key,
            thumbnail_blob_key
          FROM accessory_images
          WHERE accessory_id=${id}
        `;

        await sql`
          DELETE FROM accessories
          WHERE id=${id}
        `;

        await cleanup(
          imgs.flatMap((x: any) => [
            x.original_blob_key,
            x.display_blob_key,
            x.thumbnail_blob_key,
          ]),
        );

        return json({ ok: true });
      }
    }

    return new Response('Not found', { status: 404 });
  } catch (e) {
    if (e instanceof AuthError) {
      return new Response(e.message, { status: e.status });
    }

    console.error(e);

    return json(
      {
        error:
          'Παρουσιάστηκε κάποιο πρόβλημα. Δοκιμάστε ξανά.',
      },
      500,
    );
  }
}
