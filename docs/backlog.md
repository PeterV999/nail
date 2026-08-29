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
- Playwright owner role test สำหรับจำกัดเมนูทีมงาน
- GitHub Actions CI สำหรับรันชุดตรวจอัตโนมัติ
- ตรวจว่าข้อมูลลูกค้าไม่แสดงในหน้าสาธารณะ

## Next Priority

- ตรวจ flow เพิ่มร้านใหม่บน production แบบ end-to-end
- เพิ่ม test กรณีสิทธิ์ให้ลึกขึ้น เช่น staff ลงคิวได้แต่แก้บริการ/ทีมงานไม่ได้
- แยกไฟล์ `owner.js`, `customer.js`, และ `supabase-adapter.js` ต่อเป็นโมดูลย่อย
- เพิ่ม Web Push/PWA notification สำหรับแจ้งเตือนแม้ไม่ได้เปิดหน้าเว็บ
- ตรวจ cache/PWA บนเครื่องลูกค้าจริงหลัง deploy ใหญ่ทุกครั้ง

## Later

- มุมมองสัปดาห์ของตารางคิว
- เตรียม mobile app หรือ wrapper สำหรับ iOS, iPadOS, Android
- Migration ล้าง legacy Google Calendar หลังมั่นใจว่า production ไม่พึ่งแล้ว
