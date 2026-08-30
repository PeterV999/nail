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
- [New Shop Flow](docs/new-shop-flow.md)
- [App Readiness](docs/app-readiness.md)

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
- ปิดช่วงเวลาวันนี้ที่เลยเวลาจริงแล้วในหน้าลูกค้า
- บังคับกรอกเบอร์โทรลูกค้า 10 หลักก่อนส่งคำขอจอง
- เพิ่มช่องค้นหาบริการในหน้าจองลูกค้า และ empty state เมื่อวันนี้ไม่มีช่วงเวลาว่าง
- เพิ่มมุมมองเร็วในหลังบ้านร้าน เพื่อดึงคำขอ/คิวที่ควรทำต่อขึ้นมาก่อน
- ปรับเมนูหลังบ้านบนมือถือให้เหลือ ภาพรวม / ตาราง / ลงคิว และย้ายงานจัดการไปที่ปุ่ม `+`
- ทีมงานเห็นเมนูที่ไม่มีสิทธิ์เป็นสถานะล็อก และกดแล้วมี popup แจ้งเตือน
- เพิ่มสถานะเร็วในหลังบ้านกลาง เพื่อดูคำขอค้าง ร้านปิดอยู่ และร้านที่ข้อมูลติดต่อยังไม่ครบ
- เพิ่ม service worker push listener เป็นฐานสำหรับ Web Push ระยะถัดไป
- เตรียม SQL ฐานสำหรับ Web Push subscription ที่ `supabase/push-notifications.sql`
- เตรียม SQL ฐานสำหรับ audit log และ activity log ที่ `supabase/audit-log.sql`

### 3. งานถัดไปก่อนขยายเป็น SaaS

- ต่อ Web Push/PWA notification เข้ากับ backend subscription เพื่อแจ้งเตือนแม้เจ้าของร้านไม่ได้เปิดหน้าเว็บอยู่
- เพิ่ม edge function สำหรับส่ง Web Push จาก backend และบันทึกผลส่งแจ้งเตือน
- ต่อ audit log เข้ากับ action สำคัญ เช่น แก้สิทธิ์ทีมงาน แก้ข้อมูลร้าน เปิด/ปิดร้าน
- แสดงหน้าอ่าน activity log ใน `/admin` และหลังบ้านร้าน เฉพาะบัญชีที่มีสิทธิ์
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
npm run test:multi-shop-access
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
- ค้นหาบริการเมื่อร้านมีหลายรายการ
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
- ปิดช่วงเวลาวันนี้ที่เลยเวลาจริงแล้วในหน้าลูกค้า
- บังคับกรอกเบอร์โทร 10 หลักก่อนส่งคำขอจอง
- ตารางคิวร้านจาก `appointments`
- ยืนยันคิวแล้วแสดงในตารางทันที
- ลงทะเบียนร้านใหม่ผ่าน Supabase RPC และสร้าง URL ตาม `shopSlug`
- Automated test กันร้าน A/B เห็นข้อมูลข้ามกันด้วย `npm run test:multi-shop-access`
