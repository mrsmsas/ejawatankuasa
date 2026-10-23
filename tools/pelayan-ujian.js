// Pelayan ujian TEMPATAN: menjalankan kod .gs sebenar dengan tiruan Google (helaian dalam memori)
// dan menghidangkan antara muka sebenar, supaya keseluruhan sistem boleh diuji tanpa akaun Google.
// Guna: node tools/pelayan-ujian.js   → buka http://localhost:8765  (emel: admin@ujian.my / kata laluan: Ujian12345)
const http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const gas = path.join(__dirname, '..', 'gas');

class Julat {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr: nr || 1, nc: nc || 1 }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const b = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.d[this.r - 1 + i] || [])[this.c - 1 + j]; b.push(v === undefined ? '' : v); } o.push(b); } return o; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { const R = this.r - 1 + i; (this.sh.d[R] = this.sh.d[R] || [])[this.c - 1 + j] = x; })); return this; }
  setValue(x) { return this.setValues([[x]]); }
  setNumberFormat() { return this; } setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; }
}
class Helaian {
  constructor(n) { this.n = n; this.d = []; }
  getLastRow() { return this.d.length; } getMaxRows() { return this.d.length + 50; } setFrozenRows() {}
  getRange(r, c, nr, nc) { return new Julat(this, r, c, nr, nc); }
  deleteRow(r) { this.d.splice(r - 1, 1); }
}
const helaian = {};
const ss = { getSheetByName: n => helaian[n] || null, insertSheet: n => (helaian[n] = new Helaian(n)) };
const peta = new Map();
const kotak = {
  console, Logger: { log: console.log },
  SpreadsheetApp: { getActiveSpreadsheet: () => ss },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
  CacheService: { getScriptCache: () => ({ get: k => peta.get(k) || null, put: (k, v) => peta.set(k, v), remove: k => peta.delete(k) }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  Session: { getActiveUser: () => ({ getEmail: () => '' }), getEffectiveUser: () => ({ getEmail: () => 'admin@ujian.my' }) },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' }, getUuid: () => crypto.randomUUID(),
    computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()].map(b => (b > 127 ? b - 256 : b)),
    formatDate: (d, tz, f) => { const p = n => String(n).padStart(2, '0'); const x = new Date(d); const t = `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; return /HH/.test(f) ? `${t} ${p(x.getHours())}:${p(x.getMinutes())}` : t; }
  }
};
vm.createContext(kotak);
['Logik.gs', 'BenihData.gs', 'Code.gs', 'Setup.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(gas, f), 'utf8'), kotak, { filename: f }));
vm.runInContext('var __b = BENIH;', kotak);
console.log('Menyedia pangkalan data ujian…');
vm.runInContext('setupAwal()', kotak);
vm.runInContext("tetapKataLaluan('admin@ujian.my','Ujian12345'); tambah_('Pengguna',[{emel:'pelihat@ujian.my',nama:'Pelihat Ujian',peranan:'PELIHAT',aktif:true,garam:'g',hash:hash_('g','Ujian12345')},{emel:'pengurus@ujian.my',nama:'Pengurus Ujian',peranan:'PENGURUS',aktif:true,garam:'g',hash:hash_('g','Ujian12345')}]);", kotak);

function halaman() {
  const inc = n => fs.readFileSync(path.join(gas, n + '.html'), 'utf8');
  let t = inc('Index').replace(/<\?!= include\('(\w+)'\) \?>/g, (_, n) => inc(n));
  const shim = `<script>window.google={script:{get run(){let ok=()=>{},er=()=>{};const r={withSuccessHandler(f){ok=f;return r},withFailureHandler(f){er=f;return r},api(a){fetch('/api',{method:'POST',body:JSON.stringify(a)}).then(x=>x.json()).then(ok).catch(er);}};return r;}}};</script>`;
  return t.replace('</head>', shim + '</head>');
}
http.createServer((q, s) => {
  if (q.method === 'POST' && q.url === '/api') {
    let b = ''; q.on('data', c => b += c); q.on('end', () => {
      kotak.__req = JSON.parse(b);
      const r = vm.runInContext('JSON.stringify(api(__req))', kotak);
      s.setHeader('Content-Type', 'application/json'); s.end(r);
    });
  } else { s.setHeader('Content-Type', 'text/html; charset=utf-8'); s.end(halaman()); }
}).listen(8765, () => console.log('Sedia: http://localhost:8765'));
