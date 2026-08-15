# Data Model

## shops

เก็บข้อมูลร้าน

```text
id
name
slug
phone
line_id
facebook_page
opening_hours
status
created_at
updated_at
```

## services

เก็บบริการที่ลูกค้าเลือกคร่าว ๆ

```text
id
shop_id
name
description
is_active
sort_order
created_at
updated_at
```

## customers

เก็บข้อมูลลูกค้าแบบไม่เปิดเผยสาธารณะ

```text
id
shop_id
name
phone
line_id
facebook_name
note
created_at
updated_at
```

## booking_requests

เก็บคำขอจองจากหน้าลูกค้า

```text
id
shop_id
customer_id
booking_date
preferred_time_window
selected_service_ids
customer_note
status
source
created_at
updated_at
```

สถานะที่ใช้:

```text
pending_request
contacted
confirmed
rejected
cancelled
```

## appointments

เก็บคิวจริงที่ร้านยืนยันแล้ว หรือเจ้าของร้านลงเอง

```text
id
shop_id
customer_id
booking_request_id
staff_id
appointment_date
start_time
end_time
selected_service_ids
status
source
created_by
created_at
updated_at
```

สถานะที่ใช้:

```text
confirmed
completed
cancelled
no_show
```

## booking_time_slots

เก็บช่วงเวลาที่ร้านเปิดให้จอง

```text
id
shop_id
start_time
end_time
is_active
sort_order
created_at
updated_at
```

## booking_day_overrides

เก็บการปิดรับจองเฉพาะวัน เช่น หยุดร้าน หรือปิดทั้งวัน

```text
id
shop_id
date
is_closed
note
created_at
updated_at
```

## staff

เก็บข้อมูลช่าง รองรับอนาคตที่มีหลายคน

```text
id
shop_id
name
display_name
is_active
created_at
updated_at
```

## portfolio_items

เก็บผลงานร้าน

```text
id
shop_id
staff_id
service_id
image_url
caption
is_public
sort_order
created_at
updated_at
```

## Removed Legacy: Google Calendar

source schema ปัจจุบันไม่ใช้ Google Calendar แล้ว ตารางหรือคอลัมน์จากแนวทางเดิมไม่ควรอยู่ใน schema ใหม่
