# Integrations

## Current Direction

ระบบไม่เชื่อม Google Calendar แล้วใน product direction ปัจจุบัน

แหล่งข้อมูลหลักของคิวคือ `appointments` ใน Supabase:

- ลูกค้าส่งคำขอเข้ามาที่ `booking_requests`
- เจ้าของร้านกดยืนยันแล้วระบบสร้างรายการใน `appointments`
- เจ้าของร้านลงคิวเองแล้วระบบสร้างรายการใน `appointments`
- ตารางคิวในหลังบ้านอ่านจาก `appointments`
- หน้าลูกค้าอ่านช่วงเวลาที่ไม่ว่างจาก `appointments`

## Login

Google ยังใช้เฉพาะการเข้าสู่ระบบเจ้าของร้านและ admin เท่านั้น

OAuth scope ที่ต้องใช้:

```text
email profile
```

ห้ามขอ scope ปฏิทินหรือ offline access สำหรับ flow ปัจจุบัน

## In-App Notifications

MVP ของแจ้งเตือนในแอพจะคำนวณจากข้อมูลที่มีอยู่ก่อน:

- คำขอใหม่จาก `booking_requests`
- คำขอรอยืนยัน
- คิววันนี้จาก `appointments`
- คิวที่ใกล้ถึงเวลา

ยังไม่ทำ push notification จริงบนมือถือในช่วงแรก

## Future Cleanup

ข้อมูลเก่าที่เกี่ยวกับ Google Calendar ให้ถือเป็น legacy จนกว่าจะทำ migration ล้าง production อย่างปลอดภัย:

- `calendar_integrations`
- `google_calendar_event_id`
- `google_calendar_name`
