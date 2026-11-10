// Membina demo/eJawatankuasa-Demo.html: satu fail HTML yang menjalankan kod sebenar (gas/*.gs + antara muka)
// terus dalam pelayar, dengan data rekaan. Tiada sambungan ke Google Sheet atau API sebenar.
// Peta nama sebenar -> nama rekaan TIDAK disimpan di mana-mana. Binaan GAGAL jika data sebenar ditemui dalam fail.
// Guna: node tools/bina-demo.js
const fs = require('fs'), path = require('path');
const akar = path.join(__dirname, '..'), gas = path.join(akar, 'gas');
const keluar = path.join(akar, 'demo', 'eJawatankuasa-Demo.html');
const asal = JSON.parse(fs.readFileSync(path.join(akar, 'data', 'benih.json'), 'utf8'));

// ---------- Data rekaan ----------
function kocok(a) { // Kocok rawak baharu pada setiap binaan, supaya susunan tidak boleh dikaitkan dengan senarai asal.
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = require('crypto').randomInt(i + 1); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
const huruf = i => (i < 26 ? '' : String.fromCharCode(64 + Math.floor(i / 26))) + String.fromCharCode(65 + i % 26);
const orang = s => !/^[JR]\d+$/.test(String(s.staffId));

const kumpulan = [
  { pilih: s => s.kategori === 'GURU', gelaran: 'CIKGU', awalan: 'G', emel: 'cikgu' },
  { pilih: s => s.kategori === 'SOKONGAN', gelaran: 'STAF', awalan: 'S', emel: 'staf' },
  { pilih: s => s.kategori === 'EXOFFICIO', gelaran: 'PENGURUSAN', awalan: 'P', emel: 'pengurusan' }
];
const petaId = {}, stafBaru = [];
kumpulan.forEach(k => {
  kocok(asal.staf.filter(s => orang(s) && k.pilih(s))).forEach((s, i) => {
    const id = k.awalan + String(i + 1).padStart(3, '0'), hf = huruf(i);
    petaId[s.staffId] = id;
    stafBaru.push({ ...s, staffId: id, nama: k.gelaran + ' ' + hf, emel: k.emel + '.' + hf.toLowerCase() + '@demo.test', jawatan: bersihJawatan(s.jawatan, s.kategori), catatan: '' });
  });
});
function bersihJawatan(j, kat) { return j ? String(j) : (kat === 'GURU' ? 'GURU MARA' : 'STAF'); }
const peranan = asal.staf.filter(s => !orang(s)).map(s => {
  const m = String(s.catatan || '').match(/Pemegang:\s*(\d+)/);
  return { ...s, nama: String(s.nama).replace(/\bMARA\s+/, ''), jawatan: bersihJawatan(s.jawatan, s.kategori), emel: '', ...(s.pemegangId ? { pemegangId: petaId[s.pemegangId] || '' } : {}), catatan: m && petaId[m[1]] ? 'Pemegang: ' + petaId[m[1]] : (s.catatan && /Pemegang tempat/.test(s.catatan) ? 'Pemegang tempat' : '') };
});
const NAMA_JK = [ // Nama yang menunjukkan identiti maktab sebenar; nama jawatankuasa lain lazim di MRSM dan dikekalkan.
  [/SURAU SHEIKH MUHAMMAD IDRIS AL-MARBAWI [(]SMIM[)]/, 'SURAU MAKTAB'], [/ KALI KE-10/, ''], [/ *2025/g, ''], [/ *2026/g, '']
];
const benih = {
  tahun: asal.tahun,
  staf: stafBaru.concat(peranan),
  jawatankuasa: asal.jawatankuasa.map(j => ({ ...j, nama: NAMA_JK.reduce((t, [r, g]) => t.replace(r, g), j.nama) })),
  posisi: asal.posisi,
  tugasan: asal.tugasan.map(t => { if (!orang({ staffId: t.staffId })) return t; const id = petaId[t.staffId]; if (!id) throw new Error('Tugasan merujuk staf tidak dikenali.'); return { ...t, staffId: id }; })
};
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(akar, 'logo-mrsm-sas.png')).toString('base64'); // Logo umum MRSM, tiada nama maktab.
const SEKOLAH = { namaSekolah: 'MRSM CONTOH', namaRingkas: 'MRSM CONTOH', lokasi: 'Bandar Contoh', logo: LOGO, pengetuaNama: 'PENGETUA CONTOH', pengetuaJawatan: 'Pengetua', suratDaripada: 'Pengetua MRSM CONTOH', suratKepalaKiri: 'mara', suratKepalaKanan: 'memograf', suratCogan: 'MALAYSIA MADANI|BERKHIDMAT UNTUK NEGARA|LUAR BANDAR SEJAHTERA' };
const AKAUN = [
  { emel: 'admin@demo.test', nama: 'System Admin', peranan: 'PENTADBIR', label: 'System Admin', ket: 'Semua modul' },
  { emel: 'editor@demo.test', nama: 'Editor Demo', peranan: 'PENGURUS', label: 'Editor', ket: 'Urus jawatankuasa dan surat' },
  { emel: 'viewer@demo.test', nama: 'Viewer Demo', peranan: 'PELIHAT', label: 'Viewer', ket: 'Baca sahaja' }
];
const KATA = 'Demo12345';

// ---------- Takwim rekaan (modul Takwim Sekolah) ----------
// Sesi Januari–Disember (tahun kalendar). Tarikh cuti umum ialah anggaran untuk demo sahaja.
const CUTI_UMUM = {
  2026: [['2026-01-01', 'Tahun Baharu'], ['2026-02-01', 'Hari Thaipusam'], ['2026-02-17', 'Tahun Baru Cina'], ['2026-02-18', 'Tahun Baru Cina (Hari Kedua)'], ['2026-03-07', 'Nuzul Al-Quran'],
    ['2026-03-20', 'Hari Raya Aidilfitri'], ['2026-03-21', 'Hari Raya Aidilfitri (Hari Kedua)'], ['2026-05-01', 'Hari Pekerja'], ['2026-05-27', 'Hari Raya Aidiladha'],
    ['2026-05-31', 'Hari Wesak'], ['2026-06-01', 'Hari Keputeraan YDP Agong'], ['2026-06-16', 'Awal Muharram'], ['2026-08-25', 'Maulidur Rasul'], ['2026-08-31', 'Hari Kebangsaan'],
    ['2026-09-16', 'Hari Malaysia'], ['2026-11-08', 'Hari Deepavali'], ['2026-12-25', 'Hari Krismas']],
  2027: [['2027-01-01', 'Tahun Baharu'], ['2027-01-22', 'Hari Thaipusam'], ['2027-02-06', 'Tahun Baru Cina'], ['2027-02-07', 'Tahun Baru Cina (Hari Kedua)'], ['2027-02-24', 'Nuzul Al-Quran'], ['2027-03-10', 'Hari Raya Aidilfitri'],
    ['2027-03-11', 'Hari Raya Aidilfitri (Hari Kedua)'], ['2027-05-01', 'Hari Pekerja'], ['2027-05-17', 'Hari Raya Aidiladha'], ['2027-05-20', 'Hari Wesak'],
    ['2027-06-06', 'Awal Muharram'], ['2027-06-07', 'Hari Keputeraan YDP Agong'], ['2027-08-15', 'Maulidur Rasul'], ['2027-08-31', 'Hari Kebangsaan'], ['2027-09-16', 'Hari Malaysia'],
    ['2027-10-28', 'Hari Deepavali'], ['2027-12-25', 'Hari Krismas']]
};
function takwimContoh(y) {
  const p = n => String(n).padStart(2, '0'), iso = d => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const T = s => new Date(s + 'T00:00:00'), tambahHari = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dow = d => (d.getDay() + 6) % 7; // Isnin = 0
  const kePada = (d, hari, arah) => { let x = new Date(d); while (dow(x) !== hari) x = tambahHari(x, arah); return x; }; // hari minggu terdekat (arah +1/-1)
  const mulaSesi = new Date(y, 0, 1), akhirSesi = new Date(y, 11, 31), days = {};
  const rek = d => (days[iso(d)] = days[iso(d)] || {});
  const teks = (d, t) => { const r = rek(d); r.t = r.t ? r.t + ' / ' + t : t; };
  const julat = (a, b, c, t) => { for (let d = new Date(a), i = 0; d <= b; d = tambahHari(d, 1), i++) { const r = rek(d); if (c && !(r.c === 'ED7D31')) r.c = c; if (i === 0 && t) teks(d, t); } };
  const pendek = d => `${d.getDate()} ${['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sept', 'Okt', 'Nov', 'Dis'][d.getMonth()]}`;
  const tempoh = (a, b) => ` (${pendek(a)} - ${pendek(b)})`;

  const mula = tambahHari(kePada(mulaSesi, 0, 1), 7);                       // Isnin kedua Januari
  const cuti1 = kePada(new Date(y, 4, 30), 5, -1), cuti1Akhir = tambahHari(cuti1, 15);   // Cuti Semester 1 (16 hari)
  const cuti2 = kePada(new Date(y, 8, 12), 5, -1), cuti2Akhir = tambahHari(cuti2, 8);    // Cuti pertengahan Semester 2
  const cuti3 = kePada(new Date(y, 11, 19), 5, -1);                                      // Cuti akhir tahun hingga hujung sesi
  julat(mulaSesi, tambahHari(mula, -1), 'FFFF00', 'Cuti Akhir Tahun' + tempoh(mulaSesi, tambahHari(mula, -1)));
  julat(cuti1, cuti1Akhir, 'FFFF00', 'Cuti Semester 1' + tempoh(cuti1, cuti1Akhir));
  julat(cuti2, cuti2Akhir, 'FFFF00', 'Cuti Pertengahan Semester 2' + tempoh(cuti2, cuti2Akhir));
  julat(cuti3, akhirSesi, 'FFFF00', 'Cuti Semester 2' + tempoh(cuti3, akhirSesi));
  (CUTI_UMUM[y] || []).forEach(([t, n]) => { const d = T(t); if (d >= mulaSesi && d <= akhirSesi) { rek(d).c = 'ED7D31'; teks(d, n); } });
  // Cuti tambahan selepas Hari Raya Aidilfitri (2 hari persekolahan)
  const raya = (CUTI_UMUM[y] || []).filter(([, n]) => n === 'Hari Raya Aidilfitri (Hari Kedua)').map(([t]) => T(t))[0];
  if (raya) { let d = tambahHari(raya, 1), n = 0; while (n < 2) { if (dow(d) < 5 && rek(d).c !== 'ED7D31') { rek(d).c = '9DC3E6'; teks(d, 'Cuti Tambahan'); n++; } d = tambahHari(d, 1); } }

  const minggu = (d, n) => tambahHari(kePada(d, 0, 1), 7 * n);           // Isnin ke-n selepas tarikh
  const ujian = (isnin, hari, t) => julat(isnin, tambahHari(isnin, hari - 1), 'FF0000', t + tempoh(isnin, tambahHari(isnin, hari - 1)));
  ujian(minggu(mula, 9), 4, 'Ujian Setara 1');
  ujian(tambahHari(cuti1, -12), 12, 'Peperiksaan Semester 1');
  ujian(kePada(new Date(y, 7, 24), 0, -1), 4, 'Ujian Setara 2');
  ujian(tambahHari(cuti3, -19), 19, 'Peperiksaan Semester 2');
  const cutiUmum = d => (days[iso(d)] || {}).c === 'ED7D31';
  const aktiviti = (a, n, t) => {   // anjak seminggu jika bertembung dengan cuti umum
    for (let k = 0; k < 4 && Array.from({ length: n }, (_, i) => tambahHari(a, i)).some(cutiUmum); k++) a = tambahHari(a, 7);
    julat(a, tambahHari(a, n - 1), 'C5E0B4', n > 1 ? t + tempoh(a, tambahHari(a, n - 1)) : t);
  };
  aktiviti(tambahHari(minggu(mula, 3), 5), 1, 'Merentas Desa (SG1)');
  aktiviti(tambahHari(minggu(mula, 7), 3), 3, 'Kejohanan Olahraga Tahunan');
  aktiviti(tambahHari(minggu(cuti1Akhir, 4), 4), 3, 'Perkhemahan Perdana');
  aktiviti(tambahHari(minggu(cuti2Akhir, 1), 4), 3, 'Kem Kepimpinan Pelajar');
  const ma = minggu(new Date(y, 9, 1), 0);
  julat(ma, tambahHari(ma, 4), '7030A0', 'Minggu Aktiviti' + tempoh(ma, tambahHari(ma, 4)));

  teks(tambahHari(mula, -1), 'Pendaftaran Pelajar');
  teks(mula, 'Mula Persekolahan ' + y);
  teks(tambahHari(mula, 2), 'Minggu Orientasi' + tempoh(tambahHari(mula, 2), tambahHari(mula, 4)));
  teks(minggu(cuti1Akhir, 0), 'Hari Anugerah Semester ' + (y - 1));
  teks(minggu(cuti2Akhir, 0), 'Mula Semester 2');
  teks(T(y + '-05-16'), 'Sambutan Hari Guru');
  teks(kePada(new Date(y, 9, 31), 4, -1), 'Majlis Graduasi');
  teks(kePada(new Date(y, 11, 18), 4, -1), 'Majlis Restu Ilmu');
  for (let m = 1, n = 1; m <= 10; m++, n++) teks(kePada(new Date(y, m, 1), 2, 1), 'Mesyuarat Pelaksana ' + n);      // Rabu pertama
  for (let m = 1, n = 1; m <= 10; m += 3, n++) teks(kePada(new Date(y, m, 1), 3, 1), 'Mesyuarat Senat ' + n);       // Khamis pertama

  // Hari persekolahan, penanda minggu [α]/[β] dan Perhimpunan Rasmi
  let ab = 0, pr = 0;
  for (let d = new Date(mula); d < cuti3; d = tambahHari(d, 1)) {
    const r = rek(d), cuti = ['FFFF00', 'ED7D31', '9DC3E6'].includes(r.c);
    if (dow(d) < 5 && !cuti) r.s = 1;
    if (dow(d) === 0 && !(r.c === 'FFFF00')) { r.mk = ab++ % 2 ? 'β' : 'α'; if (ab % 4 === 1 && r.s) teks(d, 'PR ' + (++pr)); }
  }
  // Penggal tamat pada hujung sesi; buang rekod kosong
  Object.keys(days).forEach(k => { if (!Object.keys(days[k]).length) delete days[k]; });
  const months = []; for (let mm = 0; mm < 12; mm++) { months.push({ y: y, m: mm, label: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'][mm] }); }
  return {
    tahun: y, title: `TAKWIM MRSM CONTOH SESI ${y}`, months, notes: ['SG : Sekolah Ganti', 'PR : Perhimpunan Rasmi', 'Data rekaan untuk demo'],
    cats: [{ id: 'ED7D31', name: 'CUTI UMUM', color: '#ED7D31', legend: true }, { id: 'FFFF00', name: 'CUTI SEKOLAH', color: '#FFFF00', legend: true },
      { id: '9DC3E6', name: 'CUTI TAMBAHAN', color: '#9DC3E6', legend: true }, { id: 'FF0000', name: 'PEPERIKSAAN', color: '#FF0000', legend: true },
      { id: 'C5E0B4', name: 'AKTIVITI PELAJAR', color: '#C5E0B4', legend: true }, { id: '7030A0', name: 'MINGGU AKTIVITI', color: '#7030A0', legend: true }],
    days
  };
}
const TAKWIM = [benih.tahun - 1, benih.tahun].map(takwimContoh);

// ---------- Masa jalan dalam pelayar ----------
const selamat = s => s.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
const baca = f => fs.readFileSync(path.join(gas, f), 'utf8').replace(/^\uFEFF/, '');
const gs = ['Logik.gs', 'Code.gs', 'Setup.gs'].map(baca).join('\n');
const versi = require('crypto').createHash('sha256').update(gs + JSON.stringify(benih.jawatankuasa) + JSON.stringify(AKAUN) + JSON.stringify(SEKOLAH) + JSON.stringify(TAKWIM)).digest('hex').slice(0, 10);

const masaJalan = `<script>
/* eJawatankuasa DEMO: kod pelayan asal berjalan dalam pelayar dengan helaian tiruan. Data disimpan dalam pelayar ini sahaja. */
(function () {
  var KUNCI = 'ejk_demo_${versi}', BENIH_DEMO = ${JSON.stringify(benih)}, SEKOLAH_DEMO = ${JSON.stringify(SEKOLAH)}, AKAUN_DEMO = ${JSON.stringify(AKAUN.map(({ emel, nama, peranan }) => ({ emel, nama, peranan })))}, KATA_DEMO = ${JSON.stringify(KATA)}, TAKWIM_DEMO = ${JSON.stringify(TAKWIM)}, PEMILIK = 'admin@demo.test';
  function sha256(teks) {
    var m = Array.prototype.slice.call(new TextEncoder().encode(teks)), K = [], H = [], p = 2, n = 0, pc = function (x, e) { return ((Math.pow(x, e) % 1) * 4294967296) | 0; };
    while (n < 64) { var pr = true; for (var d = 2; d * d <= p; d++) if (p % d === 0) { pr = false; break; } if (pr) { if (n < 8) H[n] = pc(p, 1 / 2); K[n++] = pc(p, 1 / 3); } p++; }
    var pj = m.length * 8; m.push(0x80); while (m.length % 64 !== 56) m.push(0);
    for (var s = 56; s >= 0; s -= 8) m.push(s >= 32 ? 0 : (pj >>> s) & 0xff);
    var r = function (x, c) { return (x >>> c) | (x << (32 - c)); };
    for (var o = 0; o < m.length; o += 64) {
      var w = [], i; for (i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (i = 16; i < 64; i++) { var a0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), a1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + a0 + w[i - 7] + a1) | 0; }
      var v = H.slice();
      for (i = 0; i < 64; i++) {
        var t1 = (v[7] + (r(v[4], 6) ^ r(v[4], 11) ^ r(v[4], 25)) + ((v[4] & v[5]) ^ (~v[4] & v[6])) + K[i] + w[i]) | 0, t2 = ((r(v[0], 2) ^ r(v[0], 13) ^ r(v[0], 22)) + ((v[0] & v[1]) ^ (v[0] & v[2]) ^ (v[1] & v[2]))) | 0;
        v = [(t1 + t2) | 0, v[0], v[1], v[2], (v[3] + t1) | 0, v[4], v[5], v[6]];
      }
      H = H.map(function (x, j) { return (x + v[j]) | 0; });
    }
    var hasil = []; H.forEach(function (x) { for (var b = 24; b >= 0; b -= 8) { var y = (x >>> b) & 0xff; hasil.push(y > 127 ? y - 256 : y); } });
    return hasil;
  }
  function uuid() { var b = crypto.getRandomValues(new Uint8Array(16)), h = ''; for (var i = 0; i < 16; i++) { h += ('0' + b[i].toString(16)).slice(-2); if (i === 3 || i === 5 || i === 7 || i === 9) h += '-'; } return h; }

  var helaian = {}, urutan = [], sesi = {}, kotor = false, aktif = '', kesan = PEMILIK;
  function Julat(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr || 1; this.nc = nc || 1; }
  Julat.prototype.getValues = function () { var o = []; for (var i = 0; i < this.nr; i++) { var b = []; for (var j = 0; j < this.nc; j++) { var v = (this.sh.d[this.r - 1 + i] || [])[this.c - 1 + j]; b.push(v === undefined ? '' : v); } o.push(b); } return o; };
  Julat.prototype.getValue = function () { return this.getValues()[0][0]; };
  Julat.prototype.setValues = function (v) { var t = this; kotor = true; v.forEach(function (row, i) { row.forEach(function (x, j) { var R = t.r - 1 + i; (t.sh.d[R] = t.sh.d[R] || [])[t.c - 1 + j] = x; }); }); return this; };
  Julat.prototype.setValue = function (x) { return this.setValues([[x]]); };
  ['setNumberFormat', 'setFontWeight', 'setBackground', 'setFontColor', 'setFontSize', 'setWrap'].forEach(function (m) { Julat.prototype[m] = function () { return this; }; });
  function Helaian(n, d) { this.n = n; this.d = d || []; }
  Helaian.prototype = { getName: function () { return this.n; }, getLastRow: function () { return this.d.length; }, getMaxRows: function () { return this.d.length + 50; }, setFrozenRows: function () {}, setColumnWidth: function () {},
    clear: function () { this.d = []; kotor = true; return this; }, getRange: function (r, c, nr, nc) { return new Julat(this, r, c, nr, nc); }, deleteRow: function (r) { this.d.splice(r - 1, 1); kotor = true; } };
  var ss = { getSheetByName: function (n) { return helaian[n] || null; }, insertSheet: function (n) { helaian[n] = new Helaian(n); urutan.push(n); kotor = true; return helaian[n]; }, getSheets: function () { return urutan.map(function (n) { return helaian[n]; }); }, setActiveSheet: function () {} };
  var perkhidmatan = {
    SpreadsheetApp: { getActiveSpreadsheet: function () { return ss; }, openById: function () { return ss; } },
    PropertiesService: { getScriptProperties: function () { return { getProperty: function () { return null; }, setProperty: function () {} }; } },
    CacheService: { getScriptCache: function () { return {
      get: function (k) { var x = sesi[k]; if (!x || x.tamat < Date.now()) return null; return x.v; },
      put: function (k, v, s) { sesi[k] = { v: v, tamat: Date.now() + (s || 600) * 1000 }; kotor = true; }, remove: function (k) { delete sesi[k]; kotor = true; } }; } },
    LockService: { getScriptLock: function () { return { tryLock: function () { return true; }, releaseLock: function () {} }; } },
    Session: { getActiveUser: function () { return { getEmail: function () { return aktif; } }; }, getEffectiveUser: function () { return { getEmail: function () { return kesan; } }; } },
    Logger: { log: function () {} },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, getUuid: uuid, computeDigest: function (a, s) { return sha256(s); },
      formatDate: function (d, tz, f) { var p = function (n) { return ('0' + n).slice(-2); }, x = new Date(d), t = x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()); return /HH/.test(f) ? t + ' ' + p(x.getHours()) + ':' + p(x.getMinutes()) : t; } }
  };
  var pelayan = (function (SpreadsheetApp, PropertiesService, CacheService, LockService, Session, Logger, Utilities, BENIH, MAKLUMAT_SEKOLAH_ASAL) {
${selamat(gs)}
    return { api: api, setupAwal: setupAwal, tetapKataLaluan: tetapKataLaluan, tambah_: tambah_, hash_: hash_, takwimSimpan_: takwimSimpan_ };
  })(perkhidmatan.SpreadsheetApp, perkhidmatan.PropertiesService, perkhidmatan.CacheService, perkhidmatan.LockService, perkhidmatan.Session, perkhidmatan.Logger, perkhidmatan.Utilities, BENIH_DEMO, SEKOLAH_DEMO);

  function simpan() {
    if (!kotor) return; kotor = false;
    try { var o = { urutan: urutan, helaian: {}, sesi: sesi }; urutan.forEach(function (n) { o.helaian[n] = helaian[n].d; }); localStorage.setItem(KUNCI, JSON.stringify(o)); } catch (e) {}
  }
  function muat() {
    try {
      var t = localStorage.getItem(KUNCI); if (!t) return false;
      var o = JSON.parse(t, function (k, v) { return typeof v === 'string' && /^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z$/.test(v) ? new Date(v) : v; });
      urutan = o.urutan; sesi = o.sesi || {}; urutan.forEach(function (n) { helaian[n] = new Helaian(n, o.helaian[n]); });
      return true;
    } catch (e) { helaian = {}; urutan = []; sesi = {}; return false; }
  }
  function semai() {
    aktif = kesan = PEMILIK; pelayan.setupAwal();
    var admin = AKAUN_DEMO[0]; pelayan.tetapKataLaluan(admin.emel, KATA_DEMO);
    pelayan.tambah_('Pengguna', AKAUN_DEMO.slice(1).map(function (a) { var g = uuid(); return { emel: a.emel, nama: a.nama, peranan: a.peranan, aktif: true, garam: g, hash: pelayan.hash_(g, KATA_DEMO) }; }));
    TAKWIM_DEMO.forEach(function (t) { pelayan.takwimSimpan_({ emel: PEMILIK }, { takwim: t, tahun: t.tahun }); });
    aktif = ''; simpan();
  }
  if (!muat()) semai();

  window.google = { script: { get run() {
    var ok = function () {}, er = function () {}, r = {
      withSuccessHandler: function (f) { ok = f; return r; }, withFailureHandler: function (f) { er = f; return r; },
      api: function (a) { var w = JSON.parse(JSON.stringify(a)); setTimeout(function () { try { var h = JSON.parse(JSON.stringify(pelayan.api(w))); simpan(); ok(h); } catch (e) { er(e); } }, 40); } };
    return r;
  } } };

  document.addEventListener('DOMContentLoaded', function () {
    var pill = document.createElement('div'); pill.id = 'demoPil';
    pill.innerHTML = '<b>DEMO</b> <span>Data rekaan</span> <button type="button">Set semula</button>';
    pill.querySelector('button').addEventListener('click', function () { if (confirm('Padam semua perubahan dan kembalikan data demo asal?')) { try { localStorage.removeItem(KUNCI); sessionStorage.clear(); } catch (e) {} location.reload(); } });
    document.body.appendChild(pill);
    var ruang = document.createElement('div'); ruang.id = 'demoAkaun';
    ruang.innerHTML = '<p>Akaun demo (klik untuk masuk):</p>' + ${JSON.stringify(AKAUN.map(a => `<button type="button" data-emel="${a.emel}"><b>${a.label}</b><small>${a.ket}</small></button>`).join(''))};
    ruang.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { document.getElementById('logEmel').value = b.getAttribute('data-emel'); document.getElementById('logKata').value = KATA_DEMO; document.getElementById('borangLog').requestSubmit(); }); });
    document.getElementById('borangLog').insertAdjacentElement('afterend', ruang);
  });
})();
</script>
<style>
#demoPil{position:fixed;right:12px;bottom:12px;z-index:9000;display:flex;align-items:center;gap:8px;background:#0f2c63;color:#fff;border-radius:999px;padding:6px 8px 6px 14px;font:12px/1.2 system-ui,Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25)}
#demoPil b{color:#f5c518;letter-spacing:.5px}#demoPil button{border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;padding:5px 10px;font:inherit;cursor:pointer}#demoPil button:hover{background:rgba(255,255,255,.28)}
#demoAkaun{margin-top:18px;border-top:1px solid rgba(127,127,127,.3);padding-top:12px}#demoAkaun p{margin:0 0 8px;font-size:13px;opacity:.75}
#demoAkaun button{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;margin-top:6px;padding:9px 12px;border:1px solid rgba(127,127,127,.35);border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:14px;cursor:pointer;text-align:left}
#demoAkaun button:hover{border-color:#0f2c63;background:rgba(15,44,99,.06)}#demoAkaun small{opacity:.7;font-size:12px}
@media print{#demoPil{display:none!important}}
</style>`;

// ---------- Himpun halaman ----------
const inc = n => baca(n + '.html');
let html = inc('Index').replace(/<\?!= include\('(\w+)'\) \?>/g, (_, n) => inc(n));
html = html.replace('<base target="_top">', '').replace('<title>Sistem Jawatankuasa</title>', () => '<title>Sistem Jawatankuasa (Demo)</title>').replace('</head>', () => masaJalan + '\n</head>');

// ---------- Semakan kebocoran: gagal jika sebarang data sebenar ditemui ----------
const UMUM = new Set(['BINTI', 'ABDUL', 'MOHD', 'MOHAMAD', 'MOHAMMAD', 'MUHAMMAD', 'MUHAMAD', 'AHMAD', 'SITI', 'NUR', 'NOOR', 'HAJI', 'HJH', 'GURU', 'PENGETUA', 'TIMBALAN', 'BIN', 'ISMAIL', /* perkataan umum yang disahkan muncul dalam teks sistem atau nama JK: */ 'AKHIR', 'PUTERI', 'SYAWAL']);
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const imbas = html.split(LOGO).join(''), temuan = []; // Logo base64 dikecualikan daripada imbasan teks.
const cari = (corak, label) => { const m = imbas.match(new RegExp('.{0,30}' + corak + '.{0,20}', 'i')); if (m) temuan.push(label + (process.env.TUNJUK ? ' => ' + m[0] : '')); };
['sultan azlan', 'mrsm ?sas', 'mrsmsas', 'kuala kangsar', 'perak[^a]', '@mara.gov', 'AKfycb', 'logo-mrsm', 'github.io', 'akramprog', 'MARBAWI'].forEach(c => cari(c, 'frasa: ' + c));
let n = 0;
asal.staf.filter(orang).forEach((s, i) => {
  cari(esc(s.nama), 'nama penuh staf #' + i); n++;
  if (s.emel) { cari(esc(s.emel), 'emel staf #' + i); n++; }
  if (/^\d{5,}$/.test(String(s.staffId))) { cari('\\b' + s.staffId + '\\b', 'ID staf #' + i); n++; }
  String(s.nama).split(/[\s.,()\/'-]+/).filter(w => w.length >= 4 && !UMUM.has(w.toUpperCase())).forEach(w => { const r = new RegExp('(^|[^a-z])' + esc(w) + '($|[^a-z])', 'i'); n++; if (r.test(imbas)) temuan.push('perkataan nama staf #' + i + ': ' + (process.env.TUNJUK ? w : '(' + w.length + ' huruf)')); });
});
if (temuan.length) { console.error('GAGAL: data sebenar mungkin ditemui (fail tidak ditulis):\n  ' + [...new Set(temuan)].join('\n  ')); process.exit(1); }
fs.mkdirSync(path.dirname(keluar), { recursive: true });
fs.writeFileSync(keluar, html);
console.log(`Dibina: ${keluar} (${(html.length / 1024).toFixed(0)} KB). Staf ${benih.staf.length}, JK ${benih.jawatankuasa.length}, tugasan ${benih.tugasan.length}. Semakan kebocoran lulus (${n} corak).`);
