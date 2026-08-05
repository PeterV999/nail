# Deployment

## โครงสร้างเว็บจริงระยะแรก

- `index.html` คือหน้าลูกค้าสาธารณะ
- `owner.html` คือหน้าร้านสำหรับเจ้าของร้าน
- `_redirects` ทำให้ URL production ใช้ `/book/:shopSlug`, `/dashboard/:shopSlug`, และ `/register`
- `customer.js` ดูแล flow จองคิวฝั่งลูกค้า
- `owner.js` ดูแล flow หลังบ้าน
- `register.js` ดูแล flow ลงทะเบียนร้านใหม่
- `supabase/schema.sql` คือ schema สำหรับฐานข้อมูลจริง

## Cloudflare Pages

ตั้งค่า build บน Cloudflare Pages:

```text
Framework preset: None
Build command: exit 0
Build output directory: /
Root directory: /
Production branch: main
```

เหตุผล: เว็บระยะแรกเป็น static site ไม่มีขั้นตอน build จึงให้คำสั่งจบด้วย exit code 0 แล้วให้ Cloudflare อัปโหลดไฟล์จาก root directory

เอกสารอ้างอิง:

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)

ตัวแปรที่ต้องเตรียมเมื่อเชื่อม backend จริง:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_TOKEN_ENCRYPTION_KEY
APP_URL
```

URL ที่ใช้จริง:

```text
Public booking: /book/fah-nail
Owner dashboard: /dashboard/fah-nail
New shop registration: /register
Platform admin: /admin
```

## GitHub

หลัง commit แล้ว push ขึ้น GitHub:

```bash
git push -u origin main
```

จากนั้นเชื่อม repository กับ Cloudflare Pages

## Supabase

1. สร้าง Supabase project
2. เปิด SQL Editor
3. วางเนื้อหาใน `supabase/schema.sql`
4. Run schema
5. ตรวจว่าเปิด Row Level Security แล้วทุกตาราง
6. เปิด Authentication > Providers > Google แล้วตั้งค่า Google OAuth
7. นำ `Project URL` และ `anon public key` มาใส่ใน `app-config.js`
8. เพิ่มบัญชีเจ้าของร้านลง `shop_members`

ตัวอย่าง `app-config.js` สำหรับเว็บจริง:

```js
window.FAH_NAIL_CONFIG = {
  shopSlug: "fah-nail",
  supabaseUrl: "https://your-project.supabase.co",
  supabaseAnonKey: "your-public-anon-key",
  ownerRedirectUrl: "https://fah-nail-booking.pages.dev/dashboard/fah-nail"
};
```

หลังเจ้าของร้าน login ด้วย Google ครั้งแรก ให้ดู user id ใน Supabase > Authentication > Users แล้ว run SQL นี้:

```sql
insert into public.shop_members (shop_id, user_id, role)
select id, 'OWNER_USER_ID_FROM_AUTH_USERS', 'owner'
from public.shops
where slug = 'fah-nail';
```

สำหรับร้านใหม่ในระบบหลายร้าน ให้ใช้หน้า `/register` หลัง login ด้วย Google ระบบจะเรียก `register_shop(shop_name, requested_slug)` เพื่อสร้างร้าน, เพิ่มสมาชิกเจ้าของร้าน, seed บริการเริ่มต้น และ seed ช่วงเวลารับจอง

หลักความปลอดภัยระยะแรก:

- ลูกค้าไม่ต้องล็อกอิน และส่งคำขอจองได้เท่านั้น
- ลูกค้าสาธารณะเห็นเฉพาะบริการ ช่วงเวลา วันที่ปิด และช่วงเวลาที่ไม่ว่าง
- ข้อมูลชื่อและช่องทางติดต่อของลูกค้าอ่านได้เฉพาะบัญชีเจ้าของร้านที่อยู่ใน `shop_members`
- ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY` ในหน้าเว็บหรือ GitHub

## Google Calendar

ใช้ Supabase Edge Function ชื่อ `google-calendar-sync` สำหรับเชื่อมและส่งคิวเข้า Google Calendar

ก่อน deploy function ให้คัดลอกเนื้อหาใน `supabase/calendar-sync.sql` ไปวางใน Supabase SQL Editor แล้วกด Run

ตั้งค่า secrets ให้ Edge Function:

```bash
supabase secrets set \
  GOOGLE_OAUTH_CLIENT_ID="..." \
  GOOGLE_OAUTH_CLIENT_SECRET="..." \
  GOOGLE_TOKEN_ENCRYPTION_KEY="สุ่มอย่างน้อย-32-ตัวอักษร" \
  --project-ref punzqhfrhdgimvmczspv
```

deploy function:

```bash
supabase functions deploy google-calendar-sync --project-ref punzqhfrhdgimvmczspv --use-api
```

ใน Google Cloud OAuth ต้องมี callback ของ Supabase Auth:

```text
https://punzqhfrhdgimvmczspv.supabase.co/auth/v1/callback
```

เมื่อเจ้าของร้านกดเชื่อม Google Calendar ระบบจะขอ `offline access` เพื่อรับ refresh token แล้ว Edge Function จะเข้ารหัสเก็บไว้ใน `calendar_integrations.refresh_token_encrypted`

เมื่อเจ้าของร้านกด “ส่งคิวที่ยืนยันแล้ว” หน้าเว็บจะเรียก Edge Function ให้สร้าง Google Calendar event แล้วบันทึก `google_calendar_event_id` กลับเข้า `appointments`
