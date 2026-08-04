# Integrations

## Google Calendar

เป้าหมายคือให้คิวที่ร้านยืนยันแล้วถูกบันทึกเข้า Google Calendar ของร้าน

## หลักการทำงาน

Supabase เป็นฐานข้อมูลหลัก ส่วน Google Calendar เป็นปฏิทินเสริม

ห้ามใช้ Google Calendar เป็นแหล่งข้อมูลหลัก เพราะระบบในอนาคตต้องรองรับหลายร้าน หลายช่าง และสิทธิ์การใช้งานแบบ SaaS

## Flow การเชื่อมต่อ

```text
เจ้าของร้านเปิดหน้าตั้งค่า
→ กดเชื่อม Google Calendar
→ ระบบขอสิทธิ์ผ่าน Google OAuth
→ เจ้าของร้านเลือก Calendar
→ ระบบบันทึก calendar_id
→ เมื่อยืนยันคิว ระบบสร้าง event ใน Google Calendar
```

## เมื่อยืนยันคิว

ระบบต้อง:

- สร้าง appointment ใน Supabase
- สร้าง event ใน Google Calendar
- เก็บ google_calendar_event_id กลับมาใน appointment

ระบบ production ต้องส่ง Calendar ผ่าน Supabase Edge Function เท่านั้น:

- `google-calendar-sync` action `connect` บันทึก `calendar_id` และ refresh token ที่เข้ารหัสไว้ใน `calendar_integrations`
- `google-calendar-sync` action `status` ตรวจว่าร้านนี้มี refresh token พร้อมใช้งานหรือไม่
- `google-calendar-sync` action `syncAppointment` refresh access token และเรียก Google Calendar API จากฝั่ง server
- หน้าเว็บไม่เรียก `www.googleapis.com/calendar` โดยตรง และไม่เก็บ refresh token ถาวรใน browser

refresh token จะถูกส่งจาก browser ไปยัง Edge Function เฉพาะหลัง Google OAuth redirect ที่ให้สิทธิ์ `offline` แล้ว จากนั้นลบออกจาก `sessionStorage`

การเข้าสู่ระบบหลังบ้านปกติขอแค่ `email profile` ส่วน scope ของ Calendar จะขอเฉพาะตอนเจ้าของร้านกดเชื่อม Google Calendar

## เมื่อแก้ไขคิว

ระบบต้อง:

- อัปเดต appointment ใน Supabase
- อัปเดต event เดิมใน Google Calendar

## เมื่อยกเลิกคิว

ระบบต้อง:

- เปลี่ยนสถานะ appointment เป็น cancelled
- ลบหรืออัปเดต event ใน Google Calendar

## LINE OA และ Facebook Messenger

ช่วงแรกยังไม่จำเป็นต้องทำ automation เต็มรูปแบบ

แนะนำให้เริ่มจาก:

- เก็บช่องทางติดต่อของลูกค้า
- ให้เจ้าของร้านกดคัดลอกข้อความเพื่อติดต่อกลับ
- เพิ่มระบบส่งข้อความอัตโนมัติภายหลัง

ข้อความอัตโนมัติในอนาคต:

- รับคำขอจองแล้ว
- ร้านยืนยันคิวแล้ว
- แจ้งเตือนก่อนถึงคิว
- แจ้งเปลี่ยนแปลงคิว
- แจ้งยกเลิกคิว
