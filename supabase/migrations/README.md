# Supabase Migrations

เก็บ SQL migration ใหม่ที่ต้อง run ตามลำดับเวลา

ชื่อไฟล์:

```text
YYYYMMDDHHMM_short_description.sql
```

ไฟล์ schema รวมยังอยู่ที่ `supabase/schema.sql` แต่ migration ใหม่ควรเพิ่มในโฟลเดอร์นี้เพื่อให้รู้ลำดับการเปลี่ยนแปลง production
