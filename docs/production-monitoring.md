# Production Monitoring

เอกสารนี้กำหนดวิธีตรวจ production ของ BookingNail หลัง deploy และระหว่างเปิดใช้งานจริง โดยตั้งใจให้ตรวจได้โดยไม่แตะ secret และไม่ดึงข้อมูลส่วนตัวลูกค้าออกมา

## เป้าหมาย

- รู้เร็วว่า route หลักเปิดไม่ได้
- รู้เร็วว่า asset/cache version บน production ไม่ตรงกับโค้ดล่าสุด
- ตรวจว่า route เก่าที่ปิดหรือ redirect แล้วไม่กลับมาเปิดเป็นหน้าผิด
- มีขั้นตอน incident ที่คนในทีมทำตามได้
- แยก log สำหรับการใช้งานจริงออกจากข้อมูลส่วนตัวลูกค้า

## คำสั่งตรวจ production

```bash
npm run monitor:production
```

ค่าเริ่มต้นจะตรวจ `https://bookingnail.pages.dev` หากต้องการตรวจ preview หรือ staging:

```bash
PRODUCTION_URL=https://example.pages.dev npm run monitor:production
```

สคริปต์นี้ตรวจ:

- `/`
- `/fah`
- `/fah-owner/`
- `/demo-salon`
- `/demo-salon-owner`
- `/register/`
- `/admin/`
- `/privacy/`
- `/terms/`
- `app-config.js`
- `service-worker.js`
- `manifest.webmanifest`
- route เก่าที่ควรปิดหรือ redirect เช่น `/b/fah-nail`, `/dashboard/fah-nail`, `/owner.html`

## GitHub Actions

เพิ่ม workflow `Production Monitor` แล้วที่ `.github/workflows/production-monitor.yml`

การทำงาน:

- รันเองได้จาก GitHub Actions ด้วย `workflow_dispatch`
- รันอัตโนมัติวันละครั้ง
- ถ้า route production ล่มหรือ asset สำคัญหาย workflow จะ fail

## สิ่งที่ต้องตรวจหลัง deploy ทุกครั้ง

- เปิด `/`, `/fah`, `/fah-owner/`, `/admin/`, `/register/` บน production
- รัน `npm run monitor:production`
- ตรวจมือถือ/iPad จริง โดยเฉพาะ cache/PWA
- ถ้าเห็นหน้าเก่า ให้ refresh, กด update banner หรือ clear site data
- ถ้าเปลี่ยน flow จอง ให้ทดสอบลูกค้าจองจริง 1 รอบ
- ตรวจว่าหน้าสาธารณะไม่แสดงชื่อ เบอร์ LINE หรือข้อมูลส่วนตัวลูกค้า

## Activity Log และ Audit Log

ฐาน SQL สำหรับ log อยู่ที่ `supabase/audit-log.sql`

ตารางที่มี:

- `app_activity_logs` สำหรับ log การใช้งานของหน้าลูกค้า หลังบ้านร้าน หลังบ้านกลาง และหน้าสมัครร้าน
- `admin_audit_logs` สำหรับ log action สำคัญ เช่น แก้สิทธิ์ แก้ร้าน หรือแก้ข้อมูลที่กระทบธุรกิจ

หลักการเก็บ log:

- เก็บ event name, surface, route และ metadata ที่จำเป็นเท่านั้น
- ไม่เก็บเบอร์โทรเต็มหรือข้อมูลลูกค้าเต็มใน metadata
- ผู้ดูแลระบบกลางอ่าน log รวมได้
- สมาชิกของร้านอ่าน log ของร้านตัวเองได้ตาม RLS

งานต่อที่ยังควรทำ:

- ต่อ `admin_audit_logs` เข้ากับ action สำคัญใน `/admin` และ `/fah-owner/`
- เพิ่มหน้าอ่าน log ใน `/admin`
- เพิ่ม retention policy เช่น เก็บ activity log 90 วัน
- เพิ่ม error monitoring ภายนอก เช่น Sentry เฉพาะตอนพร้อมเปิด production จริง

## Incident Checklist

เมื่อ production มีปัญหา:

1. เปิด GitHub Actions ดูว่า `Check` หรือ `Production Monitor` fail ที่ขั้นตอนไหน
2. เปิด Cloudflare Pages deployment ล่าสุดและดู commit hash
3. รัน `npm run monitor:production` จากเครื่อง local
4. ตรวจว่า Supabase ยังตอบสนองปกติ และไม่มี RLS/SQL ใหม่ที่ยังไม่ได้รัน
5. ถ้าเป็น cache/PWA ให้ bump `assetVersion` และ `CACHE_VERSION` แล้ว deploy ใหม่
6. ถ้ากระทบการจองจริง ให้ rollback Cloudflare deployment ก่อน แล้วค่อยวิเคราะห์

## Alert ระยะถัดไป

ระยะนี้ใช้ GitHub Actions เป็น monitoring ขั้นต่ำก่อน เพราะไม่ต้องเพิ่มค่าใช้จ่ายและไม่เก็บข้อมูลลูกค้า

เมื่อระบบเริ่มมีร้านหลายร้านจริง ควรเพิ่ม:

- Uptime monitor ภายนอก
- Error monitoring
- Dashboard สำหรับคำขอจองค้างผิดปกติ
- Web Push backend สำหรับแจ้งเตือนก่อนคิวและแจ้งรายการใหม่ แม้ไม่ได้เปิดหน้าเว็บ
