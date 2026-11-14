# CoreDash PumpStation — SCADA สถานีสูบจ่ายน้ำ PIN6

ระบบ SCADA, Web App Dashboard, Mobile App และ REST API สำหรับ
**งานปรับปรุงเส้นท่อทางดูด งานติดตั้งเครื่องสูบน้ำ และระบบควบคุมการทำงานด้วยแรงดัน**
ระบบผลิตน้ำประปา นิคมอุตสาหกรรมปิ่นทอง โครงการ 6 — อ้างอิง TOR **EN0013/2569** ข้อ 3.2.3–3.2.5

พัฒนาโดย **CoreDash Technology** · โทร 081-923-2380

---

## เปิดดู

| หน้า | ไฟล์ | รายละเอียด |
|---|---|---|
| หน้าเสนองาน | `index.html` | ภาพรวมโครงการ ภาพ 3D สถานีสูบ ตารางครอบคลุม TOR แผนงาน 4 สัปดาห์ |
| ระบบสาธิต | `app/` | Web App + Mobile App (PWA) ใช้ข้อมูลจำลองตามลอจิก PLC ใน TOR |
| เอกสาร API | `docs/api.html` | วิธียืนยันตัวตน, Endpoint, ตัวอย่าง Request/Response, รหัสข้อผิดพลาด |
| OpenAPI Spec | `api/openapi.yaml` | นำเข้า Swagger UI / Postman ได้ทันที |

เมื่อเปิด GitHub Pages แล้วจะใช้งานได้ที่
`https://coredashtech.github.io/CoreDash-PumpStation/`

## เข้าระบบสาธิต

หน้าเข้าสู่ระบบมีปุ่มเลือกระดับสิทธิ์ 3 ระดับ:

| ระดับ | ทำได้ |
|---|---|
| ผู้ดูแลระบบ | ทุกอย่าง + จัดการผู้ใช้ · ช่องทางแจ้งเตือน · API Key · ดู Log ผู้ใช้ · สั่งสลับปั๊ม |
| ผู้ปฏิบัติงาน | ดูข้อมูล · สั่ง Start/Stop/Reset Fault · ตั้งค่า PID/Interval · รับทราบ Alarm |
| ผู้ดูข้อมูล | ดู Dashboard · ประวัติ · รายงาน · ส่งออก CSV/PDF |

**โหมดนำเสนอ** (หน้าภาพรวม) จำลองเหตุการณ์เพื่อสาธิตลอจิกและการแจ้งเตือน:
ความต้องการน้ำสูง (ดูปั๊มตัวที่ 2 เริ่มทำงาน), Inverter Fault (ดู Failover), ไฟขาดเฟส, ขาดการสื่อสาร

## ใหม่: 2 ภาษา · สถานี 3 มิติ · ปรับแต่งหน้าตา

- **ไทย / English** — ปุ่ม EN/TH ที่แถบบน หน้าเข้าสู่ระบบ และหน้าเสนองาน เปลี่ยนทั้งระบบทันที รวมวันที่ (ภาษาอังกฤษใช้ ค.ศ.) แจ้งเตือนบนหน้าจอ และรายงาน คำแปลอยู่ใน `app/i18n-dict.js`
- **สถานี 3 มิติ** (`#/station`) — ภาพสถานีเคลื่อนไหวตามสถานะจริง: น้ำไหลเฉพาะท่อของปั๊มที่เดิน ใบพัดหมุนตามความถี่ ไฟสถานะ RUN/STOP/FAULT ค่าจริงบนป้าย ลากเพื่อหมุน ซูมได้ คลิกปั๊มเพื่อสั่ง **ON/OFF** หรือ Reset · โหมด **AUTO / MANUAL**
- **การแสดงผล** (`#/settings`) — พื้นหลัง 5 แบบ (ตารางน้ำเงิน, ออโรร่า, มหาสมุทร, คาร์บอน, เรียบ) · สีหลัก 6 สี + กำหนดเอง · ธีมมืด/สว่าง · สีสถานี 3D 6 ชุด + ปรับทีละส่วน (พื้น ท่อ น้ำ มอเตอร์ ตัวเรือน ตู้ ถัง)

## ฟังก์ชันตาม TOR

- **3.2.3 PLC** — แสดงค่าจาก Inverter ABB ACS580 ทั้ง 2 ตัวครบ 18 รายการ, Power Meter M1M 20 (V/A/Hz L1–L3, Totalizer), Phase Protection, Flowmeter (Flow Rate, Totalizer) · สั่ง DI01 Start/Stop, DI02 Reset Fault · ตั้ง PID Setpoint, Interval สั่ง Run/ปิดปั๊มตัวที่ 2, สลับปั๊มทุก 6 ชม.
- **3.2.4 SCADA** — Dashboard เรียลไทม์ · ดูผ่านเว็บไซต์และมือถือ · แจ้งเตือน Email / LINE OA / Telegram · ประวัติการทำงาน · ผู้ใช้ 3 ระดับ + Log การทำงานของผู้ใช้
- **3.2.5 API** — REST/JSON · ค่าล่าสุด, ย้อนหลัง, สถานะ, Alarm, เวลาอัปเดตล่าสุด · ระบุจุดวัด/เวลาเริ่ม-สิ้นสุด/ช่วงรวมข้อมูล · API Key + Scope + Rate limit · เอกสารครบ · ไม่ผูกขาด

## โครงสร้าง

```
CoreDash-PumpStation/
├── index.html            หน้าเสนองาน (Landing)
├── assets/               ภาพหน้าจอระบบ
├── app/                  Web App + Mobile App (PWA)
│   ├── index.html
│   ├── app.css
│   ├── sim.js            ตัวจำลองกระบวนการ (ลอจิก PLC ตาม TOR)
│   ├── core.js           สิทธิ์ผู้ใช้ เส้นทางหน้า กราฟ เกจ
│   ├── pages-ops.js      ภาพรวม · ปั๊ม · ไฟฟ้า · ตั้งค่าควบคุม
│   ├── pages-data.js     แจ้งเตือน · ประวัติ · รายงาน
│   ├── pages-admin.js    อุปกรณ์ · ผู้ใช้ · REST API
│   ├── station3d.js      สถานี 3 มิติ + ควบคุม ON/OFF
│   ├── settings.js       การแสดงผล & ภาษา
│   ├── i18n.js, i18n-dict.js  ระบบ 2 ภาษา (ไทย/English)
│   ├── manifest.webmanifest, sw.js, icons/
├── docs/api.html         เอกสาร API
└── api/openapi.yaml      OpenAPI 3.0
```

ไม่ต้อง build ไม่มี dependency — เป็นไฟล์ HTML/CSS/JS ล้วน

## ขึ้น GitHub Pages

1. สร้าง repository ชื่อ `CoreDash-PumpStation` (Public)
2. **Add file → Upload files** ลากไฟล์และโฟลเดอร์ทั้งหมดในชุดนี้ไว้ที่ root ของ repo → **Commit changes**
3. **Settings → Pages → Deploy from a branch** → `main` / `(root)` → **Save**
4. รอ 1–2 นาที แล้วเปิด `https://<ชื่อผู้ใช้>.github.io/CoreDash-PumpStation/`

## ติดตั้งเป็นแอปบนมือถือ

- **Android (Chrome):** เปิดลิงก์ `.../app/` → เมนู ⋮ → *ติดตั้งแอป*
- **iPhone (Safari):** เปิดลิงก์ `.../app/` → ปุ่มแชร์ → *เพิ่มไปยังหน้าจอโฮม*

## เมื่อติดตั้งใช้งานจริง

ไฟล์ `app/sim.js` เป็นตัวจำลองสำหรับสาธิต ระบบจริงจะแทนด้วยบริการข้อมูลที่อ่าน PLC FX5U (SLMP/Modbus TCP) ผ่าน CoreDash Edge Gateway และเก็บลงฐานข้อมูล Time-series ส่วนหน้าจอและ API ใช้รูปแบบเดียวกับชุดนี้

> ระบบสาธิตเก็บค่าตั้งและ Log ไว้ในเบราว์เซอร์ของผู้ใช้เท่านั้น ไม่มีการส่งข้อมูลออกภายนอก
