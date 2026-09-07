# Source of Truth

เอกสารนี้กำหนดแหล่งข้อมูลหลักของโปรเจกต์ BookingNail เพื่อให้ทุกคนแก้โค้ดและ deploy ไปทางเดียวกัน

## แหล่งหลัก

- GitHub repo: `https://github.com/PeterV999/nail`
- Production branch: `main`
- Production site: `https://bookingnail.pages.dev`
- Working copy หลักบนเครื่องคุณ Peter: `/Users/peterv999/Documents/Codex/nail`

โฟลเดอร์บนเครื่องเป็นเพียง working copy ของคนทำงานคนนั้น ผู้พัฒนาคนอื่นสามารถ clone repo ไปไว้ที่ path ของตัวเองได้ แต่ต้อง push กลับเข้า GitHub และให้ Cloudflare deploy จาก GitHub เป็นหลัก

## กติกาการแก้ไข

1. ดึงโค้ดล่าสุดจาก `main` ก่อนเริ่มงาน
2. สร้าง branch สำหรับงานใหม่ ยกเว้นงานเล็กที่คุณ Peter ให้แก้ตรง `main`
3. แก้เฉพาะไฟล์ที่เกี่ยวข้อง
4. รันชุดตรวจตาม `docs/release-checklist.md`
5. เปิด Pull Request หรือ push เข้า `main` ตามสิทธิ์งาน
6. ให้ Cloudflare Pages deploy จาก GitHub

## สิ่งที่ไม่ใช่ source หลัก

- ไฟล์บน production Cloudflare ไม่ใช่ที่แก้โค้ดหลัก
- ข้อความในแชทไม่ใช่เอกสารหลัก หากเป็น decision สำคัญต้องลง docs หรือ ADR
- Screenshot เป็นหลักฐานตรวจ UI แต่ไม่ใช่ source ของ behavior
- Supabase dashboard เป็นสถานะ production ไม่ใช่ migration history

## ไฟล์ที่ห้ามนำเข้า Git

รายการนี้เป็นข้อมูลเฉพาะร้านหรือข้อมูลชั่วคราว:

- `branding/`
- `marketing/`
- `เมนูราคา.png`
- `.env`
- `.env.local`
- `test-artifacts/`
- `node_modules/`

## เมื่อข้อมูลขัดกัน

ใช้ลำดับความน่าเชื่อถือนี้:

1. Production behavior ที่ตรวจจริง
2. Source code ใน GitHub `main`
3. SQL migration/schema ใน `supabase/`
4. เอกสารใน `docs/`
5. แชทหรือ note ชั่วคราว
