# Automated Tests

เอกสารนี้สรุปชุด test ที่ใช้คุมคุณภาพ BookingNail ก่อน merge/deploy

## คำสั่งหลัก

```bash
npm run check
npm run test:smoke
npm run test:screenshots
npm run test:booking-flow
npm run test:owner-role
npm run test:multi-shop-access
npm run test:ci
```

## ความหมายของแต่ละชุด

| Command | ตรวจอะไร | ใช้เมื่อไหร่ |
|---|---|---|
| `npm run check` | syntax ของ JS หลักทั้งหมด | ทุกครั้ง |
| `npm run test:smoke` | route สำคัญและ legacy route | ทุกครั้งก่อน deploy |
| `npm run test:screenshots` | mobile/iPad screenshot และ horizontal overflow | เมื่อแก้ UI |
| `npm run test:booking-flow` | flow ลูกค้าจองแบบ browser local | เมื่อแก้หน้าจอง |
| `npm run test:owner-role` | สิทธิ์ owner/staff และเมนูหลังบ้าน | เมื่อแก้หลังบ้าน |
| `npm run test:multi-shop-access` | กันร้าน A/B เห็นข้อมูลข้ามกัน | เมื่อแก้หลายร้าน/RLS/route |
| `npm run test:booking-flow:db` | flow กับ Supabase จริง | ก่อนเปิดใช้จริงหรือหลังเปลี่ยน DB |

## GitHub Actions

GitHub Actions ต้องรัน `npm run test:ci` บน Pull Request และ push เข้า `main`

ชุดนี้ตั้งใจให้เป็น gate หลักสำหรับผู้พัฒนาร่วม ถ้าไม่ผ่านต้องแก้ก่อน merge ยกเว้น browser automation มีปัญหาจาก environment และมีหลักฐานทดสอบทดแทน

## Test ที่ต้องใช้ secret

`npm run test:booking-flow:db` ต้องใช้ environment variables:

```bash
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

ห้าม commit key เหล่านี้เข้า Git

## Test ที่ยังควรเพิ่ม

- staff ลงคิวได้ แต่แก้บริการ/ทีมงานไม่ได้
- admin กลางแก้ธีม/เปิดปิดร้านได้ แต่ข้อมูลลูกค้าสาธารณะไม่รั่ว
- PWA cache update behavior หลัง bump version
- Web Push subscription เมื่อเริ่มทำ notification ตอนปิดเว็บ
- production smoke test แบบข้อมูลจริงที่สร้างแล้วลบเอง
