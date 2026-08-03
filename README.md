# Fah Nail Booking Platform

สำหรับโปรเจคร้านทำเล็บ ระบบจองคิวและบันทึกคิว เริ่มต้นจากร้านแรกคือ **Fah Nail** และออกแบบเผื่อขยายเป็นแพลตฟอร์มให้ร้านอื่นเช่าใช้รายเดือนในอนาคต

## ขอบเขตล่าสุด

ระบบนี้โฟกัสเฉพาะ:

- การจองคิว
- การบันทึกคิว
- การจัดการคำขอจอง
- การลงคิวโดยเจ้าของร้าน
- การเชื่อม Google Calendar
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
- [Backlog](docs/backlog.md)
- [Deployment](docs/deployment.md)

## หน้าเว็บระยะแรก

ไฟล์เริ่มต้นของหน้าเว็บอยู่ที่ [index.html](index.html)

ตอนนี้แยกทางเข้าเป็นรูปแบบเว็บจริงระยะแรก:

- [index.html](index.html) สำหรับลูกค้าสาธารณะ
- [owner.html](owner.html) สำหรับเจ้าของร้าน
- [customer.js](customer.js) สำหรับ logic หน้าลูกค้า
- [owner.js](owner.js) สำหรับ logic หลังบ้าน
- [supabase/schema.sql](supabase/schema.sql) สำหรับฐานข้อมูลจริง

ฟีเจอร์ที่มีในเว็บระยะแรก:

- หน้าจองคิวลูกค้า
- เลือกบริการอย่างน้อย 1 รายการ
- เลือกช่วงเวลาที่สะดวก
- ส่งคำขอจอง
- หลังบ้านเจ้าของร้าน
- ยืนยันคำขอจอง
- ลงคิวเอง
- เพิ่ม ลบ เปิด หรือปิดบริการ
- เพิ่ม ลบ เปิด หรือปิดช่วงเวลารับจอง
- ปิดรับจองทั้งวันตามวันที่เลือก
- ปิดช่วงเวลาที่มีคิว confirmed แล้วในหน้าลูกค้า
- ตัวอย่างหน้าตั้งค่าเชื่อม Google Calendar
- แสดงสถานะคิวที่ส่งเข้าปฏิทินแล้ว
