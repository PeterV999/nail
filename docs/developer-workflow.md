# Developer Workflow

เอกสารนี้เป็นกติกากลางสำหรับผู้พัฒนาที่มาช่วยแก้ BookingNail เพื่อให้โค้ดไม่กระจัดกระจายและ deploy ได้ปลอดภัย

## Source กลาง

GitHub repo คือ source กลางของทีม:

https://github.com/PeterV999/nail

โฟลเดอร์ `/Users/peterv999/Documents/ChatGPT/nail` เป็น working copy หลักบนเครื่องคุณ Peter เท่านั้น ผู้พัฒนาคนอื่นจะ clone repo ไปไว้ใน path ของเครื่องตัวเองได้

อ่านรายละเอียด source of truth เพิ่มเติมที่ `docs/source-of-truth.md`

## ขั้นตอนทำงานมาตรฐาน

1. ดึงโค้ดล่าสุดจาก GitHub ก่อนเริ่มงาน
2. สร้าง branch ใหม่สำหรับงานนั้น เช่น `feature/shop-themes`
3. แก้เฉพาะไฟล์ที่เกี่ยวข้องกับงาน
4. รัน `npm run check`
5. รัน `npm run test:smoke`
6. รัน browser test ที่เกี่ยวข้อง เช่น `npm run test:screenshots`, `npm run test:booking-flow`, หรือ `npm run test:owner-role`
7. ถ้าแก้ route, สิทธิ์, หรือระบบหลายร้าน ให้รัน `npm run test:multi-shop-access`
8. ทดสอบหน้าเว็บหลักใน local server ด้วย `npm run dev`
9. commit พร้อมข้อความสั้นและชัดเจน
10. push branch และเปิด Pull Request
11. merge เข้า `main` หลังตรวจผ่านเท่านั้น
12. ให้ Cloudflare Pages deploy จาก GitHub ไม่ deploy จากเครื่องส่วนตัวถ้าไม่จำเป็น

งานทุกชิ้นควรผ่าน staging/preview ก่อน merge หากกระทบ UI, route, auth, Supabase หรือระบบหลายร้าน ดูขั้นตอนที่ `docs/staging.md`

## Branch และ Commit

ใช้ชื่อ branch ให้บอกงานชัดเจน:

- `feature/shop-theme-picker`
- `fix/mobile-owner-actions`
- `docs/deploy-runbook`
- `test/multi-shop-access`

ข้อความ commit ควรเป็นประโยคสั้นที่บอกผลลัพธ์ เช่น:

- `Improve mobile owner quick actions`
- `Add production health check`
- `Document database migration workflow`

หลีกเลี่ยง commit ใหญ่ที่รวมหลายเรื่อง เช่น UI, SQL, docs และ deploy config ใน commit เดียว ยกเว้นเป็นงาน release cleanup ที่ตั้งใจรวมจริง

## การใช้ AI หรือแก้ด้วยมือ

- ให้ AI ช่วยเขียนได้ แต่ผู้พัฒนาต้องอ่าน diff เองก่อน commit
- ถ้า AI แก้ไฟล์ใหญ่ เช่น `owner.js` หรือ `supabase-adapter.js` ให้ตรวจ scope ด้วย `git diff --stat` และ `git diff`
- อย่าให้ AI สร้าง dependency ใหม่โดยไม่มีเหตุผลชัดเจน
- ถ้าเปลี่ยน copy ภาษาไทยในแอพ ให้ยึดหลักสั้น เข้าใจง่าย และเหมาะกับเจ้าของร้าน
- ถ้าแก้ logic สิทธิ์ ให้เพิ่มหรืออัปเดต test สิทธิ์ทันที
- ถ้าแก้ production issue ให้จด root cause สั้น ๆ ใน PR หรือ issue เพื่อไม่ให้ปัญหาวนกลับมา

## Definition of Ready

ก่อนเริ่มแก้งาน ควรตอบได้ว่า:

- กระทบผู้ใช้กลุ่มไหน: ลูกค้า, เจ้าของร้าน, ทีมงาน, หรือ admin กลาง
- กระทบ route ไหน
- ต้องแก้ Supabase SQL หรือไม่
- ต้องมี screenshot mobile/iPad หรือไม่
- test ใดต้องผ่านก่อน merge

## Definition of Done

งานถือว่าเสร็จเมื่อ:

- โค้ดอยู่ใน branch และเปิด Pull Request แล้ว
- checklist ใน PR ถูกติ๊กหรือใส่เหตุผลครบ
- GitHub Actions ผ่าน หรือระบุข้อจำกัด environment ชัดเจน
- ไม่มีไฟล์เฉพาะร้านหรือข้อมูลส่วนตัวลูกค้าติดไปใน Git
- เอกสารที่เกี่ยวข้องอัปเดตแล้ว
- หลัง deploy ตรวจ production ด้วย `npm run monitor:production` หรือ workflow `Production Monitor`

## กติกาแก้ด้วยมือ

- ห้ามใส่ secret, service role key, private token หรือรหัสผ่านใน Git
- ห้ามเพิ่มไฟล์เฉพาะร้านเข้า Git เช่น `branding/`, `marketing/`, `เมนูราคา.png`
- ห้ามแก้ production โดยไม่ผ่าน GitHub ยกเว้นกรณีฉุกเฉิน
- ถ้ามี Supabase SQL ใหม่ ต้องเก็บไฟล์ SQL ใน `supabase/` และระบุใน PR ว่าต้องรันไฟล์ไหน
- ถ้าเป็น SQL เปลี่ยน schema/RLS/RPC ใหม่ ให้ใช้แนวทางใน `docs/database-migrations.md`
- ถ้าแก้ PWA, CSS, JS หรือ asset ต้อง bump `assetVersion` และ `CACHE_VERSION`
- ถ้าแก้ routing ต้องทดสอบทั้ง `/`, `/fah`, `/fah-owner`, `/admin`, `/register` และร้านใหม่แบบ `/xxx`, `/xxx-owner`
- ถ้าแก้ UI หลังบ้าน ต้องเทียบกับกติกาใน `DESIGN.md` โดยเฉพาะกฎลดกรอบซ้อนกรอบและคำสั้นสำหรับเจ้าของร้าน

## Checklist ก่อน merge

- [ ] `git status` ไม่มีไฟล์เฉพาะร้านติดมาโดยไม่ตั้งใจ
- [ ] `npm run check` ผ่าน
- [ ] `npm run test:ci` ผ่านในเครื่องหรือ GitHub Actions
- [ ] `npm run test:smoke` ผ่าน
- [ ] `npm run test:screenshots` ผ่าน หรือแนบเหตุผลถ้า environment เปิด browser ไม่ได้
- [ ] `npm run test:booking-flow` ผ่านเมื่อมีการแก้หน้าจอง
- [ ] `npm run test:owner-role` ผ่านเมื่อมีการแก้หลังบ้านหรือสิทธิ์ทีมงาน
- [ ] `npm run test:multi-shop-access` ผ่านเมื่อมีการแก้ระบบหลายร้านหรือ route
- [ ] `npm run monitor:production` ผ่านหลัง deploy หรือ GitHub Actions `Production Monitor` ผ่าน
- [ ] หน้าลูกค้า `/fah` เปิดได้
- [ ] หลังบ้านร้าน `/fah-owner` เปิดได้
- [ ] หลังบ้านกลาง `/admin` เปิดได้
- [ ] ร้านใหม่เปิด path `/xxx` และ `/xxx-owner` ได้
- [ ] ถ้างานกระทบ UI มี screenshot มือถือ/iPad แนบใน PR
- [ ] ถ้ามี SQL ใหม่ ระบุไฟล์ที่ต้องรันบน Supabase
- [ ] หลัง deploy ตรวจว่า PWA/cache ไม่ค้างหน้าเก่า

Checklist เต็มก่อน release อยู่ที่ `docs/release-checklist.md`

## Test เพิ่มเติม

- `npm run test:screenshots` สร้างภาพ mobile/iPad ไว้ที่ `test-artifacts/screenshots/`
- `npm run test:booking-flow` ตรวจ UX หน้าจองบน browser local
- `npm run test:owner-role` จำลองบัญชีทีมงาน ตรวจว่าเมนูที่ไม่มีสิทธิ์อยู่ในสถานะล็อก กดแล้วมี popup และ control แก้ร้าน/บริการ/ทีมงานถูกล็อก
- `npm run test:multi-shop-access` จำลองร้าน A/B ตรวจว่าหน้าลูกค้าและหลังบ้านไม่เห็นข้อมูลข้ามร้าน และบัญชีไม่มีสิทธิ์ไม่เห็นข้อมูลหลังบ้าน
- `npm run test:ci` รันชุดตรวจหลักทั้งหมดที่ GitHub Actions ใช้
- `npm run test:booking-flow:db` ตรวจ flow ฐานข้อมูลจริง ต้องตั้ง `SUPABASE_ANON_KEY` และ `SUPABASE_SERVICE_ROLE_KEY` ในเครื่องก่อนรัน ห้าม commit key เหล่านี้เข้า Git
- ถ้า Playwright ยังไม่มีในเครื่อง ให้ติดตั้งด้วย `npm install --save-dev playwright` และ `npx playwright install chromium`

## คู่มือส่งต่อ

- ใช้ `docs/new-shop-flow.md` เป็น checklist เพิ่มร้านใหม่
- ใช้ `docs/app-readiness.md` เป็น roadmap ก่อนยกระดับเป็น PWA/app store
- ใช้ `docs/production-monitoring.md` เป็นคู่มือตรวจ production และ incident
