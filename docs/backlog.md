# Backlog

## Current Priority

เป้าหมายหลักคือทำระบบจองคิวที่เจ้าของร้านใช้เร็วที่สุด ไม่ใช่ระบบที่มีฟีเจอร์เยอะที่สุด

## Phase 1: Simplify Owner Workflow

- ตัด Google Calendar ออกจาก UI และ flow การทำงาน
- ใช้ `appointments` เป็นตารางคิวหลัก
- ยืนยันคำขอแล้วต้องขึ้นตารางคิวทันที
- ลงคิวเองแล้วต้องขึ้นตารางคิวทันที
- ยกเลิกคิวแล้วสถานะต้องเปลี่ยนทันที
- ลดข้อความยาวและปุ่มที่ไม่จำเป็นในหลังบ้าน

## Phase 2: In-App Notifications

- เพิ่มปุ่มแจ้งเตือนพร้อม badge
- แจ้งคำขอใหม่
- แจ้งคำขอรอยืนยัน
- แจ้งคิววันนี้
- แจ้งคิวที่ใกล้ถึงเวลา
- เริ่มจากข้อมูล `booking_requests` และ `appointments`

## Phase 3: Contact Shortcuts

- ถ้ามีเบอร์โทร ให้มีปุ่มโทรด้วย `tel:`
- ถ้าเป็น LINE หรือ Facebook ให้มีปุ่มคัดลอก
- ลดขั้นตอนการติดต่อกลับลูกค้า

## Phase 4: Testing Baseline

- Syntax check สำหรับ JS
- Playwright E2E สำหรับลูกค้าจอง
- Playwright E2E สำหรับเจ้าของร้านยืนยันคิว
- Playwright E2E สำหรับลงคิวเอง
- Playwright E2E สำหรับยกเลิกคิว
- ตรวจว่าข้อมูลลูกค้าไม่แสดงในหน้าสาธารณะ

## Later

- มุมมองสัปดาห์ของตารางคิว
- GitHub Actions CI
- เตรียม mobile app หรือ wrapper สำหรับ iOS, iPadOS, Android
- Migration ล้าง legacy Google Calendar หลังมั่นใจว่า production ไม่พึ่งแล้ว
