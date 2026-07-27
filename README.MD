# บันทึกการใช้รถ IT Department

ระบบบันทึกการใช้รถของแผนก IT (Dunkin' / Greyhound Cafe / Au Bon Pain) เก็บข้อมูลลง Google Sheet ผ่าน Google Apps Script ไม่มีฐานข้อมูลแยก ไม่มีค่าใช้จ่ายเซิร์ฟเวอร์

## 🔗 ลิงก์หลัก

| อะไร | ลิงก์ |
|---|---|
| **เว็บใช้งานจริง** | https://mud-and-hound.github.io/Vehicle-log/ |
| **Google Sheet (ฐานข้อมูล)** | https://docs.google.com/spreadsheets/d/1I1tVPer5YsHxGbx4hWjpGg2MlAAf_INVz6qBEbIaDrQ/edit |
| **Google Apps Script (Backend)** | https://script.google.com/u/0/home/projects/1qzBxZgbwHJXJBwiXGZEvj4FS2nwQ1gJ5WiKWLqvmqcGuFkxu5tZ5tNOF/edit |

## 📁 โครงสร้างไฟล์

```
Vehicle-log/
├── index.html               หน้า Landing — เลือกว่าจะเข้าหน้าไหน
├── vehicle-log-v3.html      บันทึก/แก้ไข/ลบทริป + ดูปฏิทิน + Export CSV
├── branches-manager.html    เพิ่ม/แก้ไข/ลบ รายชื่อสาขา (GD/GHC/ABP)
├── Code.gs                  โค้ด Backend (วางใน Google Apps Script)
├── vehicle-log-database.xlsx  ไฟล์ตั้งต้นสำหรับ import สาขาเข้าชีต (ใช้ครั้งแรกเท่านั้น)
└── README.md                ไฟล์นี้
```

ทั้ง 3 หน้าเว็บ (index / vehicle-log-v3 / branches-manager) **ต้องอยู่โฟลเดอร์เดียวกัน** เพราะลิงก์ถึงกันด้วยชื่อไฟล์ตรงๆ (ไม่ใช่ URL เต็ม)

## 🗂 โครงสร้าง Google Sheet

ต้องมี 2 แท็บชื่อตรงตัวนี้เท่านั้น (ตัวพิมพ์เล็ก-ใหญ่ตรงกัน):

**Trips** — บันทึกทริปทั้งหมด (ระบบสร้าง/เขียนให้เองอัตโนมัติ ไม่ต้องแก้มือ)
`ID, OutDate, UserOut, Brand, DestCode, DestName, PurposeType, PurposeDetail, InDate, UserIn, Plate, MileageStart, MileageEnd, CreatedAt, UpdatedAt`

**Branches** — รายชื่อสาขา (แก้ผ่านหน้า `branches-manager.html` ได้เลย ไม่ต้องเข้าชีตเอง)
`Brand, ShopID, Code, Name`

> ถ้าเปิดชีตแล้วยังไม่มี 2 แท็บนี้ หรือแท็บว่างอยู่ — ไม่ต้องทำอะไร แค่เปิดเว็บใช้งานครั้งแรก ระบบจะสร้างแท็บ + ใส่ข้อมูลสาขาตั้งต้น (971 สาขา) ให้อัตโนมัติ (ดูหัวข้อ "วิธี Deploy" ด้านล่าง)

## ⚙️ วิธี Deploy / อัปเดต Backend (เมื่อแก้ Code.gs)

1. เปิดลิงก์ Apps Script ด้านบน
2. ลบโค้ดเดิมทั้งหมด วางโค้ดจาก `Code.gs` ทับ
3. **Deploy > Manage deployments** → กดไอคอนดินสอ (แก้ไข) ที่ deployment เดิม
4. ตรง **Version** เลือก **"New version"** (จุดนี้พลาดบ่อยที่สุด — ถ้าไม่เลือก โค้ดที่แก้จะไม่มีผลจริง)
5. กด **Deploy** (URL จะเหมือนเดิมทุกครั้ง ไม่ต้องแก้ที่หน้าเว็บ)
6. ทดสอบเปิดลิงก์ `.../exec?action=trips` ตรงๆ ในเบราว์เซอร์ ต้องเห็น `{"ok":true,"data":[...]}`

หน้าเว็บทั้ง 3 หน้าตั้งค่า `CONFIG.APPS_SCRIPT_URL` ไว้แล้วในโค้ด ไม่ต้องแก้อะไรเพิ่มหลัง deploy

## 🖥️ วิธีใช้งานแต่ละหน้า

### 1. บันทึกการใช้รถ (`vehicle-log-v3.html`)
- กด **+** มุมขวาล่างเพื่อเพิ่มทริป เลือกแบรนด์ปลายทางก่อน (GD/GHC/ABP) แล้วค้นหาสาขาได้ทั้งเลขสาขา/ชื่อย่อ/ชื่อเต็ม
- เลขไมค์เริ่มต้นจะดึงจากไมค์สิ้นสุดของทริปล่าสุดของรถคันนั้นให้อัตโนมัติ (แก้ไขเองได้)
- สลับดูเป็น **รายการ** หรือ **ปฏิทิน** ได้ กรองตามรถแต่ละคันได้
- กดไอคอน 📤 เพื่อ **Export CSV** เลือกช่วงวันที่ ไฟล์ที่ได้มีแค่ วันที่ออก-กลับ / ปลายทาง / ระยะทาง(กม.)

### 2. จัดการข้อมูลสาขา (`branches-manager.html`)
- ค้นหา เพิ่ม แก้ไข ลบ สาขาได้โดยตรง ไม่ต้องเข้า Google Sheet
- กันเลขสาขาซ้ำกันในแบรนด์เดียวกันให้อัตโนมัติ

## 🩹 ปัญหาที่เคยเจอ และวิธีแก้ (กันลืม)

| ปัญหา | สาเหตุ | วิธีแก้ที่ใช้ |
|---|---|---|
| `Cannot read properties of null (getDataRange)` | สคริปต์เป็น standalone ใช้ `getActiveSpreadsheet()` ไม่ได้ | เปลี่ยนเป็น `SpreadsheetApp.openById(SHEET_ID)` |
| `Illegal spreadsheet id or key` | ยังไม่ได้ใส่ `SHEET_ID` จริงใน `Code.gs` | คัดลอก ID จาก URL ชีต (ช่วงระหว่าง `/d/` กับ `/edit`) |
| กรอกเดือน 7 แต่ข้อมูลลงเดือน 6 | Google Sheets แปลง string วันที่เป็น Date object เอง แล้ว JSON.stringify แปลงเป็น UTC เลื่อนวันผิด (timezone ไทย +7) | ล็อกคอลัมน์ OutDate/InDate เป็น plain text + format กลับด้วย timezone ของชีตเองตอนอ่าน |
| ช่องวันที่โชว์ "1 Jul **BE** 2569" ตัวใหญ่ล้นช่อง (iOS) | `<input type="date">` เป็น native widget ของ OS โชว์ตามปฏิทิน/locale ที่ตั้งในเครื่อง CSS ปรับไม่ได้ | เปลี่ยนเป็น custom select วัน/เดือน/ปี (ค.ศ. ล้วน) ที่คุมเองทั้งหมด |
| เลขไมค์ล้นขอบจอมือถือจอเล็ก (iPhone SE) | CSS Grid ไม่มี `min-width:0` ทำให้ cell ไม่ยอมหด | เพิ่ม `min-width:0` + `overflow:hidden` ทุกระดับ + font-size แบบ `clamp()` |

## 🎨 ดีไซน์

โทนสี **Warm Sand** (พื้นทราย + การ์ดขาวนวล + สีเน้นน้ำตาลอิฐสีเดียว ตามหลัก 60-30-10) ไอคอนทั้งหมดเป็น SVG ไม่มี emoji ฟอนต์ Prompt (ไทย) + JetBrains Mono (ตัวเลข)
