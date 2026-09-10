import fs from 'node:fs';
const required=[
  'app/page.tsx','app/aggelies/[slug]/page.tsx','app/axesouar-antallaktika/page.tsx','app/epikoinonia/page.tsx',
  'app/admin/login/page.tsx','app/admin/page.tsx','app/admin/aggelies/nea/page.tsx','app/admin/aggelies/[id]/epexergasia/page.tsx',
  'netlify/functions/admin-api.ts','netlify/functions/auth.ts','netlify/functions/media.ts','netlify/database/migrations/0001_initial.sql','public/motoprionas-logo.png'
];
let failed=false;
for(const f of required){if(!fs.existsSync(f)){console.error('MISSING',f);failed=true}}
const all=fs.readdirSync('.', {recursive:true}).filter(x=>typeof x==='string' && /\.(ts|tsx|json|toml|sql)$/.test(x)).map(x=>fs.readFileSync(x,'utf8')).join('\n');
for(const banned of ['supabase','firebase','cloudinary','auth0','mongodb','aws s3']){if(all.toLowerCase().includes(banned)){console.error('BANNED SERVICE REFERENCE',banned);failed=true}}
const migration=fs.readFileSync('netlify/database/migrations/0001_initial.sql','utf8');
for(const token of ['CREATE TABLE listings','CREATE TABLE listing_images','CREATE TABLE accessories','CREATE TABLE accessory_images']){if(!migration.includes(token)){console.error('MISSING SCHEMA',token);failed=true}}
const admin=fs.readFileSync('netlify/functions/admin-api.ts','utf8');
for(const token of ['requireAdmin()','verifyRequestOrigin(req)','limitInputPixels','status===\'active\'','getStore(\'listing-media\')']){if(!admin.includes(token)){console.error('MISSING SECURITY/UPLOAD TOKEN',token);failed=true}}
if(failed)process.exit(1);console.log('Static project checks passed.');
