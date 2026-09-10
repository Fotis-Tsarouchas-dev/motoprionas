import 'server-only';
import { db } from './client';
export type Accessory={id:string;slug:string;title:string;price_eur:number|null;description:string;status:'active'|'sold'|'hidden';created_at:string;cover:string|null};
export async function getPublicAccessories(){const sql=db();return sql<Accessory[]>`SELECT a.*, (SELECT thumbnail_blob_key FROM accessory_images i WHERE i.accessory_id=a.id ORDER BY is_cover DESC,sort_order LIMIT 1) cover FROM accessories a WHERE status='active' ORDER BY published_at DESC NULLS LAST,created_at DESC`;}
