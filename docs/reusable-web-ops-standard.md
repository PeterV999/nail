# Reusable Web Ops Standard

เอกสารนี้คือมาตรฐานกลางสำหรับทำเว็บไซต์/เว็บแอพจากประสบการณ์ของ BookingNail เพื่อใช้ซ้ำกับโปรเจกต์อื่น โดยโฟกัสเฉพาะงานระบบ วิธีทำงาน การทดสอบ deploy monitoring และการส่งต่อทีม

เอกสารนี้ไม่ใช่คู่มือออกแบบ UI และไม่ใช่ migration SQL ใหม่ ถ้าโปรเจกต์ใหม่ต้องแก้หน้าตาหรือฐานข้อมูล ให้แยกเอกสารของโปรเจกต์นั้นเอง

## Scope

ใช้เอกสารนี้เมื่อเริ่มหรือดูแลเว็บที่ต้องการ:

- มี Git เป็น source กลาง
- มี local development ที่ทุกคนรันได้
- มี automated checks ก่อน merge
- มี staging หรือ preview ก่อน production
- มี deploy ที่ทำซ้ำได้
- มี production health check
- มี rollback checklist
- มีข้อกำหนดไม่ให้ secret หรือข้อมูลส่วนตัวหลุดเข้า repo

ไม่ครอบคลุม:

- Visual design, สี, layout, component style
- Database schema, RLS, stored procedure, migration SQL
- Business pricing, tax, payment, invoice
- Content strategy หรือ marketing copy เชิงขาย

## Source of Truth

ทุกโปรเจกต์ควรกำหนด source หลักให้ชัด:

- GitHub/GitLab repo คือ source กลาง
- เครื่องแต่ละคนเป็น working copy เท่านั้น
- Production ต้อง deploy จาก commit ที่ระบุได้
- ห้ามแก้ production โดยไม่กลับมาบันทึกใน repo
- เอกสารสำคัญต้องอยู่ใน repo ไม่อยู่แค่ในแชทหรือ note ส่วนตัว

ตัวอย่างสำหรับโปรเจกต์ใหม่:

```text
Source repo: https://github.com/<owner>/<repo>
Production URL: https://<domain>
Staging URL: https://<preview-domain>
Main branch: main
Deploy provider: Cloudflare Pages / Vercel / Netlify / other
```

## Project Structure

โครงขั้นต่ำที่แนะนำ:

```text
.
├── README.md
├── CONTRIBUTING.md
├── docs/
│   ├── source-of-truth.md
│   ├── developer-workflow.md
│   ├── release-checklist.md
│   ├── staging.md
│   ├── automated-tests.md
│   └── production-monitoring.md
├── scripts/
│   ├── dev-server.js
│   ├── smoke-test.js
│   └── production-health-check.js
├── .github/
│   ├── workflows/
│   │   ├── check.yml
│   │   └── production-monitor.yml
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
└── package.json
```

โปรเจกต์ที่ไม่มี backend หรือไม่มี PWA สามารถตัดไฟล์ที่ไม่เกี่ยวข้องออกได้ แต่ควรเหลือ README, CONTRIBUTING, release checklist, automated tests และ production monitoring

## Developer Workflow

กติกากลาง:

1. ดึง `main` ล่าสุดก่อนเริ่ม
2. สร้าง branch เฉพาะงาน เช่น `feature/register-flow`, `fix/production-cache`, `docs/release-runbook`
3. แก้เฉพาะ scope ของงาน
4. รัน checks ในเครื่อง
5. เปิด Pull Request
6. ให้ CI ผ่านก่อน merge
7. deploy จาก Git provider ไม่ deploy จากเครื่องส่วนตัว ยกเว้นกรณีฉุกเฉิน
8. หลัง deploy ต้องตรวจ production

ข้อความ commit ควรสั้นและบอกผลลัพธ์:

```text
Add production health check
Fix stale cache version
Document release workflow
```

## Pull Request Rules

PR ทุกอันควรมี:

- Summary ของสิ่งที่เปลี่ยน
- Checks ที่รันแล้ว
- Route หรือหน้าที่กระทบ
- ข้อมูล deploy/preview URL ถ้ามี
- ระบุว่าไม่มี secret หรือข้อมูลส่วนตัวติดไป
- ระบุว่าไม่กระทบ SQL หากไม่ได้แก้ฐานข้อมูล
- ระบุว่าไม่กระทบ UI หากเป็นงานระบบเท่านั้น

Checklist ขั้นต่ำ:

```text
- [ ] Ran syntax/check command
- [ ] Ran smoke test
- [ ] Ran production health check after deploy or marked not deployed yet
- [ ] No secrets or private customer data included
- [ ] No UI changes
- [ ] No SQL/database changes
- [ ] Docs updated when workflow changed
```

## Automated Tests

ชุดตรวจขั้นต่ำสำหรับเว็บทั่วไป:

- Syntax check: ตรวจว่าไฟล์ JS/config parse ได้
- Route smoke test: เปิด route หลักแล้วเจอ marker ที่คาดไว้
- Legacy route test: route เก่าต้อง redirect หรือ 404
- Auth/permission test: ถ้าเว็บมีระบบสมาชิก ต้องตรวจสิทธิ์ตาม role
- Booking/form flow test: ถ้าเว็บมีฟอร์มสำคัญ ต้องจำลองกรอกและส่งแบบ local/mock
- Production health check: ตรวจ production URL, asset สำคัญ, manifest, service worker และ route สำคัญ

ตัวอย่างคำสั่ง:

```bash
npm run check
npm run test:smoke
npm run test:ci
npm run monitor:production
```

หลักสำคัญ:

- Test ต้อง fail แบบชัดเจนเมื่อ route หายหรือ config ไม่ครบ
- Test ไม่ควรใช้ข้อมูลลูกค้าจริง
- Test ที่ต้องใช้ secret ต้องแยกเป็นคำสั่งเฉพาะ และห้ามบังคับให้ทุกคนรัน
- ถ้า browser automation รันบนเครื่องบางคนไม่ได้ ให้ CI เป็นตัวตัดสินหลัก

## Deploy Standard

แนวทาง deploy:

- Production deploy จาก `main` เท่านั้น
- Preview deploy จาก branch/PR
- Direct upload ใช้เฉพาะกรณีฉุกเฉิน
- ทุก deploy ต้องผูกกับ commit hash
- ถ้าแก้ asset/cache/PWA ต้อง bump version ตามกติกาของโปรเจกต์
- หลัง deploy ต้องรัน production health check

ข้อมูลที่ต้องมีในเอกสาร deploy:

```text
Production URL:
Staging/Preview URL:
Deploy provider:
Production branch:
Build command:
Output directory:
Environment variables:
Rollback method:
```

## Production Monitoring

ขั้นต่ำควรมี:

- Manual command สำหรับตรวจ production
- Scheduled GitHub Actions หรือ provider cron
- ตรวจ route หลัก
- ตรวจ static asset สำคัญ
- ตรวจ cache/PWA version หากมี
- ตรวจ legacy route
- แจ้งเตือนเมื่อ workflow fail

สิ่งที่ไม่ควรทำใน monitoring ขั้นพื้นฐาน:

- ไม่ดึงข้อมูลลูกค้าจริงออกมาแสดงใน log
- ไม่ใช้ service role key หากไม่จำเป็น
- ไม่เขียนข้อมูลลง production
- ไม่ผูก monitoring กับเครื่องใครคนหนึ่ง

ตัวอย่างผลลัพธ์ที่ควรเห็น:

```text
Production OK /
Production OK /login
Production OK /dashboard
Legacy route closed /old-page (301)
Production health check passed
```

## Security and Privacy Baseline

ทุกโปรเจกต์ควรมี:

- `.gitignore` ที่กัน `.env`, secret, local artifacts
- ห้าม commit private key, token, OTP, password
- ห้ามใส่ข้อมูลลูกค้าจริงใน issue, PR, docs, screenshot
- แยก public key กับ secret key ให้ชัด
- เปิด HTTPS บน production
- มี privacy/terms เมื่อเริ่มเก็บข้อมูลส่วนบุคคล
- log เฉพาะ metadata ที่จำเป็น ไม่ log ข้อมูลส่วนตัวเต็ม

## Cache and PWA Rules

ถ้าเว็บมี service worker หรือ PWA:

- ต้องมี version กลาง เช่น `assetVersion` และ `CACHE_VERSION`
- แก้ CSS/JS/asset แล้วต้อง bump version
- หลัง deploy ต้องตรวจมือถือจริง
- ถ้าหน้าเก่าค้าง ต้องมีวิธี refresh หรือ clear site data ที่อธิบายได้
- Service worker ควรใช้ network-first สำหรับหน้าที่ต้องสด และ cache-first เฉพาะ asset ที่เหมาะสม

## Rollback Standard

ก่อนเปิด production ต้องรู้วิธีถอยกลับ:

1. ดู commit/deployment ล่าสุด
2. ตรวจว่าปัญหาอยู่ที่ frontend, backend, config, cache หรือ external service
3. ถ้ากระทบผู้ใช้จริง ให้ rollback deployment ก่อน
4. ถ้าเกี่ยวกับ database ต้องระวัง เพราะ rollback frontend อย่างเดียวอาจไม่พอ
5. หลัง rollback ให้รัน production health check
6. บันทึก root cause สั้น ๆ ใน issue หรือ PR

## Handoff for Other Developers

เมื่อมีผู้พัฒนาร่วม ต้องส่งต่อ:

- Repo URL
- Branch strategy
- Local setup commands
- Test commands
- Deploy process
- Rollback process
- Environment variables ที่ต้องมี โดยไม่ส่งค่า secret ในเอกสาร
- รายการไฟล์ที่ห้าม commit
- Definition of Done

ข้อความสั้นสำหรับผู้พัฒนาร่วม:

```text
ให้ clone repo, สร้าง branch จาก main, รัน npm ci, npm run check, npm run test:smoke,
เปิด PR และรอ CI ผ่านก่อน merge ห้าม commit secret หรือข้อมูลลูกค้าจริง
```

## Reuse Checklist

ก่อนนำมาตรฐานนี้ไปใช้กับเว็บใหม่:

- [ ] เปลี่ยนชื่อ repo และ production URL
- [ ] กำหนด route หลักของเว็บใหม่
- [ ] ปรับ smoke test marker ให้ตรง HTML จริง
- [ ] กำหนด legacy route ที่ต้อง redirect หรือ 404
- [ ] กำหนด deploy provider และ branch
- [ ] เพิ่ม GitHub Actions check workflow
- [ ] เพิ่ม production monitor workflow
- [ ] เขียน rollback checklist
- [ ] ตรวจว่าไม่มี UI rules หรือ SQL rules เฉพาะ BookingNail ติดไปโดยไม่ตั้งใจ

## BookingNail Reference

ไฟล์ใน BookingNail ที่ใช้เป็นตัวอย่างได้:

- `CONTRIBUTING.md`
- `docs/developer-workflow.md`
- `docs/release-checklist.md`
- `docs/staging.md`
- `docs/automated-tests.md`
- `docs/production-monitoring.md`
- `scripts/smoke-test.js`
- `scripts/production-health-check.js`
- `.github/workflows/check.yml`
- `.github/workflows/production-monitor.yml`
- `.github/pull_request_template.md`
