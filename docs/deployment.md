# Deployment

## โครงสร้างเว็บจริงระยะแรก

- `index.html` คือหน้าลูกค้าสาธารณะ
- `owner.html` คือหน้าร้านสำหรับเจ้าของร้าน
- `customer.js` ดูแล flow จองคิวฝั่งลูกค้า
- `owner.js` ดูแล flow หลังบ้าน
- `supabase/schema.sql` คือ schema สำหรับฐานข้อมูลจริง

## Cloudflare Pages

ตั้งค่า build บน Cloudflare Pages:

```text
Framework preset: None
Build command: exit 0
Build output directory: /
Root directory: /
Production branch: main
```

เหตุผล: เว็บระยะแรกเป็น static site ไม่มีขั้นตอน build จึงให้คำสั่งจบด้วย exit code 0 แล้วให้ Cloudflare อัปโหลดไฟล์จาก root directory

เอกสารอ้างอิง:

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)

ตัวแปรที่ต้องเตรียมเมื่อเชื่อม backend จริง:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
GOOGLE_CLIENT_ID
GOOGLE_REDIRECT_URI
APP_URL
```

## GitHub

หลัง commit แล้ว push ขึ้น GitHub:

```bash
git push -u origin main
```

จากนั้นเชื่อม repository กับ Cloudflare Pages

## Supabase

1. สร้าง Supabase project
2. เปิด SQL Editor
3. วางเนื้อหาใน `supabase/schema.sql`
4. Run schema
5. ตรวจว่าเปิด Row Level Security แล้วทุกตาราง

## Google Calendar

ยังไม่ควรเก็บ token ใน frontend

ระบบจริงต้องเพิ่ม backend endpoint:

```text
/api/google/connect
/api/google/callback
/api/calendar/events
```

เมื่อเจ้าของร้านยืนยันคิว backend จะสร้าง Google Calendar event แล้วบันทึก `google_calendar_event_id` กลับเข้า `appointments`
