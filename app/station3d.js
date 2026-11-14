/* CoreDash PumpStation — interactive 3D station (isometric SVG driven by live data) */
(function () {
  'use strict';
  var A = APP, S = SIM.state, $ = A.$, $$ = A.$$, esc = A.esc, fmt = A.fmt;

  // ---------- colour presets (also used by the Appearance page)
  var PRESETS = {
    navy: { name: 'Navy Blue', floor: '#14275E', line: '#7AA2FF', pipe: '#3A4F86', water: '#5FD9FF', pump: '#3B7BFF', casing: '#C9D2E6', cabinet: '#D9DEE7', tank: '#2B4A9C' },
    green: { name: 'Industrial Green', floor: '#16352B', line: '#6EE7B7', pipe: '#3D5A4F', water: '#4FD1F5', pump: '#16A34A', casing: '#D4D8DD', cabinet: '#E5E7EB', tank: '#1F5E4A' },
    orange: { name: 'Safety Orange', floor: '#2B2A33', line: '#FDBA74', pipe: '#565463', water: '#38BDF8', pump: '#F97316', casing: '#CBD5E1', cabinet: '#E2E8F0', tank: '#3F4A5A' },
    steel: { name: 'Steel Gray', floor: '#2A303C', line: '#A3B3CC', pipe: '#5B6577', water: '#67E8F9', pump: '#64748B', casing: '#CBD5E1', cabinet: '#E2E8F0', tank: '#475569' },
    violet: { name: 'Purple Tech', floor: '#231B4D', line: '#C4B5FD', pipe: '#4C3F86', water: '#5EEAD4', pump: '#8B5CF6', casing: '#DDD6FE', cabinet: '#E9E5FF', tank: '#4C3A99' },
    blueprint: { name: 'Light Blueprint', floor: '#DCE7FB', line: '#2F6BFF', pipe: '#8EA3C9', water: '#0EA5E9', pump: '#2F6BFF', casing: '#F1F5F9', cabinet: '#FFFFFF', tank: '#9DB6E8' }
  };
  var KEYS = ['floor', 'line', 'pipe', 'water', 'pump', 'casing', 'cabinet', 'tank'];
  var KEY_LABEL = { floor: 'พื้นสถานี', line: 'เส้นตาราง', pipe: 'ท่อ', water: 'น้ำไหล', pump: 'มอเตอร์ปั๊ม', casing: 'ตัวเรือนปั๊ม', cabinet: 'ตู้ควบคุม', tank: 'ถังน้ำ' };
  function stationColors() { var a = A.ls('appearance', {}) || {}; var base = PRESETS[(a.station && a.station.preset) || 'navy'] || PRESETS.navy; var c = {}; KEYS.forEach(function (k) { c[k] = (a.station && a.station.custom && a.station.custom[k]) || base[k]; }); return c; }
  function applyStationVars(el) { var c = stationColors(); KEYS.forEach(function (k) { el.style.setProperty('--st-' + k, c[k]); }); }

  // ---------- isometric helpers
  var C = 0.8660254, H = 0.5, OX = 360, OY = 150, VB = { x: 70, y: -20, w: 690, h: 470 };
  function P(x, y, z) { z = z || 0; return [OX + (x - y) * C, OY + (x + y) * H - z]; }
  function pts(l) { return l.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
  function face(points, v, shade) { return '<polygon points="' + pts(points) + '" style="fill:var(--st-' + v + ')"/>' + (shade ? '<polygon points="' + pts(points) + '" fill="#000" opacity="' + shade + '"/>' : '') + '<polygon points="' + pts(points) + '" fill="none" stroke="rgba(5,10,30,.35)" stroke-width=".7" stroke-linejoin="round"/>'; }
  function box(x, y, z, w, d, h, v) {
    return face([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], v, 0.38) +
      face([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], v, 0.2) +
      face([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], v, 0);
  }
  function cyl(x, y, z, r, h, v) {
    var b = P(x, y, z), t = P(x, y, z + h), rx = r * 1.2247, ry = r * 0.7071;
    return '<ellipse cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" style="fill:var(--st-' + v + ')"/><ellipse cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="#000" opacity=".35"/>' +
      '<rect x="' + (b[0] - rx).toFixed(1) + '" y="' + t[1].toFixed(1) + '" width="' + (2 * rx).toFixed(1) + '" height="' + (b[1] - t[1]).toFixed(1) + '" style="fill:var(--st-' + v + ')"/><rect x="' + (b[0] - rx).toFixed(1) + '" y="' + t[1].toFixed(1) + '" width="' + (2 * rx).toFixed(1) + '" height="' + (b[1] - t[1]).toFixed(1) + '" fill="url(#stCylShade)"/>' +
      '<ellipse cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" style="fill:var(--st-' + v + ')" stroke="rgba(5,10,30,.35)" stroke-width=".7"/>';
  }
  function path3(list) { return list.map(function (p, i) { var q = P(p[0], p[1], p[2]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '); }
  function pipe(list, w, flowKey, dashed) {
    var d = path3(list);
    return '<path d="' + d + '" fill="none" style="stroke:var(--st-pipe)" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (dashed ? ' stroke-dasharray="6 6"' : '') + '/>' +
      '<path d="' + d + '" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="' + Math.max(2, w / 3) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -' + (w / 4).toFixed(1) + ')"/>' +
      (flowKey ? '<path class="st-flow" data-flow="' + flowKey + '" d="' + d + '" fill="none" style="stroke:var(--st-water)" stroke-width="' + Math.max(3, w / 2.6).toFixed(1) + '" stroke-linecap="round" stroke-linejoin="round"/>' : '');
  }
  function pct(p) { return [((p[0] - VB.x) / VB.w * 100).toFixed(2), ((p[1] - VB.y) / VB.h * 100).toFixed(2)]; }

  var ANCH = {};
  function scene() {
    var o = [];
    o.push('<defs><linearGradient id="stCylShade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>' +
      '<radialGradient id="stGlow"><stop offset="0" stop-color="currentColor" stop-opacity=".9"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="stShadow"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>');
    var c = P(210, 130, 0);
    o.push('<ellipse cx="' + c[0] + '" cy="' + (c[1] + 40) + '" rx="360" ry="120" fill="url(#stShadow)"/>');
    o.push(box(0, 0, 0, 430, 270, 12, 'floor'));
    var g = ''; for (var i = 0; i <= 430; i += 30) g += '<line x1="' + i + '" y1="0" x2="' + i + '" y2="270" style="stroke:var(--st-line)" stroke-opacity=".16"/>'; for (var j = 0; j <= 270; j += 30) g += '<line x1="0" y1="' + j + '" x2="430" y2="' + j + '" style="stroke:var(--st-line)" stroke-opacity=".16"/>';
    o.push('<g transform="matrix(' + C + ' ' + H + ' ' + (-C) + ' ' + H + ' ' + OX + ' ' + (OY - 12) + ')">' + g + '</g>');
    // tank
    o.push(cyl(60, 70, 12, 40, 96, 'tank'));
    var tb = P(60, 70, 12), tt = P(60, 70, 108), rx = 40 * 1.2247, wl = (2 * rx - 12) / 4;
    o.push('<rect x="' + (tb[0] - rx + 6).toFixed(1) + '" y="' + (tt[1] + 30).toFixed(1) + '" width="' + (2 * rx - 12).toFixed(1) + '" height="' + (tb[1] - tt[1] - 36).toFixed(1) + '" rx="6" style="fill:var(--st-water)" opacity=".55"/>');
    o.push('<path class="st-wave" d="M' + (tb[0] - rx + 6).toFixed(1) + ' ' + (tt[1] + 32).toFixed(1) + ' q ' + (wl / 2).toFixed(1) + ' -5 ' + wl.toFixed(1) + ' 0 t ' + wl.toFixed(1) + ' 0 t ' + wl.toFixed(1) + ' 0 t ' + wl.toFixed(1) + ' 0" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>');
    ANCH.tank = P(60, 70, 112);
    // cabinet + live HMI
    o.push(box(372, 6, 12, 56, 30, 100, 'cabinet'));
    var e = OX + (372 - 36) * C, f = OY + (372 + 36) * H - 12 - 100;
    o.push('<g transform="matrix(' + C + ' ' + H + ' 0 1 ' + e.toFixed(2) + ' ' + f.toFixed(2) + ')">' +
      '<rect x="8" y="40" width="44" height="32" rx="2" fill="#071233"/><polyline id="stHmi" points="" fill="none" stroke="#3CF08C" stroke-width="1.3"/>' +
      '<text x="10" y="47" font-size="5" fill="#9FB0DE" font-family="Space Grotesk">PT bar</text>' +
      '<circle id="stLedRun" cx="12" cy="84" r="3" fill="#22C55E"/><circle id="stLedPh" cx="21" cy="84" r="3" fill="#22C55E"/><circle cx="46" cy="84" r="4.5" fill="#E53935"/>' +
      '<text x="8" y="18" font-size="6" fill="#4A5570" font-family="Space Grotesk">MCC · PLC FX5U</text><text x="8" y="28" font-size="5" fill="#6A7590" font-family="Space Grotesk">HMI 10″ · UPS</text></g>');
    var an = P(418, 20, 112), an2 = P(418, 20, 142);
    o.push('<line x1="' + an[0].toFixed(1) + '" y1="' + an[1].toFixed(1) + '" x2="' + an2[0].toFixed(1) + '" y2="' + an2[1].toFixed(1) + '" stroke="#9FB0DE" stroke-width="2.4"/>');
    for (var k = 0; k < 3; k++) o.push('<circle class="st-ripple" cx="' + an2[0].toFixed(1) + '" cy="' + an2[1].toFixed(1) + '" r="16" fill="none" stroke="#4DA3FF" stroke-width="1.8" style="animation-delay:-' + (k * 0.8) + 's;transform-origin:' + an2[0].toFixed(1) + 'px ' + an2[1].toFixed(1) + 'px"/>');
    ANCH.mcc = P(400, 21, 116);
    // suction header 14"
    o.push(pipe([[100, 70, 30], [150, 70, 30], [150, 210, 30]], 15, 'suction'));
    o.push(pipe([[150, 210, 30], [150, 255, 30]], 11, null, true));
    ANCH.future = P(150, 255, 34);
    // pumps
    [[1, 95], [2, 175]].forEach(function (pp) {
      var id = pp[0], py = pp[1];
      o.push(pipe([[150, py + 12, 30], [196, py + 12, 30]], 10, 'p' + id));
      var sel = P(240, py + 13, 12);
      o.push('<ellipse class="st-sel" data-sel="' + id + '" cx="' + sel[0].toFixed(1) + '" cy="' + sel[1].toFixed(1) + '" rx="78" ry="42" fill="none" style="stroke:var(--blue)" stroke-width="2.5" stroke-dasharray="6 5" opacity="0"/>');
      o.push('<g class="st-pump" data-pump="' + id + '" tabindex="0" role="button" aria-label="P-0' + id + '">');
      o.push(box(190, py, 12, 100, 26, 6, 'pipe'));
      o.push(cyl(210, py + 13, 18, 14, 26, 'casing'));
      o.push(box(232, py + 3, 18, 52, 20, 22, 'pump'));
      o.push('<g class="st-fault-tint" data-tint="' + id + '" opacity="0">' + box(232, py + 3, 18, 52, 20, 22, 'pump').replace(/style="fill:var\(--st-pump\)"/g, 'fill="#FF3B3B"') + '</g>');
      var fan = P(284, py + 13, 29);
      o.push('<g class="st-fan" data-fan="' + id + '" style="transform-origin:' + fan[0].toFixed(1) + 'px ' + fan[1].toFixed(1) + 'px"><ellipse cx="' + fan[0].toFixed(1) + '" cy="' + fan[1].toFixed(1) + '" rx="7" ry="9" fill="none" stroke="#E6EEFF" stroke-width="2" stroke-dasharray="4 3"/><line x1="' + fan[0].toFixed(1) + '" y1="' + (fan[1] - 8).toFixed(1) + '" x2="' + fan[0].toFixed(1) + '" y2="' + (fan[1] + 8).toFixed(1) + '" stroke="#E6EEFF" stroke-width="1.6"/></g>');
      var lt = P(258, py + 13, 41);
      o.push('<g data-light="' + id + '" style="color:#3CF08C"><circle class="st-glow" cx="' + lt[0].toFixed(1) + '" cy="' + lt[1].toFixed(1) + '" r="13" fill="url(#stGlow)"/><circle cx="' + lt[0].toFixed(1) + '" cy="' + lt[1].toFixed(1) + '" r="3" fill="currentColor"/></g>');
      o.push('</g>');
      o.push(pipe([[210, py + 13, 44], [210, py - 8, 44], [330, py - 8, 44]], 10, 'p' + id));
      var pt = P(300, py - 8, 44), pt2 = P(300, py - 8, 66);
      o.push('<line x1="' + pt[0].toFixed(1) + '" y1="' + pt[1].toFixed(1) + '" x2="' + pt2[0].toFixed(1) + '" y2="' + pt2[1].toFixed(1) + '" stroke="#9FB0DE" stroke-width="2"/><circle cx="' + pt2[0].toFixed(1) + '" cy="' + pt2[1].toFixed(1) + '" r="7" fill="#0F1D45" stroke="#22C3EE" stroke-width="2"/>');
      ANCH['p' + id] = P(258, py + 13, 44); ANCH['pt' + id] = P(300, py - 8, 70);
    });
    o.push(pipe([[330, 87, 44], [330, 167, 44]], 13, 'header'));
    o.push(pipe([[330, 130, 44], [440, 130, 44]], 13, 'header'));
    o.push(cyl(385, 130, 34, 12, 20, 'tank'));
    var fm = P(385, 130, 56); o.push('<text x="' + fm[0].toFixed(1) + '" y="' + (fm[1] - 8).toFixed(1) + '" text-anchor="middle" font-size="10" fill="#7FE3FF" font-family="Space Grotesk">FT-01</text>');
    ANCH.fm = P(385, 130, 60); ANCH.out = P(440, 130, 50);
    return '<svg class="st-svg" viewBox="' + VB.x + ' ' + VB.y + ' ' + VB.w + ' ' + VB.h + '" role="img" aria-label="สถานีสูบจ่ายน้ำ 3 มิติ แสดงสถานะปั๊มแบบเรียลไทม์">' + o.join('') + '</svg>';
  }

  function chip(key, html, dx, dy, cls) {
    var p = pct(ANCH[key]);
    return '<div class="st-chip ' + (cls || '') + '" data-chip="' + key + '" style="left:' + p[0] + '%;top:' + p[1] + '%;--dx:' + (dx || 0) + 'px;--dy:' + (dy || -12) + 'px">' + html + '</div>';
  }

  function pumpCtl(id) {
    var can = A.can('command');
    return '<div class="card flat st-pcard" data-pc="' + id + '"><div class="row" style="justify-content:space-between"><b class="k-num" style="font-size:17px">P-0' + id + '</b><span><span data-st="' + id + '" class="pill">–</span> <span data-role-pill="' + id + '" class="pill">–</span></span></div>' +
      '<div class="grid g3 keep3" style="gap:8px;margin:10px 0"><div><div class="muted" style="font-size:12px">ความถี่</div><b class="k-num"><span data-v="p' + id + '.freq"></span> Hz</b></div><div><div class="muted" style="font-size:12px">กระแส</div><b class="k-num"><span data-v="p' + id + '.current"></span> A</b></div><div><div class="muted" style="font-size:12px">กำลัง</div><b class="k-num"><span data-v="p' + id + '.power"></span> kW</b></div></div>' +
      '<div class="bar" style="margin-bottom:12px"><i data-barw="p' + id + '.freq" data-max="50"></i></div>' +
      '<div class="row"><button class="btn success sm st-on" data-on="' + id + '"' + (can ? '' : ' disabled') + '>ON</button><button class="btn danger sm st-off" data-off="' + id + '"' + (can ? '' : ' disabled') + '>OFF</button><button class="btn sm" data-rst="' + id + '"' + (can ? '' : ' disabled') + '>Reset</button></div></div>';
  }

  var cam = { rx: 8, ry: -6, z: 1, auto: true };
  function applyCam(v) { var c = $('.st-cam', v); if (c) c.style.transform = 'rotateX(' + cam.rx + 'deg) rotateY(' + cam.ry + 'deg) scale(' + cam.z + ')'; }

  A.PAGES.station = {
    sel: null,
    render: function (v) {
      var self = this, canMode = A.can('setpoint');
      v.innerHTML = '<div class="st-layout">' +
        '<div class="card st-stagecard"><div class="card-h"><h3>สถานี 3 มิติ <span class="muted" style="font-weight:400">· เรียลไทม์</span></h3>' +
        '<div class="row st-tools">' +
        '<div class="tabs" role="group" aria-label="โหมดการทำงาน"><button data-mode="AUTO"' + (canMode ? '' : ' disabled') + '>AUTO</button><button data-mode="MANUAL"' + (canMode ? '' : ' disabled') + '>MANUAL</button></div>' +
        '<button class="icon-btn" data-cam="left" aria-label="หมุนซ้าย"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>' +
        '<button class="icon-btn" data-cam="right" aria-label="หมุนขวา"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>' +
        '<button class="icon-btn" data-cam="in" aria-label="ซูมเข้า"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4M11 8v6M8 11h6"/></svg></button>' +
        '<button class="icon-btn" data-cam="out" aria-label="ซูมออก"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4M8 11h6"/></svg></button>' +
        '<button class="icon-btn" data-cam="reset" aria-label="รีเซ็ตมุมมอง"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>' +
        '<button class="icon-btn" data-cam="labels" aria-label="แสดง/ซ่อนป้ายค่า"><svg viewBox="0 0 24 24"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/></svg></button>' +
        '<a class="btn sm" href="#/settings">🎨 สีสถานี</a></div></div>' +
        '<div class="st-stage" id="stStage"><div class="st-cam"><div class="st-scene" id="stScene">' + scene() +
        chip('tank', '<b>ถังเก็บน้ำใส</b><small>Storage Water Tank</small>', 0, -10) +
        chip('pt1', '<b><span data-v="p1.pt"></span> bar</b><small>PT-01 · SP <span data-v="sp"></span></small>', 54, -6, 'hot') +
        chip('pt2', '<b><span data-v="p2.pt"></span> bar</b><small>PT-02</small>', 58, 30) +
        chip('p1', '<b>P-01 <i class="st-tag" data-tag="1">RUN</i></b><small><span data-v="p1.freq"></span> Hz · <span data-v="p1.current"></span> A</small>', -80, -38, 'pchip') +
        chip('p2', '<b>P-02 <i class="st-tag" data-tag="2">READY</i></b><small><span data-v="p2.freq"></span> Hz · <span data-v="p2.current"></span> A</small>', -128, -8, 'pchip') +
        chip('fm', '<b><span data-v="flow"></span> m³/h</b><small>FT-01 · Σ <span data-v="flowTotal"></span> m³</small>', 52, 14) +
        chip('mcc', '<b><span data-v="kw"></span> kW</b><small>MCC · Phase <span data-v="phase"></span></small>', -40, -66) +
        chip('future', '<small>สามทาง 14″ → ถังพักน้ำใส เฟส 2 (อนาคต)</small>', -60, 26, 'dim') +
        '</div></div>' +
        '<div class="st-pop" id="stPop" hidden></div>' +
        '<div class="st-hint muted">ลากเพื่อหมุนมุมมอง · คลิกที่ปั๊มเพื่อสั่ง ON/OFF</div></div></div>' +
        '<div class="stack st-side">' +
        '<div class="card"><div class="card-h"><h3>ค่าเรียลไทม์</h3><span class="pill info" data-v="mode"></span></div><div class="grid g2 keep2" style="gap:10px">' +
        tile('แรงดันจ่าย', 'pressure', 'bar', '#5B8CFF') + tile('อัตราการไหล', 'flow', 'm³/h', '#22C3EE') + tile('กำลังไฟฟ้า', 'kw', 'kW', '#F5A524') + tile('ปั๊มทำงาน', 'running', '', '#22C55E') +
        '</div><div class="kv" style="margin-top:10px"><div>ปั๊มหลัก (Lead)</div><div data-v="lead"></div><div>สลับปั๊มในอีก</div><div data-v="altLeft"></div><div>อัปเดตล่าสุด</div><div data-v="ago"></div></div></div>' +
        '<div class="card"><div class="card-h"><h3>ควบคุม ON / OFF</h3>' + (A.can('command') ? '' : '<span class="muted">🔒 ดูอย่างเดียว</span>') + '</div><div class="stack" style="gap:10px">' + pumpCtl(1) + pumpCtl(2) + '</div>' +
        '<p class="muted st-note" style="font-size:12.5px;margin:10px 0 0"></p></div>' +
        '</div></div>';
      applyStationVars($('#stScene', v));
      this.bind(v); applyCam(v); this.tick(v);
    },
    bind: function (v) {
      var self = this, stage = $('#stStage', v);
      $$('[data-mode]', v).forEach(function (b) { b.onclick = function () { var m = b.getAttribute('data-mode'); if (m === S.cfg.mode) return; SIM.setConfig({ mode: m }); A.audit('แก้ไขค่า', 'โหมด: ' + m); A.toast('เปลี่ยนโหมดแล้ว', m === 'AUTO' ? 'PLC ควบคุมอัตโนมัติ (PID + สลับปั๊ม)' : 'ควบคุม ON/OFF ด้วยตนเอง', 'ok'); self.tick(v); }; });
      $$('[data-cam]', v).forEach(function (b) {
        b.onclick = function () {
          var c = b.getAttribute('data-cam'); cam.auto = false;
          if (c === 'left') cam.ry = Math.max(-28, cam.ry - 7); if (c === 'right') cam.ry = Math.min(28, cam.ry + 7);
          if (c === 'in') cam.z = Math.min(1.6, +(cam.z + 0.15).toFixed(2)); if (c === 'out') cam.z = Math.max(0.7, +(cam.z - 0.15).toFixed(2));
          if (c === 'reset') { cam.rx = 8; cam.ry = -6; cam.z = 1; cam.auto = true; }
          if (c === 'labels') stage.classList.toggle('nolabels');
          applyCam(v);
        };
      });
      var drag = null;
      stage.addEventListener('pointerdown', function (e) { if (e.target.closest('.st-pump,.st-pop,button,a')) return; drag = { x: e.clientX, y: e.clientY, rx: cam.rx, ry: cam.ry }; cam.auto = false; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging'); });
      stage.addEventListener('pointermove', function (e) { if (!drag) return; cam.ry = Math.max(-28, Math.min(28, drag.ry + (e.clientX - drag.x) / 8)); cam.rx = Math.max(0, Math.min(24, drag.rx - (e.clientY - drag.y) / 10)); applyCam(v); });
      var end = function () { drag = null; stage.classList.remove('dragging'); };
      stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
      stage.addEventListener('wheel', function (e) { if (!e.ctrlKey) return; e.preventDefault(); cam.z = Math.max(0.7, Math.min(1.6, cam.z - e.deltaY / 600)); applyCam(v); }, { passive: false });
      $$('.st-pump', v).forEach(function (g) {
        var open = function () { self.sel = +g.getAttribute('data-pump'); self.pop(v); };
        g.addEventListener('click', open); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      });
      $('.st-layout', v).addEventListener('click', function (e) {
        var on = e.target.closest('[data-on]'), off = e.target.closest('[data-off]'), rs = e.target.closest('[data-rst]'), cl = e.target.closest('[data-popclose]');
        if (cl) { self.sel = null; $('#stPop', v).hidden = true; return; }
        if (on) self.cmd(v, +on.getAttribute('data-on'), 'on');
        if (off) self.cmd(v, +off.getAttribute('data-off'), 'off');
        if (rs) self.cmd(v, +rs.getAttribute('data-rst'), 'reset');
      });
    },
    cmd: function (v, id, c) {
      var self = this, p = S.pumps[id - 1];
      var label = c === 'on' ? 'ON (Start DI01)' : c === 'off' ? 'OFF (Stop DI01)' : 'Reset Fault (DI02)';
      var note = c === 'off' && S.cfg.mode === 'AUTO' ? '<br><br><b>โหมด AUTO:</b> PLC จะสั่งปั๊มหลักกลับมาทำงานเพื่อรักษาแรงดัน เปลี่ยนเป็น MANUAL หากต้องการปิดค้างไว้' : '';
      A.confirmBox('ยืนยันสั่ง ' + label + ' · P-0' + id, 'คำสั่งจะส่งไปยัง PLC FX5U → INV-0' + id + ' และบันทึกใน Log การทำงานของผู้ใช้' + note, label, c === 'off').then(function (ok) {
        if (!ok) return;
        var r = c === 'on' ? SIM.cmdStart(id) : c === 'off' ? SIM.cmdStop(id) : SIM.cmdReset(id);
        A.audit('สั่งงาน', 'P-0' + id + ' ' + label + ' (สถานี 3D)' + (r ? '' : ' (ไม่สำเร็จ)'));
        A.toast(r ? 'ส่งคำสั่งสำเร็จ' : 'ไม่สามารถสั่งงานได้', 'P-0' + id + ' ' + label + (r ? '' : (p.fault ? ' · ต้อง Reset Fault ก่อน' : '')), r ? 'ok' : 'warning');
        self.tick(v);
      });
    },
    pop: function (v) {
      var el = $('#stPop', v), id = this.sel; if (!id) { el.hidden = true; return; }
      var p = S.pumps[id - 1], st = A.statusOf(p), an = pct(ANCH['p' + id]);
      el.hidden = false;
      el.innerHTML = '<div class="row" style="justify-content:space-between;margin-bottom:6px"><b class="k-num">P-0' + id + ' · INV-0' + id + '</b><button class="icon-btn" style="width:30px;height:30px" data-popclose aria-label="ปิด"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
        '<div class="row" style="gap:6px;margin-bottom:8px"><span class="pill ' + st.cls + '">' + st.t + '</span><span class="pill ' + (S.lead === id ? 'lead' : 'info') + '">' + (S.lead === id ? 'LEAD' : 'LAG') + '</span><span class="pill info">' + S.cfg.mode + '</span></div>' +
        '<div class="kv" style="font-size:13px"><div>ความถี่</div><div>' + fmt(p.freq, 1) + ' Hz</div><div>รอบมอเตอร์</div><div>' + fmt(p.speed, 0) + ' rpm</div><div>กระแส</div><div>' + fmt(p.current, 1) + ' A</div><div>กำลัง</div><div>' + fmt(p.power, 1) + ' kW</div><div>แรงดัน PT-0' + id + '</div><div>' + fmt(p.pressure, 2) + ' bar</div><div>Fault</div><div>' + (p.fault ? p.fault : '–') + '</div></div>' +
        '<div class="row" style="margin-top:10px"><button class="btn success sm" data-on="' + id + '"' + (A.can('command') ? '' : ' disabled') + '>ON</button><button class="btn danger sm" data-off="' + id + '"' + (A.can('command') ? '' : ' disabled') + '>OFF</button>' + (p.fault ? '<button class="btn sm" data-rst="' + id + '"' + (A.can('command') ? '' : ' disabled') + '>Reset</button>' : '') + '</div>';
      $$('[data-sel]', v).forEach(function (s) { s.setAttribute('opacity', +s.getAttribute('data-sel') === id ? '1' : '0'); });
    },
    tick: function (v) {
      var root = $('#stScene', v); if (!root) return;
      var dur = Math.max(0.35, Math.min(3, 140 / Math.max(10, S.flow))) + 's', any = false;
      S.pumps.forEach(function (p) {
        var run = p.run && p.freq > 1; any = any || run;
        $$('[data-flow="p' + p.id + '"]', root).forEach(function (e) { e.classList.toggle('on', run); e.style.animationDuration = dur; });
        var fan = $('[data-fan="' + p.id + '"]', root); fan.style.animationDuration = (0.5 * 50 / Math.max(10, p.freq)).toFixed(2) + 's'; fan.style.animationPlayState = run ? 'running' : 'paused';
        var lt = $('[data-light="' + p.id + '"]', root); lt.style.color = p.fault ? '#FF4D4D' : run ? '#3CF08C' : '#94A3B8'; lt.classList.toggle('blinking', !!p.fault); lt.classList.toggle('glow', run);
        $('[data-tint="' + p.id + '"]', root).setAttribute('opacity', p.fault ? '.55' : '0');
        var tag = $('[data-tag="' + p.id + '"]', root), st = A.statusOf(p); tag.textContent = st.t; tag.className = 'st-tag ' + st.cls;
        $$('[data-pc="' + p.id + '"]', v).forEach(function (c) { c.classList.toggle('is-run', run); c.classList.toggle('is-fault', !!p.fault); });
      });
      $$('[data-flow="suction"],[data-flow="header"]', root).forEach(function (e) { e.classList.toggle('on', any); e.style.animationDuration = dur; });
      var hmi = $('#stHmi', root), tr = S.trend.slice(-40);
      if (hmi && tr.length) hmi.setAttribute('points', tr.map(function (d, i) { return (10 + i * 40 / 39).toFixed(1) + ',' + (70 - Math.max(0, Math.min(1, d.p / 6)) * 24).toFixed(1); }).join(' '));
      var lr = $('#stLedRun', root); if (lr) lr.setAttribute('fill', any ? '#22C55E' : '#64748B');
      var lp = $('#stLedPh', root); if (lp) lp.setAttribute('fill', S.phaseOK ? '#22C55E' : '#EF4444');
      $$('[data-mode]', v).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === S.cfg.mode); b.setAttribute('aria-pressed', b.getAttribute('data-mode') === S.cfg.mode); });
      var n = $('.st-note', v); if (n) n.textContent = S.cfg.mode === 'AUTO' ? 'โหมด AUTO: PLC ควบคุมแรงดันด้วย PID และสั่งปั๊มตัวที่ 2 ตาม Interval — ปั๊มหลักที่ถูกปิดจะถูกสั่งกลับมาทำงาน' : 'โหมด MANUAL: ปั๊มทำงานตามคำสั่ง ON/OFF ของผู้ปฏิบัติงาน PID ยังปรับรอบให้แรงดันใกล้ Setpoint';
      if (cam.auto) { cam.ry = -6 + Math.sin(Date.now() / 4000) * 5; applyCam(v); }
      if (this.sel) this.pop(v);
    },
    resize: function () { }
  };

  function tile(lbl, key, unit, color) { return '<div class="card flat kpi" style="--accent:' + color + ';padding:12px 12px 10px"><div class="lbl">' + lbl + '</div><div class="val" style="font-size:24px"><span data-v="' + key + '"></span><small>' + unit + '</small></div></div>'; }

  window.STATION = { PRESETS: PRESETS, KEYS: KEYS, KEY_LABEL: KEY_LABEL, colors: stationColors, apply: applyStationVars };
})();
