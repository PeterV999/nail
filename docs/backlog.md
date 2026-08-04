# Backlog

## Phase 1: MVP สำหรับ Fah Nail

- สร้างหน้าจองคิวลูกค้า
- เลือกบริการอย่างน้อย 1 รายการ
- เลือกช่วงเวลาที่สะดวก
- ส่งคำขอจอง
- หลังบ้านดูคำขอจอง
- เจ้าของร้านยืนยันหรือปฏิเสธคำขอ
- เจ้าของร้านลงคิวเองได้
- ปิดช่วงเวลาที่ไม่ว่างในหน้าลูกค้า
- จัดการบริการ
- จัดการช่วงเวลารับจอง
- ปิดรับจองทั้งวันตามวันที่เลือก
- จัดการผลงาน
- เตรียม Supabase schema, public view, และ RLS policy
- เตรียม owner auth gate สำหรับหลังบ้าน

## ขั้นตอนต่อไปก่อนใช้ข้อมูลจริง

- เชื่อม Cloudflare Pages กับ GitHub auto deploy หลัง Cloudflare แสดง repo `PeterV999/nail`
- Run `supabase/calendar-sync.sql` บน Supabase SQL Editor
- ตั้ง Supabase Edge Function secrets สำหรับ Google OAuth และ token encryption
- Deploy Supabase Edge Function `google-calendar-sync`
- ทดสอบ flow เชื่อม Google Calendar, ตรวจ status, และส่งคิว confirmed เข้า Calendar
- หลังทดสอบ Supabase สำเร็จแล้วค่อย deploy frontend เวอร์ชันนี้ขึ้น Cloudflare

## Phase 2: Google Calendar

- เชื่อม Google OAuth ผ่าน Supabase Edge Function
- เลือก Calendar ของร้านและเก็บ refresh token ฝั่ง server
- สร้าง event เมื่อเจ้าของร้านกดส่งคิว confirmed
- ส่งคิวที่ยืนยันแล้วเข้าปฏิทินย้อนหลัง หลังเชื่อมต่อครั้งแรก
- อัปเดต event เมื่อแก้ไขคิว
- ยกเลิก event เมื่อยกเลิกคิว

## Phase 3: ป้องกันการจองมั่ว

- จำกัดจำนวนคำขอต่อ IP
- จำกัดคำขอต่อเบอร์โทรหรือช่องทางติดต่อ
- ตรวจคำขอซ้ำในวันเดียวกัน
- เพิ่ม blocklist
- เพิ่ม Cloudflare Turnstile ถ้าจำเป็น

## Phase 4: รองรับหลายช่าง

- เพิ่ม staff
- ผูกคิวกับช่าง
- แสดงตารางคิวตามช่าง
- ตั้งเวลาทำงานของช่างแต่ละคน

## Phase 5: SaaS สำหรับร้านอื่น

- รองรับหลายร้าน
- URL แยกร้าน
- ตั้งค่าธีมร้าน
- ตั้งค่าบริการของแต่ละร้าน
- ตั้งค่าช่วงเวลาของแต่ละร้าน
- สิทธิ์เจ้าของร้าน
- ระบบแพ็กเกจรายเดือนในอนาคต

## ไม่อยู่ในขอบเขต

- ใบเสร็จ
- คำนวณเงิน
- รายงานรายได้
- POS
- บัญชี
- ภาษี
