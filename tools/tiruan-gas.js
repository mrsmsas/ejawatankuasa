// Tiruan API Google untuk ujian tempatan: menjalankan kod .gs sebenar dengan helaian dalam memori.
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const gas = path.join(__dirname, '..', 'gas');
const EMEL_PEMILIK = 'pemilik@ujian.my';

class Julat {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr: nr || 1, nc: nc || 1 }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const b = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.d[this.r - 1 + i] || [])[this.c - 1 + j]; b.push(v === undefined ? '' : v); } o.push(b); } return o; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { const R = this.r - 1 + i; if (x !== '' && String(x).length > 50000) throw new Error('Sel melebihi 50,000 aksara'); (this.sh.d[R] = this.sh.d[R] || [])[this.c - 1 + j] = x; })); return this; }
  setValue(x) { return this.setValues([[x]]); }
}
['setNumberFormat', 'setFontWeight', 'setBackground', 'setFontColor', 'setFontSize', 'setWrap'].forEach(m => { Julat.prototype[m] = function () { return this; }; });

class Helaian {
  constructor(n) { this.n = n; this.d = []; }
  getName() { return this.n; }
  getLastRow() { return this.d.length; } getMaxRows() { return this.d.length + 50; } setFrozenRows() {} setColumnWidth() {} clear() { this.d = []; return this; }
  getRange(r, c, nr, nc) { return new Julat(this, r, c, nr, nc); }
  deleteRow(r) { this.d.splice(r - 1, 1); }
}

// muatBenih: true = pemasangan MRSM SAS (BenihData + SekolahIni); false = sama seperti templat sekolah lain.
function buatPersekitaran({ muatBenih }) {
  const helaian = {}, urutan = [];
  const ss = {
    nama: 'Templat',
    getSheetByName: n => helaian[n] || null,
    insertSheet: n => { helaian[n] = new Helaian(n); urutan.push(n); return helaian[n]; },
    getSheets: () => urutan.map(n => helaian[n]), deleteSheet: sh => { delete helaian[sh.n]; urutan.splice(urutan.indexOf(sh.n), 1); },
    rename(n) { this.nama = n; }, setActiveSheet() {}
  };
  const peta = new Map();
  const kotak = {
    console: { log: console.log, error: console.error }, Logger: { log() {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => peta.get(k) || null, put: (k, v) => peta.set(k, v), remove: k => peta.delete(k) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ScriptApp: { getScriptId: () => 'ID_SKRIP_UJIAN', getService: () => ({ getUrl: () => kotak.__urlWeb }) },
    Session: { getActiveUser: () => ({ getEmail: () => kotak.__aktif }), getEffectiveUser: () => ({ getEmail: () => EMEL_PEMILIK }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, getUuid: () => crypto.randomUUID(),
      computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()].map(b => (b > 127 ? b - 256 : b)),
      formatDate: (d, tz, f) => { const p = n => String(n).padStart(2, '0'); const x = new Date(d); const t = `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; return /HH/.test(f) ? `${t} ${p(x.getHours())}:${p(x.getMinutes())}` : t; }
    },
    __aktif: '', __urlWeb: ''   // __aktif kosong = pelawat tanpa log masuk Google
  };
  vm.createContext(kotak);
  const fail = fs.readdirSync(gas).filter(f => f.endsWith('.gs')).filter(f => muatBenih || !['BenihData.gs', 'SekolahIni.gs'].includes(f));
  fail.forEach(f => vm.runInContext(fs.readFileSync(path.join(gas, f), 'utf8').replace(/^﻿/, ''), kotak, { filename: f }));
  const jalan = kod => vm.runInContext(kod, kotak);
  // Panggil fungsi global seperti google.script.run; sebagai pelawat tanpa log masuk kecuali emel diberi.
  const rpc = (fn, args, emel) => {
    kotak.__aktif = emel || ''; kotak.__arg = JSON.stringify(args || []);
    try { const r = jalan(`(function(){var r=${fn}.apply(null,JSON.parse(__arg));return JSON.stringify(r===undefined?null:r);})()`); return JSON.parse(r); } finally { kotak.__aktif = ''; }
  };
  const api = (fn, args, token) => rpc('api', [{ fn, args: args || {}, token }]);
  return { kotak, helaian, ss, jalan, rpc, api, EMEL_PEMILIK };
}

function halamanUtama(shim) {
  const inc = n => fs.readFileSync(path.join(gas, n + '.html'), 'utf8');
  const t = inc('Index').replace(/<\?!= include\('(\w+)'\) \?>/g, (_, n) => inc(n));
  return t.replace('</head>', shim + '</head>');
}
function halamanPemasang(shim) { return fs.readFileSync(path.join(gas, 'Pemasang.html'), 'utf8').replace('</head>', shim + '</head>'); }

module.exports = { buatPersekitaran, halamanUtama, halamanPemasang, EMEL_PEMILIK };
