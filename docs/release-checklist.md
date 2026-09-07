# Release Checklist

ใช้ checklist นี้ก่อน merge หรือ deploy ทุกครั้ง เพื่อให้ BookingNail อัปเดตได้สม่ำเสมอและย้อนกลับได้

## ก่อนเริ่มงาน

- [ ] อยู่ที่ repo `/Users/peterv999/Documents/ChatGPT/nail` หรือ clone จาก GitHub repo เดียวกัน
- [ ] `git status` สะอาด หรือเข้าใจไฟล์ที่เปลี่ยนอยู่ทั้งหมด
- [ ] ดึงโค้ดล่าสุดจาก GitHub
- [ ] ตรวจว่าไม่มีไฟล์เฉพาะร้าน เช่น `branding/`, `marketing/`, `เมนูราคา.png`

## ก่อน commit

- [ ] `npm run check`
- [ ] `npm run test:smoke`
- [ ] `npm run test:screenshots` เมื่อแก้ UI หรือ responsive
- [ ] `npm run test:booking-flow` เมื่อแก้หน้าจองลูกค้า
- [ ] `npm run test:owner-role` เมื่อแก้หลังบ้านหรือสิทธิ์ทีมงาน
- [ ] `npm run test:multi-shop-access` เมื่อแก้ route, RLS, shop membership หรือระบบหลายร้าน
- [ ] ถ้ามี Supabase SQL ใหม่ ต้องมีไฟล์ SQL ใน `supabase/` หรือ `supabase/migrations/`
- [ ] ถ้าแก้ CSS, JS, PWA หรือ asset ต้อง bump `assetVersion` และ `CACHE_VERSION`

## คำสั่งรวมสำหรับ CI

```bash
npm run test:ci
```

คำสั่งนี้รันชุดตรวจหลักที่ควรผ่านบน GitHub Actions ได้แก่ syntax, smoke, screenshots, booking flow, owner role และ multi-shop access

## ก่อน deploy

- [ ] Pull Request ผ่าน GitHub Actions
- [ ] Cloudflare Pages เชื่อม GitHub auto-deploy อยู่
- [ ] หากต้องใช้ SQL ให้ run SQL บน Supabase production ก่อนหรือหลัง deploy ตามลำดับที่ระบุใน PR
- [ ] บันทึกว่า deploy commit ใด
- [ ] ตรวจว่า production monitoring workflow ยัง active อยู่

## หลัง deploy

- [ ] รัน `npm run monitor:production` หรือกดรัน GitHub Actions workflow `Production Monitor`
- [ ] เปิด `https://bookingnail.pages.dev/`
- [ ] เปิด `https://bookingnail.pages.dev/fah`
- [ ] เปิด `https://bookingnail.pages.dev/fah-owner/`
- [ ] เปิด `https://bookingnail.pages.dev/register/`
- [ ] เปิด `https://bookingnail.pages.dev/admin/`
- [ ] ทดสอบลูกค้าจองจริง 1 รอบถ้างานกระทบ booking
- [ ] ตรวจว่า public page ไม่แสดงชื่อ เบอร์ LINE หรือข้อมูลส่วนตัวลูกค้า
- [ ] ตรวจมือถือ/iPad จริง ถ้าเห็นหน้าเก่าให้ refresh หรือ clear site data
- [ ] ถ้า health check fail ให้ rollback ก่อนแก้เพิ่มเมื่อกระทบการจองจริง

## Rollback

1. เข้า Cloudflare Pages project `bookingnail`
2. เปิด Deployments
3. เลือก deployment ก่อนหน้า
4. กด Rollback
5. ตรวจ route หลักอีกครั้ง

ถ้า rollback เกี่ยวข้องกับ Supabase SQL ให้ดู `docs/database-migrations.md` ก่อน เพราะ schema บางอย่าง rollback ด้วยหน้าเว็บอย่างเดียวไม่ได้
