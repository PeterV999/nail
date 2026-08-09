# Fah Nail Booking Platform

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

## หน้าเว็บระยะแรก

ไฟล์เริ่มต้นของหน้าเว็บอยู่ที่ [index.html](index.html)

ตอนนี้แยกทางเข้าเป็นรูปแบบเว็บจริงระยะแรก โดย URL ที่ใช้กับลูกค้าและเจ้าของร้านควรเป็น route ของแพลตฟอร์ม ไม่ใช่ชื่อไฟล์ HTML:

- `/` เป็นหน้า preview/รายการตัวอย่างของแพลตฟอร์ม ไม่ใช่หน้าจองร้านจริง
- `/fah` สำหรับลูกค้าสาธารณะของร้าน Fah Nail
- `/fah-owner` สำหรับเจ้าของร้าน Fah Nail
- `/{shopSlug}` สำหรับหน้าจองคิวของร้านอื่นในอนาคต
- `/{shopSlug}-owner` สำหรับหลังบ้านของร้านนั้นเท่านั้น
- `/b/{shopSlug}`, `/book/{shopSlug}`, `/o/{shopSlug}`, และ `/dashboard/{shopSlug}` ยังรองรับเป็น route เก่า
- `/admin/` สำหรับหลังบ้านกลางของผู้ดูแลระบบ และเป็นหน้าเริ่มต้นเมื่อเปิดแบบ PWA
- `/register` สำหรับร้านใหม่ที่ต้องการลงทะเบียน
- [index.html](index.html) เป็นไฟล์ implementation ของหน้าลูกค้า
- [owner.html](owner.html) เป็นไฟล์ implementation ของหลังบ้าน
- [customer.js](customer.js) สำหรับ logic หน้าลูกค้า
- [owner.js](owner.js) สำหรับ logic หลังบ้าน
- [register.js](register.js) สำหรับ logic ลงทะเบียนร้านใหม่
- [supabase/schema.sql](supabase/schema.sql) สำหรับฐานข้อมูลจริง
- Google Calendar sync ถูกตัดออกจาก flow ปัจจุบันแล้ว

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
