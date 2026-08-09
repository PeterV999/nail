# Deployment

## โครงสร้างเว็บจริงระยะแรก

- `index.html` คือหน้าลูกค้าสาธารณะ
- `owner.html` คือหน้าร้านสำหรับเจ้าของร้าน
- `_redirects` ทำให้ URL production ใช้ `/` เป็นหน้า preview, `/fah`, `/fah-owner`, `/:shopSlug`, `/:shopSlug-owner`, route เก่า `/b/:shopSlug`, `/o/:shopSlug`, `/book/:shopSlug`, `/dashboard/:shopSlug`, และ `/register`
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
Production domain: https://bookingnail.pages.dev
Public booking: /fah
Owner dashboard: /fah-owner
Platform preview: /
Future shop routes: /{shopSlug} and /{shopSlug}-owner
New shop registration: /register
Platform admin: /admin
```

หมายเหตุสำหรับ `*.pages.dev`: Cloudflare Pages ไม่รองรับการเปลี่ยน subdomain ของ project เดิมจาก `fah-nail-booking.pages.dev` เป็น `bookingnail.pages.dev` โดยตรง ถ้าต้องใช้ URL ใหม่เป็น `bookingnail.pages.dev` ให้สร้าง Pages project ใหม่ชื่อ `bookingnail` แล้วเชื่อม repository/branch เดิม จากนั้นตั้งค่า Supabase redirect ให้ตรงกับ domain ใหม่ก่อนใช้งานจริง

## PWA + Admin Deployment Notes

After updating the PWA/admin dashboard files, run `supabase/platform-admin.sql` again in the Supabase SQL Editor for project `punzqhfrhdgimvmczspv`. This refreshes the `list_accessible_shops()` RPC so `/admin/` can show the new summary fields:

- tomorrow appointments
- upcoming 7-day appointments
- today appointments
- pending booking requests
- shop active status

Then deploy the frontend to Cloudflare Pages as usual. After deployment, verify:

- `/admin/` opens and shows the richer dashboard.
- `/manifest.webmanifest` returns valid JSON.
- `/service-worker.js` returns the latest worker.
- `/fah` and `/fah-owner` still route correctly.
- Installing the PWA starts at `/admin/`.

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
  ownerRedirectUrl: "https://bookingnail.pages.dev/fah-owner"
};
```

หลังเปลี่ยน domain เป็น `bookingnail.pages.dev` ให้ตั้งค่า Supabase Authentication > URL Configuration:

```text
Site URL: https://bookingnail.pages.dev
Redirect URLs:
https://bookingnail.pages.dev/fah-owner
https://bookingnail.pages.dev/register
https://bookingnail.pages.dev/admin
http://localhost:4177/**
http://localhost:4182/**
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

## Queue Data

ระบบใช้ `appointments` ใน Supabase เป็นตารางคิวหลัก

- ลูกค้าจองเองจะเข้า `booking_requests`
- เจ้าของร้านกดยืนยันแล้วระบบสร้าง `appointments`
- เจ้าของร้านลงคิวเองแล้วระบบสร้าง `appointments`
- ยกเลิกคิวแล้วระบบเปลี่ยน `appointments.status` เป็น `cancelled`
- ยังไม่ deploy หรือใช้ Edge Function สำหรับปฏิทินภายนอกใน flow ปัจจุบัน
