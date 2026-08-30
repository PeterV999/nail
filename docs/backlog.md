# Backlog

## Current Priority

เป้าหมายหลักคือทำระบบจองคิวที่เจ้าของร้านใช้เร็วที่สุด ไม่ใช่ระบบที่มีฟีเจอร์เยอะที่สุด

## Done: Simplify Owner Workflow

- ตัด Google Calendar ออกจาก UI และ flow การทำงาน
- ใช้ `appointments` เป็นตารางคิวหลัก
- ยืนยันคำขอแล้วต้องขึ้นตารางคิวทันที
- ลงคิวเองแล้วต้องขึ้นตารางคิวทันที
- ยกเลิกคิวแล้วสถานะต้องเปลี่ยนทันที
- ลดข้อความยาวและปุ่มที่ไม่จำเป็นในหลังบ้าน

## Done: In-App Notifications

- เพิ่มปุ่มแจ้งเตือนพร้อม badge
- แจ้งคำขอใหม่
- แจ้งคำขอรอยืนยัน
- แจ้งคิววันนี้
- แจ้งคิวที่ใกล้ถึงเวลา
- เริ่มจากข้อมูล `booking_requests` และ `appointments`
- เพิ่ม popup แจ้งเตือนในหลังบ้าน
- เพิ่มปุ่มเปิด/ปิดเสียง
- เพิ่มเสียงเตือนคิวที่กำลังจะถึงภายใน 30 นาทีเมื่อหน้าแอปเปิดอยู่

## Done: Contact Shortcuts

- ถ้ามีเบอร์โทร ให้มีปุ่มโทรด้วย `tel:`
- ถ้าเป็น LINE หรือ Facebook ให้มีปุ่มคัดลอก
- ลดขั้นตอนการติดต่อกลับลูกค้า

## Done: Testing Baseline

- Syntax check สำหรับ JS
- Playwright E2E สำหรับลูกค้าจอง
- Playwright E2E สำหรับเจ้าของร้านยืนยันคิว
- Playwright screenshot test สำหรับ mobile/iPad
- Playwright owner role test สำหรับจำกัดเมนูทีมงาน และล็อก control สำคัญของ staff
- GitHub Actions CI สำหรับรันชุดตรวจอัตโนมัติ
- ตรวจว่าข้อมูลลูกค้าไม่แสดงในหน้าสาธารณะ

## Done: Customer Booking Guardrails

- ปิดช่วงเวลาวันนี้ที่เลยเวลาจริงแล้ว
- แสดงสถานะ "เลยเวลา" ในหน้าลูกค้า
- บังคับเบอร์โทรลูกค้า 10 หลัก
- แสดงข้อความสีแดงเมื่อเบอร์ไม่ครบ
- เพิ่มค้นหาบริการ เพื่อรองรับร้านที่มีบริการหลายรายการ
- เพิ่มข้อความกรณีวันนี้ไม่มีช่วงเวลาที่จองได้
- เพิ่ม service worker push listener เป็นฐานสำหรับ Web Push ระยะถัดไป

## Done: Multi-Shop Readiness Baseline

- เพิ่มมุมมองเร็วในหลังบ้านร้านสำหรับคำขอและคิวที่ควรทำต่อ
- ปรับ mobile nav ของหลังบ้านให้เหลือเมนูหลัก และย้ายงานจัดการไปที่ปุ่ม `+`
- เพิ่มสถานะล็อกและ popup แจ้งเตือนเมื่อทีมงานกดเมนูที่ไม่มีสิทธิ์
- เพิ่มสถานะเร็วในหลังบ้านกลางสำหรับคำขอค้าง ร้านปิด และข้อมูลติดต่อไม่ครบ
- เพิ่ม test กันร้าน A/B เห็นข้อมูลข้ามกันด้วย `npm run test:multi-shop-access`
- เตรียม SQL สำหรับ Web Push subscription ที่ `supabase/push-notifications.sql`
- เตรียม SQL สำหรับ audit log และ app activity log ที่ `supabase/audit-log.sql`
- เพิ่ม hook log เบื้องต้นสำหรับการส่งคำขอจอง และการเปิด/พยายามเข้าเมนูหลังบ้าน

## Next Priority

- ตรวจ flow เพิ่มร้านใหม่บน production แบบ end-to-end
- ต่อ audit log เข้ากับ action สำคัญในหลังบ้านและแอดมิน
- ทำหน้าดู log ใน `/admin` และหลังบ้านร้าน เฉพาะผู้มีสิทธิ์
- แยกไฟล์ `owner.js`, `customer.js`, และ `supabase-adapter.js` ต่อเป็นโมดูลย่อย
- ต่อ Web Push/PWA notification เข้ากับ backend subscription สำหรับแจ้งเตือนแม้ไม่ได้เปิดหน้าเว็บ
- ตรวจ cache/PWA บนเครื่องลูกค้าจริงหลัง deploy ใหญ่ทุกครั้ง

## Later

- มุมมองสัปดาห์ของตารางคิว
- เตรียม mobile app หรือ wrapper สำหรับ iOS, iPadOS, Android
- Migration ล้าง legacy Google Calendar หลังมั่นใจว่า production ไม่พึ่งแล้ว
