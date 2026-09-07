# Database Migrations

ใช้เอกสารนี้ควบคุมการแก้ Supabase schema, RLS, RPC และ seed data เพื่อไม่ให้ production เปลี่ยนแบบจำไม่ได้

## หลักการ

- ทุกการแก้ database ต้องอยู่ใน Git
- ห้ามแก้ SQL ใน Supabase dashboard แล้วไม่บันทึกกลับ repo
- SQL ที่เปลี่ยน schema/RLS/RPC ต้องมีหมายเหตุว่า run แล้วหรือยัง
- ถ้า rollback ยาก ต้องเขียน recovery note ก่อน deploy

## โครงสร้างไฟล์

ไฟล์ฐานปัจจุบันยังอยู่ใน `supabase/`:

- `supabase/schema.sql`
- `supabase/platform-admin.sql`
- `supabase/shop-members-admin.sql`
- `supabase/shop-profile.sql`
- `supabase/shop-themes.sql`
- `supabase/audit-log.sql`
- `supabase/push-notifications.sql`
- `supabase/remove-legacy-calendar.sql`

สำหรับ migration ใหม่ ให้เพิ่มใน:

```text
supabase/migrations/
```

รูปแบบชื่อไฟล์:

```text
YYYYMMDDHHMM_short_description.sql
```

ตัวอย่าง:

```text
202609071430_add_shop_activity_log_indexes.sql
```

## Checklist ก่อน run SQL

- [ ] อ่าน SQL ทั้งไฟล์แล้ว
- [ ] ไม่มี service role key หรือข้อมูลส่วนตัวในไฟล์
- [ ] มี `create table if not exists` หรือแนวทาง idempotent เมื่อเหมาะสม
- [ ] RLS เปิดและ policy ไม่กว้างเกินไป
- [ ] RPC ที่ใช้ `security definer` ตั้ง `search_path`
- [ ] ระบุว่า SQL ต้อง run ก่อนหรือหลัง deploy frontend
- [ ] สำรอง schema หรือ export ก่อนแก้ production ที่เสี่ยง

## บันทึกการ run

เมื่อ run SQL production ให้บันทึกใน PR หรือ release note:

```text
Supabase project: punzqhfrhdgimvmczspv
File: supabase/migrations/YYYYMMDDHHMM_example.sql
Run by: [ชื่อผู้ run]
Run date: YYYY-MM-DD
Result: success / failed
Rollback note: [ถ้ามี]
```

## งานที่ต้องแยก staging

ควรทดสอบบน Supabase staging project ก่อนถ้า SQL กระทบ:

- RLS ของ `booking_requests`, `appointments`, `shop_members`
- RPC สมัครร้านใหม่
- policy ที่เกี่ยวกับ public booking
- Web Push backend
- audit/activity log
