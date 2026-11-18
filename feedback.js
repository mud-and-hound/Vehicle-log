/* ============================================================
   feedback.js — ความคิดเห็น / แจ้งปรับปรุงระบบ (ใช้ร่วมกันทุกหน้า)
   ------------------------------------------------------------
   - ปุ่มรูปข้อความมุมขวาบน → เปิดหน้ารายการความคิดเห็นทั้งหมด + สถานะ
   - แจ้งได้ 3 แบบ: ปรับปรุง / แก้ไข / เพิ่มใหม่ ระบุหน้าและจุดของระบบ + รายละเอียด
   - แนบรูปจากเครื่อง หรือ "จับภาพหน้านี้" แล้ววงกลม / กรอบ / ลูกศร / ขีดเขียน / ใส่ข้อความ
     ตรงจุดที่ต้องการได้ (รูปที่มาร์กแล้วจะถูกรวมเป็นรูปเดียวก่อนอัปโหลด)
   - เก็บข้อมูลที่ API: GET/POST /feedback, PATCH/DELETE /feedback/{id} รูปอัปโหลดผ่าน POST /uploads
   ใส่ในหน้าไหนก็ได้ด้วย: <script src="feedback.js" defer></script>
   ถ้าหน้านั้นมี CONFIG.API_URL จะใช้ค่านั้น (ค่าว่าง = โหมดตัวอย่าง เก็บในเครื่องอย่างเดียว)
   ============================================================ */
(function(){
'use strict';
if(window.__fbkLoaded) return;
window.__fbkLoaded = true;

const DEFAULT_API = 'https://vehiclelog.mobile1234.site';
const API = (typeof CONFIG !== 'undefined' && CONFIG && typeof CONFIG.API_URL === 'string') ? CONFIG.API_URL : DEFAULT_API;
const isDemo = !API;
const H2C_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const MAX_IMAGES = 6;
const MAX_SIDE = 1600;   // ย่อรูปให้ด้านยาวสุดไม่เกินนี้ก่อนอัปโหลด

const PAGES = [
  { file:'index.html', name:'หน้าแรก', areas:['การ์ดเลือกระบบ','หัวข้อ / ข้อความ'] },
  { file:'vehicle-log-v3.html', name:'บันทึกการใช้รถ', areas:['ตัวเลขสรุปด้านบน','เลือกเดือน / ปฏิทิน','ตารางรายการทริป','ทริปสด (เริ่ม / จุดแวะ / จบ)','ฟอร์มกรอกย้อนหลัง','เลือกสาขาปลายทาง','หน้ารายละเอียดทริป','กล้อง / รูปถ่าย','Export Excel'] },
  { file:'vehicle-report.html', name:'สรุปการใช้รถรายปี', areas:['ระยะทางรวม / ค่าเฉลี่ย','รถแต่ละคัน','มากสุด / น้อยสุด','กราฟรายเดือน','ตารางรายเดือน','เทียบทุกปี','ตรวจสอบข้อมูล'] },
  { file:'branches-manager.html', name:'จัดการข้อมูลสาขา', areas:['ค้นหา / กรองแบรนด์','รายการสาขา','เพิ่ม / แก้ไขสาขา'] },
  { file:'*', name:'ทั้งระบบ', areas:['หน้าตา / สี / ตัวอักษร','ความเร็ว','ใช้งานบนมือถือ','สิทธิ์ / การเข้าใช้งาน'] },
];
const curFile = decodeURIComponent(location.pathname.split('/').pop() || '') || 'index.html';
const CUR = PAGES.find(p=>p.file===curFile) || { file:curFile, name:(document.title||curFile).split('—')[0].trim(), areas:[] };
if(!PAGES.includes(CUR)) PAGES.splice(PAGES.length-1, 0, CUR);

const KINDS = {
  add:     { label:'เพิ่มใหม่', desc:'อยากได้ฟังก์ชันหรือข้อมูลใหม่',  ph:'เช่น อยากให้มีช่องบันทึกค่าน้ำมัน / อยากได้รายงานแยกตามผู้ใช้' },
  fix:     { label:'แก้ไข',    desc:'มีจุดผิด หรือใช้งานไม่ได้',     ph:'เช่น กดบันทึกแล้วขึ้นว่าไม่สำเร็จ / ตัวเลขรวมไม่ตรงกับในตาราง' },
  remove:  { label:'ลบออก',   desc:'ไม่ใช้แล้ว อยากให้เอาออก',     ph:'เช่น เอาปุ่ม/ช่องที่ไม่ได้ใช้ออก / ลบสาขาที่ปิดไปแล้วออกจากรายการ' },
  improve: { label:'ปรับปรุง', desc:'ของเดิมใช้ได้ แต่อยากให้ดีขึ้น', ph:'เช่น ตัวหนังสือในตารางเล็กไป อยากให้ใหญ่ขึ้น / อยากให้เรียงจากใหม่ไปเก่า' },
};
const STATUSES = { open:'รอดำเนินการ', doing:'กำลังทำ', done:'เสร็จแล้ว' };
const MS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

/* ---------- ไอคอน (เส้น) ---------- */
const P = {
  chat:'<path d="M4.5 4.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4.5 3.5v-3.5h-1a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"/><path d="M7.5 9h9M7.5 12.5h6"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m21 15.5-5-5L5.5 20"/>',
  screen:'<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/><path d="M9.5 9.5a3 2.2 0 1 0 6 0 3 2.2 0 1 0-6 0"/>',
  pencil:'<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  ellipse:'<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
  rect:'<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
  arrow:'<path d="M5 19 18.5 5.5M10 5h9v9"/>',
  pen:'<path d="M3 16.5c2.5-3.5 4.5-3.5 6 0s3.5 3.5 6 0 4.5-3.5 6-1"/>',
  text:'<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>',
  undo:'<path d="M9 5 4 10l5 5"/><path d="M4 10h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  trash:'<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7"/>',
  send:'<path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"/>',
  page:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
};
const icon = (n, cls) => `<svg class="fbk-ic${cls?' '+cls:''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||''}</svg>`;

/* ---------- CSS ---------- */
const CSS = `
.fbk-ic{width:1em;height:1em;display:inline-block;vertical-align:-0.14em;flex-shrink:0}
.fbk-launch{position:fixed;top:calc(12px + env(safe-area-inset-top, 0px));right:12px;z-index:55;width:40px;height:40px;border-radius:50%;
  background:var(--panel,#fff);border:1px solid var(--line,#eee9e1);color:var(--tx2,#6f675c);display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 10px rgba(46,42,36,.10);cursor:pointer;padding:0;font-family:var(--sans,'Prompt',sans-serif)}
.fbk-launch:hover{color:var(--tx,#2e2a24);border-color:var(--tx3,#a39a8d)}
.fbk-launch .fbk-ic{width:20px;height:20px}
.fbk-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--amber,#8a6a4a);color:#fff;
  font:600 10px/18px var(--mono,'JetBrains Mono',monospace);text-align:center;border:2px solid var(--ink,#faf8f5);box-sizing:content-box;display:none}
.fbk-badge.show{display:block}
html.fbk-lock,html.fbk-lock body{overflow:hidden!important}

.fbk-ov{position:fixed;inset:0;z-index:500;background:rgba(6,7,9,0);display:flex;visibility:hidden;pointer-events:none;transition:background-color .3s ease, visibility 0s linear .36s;justify-content:flex-end;font-family:var(--sans,'Prompt',sans-serif);color:var(--tx,#2e2a24)}
.fbk-ov.open{background:rgba(6,7,9,.55);visibility:visible;pointer-events:auto;transition:background-color .3s ease}
.fbk-ov .fbk-panel{transform:translateX(102%);transition:transform .36s cubic-bezier(.32,.72,0,1)}
.fbk-ov.open .fbk-panel{transform:none}
.fbk-panel{width:100%;max-width:520px;height:100%;height:100dvh;background:var(--ink,#faf8f5);display:flex;flex-direction:column;box-shadow:-8px 0 30px rgba(0,0,0,.15)}
.fbk-head{display:flex;align-items:center;gap:6px;padding:calc(10px + env(safe-area-inset-top, 0px)) 10px 10px;border-bottom:1px solid var(--line,#eee9e1);background:var(--panel,#fff);flex-shrink:0}
.fbk-head h2{flex:1;font-size:15.5px;font-weight:600;margin:0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fbk-iconbtn{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--tx,#2e2a24);background:none;border:none;cursor:pointer;padding:0;flex-shrink:0}
.fbk-iconbtn:hover{background:var(--ink,#faf8f5)}
.fbk-iconbtn .fbk-ic{width:20px;height:20px}
.fbk-iconbtn[hidden]{display:none}
.fbk-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 16px calc(24px + env(safe-area-inset-bottom, 0px))}
.fbk-body button{font-family:inherit;cursor:pointer}
.fbk-body input[type=text],.fbk-body textarea,.fbk-body select{font-family:inherit;background:var(--panel,#fff);border:1px solid var(--line,#eee9e1);border-radius:11px;
  padding:11px 12px;color:var(--tx,#2e2a24);font-size:15px;width:100%;outline:none;box-sizing:border-box}
.fbk-body textarea{min-height:110px;resize:vertical;line-height:1.55}
.fbk-body input:focus,.fbk-body textarea:focus,.fbk-body select:focus{border-color:var(--amber,#8a6a4a)}

.fbk-primary{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;border-radius:11px;border:none;background:var(--amber,#8a6a4a);color:#fff;font-size:14px;font-weight:600}
.fbk-primary:disabled{opacity:.7;cursor:default}
.fbk-primary .fbk-ic{width:16px;height:16px}
.fbk-secondary{display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 12px;border-radius:11px;border:1px solid var(--line,#eee9e1);background:var(--panel,#fff);color:var(--tx2,#6f675c);font-size:13px;font-weight:500}
.fbk-secondary .fbk-ic{width:16px;height:16px}
.fbk-secondary:disabled{opacity:.5;cursor:default}
.fbk-danger{color:#b3462b}

.fbk-chips{display:flex;gap:6px;overflow-x:auto;margin:14px 0 8px;padding-bottom:2px}
.fbk-chips::-webkit-scrollbar{display:none}
.fbk-chip{flex-shrink:0;padding:6px 11px;border-radius:11px;border:1px solid var(--line,#eee9e1);background:var(--panel,#fff);font-size:12px;color:var(--tx2,#6f675c);white-space:nowrap}
.fbk-chip.active{border-color:var(--amber,#8a6a4a);color:var(--tx,#2e2a24);font-weight:600}
.fbk-chip .n{font-family:var(--mono,monospace);font-size:10.5px;color:var(--tx3,#a39a8d);margin-left:3px}
.fbk-check{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--tx2,#6f675c);margin:2px 0 12px;cursor:pointer;user-select:none}
.fbk-check input{width:16px!important;height:16px;margin:0;accent-color:var(--amber,#8a6a4a);padding:0}
.fbk-draft{display:flex;align-items:center;gap:8px;width:100%;margin-top:10px;padding:10px 12px;border-radius:11px;border:1px dashed var(--amber,#8a6a4a);background:var(--panel,#fff);color:var(--tx2,#6f675c);font-size:12.5px;text-align:left}
.fbk-draft b{color:var(--tx,#2e2a24)}

.fbk-card{display:block;width:100%;text-align:left;background:var(--panel,#fff);border:1px solid var(--line,#eee9e1);border-radius:14px;padding:12px 13px;margin-bottom:9px;color:inherit}
.fbk-card:hover{border-color:var(--tx3,#a39a8d)}
.fbk-card-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.fbk-kind{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:6px}
.fbk-kind.k-improve{background:rgba(42,120,214,.10);color:#1f5fae}
.fbk-kind.k-fix{background:rgba(208,59,59,.10);color:#a8302f}
.fbk-kind.k-add{background:rgba(27,175,122,.12);color:#137a55}
.fbk-kind.k-remove{background:rgba(111,103,92,.13);color:#5a5248}
.fbk-st{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--tx2,#6f675c)}
.fbk-st i{width:7px;height:7px;border-radius:50%;display:inline-block}
.fbk-st.st-open i{background:#fab219}
.fbk-st.st-doing i{background:#2a78d6}
.fbk-st.st-done i{background:#0ca30c}
.fbk-id{margin-left:auto;font-family:var(--mono,monospace);font-size:10.5px;color:var(--tx3,#a39a8d)}
.fbk-where{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--tx3,#a39a8d);margin-top:7px}
.fbk-where .fbk-ic{width:12px;height:12px}
.fbk-where b{color:var(--tx2,#6f675c);font-weight:500}
.fbk-text{font-size:13.5px;line-height:1.55;margin-top:4px;white-space:pre-wrap;word-break:break-word}
.fbk-card .fbk-text{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.fbk-thumbs{display:flex;gap:6px;margin-top:9px}
.fbk-thumbs img,.fbk-thumbs span{width:54px;height:54px;border-radius:8px;object-fit:cover;border:1px solid var(--line,#eee9e1);flex-shrink:0}
.fbk-thumbs span{display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--tx2,#6f675c);background:var(--ink,#faf8f5)}
.fbk-foot{font-size:11px;color:var(--tx3,#a39a8d);margin-top:8px}
.fbk-empty{text-align:center;color:var(--tx3,#a39a8d);font-size:13px;padding:40px 16px;line-height:1.7}
.fbk-empty .fbk-ic{width:34px;height:34px;opacity:.5;margin-bottom:6px}
.fbk-err{background:var(--panel,#fff);border:1px solid var(--line,#eee9e1);border-radius:12px;padding:14px;font-size:12.5px;color:#b3462b;line-height:1.6;margin-top:12px}
.fbk-spin{width:22px;height:22px;border:3px solid var(--line,#eee9e1);border-top-color:var(--amber,#8a6a4a);border-radius:50%;animation:fbksp .7s linear infinite;margin:40px auto}
.fbk-spin-sm{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:fbksp .6s linear infinite}
@keyframes fbksp{to{transform:rotate(360deg)}}

.fbk-field{margin-bottom:18px}
.fbk-label{display:block;font-size:12px;color:var(--tx2,#6f675c);font-weight:600;margin-bottom:7px}
.fbk-label small{font-weight:400;color:var(--tx3,#a39a8d)}
.fbk-kinds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.fbk-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.fbk-kopt{border:1px solid var(--line,#eee9e1);background:var(--panel,#fff);border-radius:12px;padding:10px 8px;text-align:center;color:var(--tx,#2e2a24)}
.fbk-kopt b{display:block;font-size:13.5px;font-weight:600}
.fbk-kopt span{display:block;font-size:10.5px;color:var(--tx3,#a39a8d);line-height:1.35;margin-top:3px}
.fbk-kopt.sel{border-color:var(--amber,#8a6a4a);box-shadow:inset 0 0 0 1px var(--amber,#8a6a4a)}
.fbk-kopt.sel b{color:var(--amber,#8a6a4a)}
.fbk-areas{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.fbk-areas button{padding:6px 10px;border-radius:10px;border:1px solid var(--line,#eee9e1);background:var(--panel,#fff);font-size:12px;color:var(--tx2,#6f675c)}
.fbk-areas button.sel{border-color:var(--amber,#8a6a4a);color:var(--tx,#2e2a24);font-weight:600}
.fbk-att-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fbk-imgs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.fbk-imgs:empty{display:none}
.fbk-img{position:relative;aspect-ratio:1;border-radius:11px;overflow:hidden;border:1px solid var(--line,#eee9e1);background:var(--panel,#fff);cursor:pointer}
.fbk-img img{width:100%;height:100%;object-fit:cover;display:block}
.fbk-img .rm{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;display:flex;align-items:center;justify-content:center;border:none;padding:0}
.fbk-img .rm .fbk-ic{width:12px;height:12px}
.fbk-img .ed{position:absolute;left:4px;bottom:4px;display:flex;align-items:center;gap:4px;padding:3px 7px;border-radius:7px;background:rgba(0,0,0,.6);color:#fff;font-size:10.5px}
.fbk-img .ed .fbk-ic{width:11px;height:11px}
.fbk-hint{font-size:11px;color:var(--tx3,#a39a8d);margin-top:7px;line-height:1.5}

.fbk-dmeta{font-size:11.5px;color:var(--tx3,#a39a8d);margin-top:6px;line-height:1.6}
.fbk-dimgs img{width:100%;border-radius:12px;border:1px solid var(--line,#eee9e1);display:block;margin-top:10px;cursor:zoom-in;background:var(--panel,#fff)}
.fbk-box{background:var(--panel,#fff);border:1px solid var(--line,#eee9e1);border-radius:14px;padding:13px;margin-top:14px}
.fbk-thread{display:flex;flex-direction:column;gap:10px;margin:4px 0 12px;max-height:360px;overflow-y:auto}
.fbk-thread-empty{font-size:12px;color:var(--tx3,#a39a8d);text-align:center;padding:10px 4px;line-height:1.6}
.fbk-msg{display:flex;flex-direction:column;align-items:flex-start;max-width:88%;animation:fbkUp .3s cubic-bezier(.32,.72,0,1) both}
.fbk-msg.mine{align-self:flex-end;align-items:flex-end}
.fbk-bubble{background:var(--ink,#faf8f5);border:1px solid var(--line,#eee9e1);border-radius:14px 14px 14px 4px;padding:8px 11px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.fbk-msg.mine .fbk-bubble{background:rgba(138,106,74,.1);border-color:rgba(138,106,74,.25);border-radius:14px 14px 4px 14px}
.fbk-msg-meta{font-size:10.5px;color:var(--tx3,#a39a8d);margin-top:3px;padding:0 4px}
.fbk-msg-del{border:none;background:none;padding:0;color:var(--tx3,#a39a8d);font:inherit;text-decoration:underline;cursor:pointer}
.fbk-compose{display:flex;gap:8px;align-items:flex-end}
.fbk-compose textarea{min-height:44px!important;max-height:140px;resize:none;flex:1}
.fbk-send{width:44px;height:44px;border-radius:12px;border:none;background:var(--amber,#8a6a4a);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer}
.fbk-send:disabled{opacity:.6}
.fbk-send .fbk-ic{width:18px;height:18px}
.fbk-foot .fbk-ic{width:12px;height:12px}
.fbk-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.fbk-seg button{padding:9px 4px;border-radius:10px;border:1px solid var(--line,#eee9e1);background:var(--ink,#faf8f5);font-size:12px;color:var(--tx2,#6f675c);display:flex;align-items:center;justify-content:center;gap:5px}
.fbk-seg button.sel{border-color:var(--amber,#8a6a4a);background:var(--panel,#fff);color:var(--tx,#2e2a24);font-weight:600}
.fbk-seg i{width:7px;height:7px;border-radius:50%;display:inline-block}

/* ---------- วาด/มาร์กบนรูป ---------- */
.fbk-ann{position:fixed;inset:0;height:100dvh;z-index:520;background:#15140f;display:flex;visibility:hidden;opacity:0;transform:translateY(28px);transition:opacity .25s ease, transform .34s cubic-bezier(.32,.72,0,1), visibility 0s linear .34s;flex-direction:column;font-family:var(--sans,'Prompt',sans-serif);color:#fff;user-select:none;-webkit-user-select:none}
.fbk-ann.open{visibility:visible;opacity:1;transform:none;transition:opacity .25s ease, transform .34s cubic-bezier(.32,.72,0,1)}
.fbk-ann-top{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top, 0px)) 10px 8px;flex-shrink:0}
.fbk-ann-top h3{flex:1;margin:0;font-size:14px;font-weight:500;text-align:center;color:rgba(255,255,255,.85)}
.fbk-ann-top button{padding:9px 14px;border-radius:10px;border:none;font-family:inherit;font-size:13.5px;cursor:pointer}
.fbk-ann-cancel{background:rgba(255,255,255,.1);color:#fff}
.fbk-ann-done{background:#fff;color:#15140f;font-weight:600}
.fbk-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px;overflow:hidden}
.fbk-stage canvas{touch-action:none;display:block;box-shadow:0 4px 24px rgba(0,0,0,.5);cursor:crosshair;background:#fff}
.fbk-tools{flex-shrink:0;padding:8px 10px calc(10px + env(safe-area-inset-bottom, 0px));display:flex;flex-direction:column;gap:8px;align-items:center}
.fbk-trow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center}
.fbk-tool{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px;padding:6px 6px 5px;border-radius:10px;border:none;background:rgba(255,255,255,.08);color:rgba(255,255,255,.8);font-family:inherit;font-size:10.5px;cursor:pointer}
.fbk-tool .fbk-ic{width:20px;height:20px}
.fbk-tool.sel{background:#fff;color:#15140f;font-weight:600}
.fbk-tool:disabled{opacity:.35;cursor:default}
.fbk-color{width:30px;height:30px;border-radius:50%;border:3px solid rgba(255,255,255,.25);cursor:pointer;padding:0}
.fbk-color.sel{border-color:#fff;transform:scale(1.08)}
.fbk-sep{width:1px;height:24px;background:rgba(255,255,255,.2);margin:0 4px}
.fbk-ann-hint{font-size:11px;color:rgba(255,255,255,.55)}

.fbk-lb{position:fixed;inset:0;z-index:530;background:rgba(0,0,0,.92);display:flex;visibility:hidden;opacity:0;transition:opacity .22s ease, visibility 0s linear .22s;align-items:center;justify-content:center;cursor:zoom-out}
.fbk-lb.open{visibility:visible;opacity:1;transition:opacity .22s ease}
.fbk-lb img{transform:scale(.95);transition:transform .3s cubic-bezier(.32,.72,0,1)}
.fbk-lb.open img{transform:none}
.fbk-lb img{max-width:100%;max-height:100dvh;object-fit:contain}
.fbk-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom, 0px));transform:translate(-50%,12px);z-index:540;background:#2e2a24;color:#fff;padding:10px 18px;border-radius:11px;
  font:13px/1.5 var(--sans,'Prompt',sans-serif);opacity:0;pointer-events:none;transition:opacity .2s, transform .3s cubic-bezier(.32,.72,0,1);max-width:calc(100% - 32px);text-align:center}
.fbk-toast.show{opacity:1;transform:translate(-50%,0)}
@keyframes fbkIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
@keyframes fbkUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.fbk-body.swap{animation:fbkIn .32s cubic-bezier(.32,.72,0,1) both}
.fbk-card{animation:fbkUp .36s cubic-bezier(.32,.72,0,1) both}
.fbk-card:nth-of-type(2){animation-delay:35ms}.fbk-card:nth-of-type(3){animation-delay:70ms}.fbk-card:nth-of-type(4){animation-delay:105ms}
.fbk-card:nth-of-type(5){animation-delay:140ms}.fbk-card:nth-of-type(n+6){animation-delay:175ms}
@media (max-width:360px){ .fbk-tool{min-width:44px} }
@media (prefers-reduced-motion: reduce){
  .fbk-ov,.fbk-ov .fbk-panel,.fbk-ann,.fbk-lb,.fbk-lb img,.fbk-toast{transition:none!important}
  .fbk-body.swap,.fbk-card{animation:none!important}
}
`;

/* ---------- ยูทิล ---------- */
const $ = (sel, root) => (root||document).querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lsGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const lsSet = (k,v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const imgUrl = p => (!p ? '' : (/^(https?:|data:|blob:)/.test(p) ? p : API + p));
const rid = () => Math.random().toString(36).slice(2,10);
function relTime(s){
  if(!s) return '';
  const d = new Date(String(s).replace(' ','T'));
  if(isNaN(d)) return s;
  const diff = (Date.now() - d.getTime())/1000;
  if(diff < 60) return 'เมื่อสักครู่';
  if(diff < 3600) return Math.floor(diff/60) + ' นาทีที่แล้ว';
  if(diff < 86400) return Math.floor(diff/3600) + ' ชม.ที่แล้ว';
  if(diff < 7*86400) return Math.floor(diff/86400) + ' วันที่แล้ว';
  return `${d.getDate()} ${MS[d.getMonth()]} ${String(d.getFullYear()+543).slice(-2)}`;
}
function fullTime(s){
  const d = new Date(String(s||'').replace(' ','T'));
  if(isNaN(d)) return s || '';
  const p = n => String(n).padStart(2,'0');
  return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()+543} ${p(d.getHours())}:${p(d.getMinutes())} น.`;
}
let _toastT;
function toast(msg){ const t = $('#fbkToast'); t.textContent = msg; t.classList.add('show'); clearTimeout(_toastT); _toastT = setTimeout(()=>t.classList.remove('show'), 2600); }
const _scripts = {};
function loadScript(src){
  if(!_scripts[src]) _scripts[src] = new Promise((res, rej)=>{
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = res; s.onerror = ()=>{ delete _scripts[src]; rej(new Error('load ' + src)); };
    document.head.appendChild(s);
  });
  return _scripts[src];
}

/* ---------- API (โหมดตัวอย่างเก็บใน localStorage ของเครื่องนี้) ---------- */
const DEMO_KEY = 'fbk_demo_items';
const demoGet = () => { try{ return JSON.parse(lsGet(DEMO_KEY) || '[]'); }catch(e){ return []; } };
const demoSet = arr => lsSet(DEMO_KEY, JSON.stringify(arr));
async function api(path, opts){
  let r;
  try{ r = await fetch(API + path, opts); }
  catch(e){ const err = new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ เช็คอินเทอร์เน็ตแล้วลองใหม่'); err.status = 0; throw err; }
  let j = null; try{ j = await r.json(); }catch(e){}
  if(!r.ok){
    let msg = j && (j.detail || j.error);
    if(Array.isArray(msg)) msg = 'ข้อมูลไม่ครบหรือยาวเกินกำหนด';
    const err = new Error(msg || ('เกิดข้อผิดพลาด (HTTP ' + r.status + ')')); err.status = r.status; throw err;
  }
  return j;
}
const jsonOpts = (method, body) => ({ method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
async function apiList(){
  if(isDemo) return demoGet();
  return (await api('/feedback')).data || [];
}
async function apiUpload(dataUrl){
  if(isDemo) return dataUrl;
  return (await api('/uploads', jsonOpts('POST', { image: dataUrl }))).url;
}
async function apiCreate(p){
  if(isDemo){
    const arr = demoGet(); const now = new Date(); const pad = n=>String(n).padStart(2,'0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const id = arr.reduce((m,x)=>Math.max(m,x.ID),0)+1;
    arr.unshift({ ID:id, ...p, Status:'open', Reply:'', CreatedAt:ts, UpdatedAt:ts }); demoSet(arr); return;
  }
  await api('/feedback', jsonOpts('POST', p));
}
async function apiPatch(id, p){   // เปลี่ยนสถานะ / ตอบกลับ
  if(isDemo){ const arr = demoGet(); const it = arr.find(x=>x.ID===id); if(it) Object.assign(it, p); demoSet(arr); return; }
  await api('/feedback/' + id, jsonOpts('PATCH', p));
}
async function apiUpdate(id, p){  // แก้ไขเนื้อหาทั้งเรื่อง (ประเภท / หน้า / จุด / รายละเอียด / รูป / ผู้แจ้ง)
  if(isDemo){ const arr = demoGet(); const it = arr.find(x=>x.ID===id); if(it) Object.assign(it, p); demoSet(arr); return; }
  await api('/feedback/' + id, jsonOpts('PUT', p));
}
// ข้อความตอบกลับไปมาในเรื่องนั้น
async function apiAddMsg(id, m){
  if(isDemo){
    const arr = demoGet(); const it = arr.find(x=>x.ID===id); if(!it) return;
    const now = new Date(), pad = n=>String(n).padStart(2,'0');
    (it.Messages = it.Messages || []).push({ ID: Date.now(), ...m, At: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` });
    demoSet(arr); return;
  }
  await api('/feedback/' + id + '/messages', jsonOpts('POST', m));
}
async function apiDelMsg(id, mid){
  if(isDemo){ const arr = demoGet(); const it = arr.find(x=>x.ID===id); if(it) it.Messages = (it.Messages||[]).filter(x=>x.ID!==mid); demoSet(arr); return; }
  await api('/feedback/' + id + '/messages/' + mid, { method:'DELETE' });
}
async function apiDelete(id){
  if(isDemo){ demoSet(demoGet().filter(x=>x.ID!==id)); return; }
  await api('/feedback/' + id, { method:'DELETE' });
}

/* ---------- state ---------- */
const S = { items:[], loaded:false, loading:false, err:'', view:'list', detailId:null, editId:null, filter:'ALL', onlyPage:false, busy:false };
const newDraft = () => ({ kind:'', page: CUR.name, area:'', detail:'', images:[], author: lsGet('fbk_author') || '' });
let draft = newDraft();
let savedNewDraft = null;   // ร่างเรื่องใหม่ที่พักไว้ระหว่างแก้ไขเรื่องเดิม
const draftDirty = () => !!(draft.kind || draft.area.trim() || draft.detail.trim() || draft.images.length);

// แก้ไขเรื่องที่ส่งไปแล้ว: ใช้ฟอร์มเดียวกับแจ้งใหม่ รูปเดิมเก็บ path ไว้ (ไม่อัปโหลดซ้ำถ้าไม่ได้มาร์กเพิ่ม)
function startEdit(it){
  savedNewDraft = draft;
  draft = {
    kind: it.Kind, page: it.Page || CUR.name, area: it.Area || '', detail: it.Detail || '', author: it.Author || '',
    images: (it.Images || []).map(p=>({ id: rid(), url: p, base: imgUrl(p), out: imgUrl(p), w: 0, h: 0, shapes: [] })),
  };
  S.editId = it.ID;
  go('form');
}
function endEdit(){
  if(S.editId == null) return;
  draft = savedNewDraft || newDraft(); savedNewDraft = null; S.editId = null;
}

async function loadItems(){
  S.loading = true;
  try{ S.items = await apiList(); S.err = ''; S.loaded = true; }
  catch(e){ S.err = e.status===404 ? 'ระบบความคิดเห็นยังไม่เปิดใช้งานบนเซิร์ฟเวอร์ (ต้องอัปเดต API ก่อน)' : e.message; }
  S.loading = false;
  updateBadge();
}
function updateBadge(){
  const n = S.items.filter(x=>x.Status!=='done').length;
  const b = $('#fbkBadge');
  if(!b) return;
  b.textContent = n > 99 ? '99+' : n;
  b.classList.toggle('show', n > 0);
  $('#fbkLaunch').title = n ? `ความคิดเห็น / แจ้งปรับปรุงระบบ (ค้าง ${n} เรื่อง)` : 'ความคิดเห็น / แจ้งปรับปรุงระบบ';
}

/* ---------- ชั้นที่เปิดซ้อนกัน + ปุ่มย้อนกลับของมือถือ ---------- */
const layers = [];
function pushLayer(name){ layers.push(name); try{ history.pushState({ fbk:name }, ''); }catch(e){} }
function closeLayerUI(){ if(history.state && history.state.fbk) history.back(); else closeTop(); }
function closeTop(){
  const name = layers.pop();
  if(name === 'panel'){ $('#fbkOv').classList.remove('open'); document.documentElement.classList.remove('fbk-lock'); if(S.editId != null){ endEdit(); S.view = 'list'; } }
  else if(name === 'ann'){ annFinish(ANN.cancelled ? false : true); }
  else if(name === 'lb'){ $('#fbkLb').classList.remove('open'); }
}
window.addEventListener('popstate', ()=>{ if(layers.length) closeTop(); });
document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && layers.length){ if(layers[layers.length-1]==='ann') ANN.cancelled = true; closeLayerUI(); } });

/* ---------- เปิด / ปิดหน้าความคิดเห็น ---------- */
function openPanel(){
  $('#fbkOv').classList.add('open');
  document.documentElement.classList.add('fbk-lock');
  pushLayer('panel');
  if(!(S.view === 'form' && draftDirty())) S.view = 'list';
  render();
  loadItems().then(()=>{ if(S.view !== 'form') render(); });
}
function go(view, id){
  S.view = view; if(id!=null) S.detailId = id; render();
  const b = $('#fbkBody'); b.scrollTop = 0;
  b.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap');   // เปลี่ยนหน้าย่อย = เนื้อหาเลื่อนเข้ามา
}

function render(){
  const back = $('#fbkBack');
  back.hidden = S.view === 'list';
  $('#fbkTitle').textContent = S.view === 'form' ? (S.editId != null ? `แก้ไขความคิดเห็น #${S.editId}` : 'แจ้ง เพิ่ม / แก้ไข / ลบ / ปรับปรุง')
    : S.view === 'detail' ? `ความคิดเห็น #${S.detailId}` : 'ความคิดเห็น / แจ้งปรับปรุงระบบ';
  const body = $('#fbkBody');
  if(S.view === 'form') renderForm(body);
  else if(S.view === 'detail') renderDetail(body);
  else renderList(body);
}

/* ---------- รายการ ---------- */
function kindChip(k){ return `<span class="fbk-kind k-${esc(k)}">${esc((KINDS[k]||{}).label || k)}</span>`; }
function statusChip(s){ return `<span class="fbk-st st-${esc(s)}"><i></i>${esc(STATUSES[s] || s)}</span>`; }
function whereLine(it){ return `<div class="fbk-where">${icon('page')}<b>${esc(it.Page || 'ไม่ระบุหน้า')}</b>${it.Area ? ` › ${esc(it.Area)}` : ''}</div>`; }

function renderList(body){
  let h = `<button class="fbk-primary" id="fbkNew">${icon('plus')}แจ้ง เพิ่ม / แก้ไข / ลบ / ปรับปรุง</button>`;
  if(draftDirty()) h += `<button class="fbk-draft" id="fbkDraft">${icon('pencil')}<span>มี<b>ร่างที่ยังไม่ส่ง</b> — แตะเพื่อเขียนต่อ</span></button>`;
  if(S.err && !S.items.length){
    body.innerHTML = h + `<div class="fbk-err">${esc(S.err)}<br><button class="fbk-secondary" id="fbkRetry" style="margin-top:10px">ลองใหม่</button></div>`;
    bindListTop(body);
    $('#fbkRetry').onclick = async ()=>{ body.innerHTML = '<div class="fbk-spin"></div>'; await loadItems(); render(); };
    return;
  }
  if(!S.loaded){ body.innerHTML = h + '<div class="fbk-spin"></div>'; bindListTop(body); return; }

  const pool = S.items.filter(x=>!S.onlyPage || x.Page === CUR.name);
  const cnt = s => pool.filter(x=>s==='ALL' || x.Status===s).length;
  h += `<div class="fbk-chips" id="fbkFilters">` +
    [['ALL','ทั้งหมด'], ['open',STATUSES.open], ['doing',STATUSES.doing], ['done',STATUSES.done]]
      .map(([k,l])=>`<button class="fbk-chip${S.filter===k?' active':''}" data-f="${k}">${l}<span class="n">${cnt(k)}</span></button>`).join('') + `</div>`;
  h += `<label class="fbk-check"><input type="checkbox" id="fbkOnlyPage"${S.onlyPage?' checked':''}>เฉพาะเรื่องของหน้า “${esc(CUR.name)}”</label>`;
  const list = pool.filter(x=>S.filter==='ALL' || x.Status===S.filter);
  if(!list.length){
    h += `<div class="fbk-empty">${icon('chat')}<br>${S.items.length ? 'ไม่มีรายการในตัวกรองนี้' : 'ยังไม่มีความคิดเห็น<br>อยากให้ปรับ แก้ หรือเพิ่มอะไร แจ้งได้เลย'}</div>`;
  } else {
    h += list.map(it=>{
      const imgs = it.Images || [];
      return `<button class="fbk-card" data-id="${it.ID}">
        <div class="fbk-card-top">${kindChip(it.Kind)}${statusChip(it.Status)}<span class="fbk-id">#${it.ID}</span></div>
        ${whereLine(it)}
        <div class="fbk-text">${esc(it.Detail)}</div>
        ${imgs.length ? `<div class="fbk-thumbs">${imgs.slice(0,4).map(p=>`<img src="${esc(imgUrl(p))}" alt="" loading="lazy">`).join('')}${imgs.length>4?`<span>+${imgs.length-4}</span>`:''}</div>` : ''}
        <div class="fbk-foot">${esc(it.Author || 'ไม่ระบุชื่อ')} · ${esc(relTime(it.CreatedAt))}${msgCount(it) ? ` · ${icon('chat')} ${msgCount(it)} ข้อความ` : ''}</div>
      </button>`;
    }).join('');
  }
  body.innerHTML = h;
  bindListTop(body);
  body.querySelectorAll('#fbkFilters button').forEach(b=>b.onclick = ()=>{ S.filter = b.dataset.f; render(); });
  $('#fbkOnlyPage').onchange = e=>{ S.onlyPage = e.target.checked; render(); };
  body.querySelectorAll('.fbk-card').forEach(c=>c.onclick = ()=>go('detail', Number(c.dataset.id)));
}
function bindListTop(body){
  $('#fbkNew', body).onclick = ()=>{ if(!draftDirty()) draft = newDraft(); go('form'); };
  const d = $('#fbkDraft', body); if(d) d.onclick = ()=>go('form');
}

/* ---------- ฟอร์มแจ้ง ---------- */
function renderForm(body){
  const editing = S.editId != null;
  // เรื่องเก่าที่ระบุหน้าที่ไม่มีในรายการแล้ว ยังเลือกค่าเดิมไว้ได้
  const pageList = PAGES.some(p=>p.name===draft.page) ? PAGES : [...PAGES, { name: draft.page, areas: [] }];
  const pg = pageList.find(p=>p.name===draft.page) || CUR;
  const k = KINDS[draft.kind];
  body.innerHTML = `
    <div class="fbk-field">
      <span class="fbk-label">ต้องการให้ทำอะไร</span>
      <div class="fbk-kinds">${Object.entries(KINDS).map(([key,v])=>`<button type="button" class="fbk-kopt${draft.kind===key?' sel':''}" data-k="${key}"><b>${v.label}</b><span>${v.desc}</span></button>`).join('')}</div>
    </div>
    <div class="fbk-field">
      <span class="fbk-label">ตรงไหนของระบบ</span>
      <select id="fbkPage">${pageList.map(p=>`<option value="${esc(p.name)}"${p.name===draft.page?' selected':''}>${esc(p.name)}${p===CUR?' (หน้านี้)':''}</option>`).join('')}</select>
      <div class="fbk-areas" id="fbkAreas">${pg.areas.map(a=>`<button type="button" data-a="${esc(a)}"${a===draft.area?' class="sel"':''}>${esc(a)}</button>`).join('')}</div>
      <input type="text" id="fbkArea" maxlength="200" placeholder="เลือกด้านบน หรือพิมพ์เอง เช่น ปุ่ม Export / ช่องเลขไมค์" value="${esc(draft.area)}">
    </div>
    <div class="fbk-field">
      <span class="fbk-label">รายละเอียด <small>— อยากให้ทำอะไร แบบไหน</small></span>
      <textarea id="fbkDetail" maxlength="5000" placeholder="${esc(k ? k.ph : 'อธิบายว่าอยากให้ทำอะไร ตรงไหน แบบไหน')}">${esc(draft.detail)}</textarea>
    </div>
    <div class="fbk-field">
      <span class="fbk-label">รูปประกอบ <small>— วงกลม / มาร์กจุดที่ต้องการได้ (สูงสุด ${MAX_IMAGES} รูป)</small></span>
      <div class="fbk-att-btns">
        <button type="button" class="fbk-secondary" id="fbkPick"${draft.images.length>=MAX_IMAGES?' disabled':''}>${icon('image')}แนบรูปจากเครื่อง</button>
        <button type="button" class="fbk-secondary" id="fbkShot"${draft.images.length>=MAX_IMAGES?' disabled':''}>${icon('screen')}จับภาพหน้านี้</button>
      </div>
      <input type="file" id="fbkFile" accept="image/*" multiple hidden>
      <div class="fbk-imgs" id="fbkImgs">${draft.images.map((im,i)=>`<div class="fbk-img" data-i="${i}"><img src="${im.out}" alt="รูปที่ ${i+1}"><span class="ed">${icon('pencil')}${im.shapes.length ? `มาร์ก ${im.shapes.length} จุด` : 'แตะเพื่อมาร์ก'}</span><button type="button" class="rm" data-i="${i}" aria-label="ลบรูป">${icon('close')}</button></div>`).join('')}</div>
      <div class="fbk-hint">“จับภาพหน้านี้” = ถ่ายภาพหน้าเว็บที่เปิดอยู่ข้างหลัง แล้ววง/ชี้จุดที่อยากให้แก้ได้ทันที · แตะรูปเพื่อวาดเพิ่มหรือแก้มาร์ก</div>
    </div>
    <div class="fbk-field">
      <span class="fbk-label">ชื่อผู้แจ้ง</span>
      <input type="text" id="fbkAuthor" maxlength="100" placeholder="ชื่อ (ระบบจำไว้ให้ครั้งต่อไป)" value="${esc(draft.author)}">
    </div>
    <button class="fbk-primary" id="fbkSubmit">${editing ? `${icon('check')}บันทึกการแก้ไข` : `${icon('send')}ส่งความคิดเห็น`}</button>
    <button class="fbk-secondary" id="fbkDiscard" style="width:100%;margin-top:8px">${editing ? 'ยกเลิกการแก้ไข' : 'ล้างฟอร์ม'}</button>`;

  body.querySelectorAll('.fbk-kopt').forEach(b=>b.onclick = ()=>{ draft.kind = b.dataset.k; syncFormFields(); renderForm(body); });
  $('#fbkPage').onchange = e=>{ draft.page = e.target.value; syncFormFields(); renderForm(body); };
  body.querySelectorAll('#fbkAreas button').forEach(b=>b.onclick = ()=>{
    const same = draft.area === b.dataset.a;
    draft.area = same ? '' : b.dataset.a;
    $('#fbkArea').value = draft.area;
    body.querySelectorAll('#fbkAreas button').forEach(x=>x.classList.toggle('sel', x.dataset.a === draft.area));
  });
  $('#fbkArea').oninput = e=>{ draft.area = e.target.value; body.querySelectorAll('#fbkAreas button').forEach(x=>x.classList.toggle('sel', x.dataset.a === draft.area)); };
  $('#fbkDetail').oninput = e=>{ draft.detail = e.target.value; };
  $('#fbkAuthor').oninput = e=>{ draft.author = e.target.value; };
  $('#fbkPick').onclick = ()=>$('#fbkFile').click();
  $('#fbkFile').onchange = onFilesPicked;
  $('#fbkShot').onclick = captureScreen;
  body.querySelectorAll('.fbk-img').forEach(el=>el.onclick = e=>{
    if(e.target.closest('.rm')) return;
    openAnnotator(draft.images[Number(el.dataset.i)]);
  });
  body.querySelectorAll('.fbk-img .rm').forEach(b=>b.onclick = e=>{
    e.stopPropagation();
    if(!confirm('ลบรูปนี้ออกจากความคิดเห็น?')) return;
    draft.images.splice(Number(b.dataset.i), 1); renderForm(body);
  });
  $('#fbkSubmit').onclick = submitDraft;
  $('#fbkDiscard').onclick = ()=>{
    if(editing){ const id = S.editId; endEdit(); go('detail', id); return; }
    if(draftDirty() && !confirm('ล้างข้อมูลที่กรอกไว้ทั้งหมด?')) return;
    draft = newDraft(); renderForm(body);
  };
}
function syncFormFields(){
  const a = $('#fbkArea'), d = $('#fbkDetail'), u = $('#fbkAuthor');
  if(a) draft.area = a.value; if(d) draft.detail = d.value; if(u) draft.author = u.value;
}

async function onFilesPicked(e){
  const files = [...(e.target.files || [])].filter(f=>/^image\//.test(f.type) || /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(f.name));
  e.target.value = '';
  if(!files.length) return;
  const room = MAX_IMAGES - draft.images.length;
  if(files.length > room) toast(`แนบได้อีก ${room} รูป (สูงสุด ${MAX_IMAGES})`);
  const added = [];
  for(const f of files.slice(0, room)){
    try{ added.push(await fileToItem(f)); }
    catch(err){ toast('เปิดรูป ' + f.name + ' ไม่ได้ — ลองแคปหน้าจอเป็น JPG/PNG แล้วแนบใหม่'); }
  }
  draft.images.push(...added);
  syncFormFields();
  renderForm($('#fbkBody'));
  if(added.length === 1) openAnnotator(added[0]);   // แนบรูปเดียว → เปิดหน้ามาร์กให้เลย
}
function fileToItem(file){
  return new Promise((res, rej)=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ try{ res(imageToItem(img)); }catch(e){ rej(e); } URL.revokeObjectURL(url); };
    img.onerror = ()=>{ URL.revokeObjectURL(url); rej(new Error('decode')); };
    img.src = url;
  });
}
function imageToItem(src){
  const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
  if(!w0 || !h0) throw new Error('empty image');
  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const w = Math.round(w0*k), h = Math.round(h0*k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0,0,w,h); x.drawImage(src, 0, 0, w, h);
  const base = c.toDataURL('image/jpeg', 0.9);
  return { id: rid(), base, w, h, shapes: [], out: base };
}

async function captureScreen(){
  if(draft.images.length >= MAX_IMAGES){ toast(`แนบได้สูงสุด ${MAX_IMAGES} รูป`); return; }
  syncFormFields();
  const btn = $('#fbkShot'); const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="fbk-spin-sm" style="border-color:rgba(0,0,0,.15);border-top-color:var(--amber,#8a6a4a)"></span> กำลังจับภาพ...';
  const ov = $('#fbkOv'), launch = $('#fbkLaunch');
  let item = null;
  try{
    await loadScript(H2C_URL);
    ov.style.visibility = 'hidden'; launch.style.visibility = 'hidden';
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const bg = getComputedStyle(document.body).backgroundColor;
    const canvas = await window.html2canvas(document.body, {
      x: window.scrollX, y: window.scrollY, width: window.innerWidth, height: window.innerHeight,
      scale: Math.min(2, window.devicePixelRatio || 1), useCORS: true, logging: false,
      backgroundColor: (bg && bg !== 'rgba(0, 0, 0, 0)') ? bg : '#faf8f5',
      ignoreElements: el => el.id === 'fbkRoot',
    });
    item = imageToItem(canvas);
  }catch(e){
    toast('จับภาพหน้านี้ไม่ได้ — ใช้วิธีแคปหน้าจอมือถือ แล้วกด “แนบรูปจากเครื่อง” แทน');
  }finally{
    ov.style.visibility = ''; launch.style.visibility = '';
  }
  if(item){ draft.images.push(item); renderForm($('#fbkBody')); openAnnotator(item); }
  else { btn.disabled = false; btn.innerHTML = orig; }
}

async function submitDraft(){
  syncFormFields();
  if(!draft.kind){ toast('เลือกก่อนว่าต้องการ เพิ่มใหม่ / แก้ไข / ลบออก / ปรับปรุง'); return; }
  if(!draft.detail.trim()){ toast('กรอกรายละเอียดก่อนส่ง'); $('#fbkDetail').focus(); return; }
  const editId = S.editId;
  const btn = $('#fbkSubmit'); const orig = btn.innerHTML;
  btn.disabled = true;
  try{
    const urls = [];
    const toUpload = draft.images.filter(im=>!(im.url && im.out === im.base)).length;
    let n = 0;
    for(const im of draft.images){
      if(im.url && im.out === im.base){ urls.push(im.url); continue; }   // รูปเดิมที่ไม่ได้มาร์กเพิ่ม ใช้ไฟล์เดิม
      btn.innerHTML = `<span class="fbk-spin-sm"></span> กำลังอัปโหลดรูป (${++n}/${toUpload})...`;
      urls.push(await apiUpload(im.out));
    }
    btn.innerHTML = '<span class="fbk-spin-sm"></span> กำลังบันทึก...';
    const payload = { Kind: draft.kind, Page: draft.page, Area: draft.area.trim(), Detail: draft.detail.trim(), Images: urls, Author: draft.author.trim() };
    if(editId != null) await apiUpdate(editId, payload); else await apiCreate(payload);
    if(draft.author.trim()) lsSet('fbk_author', draft.author.trim());
    if(editId != null){ endEdit(); } else { draft = newDraft(); S.filter = 'ALL'; }
    await loadItems();
    if(editId != null){ go('detail', editId); toast('บันทึกการแก้ไขแล้ว'); }
    else { go('list'); toast('ส่งความคิดเห็นแล้ว ขอบคุณครับ'); }
  }catch(e){
    toast((editId != null ? 'บันทึกไม่สำเร็จ: ' : 'ส่งไม่สำเร็จ: ') + e.message);
    btn.disabled = false; btn.innerHTML = orig;
  }
}

/* ---------- รายละเอียด + เปลี่ยนสถานะ ---------- */
/* ---------- ข้อความตอบกลับ (เธรดของแต่ละเรื่อง) ---------- */
const msgCount = it => (it.Messages || []).length + (it.Reply ? 1 : 0);
function threadHTML(it){
  const me = (lsGet('fbk_author') || '').trim();
  const msgs = (it.Reply ? [{ ID:'legacy', Author:'บันทึกการดำเนินการ', Text:it.Reply, At:it.UpdatedAt, legacy:true }] : []).concat(it.Messages || []);
  if(!msgs.length) return '<div class="fbk-thread-empty">ยังไม่มีข้อความตอบกลับ — ผู้แก้ไขตอบกลับ หรือผู้แจ้งถามเพิ่มได้ตรงนี้</div>';
  return msgs.map(m=>{
    const mine = !m.legacy && me && m.Author === me;
    return `<div class="fbk-msg${mine?' mine':''}">
      <div class="fbk-bubble">${esc(m.Text)}</div>
      <div class="fbk-msg-meta">${esc(m.Author || 'ไม่ระบุชื่อ')} · ${esc(relTime(m.At))}${mine ? ` · <button type="button" class="fbk-msg-del" data-mid="${m.ID}">ลบ</button>` : ''}</div>
    </div>`;
  }).join('');
}
function bindThread(body, it){
  const send = $('#fbkSend', body), ta = $('#fbkMsg', body);
  // ช่องพิมพ์ขยายตามข้อความ
  ta.addEventListener('input', ()=>{ ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; });
  ta.addEventListener('keydown', e=>{ if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); send.click(); } });
  send.onclick = async ()=>{
    const text = ta.value.trim();
    const nameEl = $('#fbkMsgName', body);
    const author = nameEl ? nameEl.value.trim() : (lsGet('fbk_author') || '').trim();
    if(!text){ ta.focus(); return; }
    if(!author){ toast('ใส่ชื่อของคุณก่อนส่งข้อความ'); nameEl && nameEl.focus(); return; }
    send.disabled = true;
    try{
      await apiAddMsg(it.ID, { Author: author, Text: text });
      lsSet('fbk_author', author);
      await loadItems();
      renderDetail(body);
      const th = $('#fbkThread', body); if(th) th.lastElementChild && th.lastElementChild.scrollIntoView({ block:'nearest' });
      toast('ส่งข้อความแล้ว');
    }catch(e){ toast('ส่งไม่สำเร็จ: ' + e.message); send.disabled = false; }
  };
  body.querySelectorAll('.fbk-msg-del').forEach(b=>b.onclick = async ()=>{
    if(!confirm('ลบข้อความนี้?')) return;
    try{ await apiDelMsg(it.ID, Number(b.dataset.mid)); await loadItems(); renderDetail(body); toast('ลบข้อความแล้ว'); }
    catch(e){ toast('ลบไม่สำเร็จ: ' + e.message); }
  });
}

function renderDetail(body){
  const it = S.items.find(x=>x.ID === S.detailId);
  if(!it){ body.innerHTML = '<div class="fbk-empty">ไม่พบรายการนี้ (อาจถูกลบไปแล้ว)</div>'; return; }
  const me = (lsGet('fbk_author') || '').trim();
  body.innerHTML = `
    <div class="fbk-card-top">${kindChip(it.Kind)}${statusChip(it.Status)}<span class="fbk-id">#${it.ID}</span></div>
    ${whereLine(it)}
    <div class="fbk-text" style="font-size:14.5px;margin-top:10px">${esc(it.Detail)}</div>
    <div class="fbk-dmeta">แจ้งโดย ${esc(it.Author || 'ไม่ระบุชื่อ')} · ${esc(fullTime(it.CreatedAt))}${it.UpdatedAt && it.UpdatedAt !== it.CreatedAt ? `<br>อัปเดตล่าสุด ${esc(fullTime(it.UpdatedAt))}` : ''}</div>
    ${(it.Images||[]).length ? `<div class="fbk-dimgs">${it.Images.map(p=>`<img src="${esc(imgUrl(p))}" alt="รูปประกอบ" loading="lazy">`).join('')}</div>` : ''}
    <div class="fbk-row2">
      <button class="fbk-secondary" id="fbkEdit">${icon('pencil')}แก้ไขเรื่องนี้</button>
      <button class="fbk-secondary fbk-danger" id="fbkDel">${icon('trash')}ลบเรื่องนี้</button>
    </div>
    <div class="fbk-box">
      <span class="fbk-label">สถานะ</span>
      <div class="fbk-seg" id="fbkSeg">${Object.entries(STATUSES).map(([k,l])=>`<button type="button" data-s="${k}" class="${it.Status===k?'sel':''}"><i style="background:${k==='open'?'#fab219':k==='doing'?'#2a78d6':'#0ca30c'}"></i>${l}</button>`).join('')}</div>
    </div>
    <div class="fbk-box">
      <span class="fbk-label">ข้อความตอบกลับ <small>— คุยกันไปมาระหว่างผู้แจ้งกับผู้แก้ไขได้</small></span>
      <div class="fbk-thread" id="fbkThread">${threadHTML(it)}</div>
      ${me ? '' : `<input type="text" id="fbkMsgName" maxlength="100" placeholder="ชื่อของคุณ (ระบบจำไว้ให้)" style="margin-bottom:8px">`}
      <div class="fbk-compose">
        <textarea id="fbkMsg" maxlength="3000" rows="1" placeholder="พิมพ์ข้อความตอบกลับ…"></textarea>
        <button type="button" class="fbk-send" id="fbkSend" aria-label="ส่งข้อความ">${icon('send')}</button>
      </div>
      ${me ? `<div class="fbk-hint">ส่งในชื่อ “${esc(me)}”</div>` : ''}
    </div>`;
  $('#fbkEdit').onclick = ()=>startEdit(it);
  bindThread(body, it);
  body.querySelectorAll('.fbk-dimgs img').forEach(img=>img.onclick = ()=>openLightbox(img.src));
  body.querySelectorAll('#fbkSeg button').forEach(b=>b.onclick = async ()=>{
    if(b.dataset.s === it.Status || S.busy) return;
    S.busy = true;
    try{ await apiPatch(it.ID, { Status: b.dataset.s }); it.Status = b.dataset.s; updateBadge(); renderDetail(body); toast('เปลี่ยนสถานะเป็น “' + STATUSES[b.dataset.s] + '” แล้ว'); }
    catch(e){ toast('เปลี่ยนสถานะไม่สำเร็จ: ' + e.message); }
    S.busy = false;
  });
  $('#fbkDel').onclick = async ()=>{
    if(!confirm(`ลบความคิดเห็น #${it.ID} ใช่ไหม? กู้คืนไม่ได้`)) return;
    try{ await apiDelete(it.ID); S.items = S.items.filter(x=>x.ID !== it.ID); updateBadge(); go('list'); toast('ลบแล้ว'); }
    catch(e){ toast('ลบไม่สำเร็จ: ' + e.message); }
  };
}

function openLightbox(src){ $('#fbkLbImg').src = src; $('#fbkLb').classList.add('open'); pushLayer('lb'); }

/* ============================================================
   วาด / มาร์กบนรูป: วงกลม, กรอบ, ลูกศร, ขีดเขียน, ข้อความ
   ============================================================ */
const COLORS = ['#e5322d', '#ffc400', '#1e88ff', '#111111'];
const TOOLS = [['ellipse','วงกลม'], ['rect','กรอบ'], ['arrow','ลูกศร'], ['pen','ขีดเขียน'], ['text','ข้อความ']];
const ANN = { item:null, img:null, shapes:[], tool:'ellipse', color:COLORS[0], drawing:null, cancelled:false, textAt:null };

function openAnnotator(item){
  ANN.item = item;
  ANN.shapes = item.shapes.map(s=>({ ...s, pts: s.pts ? s.pts.map(p=>({ ...p })) : undefined }));
  ANN.drawing = null; ANN.cancelled = false;
  const img = new Image();
  const remote = /^https?:/.test(item.base);   // รูปเดิมบนเซิร์ฟเวอร์ (ตอนแก้ไขเรื่องเก่า) ต้องโหลดแบบ CORS ไม่งั้นรวมรูปไม่ได้
  if(remote) img.crossOrigin = 'anonymous';
  img.onload = ()=>{
    if(!item.w){
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      item.w = Math.round(img.naturalWidth*k); item.h = Math.round(img.naturalHeight*k);
    }
    ANN.img = img;
    const c = $('#fbkCanvas'); c.width = item.w; c.height = item.h;
    $('#fbkAnn').classList.add('open');
    pushLayer('ann');
    renderTools(); fitCanvas(); annDraw();
  };
  img.onerror = ()=>{ ANN.item = null; toast('เปิดรูปนี้เพื่อมาร์กไม่ได้ — ลบรูปนี้แล้วแนบใหม่แทน'); };
  img.src = remote ? item.base + (item.base.includes('?') ? '&' : '?') + 'cors=1' : item.base;   // query กันเบราว์เซอร์ใช้แคชที่ไม่มี CORS header
}
function annFinish(keep){
  $('#fbkAnn').classList.remove('open');
  const it = ANN.item;
  if(!it){ return; }
  if(!keep){ ANN.item = null; return; }
  ANN.drawing = null; annDraw();   // วาดรอบสุดท้ายให้ครบทุกชิ้นก่อนรวมเป็นรูป
  try{
    it.out = ANN.shapes.length ? $('#fbkCanvas').toDataURL('image/jpeg', 0.85) : it.base;
    it.shapes = ANN.shapes;
  }catch(e){
    toast('รวมรูปที่มาร์กไม่ได้ — ลบรูปนี้แล้วแนบใหม่แทน');
  }
  ANN.item = null;
  if(S.view === 'form' && $('#fbkOv').classList.contains('open')){ syncFormFields(); renderForm($('#fbkBody')); }
}
function renderTools(){
  $('#fbkToolRow').innerHTML = TOOLS.map(([k,l])=>`<button type="button" class="fbk-tool${ANN.tool===k?' sel':''}" data-t="${k}">${icon(k)}${l}</button>`).join('');
  $('#fbkColorRow').innerHTML = COLORS.map(c=>`<button type="button" class="fbk-color${ANN.color===c?' sel':''}" data-c="${c}" style="background:${c}" aria-label="สี ${c}"></button>`).join('') +
    `<span class="fbk-sep"></span><button type="button" class="fbk-tool" id="fbkUndo"${ANN.shapes.length?'':' disabled'}>${icon('undo')}ย้อนกลับ</button>` +
    `<button type="button" class="fbk-tool" id="fbkClear"${ANN.shapes.length?'':' disabled'}>${icon('trash')}ล้าง</button>`;
  $('#fbkToolRow').querySelectorAll('button').forEach(b=>b.onclick = ()=>{ ANN.tool = b.dataset.t; renderTools(); });
  $('#fbkColorRow').querySelectorAll('.fbk-color').forEach(b=>b.onclick = ()=>{ ANN.color = b.dataset.c; renderTools(); });
  $('#fbkUndo').onclick = ()=>{ ANN.shapes.pop(); annDraw(); renderTools(); };
  $('#fbkClear').onclick = ()=>{ if(confirm('ล้างที่วาดไว้ทั้งหมด?')){ ANN.shapes = []; annDraw(); renderTools(); } };
  $('#fbkAnnHint').textContent = ANN.tool === 'text' ? 'แตะตรงจุดที่ต้องการ แล้วพิมพ์ข้อความ' : ANN.tool === 'pen' ? 'ลากนิ้วเพื่อขีดเขียน' : 'ลากนิ้ว/เมาส์คร่อมจุดที่ต้องการ';
}
function fitCanvas(){
  const it = ANN.item; if(!it) return;
  const st = $('#fbkStage'), c = $('#fbkCanvas');
  const k = Math.min((st.clientWidth - 12) / it.w, (st.clientHeight - 12) / it.h);
  c.style.width = Math.max(50, Math.floor(it.w * k)) + 'px';
  c.style.height = Math.max(50, Math.floor(it.h * k)) + 'px';
}
window.addEventListener('resize', ()=>{ if(ANN.item) fitCanvas(); });
const lineW = () => Math.max(3, Math.round(Math.max(ANN.item.w, ANN.item.h) / 200));

function annDraw(){
  const c = $('#fbkCanvas'), x = c.getContext('2d');
  if(!ANN.img || !ANN.item) return;
  x.clearRect(0, 0, c.width, c.height);
  x.drawImage(ANN.img, 0, 0, c.width, c.height);
  ANN.shapes.concat(ANN.drawing ? [ANN.drawing] : []).forEach(s=>drawShape(x, s));
}
function drawShape(x, s){
  x.save();
  x.lineCap = 'round'; x.lineJoin = 'round';
  if(s.t === 'text'){
    const fs = s.lw * 6;
    x.font = `600 ${fs}px Prompt, sans-serif`;
    x.textBaseline = 'middle';
    x.lineWidth = Math.max(3, fs / 5); x.strokeStyle = s.color === '#111111' ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.65)';
    x.strokeText(s.text, s.x0, s.y0);
    x.fillStyle = s.color; x.fillText(s.text, s.x0, s.y0);
    x.restore(); return;
  }
  // วาด 2 รอบ: เงาเข้มด้านล่าง + สีจริงด้านบน ให้เห็นชัดทั้งบนพื้นสว่างและพื้นมืด
  [[s.color === '#111111' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.35)', s.lw + Math.max(2, s.lw*0.6)], [s.color, s.lw]].forEach(([col, w])=>{
    x.strokeStyle = col; x.lineWidth = w; x.beginPath();
    if(s.t === 'ellipse'){
      x.ellipse((s.x0+s.x1)/2, (s.y0+s.y1)/2, Math.max(1, Math.abs(s.x1-s.x0)/2), Math.max(1, Math.abs(s.y1-s.y0)/2), 0, 0, Math.PI*2);
    } else if(s.t === 'rect'){
      x.rect(Math.min(s.x0,s.x1), Math.min(s.y0,s.y1), Math.abs(s.x1-s.x0), Math.abs(s.y1-s.y0));
    } else if(s.t === 'arrow'){
      const a = Math.atan2(s.y1-s.y0, s.x1-s.x0), hl = s.lw * 5;
      x.moveTo(s.x0, s.y0); x.lineTo(s.x1, s.y1);
      x.moveTo(s.x1, s.y1); x.lineTo(s.x1 - hl*Math.cos(a-0.45), s.y1 - hl*Math.sin(a-0.45));
      x.moveTo(s.x1, s.y1); x.lineTo(s.x1 - hl*Math.cos(a+0.45), s.y1 - hl*Math.sin(a+0.45));
    } else if(s.t === 'pen'){
      const p = s.pts; x.moveTo(p[0].x, p[0].y);
      if(p.length === 1) x.lineTo(p[0].x + 0.1, p[0].y);
      for(let i=1;i<p.length;i++) x.lineTo(p[i].x, p[i].y);
    }
    x.stroke();
  });
  x.restore();
}
function canvasPt(e){
  const c = $('#fbkCanvas'), r = c.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
}
function bindCanvas(){
  const c = $('#fbkCanvas');
  c.addEventListener('pointerdown', e=>{
    if(!e.isPrimary || !ANN.item) return;
    e.preventDefault();
    try{ c.setPointerCapture(e.pointerId); }catch(err){}
    const p = canvasPt(e);
    if(ANN.tool === 'text'){ ANN.textAt = p; return; }
    ANN.drawing = { t: ANN.tool, color: ANN.color, lw: lineW(), x0:p.x, y0:p.y, x1:p.x, y1:p.y, pts: ANN.tool === 'pen' ? [p] : undefined };
    annDraw();
  });
  c.addEventListener('pointermove', e=>{
    const d = ANN.drawing; if(!d || !e.isPrimary) return;
    e.preventDefault();
    const p = canvasPt(e);
    d.x1 = p.x; d.y1 = p.y;
    if(d.t === 'pen'){ const last = d.pts[d.pts.length-1]; if(Math.hypot(p.x-last.x, p.y-last.y) > 2) d.pts.push(p); }
    annDraw();
  });
  const end = e=>{
    if(!e.isPrimary) return;
    if(ANN.tool === 'text' && ANN.textAt){
      const at = ANN.textAt; ANN.textAt = null;
      const t = prompt('พิมพ์ข้อความที่จะใส่ในรูป');
      if(t && t.trim()){ ANN.shapes.push({ t:'text', color: ANN.color, lw: lineW(), x0: at.x, y0: at.y, text: t.trim().slice(0, 80) }); annDraw(); renderTools(); }
      return;
    }
    const d = ANN.drawing; if(!d) return;
    ANN.drawing = null;
    const big = d.t === 'pen' ? d.pts.length > 1 : Math.hypot(d.x1-d.x0, d.y1-d.y0) > d.lw * 3;
    if(big) ANN.shapes.push(d);
    annDraw(); renderTools();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', ()=>{ ANN.drawing = null; ANN.textAt = null; annDraw(); });
}

/* ---------- สร้าง DOM ---------- */
function init(){
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'fbkRoot';
  root.innerHTML = `
    <button type="button" class="fbk-launch" id="fbkLaunch" aria-label="ความคิดเห็น / แจ้งปรับปรุงระบบ" title="ความคิดเห็น / แจ้งปรับปรุงระบบ">${icon('chat')}<span class="fbk-badge" id="fbkBadge"></span></button>
    <div class="fbk-ov" id="fbkOv" role="dialog" aria-modal="true" aria-labelledby="fbkTitle">
      <div class="fbk-panel">
        <div class="fbk-head">
          <button type="button" class="fbk-iconbtn" id="fbkBack" aria-label="กลับ" hidden>${icon('back')}</button>
          <h2 id="fbkTitle">ความคิดเห็น</h2>
          <button type="button" class="fbk-iconbtn" id="fbkClose" aria-label="ปิด">${icon('close')}</button>
        </div>
        <div class="fbk-body" id="fbkBody"></div>
      </div>
    </div>
    <div class="fbk-ann" id="fbkAnn" role="dialog" aria-modal="true" aria-label="วาดมาร์กบนรูป">
      <div class="fbk-ann-top">
        <button type="button" class="fbk-ann-cancel" id="fbkAnnCancel">ยกเลิก</button>
        <h3>วง / มาร์กจุดที่ต้องการ</h3>
        <button type="button" class="fbk-ann-done" id="fbkAnnDone">เสร็จ</button>
      </div>
      <div class="fbk-stage" id="fbkStage"><canvas id="fbkCanvas"></canvas></div>
      <div class="fbk-tools">
        <div class="fbk-trow" id="fbkToolRow"></div>
        <div class="fbk-trow" id="fbkColorRow"></div>
        <div class="fbk-ann-hint" id="fbkAnnHint"></div>
      </div>
    </div>
    <div class="fbk-lb" id="fbkLb"><img id="fbkLbImg" alt=""></div>
    <div class="fbk-toast" id="fbkToast" role="status"></div>`;
  document.body.appendChild(root);
  // มีแถบเมนูด้านบน (ui.js) → ย้ายปุ่มไปอยู่ขวาสุดของแถบ
  const slot = document.getElementById('uiBarRight');
  if(slot) slot.appendChild($('#fbkLaunch'));

  $('#fbkLaunch').onclick = openPanel;
  $('#fbkClose').onclick = ()=>{ if(S.view === 'form') syncFormFields(); closeLayerUI(); };
  $('#fbkBack').onclick = ()=>{
    if(S.view === 'form'){
      syncFormFields();
      if(S.editId != null){ const id = S.editId; endEdit(); go('detail', id); return; }   // ยกเลิกแก้ไข → กลับหน้ารายละเอียดเรื่องนั้น
    }
    go('list');
  };
  $('#fbkOv').addEventListener('click', e=>{ if(e.target.id === 'fbkOv'){ if(S.view === 'form') syncFormFields(); closeLayerUI(); } });
  $('#fbkAnnCancel').onclick = ()=>{ ANN.cancelled = true; closeLayerUI(); };
  $('#fbkAnnDone').onclick = ()=>{ ANN.cancelled = false; closeLayerUI(); };
  $('#fbkLb').onclick = ()=>closeLayerUI();
  bindCanvas();
  loadItems();   // ดึงจำนวนเรื่องที่ค้างมาโชว์บนปุ่ม
  window.FBK = { open: openPanel };   // ให้เมนูแฮมเบอร์เกอร์ (ui.js) เปิดหน้าความคิดเห็นได้
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
