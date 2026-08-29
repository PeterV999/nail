# Developer Workflow

เอกสารนี้เป็นกติกากลางสำหรับผู้พัฒนาที่มาช่วยแก้ BookingNail เพื่อให้โค้ดไม่กระจัดกระจายและ deploy ได้ปลอดภัย

## Source กลาง

GitHub repo คือ source กลางของทีม:

https://github.com/PeterV999/nail

โฟลเดอร์ `/Users/peterv999/Documents/Codex/nail` เป็น working copy บนเครื่องคุณ Peter เท่านั้น ผู้พัฒนาคนอื่นจะ clone repo ไปไว้ใน path ของเครื่องตัวเองได้

## ขั้นตอนทำงานมาตรฐาน

1. ดึงโค้ดล่าสุดจาก GitHub ก่อนเริ่มงาน
2. สร้าง branch ใหม่สำหรับงานนั้น เช่น `feature/shop-themes`
3. แก้เฉพาะไฟล์ที่เกี่ยวข้องกับงาน
4. รัน `npm run check`
5. รัน `npm run test:smoke`
6. รัน browser test ที่เกี่ยวข้อง เช่น `npm run test:screenshots`, `npm run test:booking-flow`, หรือ `npm run test:owner-role`
7. ทดสอบหน้าเว็บหลักใน local server ด้วย `npm run dev`
8. commit พร้อมข้อความสั้นและชัดเจน
9. push branch และเปิด Pull Request
10. merge เข้า `main` หลังตรวจผ่านเท่านั้น
11. ให้ Cloudflare Pages deploy จาก GitHub ไม่ deploy จากเครื่องส่วนตัวถ้าไม่จำเป็น

## กติกาแก้ด้วยมือ

- ห้ามใส่ secret, service role key, private token หรือรหัสผ่านใน Git
- ห้ามเพิ่มไฟล์เฉพาะร้านเข้า Git เช่น `branding/`, `marketing/`, `เมนูราคา.png`
- ห้ามแก้ production โดยไม่ผ่าน GitHub ยกเว้นกรณีฉุกเฉิน
- ถ้ามี Supabase SQL ใหม่ ต้องเก็บไฟล์ SQL ใน `supabase/` และระบุใน PR ว่าต้องรันไฟล์ไหน
- ถ้าแก้ PWA, CSS, JS หรือ asset ต้อง bump `assetVersion` และ `CACHE_VERSION`
- ถ้าแก้ routing ต้องทดสอบทั้ง `/`, `/fah`, `/fah-owner`, `/admin`, `/register` และร้านใหม่แบบ `/xxx`, `/xxx-owner`

## Checklist ก่อน merge

- [ ] `git status` ไม่มีไฟล์เฉพาะร้านติดมาโดยไม่ตั้งใจ
- [ ] `npm run check` ผ่าน
- [ ] `npm run test:smoke` ผ่าน
- [ ] `npm run test:screenshots` ผ่าน หรือแนบเหตุผลถ้า environment เปิด browser ไม่ได้
- [ ] `npm run test:booking-flow` ผ่านเมื่อมีการแก้หน้าจอง
- [ ] `npm run test:owner-role` ผ่านเมื่อมีการแก้หลังบ้านหรือสิทธิ์ทีมงาน
- [ ] หน้าลูกค้า `/fah` เปิดได้
- [ ] หลังบ้านร้าน `/fah-owner` เปิดได้
- [ ] หลังบ้านกลาง `/admin` เปิดได้
- [ ] ร้านใหม่เปิด path `/xxx` และ `/xxx-owner` ได้
- [ ] ถ้างานกระทบ UI มี screenshot มือถือ/iPad แนบใน PR
- [ ] ถ้ามี SQL ใหม่ ระบุไฟล์ที่ต้องรันบน Supabase
- [ ] หลัง deploy ตรวจว่า PWA/cache ไม่ค้างหน้าเก่า

## Test เพิ่มเติม

- `npm run test:screenshots` สร้างภาพ mobile/iPad ไว้ที่ `test-artifacts/screenshots/`
- `npm run test:booking-flow` ตรวจ UX หน้าจองบน browser local
- `npm run test:owner-role` จำลองบัญชีทีมงานและตรวจว่าเมนูจัดการร้าน/ทีมงานถูกซ่อนจาก staff
- `npm run test:booking-flow:db` ตรวจ flow ฐานข้อมูลจริง ต้องตั้ง `SUPABASE_ANON_KEY` และ `SUPABASE_SERVICE_ROLE_KEY` ในเครื่องก่อนรัน ห้าม commit key เหล่านี้เข้า Git
- ถ้า Playwright ยังไม่มีในเครื่อง ให้ติดตั้งด้วย `npm install --save-dev playwright` และ `npx playwright install chromium`
