/* CoreDash PumpStation — live data source (Edge Gateway REST API)
 * Used when the mode bar is set to "ทำงานจริง". Polls GET /api/v1/latest every 2 s and maps the
 * values into the same state the screens read. Commands go to POST /api/v1/control.
 */
(function (g) {
  'use strict';
  var S = SIM.state;
  function ls(k, d) { try { var v = localStorage.getItem('cdps.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem('cdps.' + k, JSON.stringify(v)); } catch (e) { } }
  var cfg = ls('liveCfg', { url: '', key: '' }), connected = false, lastErr = '', busy = false, lastOk = 0;
  var PTS = ['system.pressure', 'FT-01.flow', 'FT-01.total', 'PM-01.kw', 'PM-01.kwh', 'PM-01.v_l1', 'PM-01.v_l2', 'PM-01.v_l3', 'PM-01.a_l1', 'PM-01.a_l2', 'PM-01.a_l3', 'PM-01.hz', 'MCC.phase'];
  [1, 2].forEach(function (i) { ['freq', 'speed', 'current', 'torque', 'power', 'dcbus', 'vout', 'energy', 'saved_kwh', 'inv_hours', 'motor_hours', 'fan_hours', 'pid_fb', 'pid_out', 'run', 'ready', 'fault'].forEach(function (k) { PTS.push('P-0' + i + '.' + k); }); });
  function base() { return (cfg.url || '').replace(/\/+$/, ''); }
  function apply(list) {
    var m = {}; list.forEach(function (d) { m[d.point] = d.value; });
    function n(k, d) { return typeof m[k] === 'number' ? m[k] : d; }
    S.pressure = n('system.pressure', S.pressure); S.flow = n('FT-01.flow', S.flow); S.flowTotal = n('FT-01.total', S.flowTotal);
    S.pm.kw = n('PM-01.kw', S.pm.kw); S.kwhTotal = n('PM-01.kwh', S.kwhTotal);
    S.pm.v = [n('PM-01.v_l1', 0), n('PM-01.v_l2', 0), n('PM-01.v_l3', 0)]; S.pm.a = [n('PM-01.a_l1', 0), n('PM-01.a_l2', 0), n('PM-01.a_l3', 0)]; S.pm.hz = [n('PM-01.hz', 50), n('PM-01.hz', 50), n('PM-01.hz', 50)];
    if ('MCC.phase' in m) S.phaseOK = !!m['MCC.phase'];
    S.pumps.forEach(function (p) {
      var P = 'P-0' + p.id + '.';
      p.freq = n(P + 'freq', 0); p.speed = n(P + 'speed', 0); p.current = n(P + 'current', 0); p.torque = n(P + 'torque', 0); p.power = n(P + 'power', 0); p.dcbus = n(P + 'dcbus', 0); p.vout = n(P + 'vout', 0);
      p.energy = n(P + 'energy', p.energy); p.savedKwh = n(P + 'saved_kwh', p.savedKwh); p.invHours = n(P + 'inv_hours', p.invHours); p.motorHours = n(P + 'motor_hours', p.motorHours); p.fanHours = n(P + 'fan_hours', p.fanHours);
      p.pressure = n(P + 'pid_fb', S.pressure); p.pidOut = n(P + 'pid_out', 0); p.run = !!m[P + 'run']; p.ready = !!m[P + 'ready']; p.fault = m[P + 'fault'] || null;
    });
    S.trend.push({ t: Date.now(), p: S.pressure, q: S.flow, kw: S.pm.kw, sp: S.cfg.sp, f1: S.pumps[0].freq, f2: S.pumps[1].freq }); if (S.trend.length > 3600) S.trend.shift();
  }
  function poll() {
    if (S.src !== 'live') return;
    if (!base()) { connected = false; lastErr = 'not-configured'; SIM._emit('tick', S); return; }
    if (busy) return; busy = true;
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
    fetch(base() + '/api/v1/latest?points=' + encodeURIComponent(PTS.join(',')), { headers: { 'X-API-Key': cfg.key }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { apply(j.data || []); connected = true; lastErr = ''; lastOk = Date.now(); S.lastUpdate = lastOk; })
      .catch(function (e) { connected = false; lastErr = String(e && e.message || e); })
      .then(function () { clearTimeout(to); busy = false; SIM._emit('tick', S); });
  }
  setInterval(poll, 2000);
  g.LIVE = {
    connected: function () { return connected; },
    error: function () { return lastErr; },
    cfg: function () { return { url: cfg.url, key: cfg.key }; },
    setCfg: function (c) { cfg = { url: (c.url || '').trim(), key: (c.key || '').trim() }; lsSet('liveCfg', cfg); connected = false; poll(); },
    test: function (c) {
      var u = (c.url || '').replace(/\/+$/, '');
      return fetch(u + '/api/v1/meta/last-update', { headers: { 'X-API-Key': c.key } }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    },
    send: function (cmd, args) {
      if (!connected) return false;
      fetch(base() + '/api/v1/control', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': cfg.key }, body: JSON.stringify({ command: cmd, args: args }) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
        .catch(function (e) { if (g.APP) g.APP.toast('ส่งคำสั่งไม่สำเร็จ', String(e.message || e), 'warning'); });
      return true;
    },
    poll: poll
  };
})(window);
