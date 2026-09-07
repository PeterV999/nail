# Contributing to BookingNail

เอกสารนี้คือทางเข้าหลักสำหรับผู้พัฒนาร่วม ก่อนแก้โค้ดให้อ่านไฟล์นี้และเอกสารที่ลิงก์ไว้ เพื่อให้ทุกคนทำงานจากมาตรฐานเดียวกัน

## Source หลัก

Source กลางคือ GitHub repo:

https://github.com/PeterV999/nail

โฟลเดอร์ `/Users/peterv999/Documents/Codex/nail` เป็น working copy บนเครื่องคุณ Peter เท่านั้น ผู้พัฒนาคนอื่น clone repo ไปไว้ในเครื่องตัวเอง แล้วทำ branch, commit, push และเปิด Pull Request กลับเข้า repo กลาง

## เริ่มงาน

```bash
git clone https://github.com/PeterV999/nail.git
cd nail
npm ci
npm run check
npm run dev
```

เปิด local:

- `http://127.0.0.1:4177/`
- `http://127.0.0.1:4177/fah`
- `http://127.0.0.1:4177/fah-owner/`
- `http://127.0.0.1:4177/admin/`
- `http://127.0.0.1:4177/register/`

## วิธีทำงาน

1. ดึง `main` ล่าสุดก่อนเริ่ม
2. สร้าง branch ใหม่ เช่น `feature/owner-calendar-summary`
3. แก้เฉพาะ scope ของงาน
4. รัน test ที่เกี่ยวข้อง
5. เปิด Pull Request พร้อม checklist
6. รอ GitHub Actions ผ่านก่อน merge
7. ให้ Cloudflare Pages auto-deploy จาก `main`

## กติกาสำคัญ

- อย่า commit secret, service role key, token, password หรือไฟล์ `.env`
- อย่า commit ไฟล์เฉพาะร้าน เช่น `branding/`, `marketing/`, `เมนูราคา.png`
- ถ้าแก้ UI ให้ยึด `DESIGN.md` โดยเฉพาะกติกาลดกรอบซ้อนกรอบและคำสั้น
- ถ้าแก้ route ต้องทดสอบทั้ง `/`, `/fah`, `/fah-owner/`, `/admin/`, `/register/`, `/xxx`, `/xxx-owner`
- ถ้าแก้ Supabase schema/RLS/RPC ต้องเพิ่ม SQL ใน `supabase/` หรือ `supabase/migrations/`
- ถ้าแก้ CSS, JS, PWA หรือ asset ต้อง bump `assetVersion` และ `CACHE_VERSION`
- ถ้าใช้ AI ช่วยเขียน ให้ผู้พัฒนาอ่าน diff เองก่อน commit เสมอ

## Definition of Done

- `npm run check` ผ่าน
- test ที่เกี่ยวข้องผ่าน หรือระบุเหตุผลชัดเจนว่ารันไม่ได้เพราะ environment
- ไม่มีข้อมูลลูกค้าจริงใน commit, issue, PR หรือ screenshot
- screenshot mobile/iPad แนบเมื่อแก้ UI
- PR ระบุ SQL ที่ต้องรัน ถ้ามี
- หลัง deploy รัน `npm run monitor:production` หรือเปิด GitHub Actions workflow `Production Monitor`

## เอกสารที่ควรอ่าน

- `docs/developer-workflow.md`
- `docs/release-checklist.md`
- `docs/source-of-truth.md`
- `docs/staging.md`
- `docs/automated-tests.md`
- `docs/database-migrations.md`
- `docs/production-monitoring.md`
- `DESIGN.md`
