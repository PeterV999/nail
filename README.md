# BookingNail Platform

สำหรับโปรเจคร้านทำเล็บ ระบบจองคิวและบันทึกคิว เริ่มต้นจากร้านแรกคือ **Fah Nail** และออกแบบเผื่อขยายเป็นแพลตฟอร์มให้ร้านอื่นเช่าใช้รายเดือนในอนาคต

## ขอบเขตล่าสุด

ระบบนี้โฟกัสเฉพาะ:

- การจองคิว
- การบันทึกคิว
- การจัดการคำขอจอง
- การลงคิวโดยเจ้าของร้าน
- ตารางคิวของร้านจากข้อมูลในระบบ
- การจัดการบริการและผลงานร้าน

ระบบนี้ไม่รวม:

- ใบเสร็จ
- การคำนวณเงิน
- รายงานรายได้
- POS
- ระบบบัญชี
- ใบกำกับภาษี

## เอกสารหลัก

- [Project Context](docs/project-context.md)
- [Requirements](docs/requirements.md)
- [Booking Flow](docs/booking-flow.md)
- [Data Model](docs/data-model.md)
- [Integrations](docs/integrations.md)
- [UI Guidelines](docs/ui-guidelines.md)
- [Platform Admin](docs/admin.md)
- [Backlog](docs/backlog.md)
- [Deployment](docs/deployment.md)
- [Developer Workflow](docs/developer-workflow.md)

## ลำดับงานจากนี้

### 1. ก่อนเปิดใช้จริงรอบแรก

- เช็ก cache/PWA หลัง deploy ถ้าหน้าเก่ายังค้างให้กดปุ่มอัปเดตที่ระบบแสดง หรือเรียก `window.FahNailPWA.clearCacheAndReload()` ใน browser console
- Smoke test route หลักด้วย `npm run test:smoke`
- ตรวจ mobile/iPad ด้วย `npm run test:screenshots`
- ตรวจ backend flow จริง: ลูกค้าจองที่ `/fah` → หลังบ้านเห็นคำขอ → เจ้าของร้านยืนยัน → คิวขึ้นในตารางและช่วงเวลานั้นปิดในหน้าลูกค้า
- ตรวจว่า public views ไม่แสดงชื่อ เบอร์ LINE หรือข้อมูลส่วนตัวลูกค้า
- ตรวจบัญชีเจ้าของร้านใน `shop_members` และผู้ดูแลระบบกลางใน `platform_admins`
- สำรอง schema โดยเก็บ `supabase/schema.sql`, `supabase/platform-admin.sql`, และ SQL ที่ใช้แก้จริงไว้ใน Git

### 2. งานที่ทำแล้วในรอบ readiness

- เพิ่ม PWA update banner และ helper สำหรับ clear cache
- เพิ่ม Terms of Service ที่ `/terms`
- เพิ่ม smoke test route หลักใน `scripts/smoke-test.js`
- เพิ่ม GitHub Actions ใน `.github/workflows/check.yml` พร้อม `npm ci`, syntax check, smoke test, Playwright screenshot test, booking flow test และ owner role test
- เพิ่ม Cloudflare Turnstile สำหรับหน้าจองลูกค้าก่อนส่งคำขอจอง
- เพิ่ม UI จัดการธีมร้านจาก `/admin`
- เพิ่ม UI จัดการสิทธิ์เจ้าของร้าน/ทีมงานจากหลังบ้านร้านและ `/admin`
- ปิดปุ่มดำเนินการบนคิวหรือคำขอที่เลยวันแล้ว
- เพิ่มแจ้งเตือนในแอพ, popup หลังบ้าน, ปุ่มเปิด/ปิดเสียง และเสียงแจ้งเตือนเมื่อมีคิว confirmed ที่กำลังจะถึงภายใน 30 นาที ขณะหน้าแอปเปิดอยู่

### 3. งานถัดไปก่อนขยายเป็น SaaS

- เพิ่ม Web Push/PWA notification เพื่อแจ้งเตือนแม้เจ้าของร้านไม่ได้เปิดหน้าเว็บอยู่
- เพิ่ม test สิทธิ์ให้ลึกขึ้น เช่น staff ลงคิวได้แต่แก้บริการ/ทีมงานไม่ได้ และเจ้าของร้านเห็นเฉพาะร้านของตัวเอง
- แยก `owner.js`, `customer.js`, และ `supabase-adapter.js` ต่อเป็นโมดูลย่อยเพื่อให้ดูแลง่ายขึ้น
- ตรวจ flow เพิ่มร้านใหม่บน production แบบ end-to-end: สมัครร้าน → ได้ลิงก์จอง/หลังบ้านจากระบบกลาง → เจ้าของเข้าหลังบ้านได้ทันที
- อัปเดตคู่มือ deploy/rollback ทุกครั้งที่เปลี่ยน route, cache, หรือ Supabase SQL

## คำสั่งตรวจงาน

```bash
npm run check
npm run test:smoke
npm run test:screenshots
npm run test:booking-flow
npm run test:owner-role
```

คำสั่งทดสอบฐานข้อมูลจริงใช้เฉพาะผู้พัฒนาที่มี secret ในเครื่อง:

```bash
SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:booking-flow:db
```

## Deploy / Rollback สั้น ๆ

Deploy:

```bash
npx wrangler pages deploy . --project-name bookingnail --branch main
```

Rollback:

1. เข้า Cloudflare Pages project `bookingnail`
2. เปิด Deployments
3. เลือก deployment ก่อนหน้า
4. กด Rollback
5. เปิด `/`, `/fah`, `/fah-owner`, `/admin/` เพื่อตรวจอีกครั้ง

## หน้าเว็บระยะแรก

ไฟล์เริ่มต้นของหน้าเว็บอยู่ที่ [index.html](index.html)

ตอนนี้แยกทางเข้าเป็นรูปแบบเว็บจริงระยะแรก โดย URL ที่ใช้กับลูกค้าและเจ้าของร้านควรเป็น route ของแพลตฟอร์ม ไม่ใช่ชื่อไฟล์ HTML:

- `/` เป็นหน้า preview/รายการตัวอย่างของแพลตฟอร์ม ไม่ใช่หน้าจองร้านจริง
- `/fah` สำหรับลูกค้าสาธารณะของร้าน Fah Nail
- `/fah-owner` สำหรับเจ้าของร้าน Fah Nail
- `/{shopSlug}` สำหรับหน้าจองคิวร้านอื่น
- `/{shopSlug}-owner` สำหรับหลังบ้านร้านอื่น
- `/admin/` สำหรับหลังบ้านกลางของผู้ดูแลระบบ และเป็นหน้าเริ่มต้นเมื่อเปิดแบบ PWA
- `/register` สำหรับร้านใหม่ที่ต้องการลงทะเบียน
- [index.html](index.html) เป็นไฟล์ implementation ของหน้าลูกค้า
- [fah-owner/index.html](fah-owner/index.html) เป็นไฟล์ implementation ของหลังบ้าน
- [customer.js](customer.js) สำหรับ logic หน้าลูกค้า
- [owner.js](owner.js) สำหรับ logic หลังบ้าน
- [register.js](register.js) สำหรับ logic ลงทะเบียนร้านใหม่
- [supabase/schema.sql](supabase/schema.sql) สำหรับฐานข้อมูลจริง
- Google Calendar sync ถูกตัดออกจาก flow ปัจจุบันแล้ว
- Route เก่า `/b/{shopSlug}`, `/book/{shopSlug}`, `/o/{shopSlug}`, และ `/dashboard/{shopSlug}` ถูกปิดแล้ว

ฟีเจอร์ที่มีในเว็บระยะแรก:

- หน้าจองคิวลูกค้า
- เลือกบริการอย่างน้อย 1 รายการ
- เลือกช่วงเวลาที่สะดวก
- ยินยอมการใช้ข้อมูลก่อนส่งคำขอจอง
- ส่งคำขอจอง
- หลังบ้านเจ้าของร้าน
- ยืนยันคำขอจอง
- ลงคิวเอง
- เพิ่ม ลบ เปิด หรือปิดบริการ
- เพิ่ม ลบ เปิด หรือปิดช่วงเวลารับจอง
- ปิดรับจองทั้งวันตามวันที่เลือก
- ปิดช่วงเวลาที่มีคิว confirmed แล้วในหน้าลูกค้า
- ตารางคิวร้านจาก `appointments`
- ยืนยันคิวแล้วแสดงในตารางทันที
- ลงทะเบียนร้านใหม่ผ่าน Supabase RPC และสร้าง URL ตาม `shopSlug`
