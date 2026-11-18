/* ============================================================
   ui.js — ส่วนกลางของทุกหน้า
   ------------------------------------------------------------
   1) แถบเมนูด้านบน: ปุ่ม ☰ (ซ้าย) · ชื่อหน้า · ปุ่มความคิดเห็น (ขวา, จาก feedback.js)
      เลื่อนหน้าลง = แถบสไลด์หลบขึ้นไป / เลื่อนขึ้น = แถบสไลด์กลับลงมา
   2) เมนูแฮมเบอร์เกอร์: สไลด์ออกจากด้านซ้าย มีลิงก์ทุกหน้า + ทางลัดของหน้าที่เปิดอยู่
      ปัดไปทางซ้าย / กดพื้นหลัง / ปุ่มย้อนกลับของมือถือ = ปิดเมนู
   3) อนิเมชันเลื่อนขึ้น-ลง: ฟอร์มด้านล่าง (.overlay .sheet) สไลด์ขึ้นตอนเปิด/ลงตอนปิด
      ลากแถบด้านบนของฟอร์มลงเพื่อปิดได้ · รายการ/การ์ดค่อยๆ เลื่อนขึ้นมา · ปุ่ม + หมุน
   ใส่ใน <head> ของทุกหน้า (ไม่ใส่ defer เพื่อให้ CSS มาก่อนหน้าเว็บแสดง จะได้ไม่กระพริบ):
     <script src="ui.js"></script>
   ============================================================ */
(function(){
'use strict';
if(window.__uiLoaded) return;
window.__uiLoaded = true;

const PAGES = [
  { file:'index.html',            name:'หน้าแรก',            icon:'home',  desc:'เลือกระบบที่ต้องการใช้งาน' },
  { file:'vehicle-log-v3.html',   name:'บันทึกการใช้รถ',      icon:'car',   desc:'ทริปสด · กรอกย้อนหลัง · ปฏิทิน' },
  { file:'vehicle-report.html',   name:'สรุปการใช้รถรายปี',   icon:'chart', desc:'กี่กิโล · มากสุด/น้อยสุด · ตรวจข้อมูล' },
  { file:'branches-manager.html', name:'จัดการข้อมูลสาขา',    icon:'shop',  desc:'เพิ่ม / แก้ไข / ลบ รายชื่อสาขา' },
];
// ทางลัดของแต่ละหน้า: เรียกฟังก์ชันที่หน้านั้นมีอยู่แล้ว (ถ้าหน้านั้นไม่มีฟังก์ชันนั้น ปุ่มจะไม่โชว์)
const SHORTCUTS = {
  'vehicle-log-v3.html': [
    { label:'เริ่มทริปสด (ถ่ายรูปจริง)', icon:'camera',   fn:'openStartTrip' },
    { label:'กรอกข้อมูลย้อนหลัง',       icon:'pencil',   fn:'openAdd' },
    { label:'Export Excel',            icon:'download', fn:'openExport' },
    { label:'จัดการรถ (เพิ่ม / แก้ไข / ลบ)', icon:'car', fn:'openVehicleManager' },
  ],
  'vehicle-report.html': [
    { label:'ไปที่ตรวจสอบข้อมูล', icon:'alert', run: ()=>{ const el = document.getElementById('checkSec'); if(el) el.scrollIntoView({ behavior:'smooth', block:'start' }); } },
  ],
  'branches-manager.html': [
    { label:'เพิ่มสาขาใหม่', icon:'plus', fn:'openAdd' },
  ],
};
const curFile = decodeURIComponent(location.pathname.split('/').pop() || '') || 'index.html';
const CUR = PAGES.find(p=>p.file===curFile) || { file:curFile, name:(document.title||'').split('—')[0].trim() || 'IT Department', icon:'home' };

const P = {
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  home:'<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M6 9v10.5h4.5V14h3v5.5H18V9"/>',
  car:'<path d="M5 16.5h14M6.5 16.5v2M17.5 16.5v2"/><path d="M4 16.5v-4l2.2-5A2 2 0 0 1 8 6.3h8a2 2 0 0 1 1.8 1.2l2.2 5v4"/><path d="M4 12.5h16"/><circle cx="7.5" cy="14.5" r=".9"/><circle cx="16.5" cy="14.5" r=".9"/>',
  chart:'<path d="M4 4v15.5h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  shop:'<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12v8h13v-8M10 20v-4.5h4V20"/>',
  camera:'<path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
  pencil:'<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  download:'<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  alert:'<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.3"/>',
  chat:'<path d="M4.5 4.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4.5 3.5v-3.5h-1a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"/><path d="M7.5 9h9M7.5 12.5h6"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
};
const icon = (n, cls) => `<svg class="ui-ic${cls?' '+cls:''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||''}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- CSS ---------- */
const EASE = 'cubic-bezier(.32,.72,0,1)';   // ออกตัวเร็ว จอดนุ่ม แบบแอปมือถือ
let stagger = '';
for(let i=1;i<=14;i++){
  // รายการ/แถวค่อยๆ เลื่อนขึ้นมาทีละแถว (หลังแถวที่ 14 มาพร้อมกัน)
  stagger += `.tbl > .trow:nth-child(${i+1}), .tbl > .brow:nth-child(${i+1}){animation-delay:${i*22}ms}\n`;
  stagger += `#uiDrawerOv.open .ui-anim:nth-child(${i}){animation-delay:${60 + i*30}ms}\n`;
}
const CSS = `
html.has-uibar{--ui-h:calc(58px + env(safe-area-inset-top, 0px))}
html.has-uibar body::before{content:'';display:block;height:var(--ui-h);flex-shrink:0;width:100%}
.ui-ic{width:1em;height:1em;display:inline-block;vertical-align:-0.14em;flex-shrink:0}

/* ===== แถบเมนูด้านบน ===== */
.ui-bar{position:fixed;top:0;left:0;right:0;z-index:45;height:var(--ui-h);padding-top:env(safe-area-inset-top, 0px);
  background:rgba(255,255,255,.9);-webkit-backdrop-filter:saturate(1.5) blur(12px);backdrop-filter:saturate(1.5) blur(12px);
  border-bottom:1px solid var(--line,#eee9e1);transition:transform .34s ${EASE}, box-shadow .25s ease;font-family:var(--sans,'Prompt',sans-serif);color:var(--tx,#2e2a24)}
.ui-bar.hide{transform:translateY(-100%)}
.ui-bar.scrolled{box-shadow:0 2px 14px rgba(46,42,36,.08)}
.ui-bar-in{height:58px;max-width:var(--ui-max,760px);margin:0 auto;padding:0 12px;display:flex;align-items:center;gap:10px}
.ui-burger{width:40px;height:40px;border-radius:12px;border:1px solid var(--line,#eee9e1);background:var(--panel,#fff);color:var(--tx,#2e2a24);
  display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex-shrink:0;transition:background .15s, transform .15s}
.ui-burger:hover{background:var(--ink,#faf8f5)}
.ui-burger:active{transform:scale(.94)}
.ui-burger .ui-ic{width:20px;height:20px}
.ui-title{flex:1;min-width:0;line-height:1.15}
.ui-title small{display:block;font-family:var(--mono,'JetBrains Mono',monospace);font-size:9.5px;letter-spacing:.16em;color:var(--tx3,#a39a8d);text-transform:uppercase}
.ui-title b{display:block;font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ui-bar-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ui-bar-right .fbk-launch{position:relative;top:auto;right:auto;box-shadow:none}

/* ===== เมนูแฮมเบอร์เกอร์ (สไลด์จากซ้าย) ===== */
.ui-drawer-ov{position:fixed;inset:0;z-index:480;background:rgba(6,7,9,0);visibility:hidden;pointer-events:none;
  transition:background-color .3s ease, visibility 0s linear .36s;font-family:var(--sans,'Prompt',sans-serif);color:var(--tx,#2e2a24)}
.ui-drawer-ov.open{background:rgba(6,7,9,.45);visibility:visible;pointer-events:auto;transition:background-color .3s ease}
.ui-drawer{position:absolute;top:0;bottom:0;left:0;width:min(320px, 86vw);background:var(--ink,#faf8f5);display:flex;flex-direction:column;
  box-shadow:8px 0 30px rgba(0,0,0,.18);transform:translateX(-102%);transition:transform .36s ${EASE};overflow-y:auto;overscroll-behavior:contain;
  padding:calc(14px + env(safe-area-inset-top, 0px)) 12px calc(18px + env(safe-area-inset-bottom, 0px))}
.ui-drawer-ov.open .ui-drawer{transform:none}
.ui-dh{display:flex;align-items:flex-start;gap:10px;padding:4px 6px 16px;border-bottom:1px solid var(--line,#eee9e1);margin-bottom:10px}
.ui-dh .t{flex:1;min-width:0}
.ui-dh small{display:block;font-family:var(--mono,'JetBrains Mono',monospace);font-size:10px;letter-spacing:.16em;color:var(--tx3,#a39a8d)}
.ui-dh b{display:block;font-size:17px;font-weight:600;margin-top:4px}
.ui-x{width:36px;height:36px;border-radius:10px;border:none;background:none;color:var(--tx2,#6f675c);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.ui-x:hover{background:var(--line,#eee9e1)}
.ui-x .ui-ic{width:20px;height:20px}
.ui-sec{font-size:10.5px;font-weight:600;color:var(--tx3,#a39a8d);letter-spacing:.06em;padding:12px 10px 6px}
.ui-item{display:flex;align-items:center;gap:12px;width:100%;padding:11px 10px;border-radius:12px;border:none;background:none;color:inherit;text-decoration:none;
  font-family:inherit;font-size:14px;text-align:left;cursor:pointer;transition:background .15s}
.ui-item:hover{background:var(--panel,#fff)}
.ui-item:active{background:var(--line,#eee9e1)}
.ui-item .ui-ic{width:20px;height:20px;color:var(--tx2,#6f675c)}
.ui-item .tx{flex:1;min-width:0}
.ui-item .tx b{display:block;font-weight:500}
.ui-item .tx small{display:block;font-size:11px;color:var(--tx3,#a39a8d);margin-top:1px}
.ui-item .go{width:14px;height:14px;color:var(--tx3,#a39a8d)}
.ui-item.cur{background:var(--panel,#fff);box-shadow:inset 3px 0 0 var(--amber,#8a6a4a)}
.ui-item.cur b,.ui-item.cur .ui-ic{color:var(--amber,#8a6a4a)}
.ui-item .cnt{min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--amber,#8a6a4a);color:#fff;font:600 11px/20px var(--mono,monospace);text-align:center}
.ui-foot{margin-top:auto;padding:16px 10px 0;font-size:11px;color:var(--tx3,#a39a8d);line-height:1.6}
@keyframes uiItemIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
#uiDrawerOv.open .ui-anim{animation:uiItemIn .4s ${EASE} both}

/* ===== ฟอร์มด้านล่าง: สไลด์ขึ้นตอนเปิด / ลงตอนปิด (ใช้กับ .overlay .sheet ทุกหน้า) ===== */
.overlay{display:flex;visibility:hidden;opacity:0;pointer-events:none;transition:opacity .26s ease, visibility 0s linear .36s}
.overlay.open{visibility:visible;opacity:1;pointer-events:auto;transition:opacity .26s ease}
.overlay .sheet{transform:translateY(104%);transition:transform .36s ${EASE};overscroll-behavior:contain}
.overlay.open .sheet{transform:none}
.overlay .sheet-handle{width:42px;height:5px;cursor:grab}
.overlay .sheet-handle,.overlay .sheet-title{touch-action:none}
.overlay .sheet.dragging{transition:none}

/* ===== ปุ่ม + / เมนูลอย / แจ้งเตือน ===== */
.fab{transition:transform .2s ${EASE}, box-shadow .2s}
.fab:active{transform:scale(.92)}
.fab .ic{transition:transform .3s ${EASE}}
.fab.open .ic{transform:rotate(135deg)}
@keyframes uiPop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
.fab-menu button{animation:uiPop .3s ${EASE} both}
.fab-menu button:nth-last-child(1){animation-delay:0ms}
.fab-menu button:nth-last-child(2){animation-delay:50ms}
.fab-menu button:nth-last-child(3){animation-delay:100ms}
html.has-uibar .toast{top:calc(var(--ui-h) + 10px)}
.toast{transition:opacity .25s ease, transform .32s ${EASE};transform:translate(-50%,-12px)}
.toast.show{transform:translate(-50%,0)}

/* ===== รายการ / การ์ด ค่อยๆ เลื่อนขึ้นมา ===== */
@keyframes uiUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes uiFade{from{opacity:0}to{opacity:1}}
@keyframes uiSlideUp{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
@keyframes uiZoom{from{transform:scale(.94);opacity:0}to{transform:none;opacity:1}}
.tbl > .trow, .tbl > .brow{animation:uiUp .38s ${EASE} both}
${stagger}
.active-card{animation:uiUp .4s ${EASE} both}
.stop-card{animation:uiUp .38s ${EASE} both}
.stop-card:nth-child(2){animation-delay:40ms}.stop-card:nth-child(3){animation-delay:80ms}.stop-card:nth-child(4){animation-delay:120ms}.stop-card:nth-child(n+5){animation-delay:160ms}
.cal-wrap{animation:uiUp .35s ${EASE} both}
.picker-overlay.open .picker{animation:uiSlideUp .34s ${EASE} both}
.camera-overlay.open{animation:uiFade .22s ease both}
.lightbox.open img{animation:uiZoom .28s ${EASE} both}

@media (prefers-reduced-motion: reduce){
  .ui-bar,.ui-drawer,.ui-drawer-ov,.overlay,.overlay .sheet,.toast,.fab,.fab .ic{transition:none!important}
  #uiDrawerOv.open .ui-anim,.fab-menu button,.tbl > .trow,.tbl > .brow,.active-card,.stop-card,.cal-wrap,
  .picker-overlay.open .picker,.camera-overlay.open,.lightbox.open img{animation:none!important}
}
`;

/* ---------- ใส่ CSS ทันที (ก่อนหน้าเว็บวาดครั้งแรก) ---------- */
document.documentElement.classList.add('has-uibar');
const style = document.createElement('style');
style.id = 'uiStyle';
style.textContent = CSS;
document.head.appendChild(style);

/* ---------- แถบเมนู + เมนูแฮมเบอร์เกอร์ ---------- */
let bar, ov, drawer, burger, isOpen = false, pendingClose = null, lastFocus = null;

function buildMenu(){
  const pages = PAGES.map(p=>`
    <a class="ui-item ui-anim${p.file===CUR.file?' cur':''}" href="${esc(p.file)}"${p.file===CUR.file?' aria-current="page"':''}>
      ${icon(p.icon)}<span class="tx"><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></span>${p.file===CUR.file?'':icon('chev','go')}
    </a>`).join('');
  const shortcuts = (SHORTCUTS[CUR.file] || []).filter(s=>s.run || typeof window[s.fn] === 'function');
  const fbCount = (document.getElementById('fbkBadge') || {}).textContent || '';
  const hasFb = !!document.getElementById('fbkLaunch');
  return `
    <div class="ui-dh ui-anim"><div class="t"><small>IT DEPARTMENT</small><b>ระบบบันทึกการใช้รถ</b></div>
      <button type="button" class="ui-x" id="uiDrawerClose" aria-label="ปิดเมนู">${icon('close')}</button></div>
    <div class="ui-sec ui-anim">เมนู</div>
    ${pages}
    ${shortcuts.length ? `<div class="ui-sec ui-anim">ทางลัดหน้านี้</div>` + shortcuts.map((s,i)=>`<button type="button" class="ui-item ui-anim" data-sc="${i}">${icon(s.icon)}<span class="tx"><b>${esc(s.label)}</b></span></button>`).join('') : ''}
    ${hasFb ? `<div class="ui-sec ui-anim">อื่นๆ</div>
      <button type="button" class="ui-item ui-anim" id="uiFeedback">${icon('chat')}<span class="tx"><b>ความคิดเห็น / แจ้งปรับปรุงระบบ</b><small>แจ้ง เพิ่ม / แก้ไข / ลบ / ปรับปรุง</small></span>${fbCount && fbCount !== '0' ? `<span class="cnt">${esc(fbCount)}</span>` : ''}</button>` : ''}
    <div class="ui-foot ui-anim">ข้อมูลทุกหน้าซิงก์จากฐานข้อมูลชุดเดียวกัน</div>`;
}

function openDrawer(){
  if(isOpen) return;
  drawer.innerHTML = buildMenu();
  bindMenu();
  isOpen = true;
  lastFocus = document.activeElement;
  ov.classList.add('open');
  burger.setAttribute('aria-expanded', 'true');
  bar.classList.remove('hide');
  document.documentElement.style.overflow = 'hidden';
  try{ history.pushState({ uiDrawer:true }, ''); }catch(e){}
  setTimeout(()=>{ const c = document.getElementById('uiDrawerClose'); if(c) c.focus({ preventScroll:true }); }, 50);
}
function hideDrawer(){
  if(!isOpen) return;
  isOpen = false;
  ov.classList.remove('open');
  drawer.style.transform = '';
  burger.setAttribute('aria-expanded', 'false');
  document.documentElement.style.overflow = '';
  if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
}
// ปิดเมนู แล้วค่อยทำอย่างอื่นต่อ (รอให้ history ถอยกลับเสร็จก่อน ไม่งั้นหน้าต่อไปจะเปิด/ปิดชนกัน)
function closeDrawer(){
  return new Promise(res=>{
    if(!isOpen) return res();
    if(history.state && history.state.uiDrawer){ pendingClose = res; history.back(); }
    else { hideDrawer(); res(); }
  });
}
window.addEventListener('popstate', ()=>{
  if(!isOpen) return;
  hideDrawer();
  if(pendingClose){ const r = pendingClose; pendingClose = null; setTimeout(r, 30); }
});

function bindMenu(){
  document.getElementById('uiDrawerClose').onclick = ()=>closeDrawer();
  drawer.querySelectorAll('a.ui-item').forEach(a=>a.addEventListener('click', async e=>{
    e.preventDefault();
    const href = a.getAttribute('href');
    await closeDrawer();
    if(a.classList.contains('cur')) return;
    location.href = href;
  }));
  const list = (SHORTCUTS[CUR.file] || []).filter(s=>s.run || typeof window[s.fn] === 'function');
  drawer.querySelectorAll('[data-sc]').forEach(b=>b.addEventListener('click', async ()=>{
    const s = list[Number(b.dataset.sc)];
    await closeDrawer();
    if(s.run) s.run(); else window[s.fn]();
  }));
  const fb = document.getElementById('uiFeedback');
  if(fb) fb.addEventListener('click', async ()=>{
    await closeDrawer();
    if(window.FBK && window.FBK.open) window.FBK.open(); else { const l = document.getElementById('fbkLaunch'); if(l) l.click(); }
  });
}

// ปัดเมนูไปทางซ้ายเพื่อปิด
function bindDrawerSwipe(){
  let x0 = null, y0 = 0, dx = 0, horizontal = null;
  drawer.addEventListener('touchstart', e=>{ x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horizontal = null; }, { passive:true });
  drawer.addEventListener('touchmove', e=>{
    if(x0 === null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if(horizontal === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horizontal = Math.abs(mx) > Math.abs(my);
    if(!horizontal) return;
    dx = Math.min(0, mx);
    drawer.style.transition = 'none';
    drawer.style.transform = `translateX(${dx}px)`;
  }, { passive:true });
  drawer.addEventListener('touchend', ()=>{
    if(x0 === null) return;
    drawer.style.transition = '';
    if(horizontal && dx < -70) closeDrawer(); else drawer.style.transform = '';
    x0 = null;
  });
}

// แถบเมนูสไลด์หลบตอนเลื่อนลง โผล่กลับตอนเลื่อนขึ้น
function bindAutoHide(){
  let lastY = window.scrollY, ticking = false;
  window.addEventListener('scroll', ()=>{
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const y = Math.max(0, window.scrollY), dy = y - lastY;
      if(Math.abs(dy) > 6){
        bar.classList.toggle('hide', dy > 0 && y > 90 && !isOpen);
        lastY = y;
      }
      bar.classList.toggle('scrolled', y > 4);
      ticking = false;
    });
  }, { passive:true });
}

// ลากแถบด้านบนของฟอร์ม (ขีดเทา + หัวข้อ) ลงเพื่อปิด — เหมือนแอปมือถือ
function bindSheetSwipe(){
  let drag = null;
  document.addEventListener('touchstart', e=>{
    const grip = e.target.closest('.overlay.open .sheet-handle, .overlay.open .sheet-title');
    if(!grip) return;
    const sheet = grip.closest('.sheet');
    drag = { sheet, y0: e.touches[0].clientY, dy: 0 };
    sheet.classList.add('dragging');
  }, { passive:true });
  document.addEventListener('touchmove', e=>{
    if(!drag) return;
    drag.dy = Math.max(0, e.touches[0].clientY - drag.y0);
    drag.sheet.style.transform = `translateY(${drag.dy}px)`;
  }, { passive:true });
  const end = ()=>{
    if(!drag) return;
    const { sheet, dy } = drag; drag = null;
    sheet.classList.remove('dragging');
    sheet.style.transform = '';
    // ลงเกิน 90px = ปิด (กดพื้นหลังแทนผู้ใช้ เพื่อให้ปิดผ่านโค้ดเดิมของแต่ละฟอร์ม)
    if(dy > 90){ const o = sheet.closest('.overlay'); if(o) o.dispatchEvent(new MouseEvent('click', { bubbles:true })); }
  };
  document.addEventListener('touchend', end);
  document.addEventListener('touchcancel', end);
}

// ปุ่ม + หมุนเป็น × ตอนเปิดเมนูลอย (เฝ้าดูการเปิด/ปิดเมนูลอยของหน้าบันทึกการใช้รถ)
function bindFab(){
  const fab = document.querySelector('.fab'), menu = document.getElementById('fabMenu');
  if(!fab || !menu) return;
  const sync = ()=>fab.classList.toggle('open', menu.style.display !== 'none' && menu.style.display !== '');
  new MutationObserver(sync).observe(menu, { attributes:true, attributeFilter:['style'] });
  sync();
}

// ย้ายปุ่มความคิดเห็น (feedback.js) มาไว้ขวาสุดของแถบเมนู
function adoptFeedback(){
  const l = document.getElementById('fbkLaunch'), slot = document.getElementById('uiBarRight');
  if(l && slot && l.parentElement !== slot) slot.appendChild(l);
}

function build(){
  if(bar) return;
  bar = document.createElement('header');
  bar.className = 'ui-bar';
  bar.id = 'uiBar';
  bar.innerHTML = `<div class="ui-bar-in">
      <button type="button" class="ui-burger" id="uiBurger" aria-label="เปิดเมนู" aria-expanded="false" aria-controls="uiDrawer">${icon('menu')}</button>
      <div class="ui-title"><small>IT DEPARTMENT</small><b>${esc(CUR.file === 'index.html' ? 'ระบบบันทึกการใช้รถ' : CUR.name)}</b></div>
      <div class="ui-bar-right" id="uiBarRight"></div>
    </div>`;
  ov = document.createElement('div');
  ov.className = 'ui-drawer-ov';
  ov.id = 'uiDrawerOv';
  ov.innerHTML = `<nav class="ui-drawer" id="uiDrawer" aria-label="เมนูหลัก"></nav>`;
  document.body.prepend(ov);
  document.body.prepend(bar);
  drawer = ov.querySelector('.ui-drawer');
  burger = bar.querySelector('#uiBurger');
  burger.onclick = openDrawer;
  ov.addEventListener('click', e=>{ if(e.target === ov) closeDrawer(); });
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && isOpen) closeDrawer(); });
  bindDrawerSwipe(); bindAutoHide(); bindSheetSwipe(); bindFab();
  adoptFeedback();
  // feedback.js อาจโหลดเสร็จทีหลัง → คอยย้ายปุ่มมาเมื่อปุ่มโผล่
  new MutationObserver(adoptFeedback).observe(document.body, { childList:true });
}
// สร้างแถบให้เร็วที่สุด (ตอน HTML อ่านจบ ก่อนสคริปต์ defer อื่นๆ ทำงาน)
if(document.readyState === 'loading'){
  document.addEventListener('readystatechange', ()=>{ if(document.readyState !== 'loading') build(); });
  document.addEventListener('DOMContentLoaded', build);
} else build();

window.UI = { openMenu: openDrawer, closeMenu: closeDrawer };
})();
