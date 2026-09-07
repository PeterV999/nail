# Staging and Preview

เป้าหมายของ staging คือให้เห็นงานจริงก่อนแตะ production โดยเฉพาะงาน UI, route, ระบบหลายร้าน, auth และ Supabase policy

## แนวทางแนะนำ

ใช้ Cloudflare Pages preview deployment จาก branch/PR เป็น staging หลัก

- Production: branch `main`
- Preview/Staging: branch งานหรือ Pull Request
- Production URL: `https://bookingnail.pages.dev`
- Preview URL: URL ที่ Cloudflare สร้างให้ในแต่ละ deployment

## วิธีใช้งาน

1. สร้าง branch งาน เช่น `feature/owner-dashboard-cleanup`
2. Push branch ไป GitHub
3. เปิด Pull Request
4. รอ GitHub Actions ผ่าน
5. เปิด Cloudflare Preview URL ของ PR
6. ตรวจ route และ screenshot ก่อน merge

## Route ที่ต้องตรวจใน staging

- `/` หน้า preview/รวมร้าน
- `/fah` หน้าจองร้าน Fah Nail
- `/fah-owner/` หลังบ้านร้าน Fah Nail
- `/register/` สมัครร้านใหม่
- `/admin/` หลังบ้านกลาง
- `/{shopSlug}` และ `/{shopSlug}-owner` เมื่อแก้ระบบหลายร้าน

## Supabase ใน staging

ระยะแรกสามารถใช้ Supabase production project เดิมได้เฉพาะงาน frontend ที่ไม่สร้างข้อมูลจริงจำนวนมาก แต่ต้องระวัง:

- ห้ามใช้ service role key ใน frontend
- ห้าม seed ข้อมูลทดสอบโดยไม่ลบ
- ห้ามทดสอบลบ/ปิดร้านจริงโดยไม่มีแผน rollback
- ถ้าจะทดสอบ migration/RLS เสี่ยงสูง ควรสร้าง Supabase staging project แยก

## เมื่อควรมี Supabase staging แยก

- เปลี่ยน schema หรือ RLS หลัก
- เพิ่มระบบชำระเงิน
- เพิ่มระบบ Web Push backend
- เพิ่ม flow สมัครร้านที่สร้างข้อมูลหลายตาราง
- ทดสอบสิทธิ์ owner/staff/admin แบบหลายบัญชี

## Definition of Done

- GitHub Actions ผ่าน
- Preview route เปิดครบ
- ไม่มี console error สำคัญ
- mobile/iPad screenshot ไม่ล้น
- หากกระทบ database ต้องมี migration note
- พร้อม merge เข้า `main` โดยไม่ต้องเดา
