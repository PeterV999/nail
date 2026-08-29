# App Readiness

เป้าหมายคือเริ่มจากเว็บแอพและ PWA ให้ร้านใช้จริงก่อน แล้วค่อยทำแอป iOS, iPadOS, และ Android เมื่อ flow หลักนิ่งแล้ว

## ลำดับที่แนะนำ

1. Pilot เป็นเว็บแอพที่ `bookingnail.pages.dev`
2. เปิดใช้ PWA ให้เจ้าของร้านเพิ่มแอปลงหน้าจอมือถือ
3. เพิ่ม Web Push สำหรับแจ้งเตือนแม้ไม่ได้เปิดหน้าเว็บ
4. ทำ native wrapper app สำหรับเจ้าของร้านด้วย Capacitor หรือเครื่องมือเทียบเท่า
5. ส่ง TestFlight และ internal testing ก่อนส่ง store จริง

## สิ่งที่ต้องมีก่อนส่ง Store

- Privacy Policy และ Terms ใช้งานได้จริง
- ช่องทาง support ที่ติดต่อได้จริง
- App icon และ splash screen ครบขนาด
- Demo account หรือ demo shop สำหรับ reviewer
- Flow login ที่ reviewer ทดสอบได้
- ไม่มีข้อมูลลูกค้าจริงใน screenshot หรือ demo data
- Checklist ลบข้อมูลลูกค้าเมื่อมีการร้องขอ

## ค่าใช้จ่ายหลัก

- Apple Developer Program: 99 USD ต่อปี
- Google Play Console: 25 USD ครั้งเดียว
- Supabase production plan: เริ่ม Free ได้ แต่แนะนำ Pro เมื่อมีร้านจริง
- Cloudflare: เริ่ม Free ได้ และอาจมีค่า Workers เมื่อ traffic หรือ function usage สูงขึ้น
- Domain: ค่าโดเมนรายปีถ้าต้องการชื่อแบรนด์ของตัวเอง

## ข้อควรระวัง

- แอปแรกควรเน้นหลังบ้านเจ้าของร้าน ไม่บังคับลูกค้าโหลดแอป
- ถ้าใช้ Google/Facebook login ในแอป iOS ต้องตรวจข้อกำหนด Sign in with Apple ก่อนส่ง review
- WebView อย่างเดียวอาจถูก reject ถ้าแอปไม่มีคุณค่าหรือประสบการณ์ที่เหมาะกับมือถือมากพอ
- Push notification ต้องให้ผู้ใช้ยินยอม และต้องมี backend เก็บ push subscription อย่างปลอดภัย
