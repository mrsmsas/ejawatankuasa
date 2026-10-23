// Sistem Pengurusan Jawatankuasa MRSM Sultan Azlan Shah (pelbagai tahun) — Backend Google Apps Script.
// Antara muka dihidangkan oleh Apps Script sendiri (doGet) supaya pengesahan dilakukan di pelayan.

var SKEMA = {
  Staf: ['staffId', 'nama', 'jawatan', 'emel', 'telefon', 'jabatan', 'kategori', 'status', 'pemegangId', 'catatan'],
  Jawatankuasa: ['jkId', 'tahun', 'kod', 'nama', 'kategori', 'keterangan', 'status', 'posisiWajib'],
  Posisi: ['posisiId', 'nama', 'merit', 'tahap', 'keterangan', 'urutan', 'pelbagaPemegang', 'bolehBeberapaJK', 'hadPerStaf', 'aktif'],
  Tugasan: ['asgId', 'tahun', 'jkId', 'staffId', 'posisiId', 'kualifikasi', 'status', 'tarikhEfektif', 'tarikhLantik', 'catatan'],
  TetapanMerit: ['tahun', 'posisiId', 'merit'],
  Pengguna: ['emel', 'nama', 'peranan', 'aktif', 'garam', 'hash'],
  LogAudit: ['masa', 'pengguna', 'tindakan', 'entiti', 'idEntiti', 'sebelum', 'selepas'],
  Tetapan: ['kunci', 'nilai']
};
var TEKS_ = ['staffId', 'asgId', 'jkId', 'posisiId', 'kod', 'telefon', 'emel', 'tarikhEfektif', 'tarikhLantik'];
var PERANAN = { PENTADBIR: 3, PENGURUS: 2, PELIHAT: 1 };
var TETAPAN_ASAL = {
  tahunAktif: '', ambangTinggi: '130', ambangRendah: '50',
  posisiWajib: 'Pengerusi|Penyelaras|Presiden|Ketua Jabatan/Unit|Guru Penasihat',
  sasaranMin_GURU: '', sasaranMax_GURU: '', sasaranMin_SOKONGAN: '', sasaranMax_SOKONGAN: ''
};

// ---------- Titik masuk ----------
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Sistem JK MRSM SAS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
// API JSON untuk antara muka yang dihoskan di GitHub Pages (permintaan teks biasa => tiada preflight CORS).
// Pengesahan tetap melalui token sesi + semakan peranan di pelayan (api()).
function doPost(e) {
  var hasil;
  try {
    var teks = (e && e.postData && e.postData.contents) || '';
    if (teks.length > 600000) hasil = gagal_('Permintaan terlalu besar.');
    else {
      var p = JSON.parse(teks);
      hasil = (p && typeof p.fn === 'string') ? api({ token: p.token, fn: p.fn, args: p.args }) : gagal_('Permintaan tidak sah.');
    }
  } catch (err) { hasil = gagal_('Permintaan tidak sah.'); }
  return ContentService.createTextOutput(JSON.stringify(hasil)).setMimeType(ContentService.MimeType.JSON);
}
function include(nama) { return HtmlService.createHtmlOutputFromFile(nama).getContent(); }

// Satu pintu masuk API. permintaan = {token, fn, args}
function api(permintaan) {
  try {
    var fn = permintaan && permintaan.fn, args = (permintaan && permintaan.args) || {};
    var awam = { login: login_, sesi: sesi_ };
    if (awam[fn]) return awam[fn](permintaan.token, args);
    var pengguna = pengesah_(permintaan.token);
    if (!pengguna) return gagal_('Sesi tamat. Sila log masuk semula.', 'TAMAT_SESI');
    var h = LALUAN_[fn];
    if (!h) return gagal_('Fungsi tidak dikenali.');
    if (PERANAN[pengguna.peranan] < PERANAN[h.min]) return gagal_('Anda tidak dibenarkan melakukan tindakan ini.', 'TIADA_AKSES');
    if (h.tulis) {
      var kunci = LockService.getScriptLock();
      if (!kunci.tryLock(20000)) return gagal_('Sistem sedang sibuk. Sila cuba sekejap lagi.');
      try { return h.fn(pengguna, args); } finally { kunci.releaseLock(); }
    }
    return h.fn(pengguna, args);
  } catch (e) {
    if (e && e.pengguna) return gagal_(e.message);
    console.error(e && e.stack ? e.stack : e);
    return gagal_('Ralat dalaman. Sila hubungi pentadbir sistem.');
  }
}
function ok_(data, mesej) { return { success: true, message: mesej || 'Berjaya.', data: data === undefined ? null : data }; }
function gagal_(mesej, kod) { return { success: false, message: mesej, code: kod || 'RALAT' }; }
function tolak_(mesej) { var e = new Error(mesej); e.pengguna = true; throw e; }

// ---------- Pengesahan ----------
function hash_(garam, kata) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, garam + '|' + kata)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function cariPengguna_(emel) {
  emel = String(emel || '').trim().toLowerCase(); if (!emel) return null;
  return baca_('Pengguna').filter(function (p) { return String(p.emel).toLowerCase() === emel && benar_(p.aktif); })[0] || null;
}
function jadiSesi_(p) {
  var token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('s_' + token, String(p.emel).toLowerCase(), 21600);
  return token;
}
function pengesah_(token) {
  if (!token) return null;
  var emel = CacheService.getScriptCache().get('s_' + token);
  return emel ? cariPengguna_(emel) : null;
}
function profilPengguna_(p) { return { emel: p.emel, nama: p.nama, peranan: p.peranan }; }

function sesi_(token) {
  // 1) Akaun Google yang dikenali pelayan (berfungsi jika domain sama), 2) token sesi sedia ada.
  var p = pengesah_(token);
  if (p) return ok_({ token: token, pengguna: profilPengguna_(p) });
  var g = ''; try { g = Session.getActiveUser().getEmail(); } catch (e) { g = ''; }
  p = cariPengguna_(g);
  if (p) return ok_({ token: jadiSesi_(p), pengguna: profilPengguna_(p) });
  return gagal_('Sila log masuk.', 'PERLU_LOG_MASUK');
}
function login_(token, a) {
  var p = cariPengguna_(a.emel);
  var gagalMsg = 'Emel atau kata laluan tidak betul.';
  var cache = CacheService.getScriptCache(), kk = 'cuba_' + String(a.emel || '').toLowerCase();
  var cuba = Number(cache.get(kk) || 0);
  if (cuba >= 5) return gagal_('Terlalu banyak percubaan. Cuba lagi selepas 10 minit.');
  if (!p || !p.hash || hash_(p.garam, a.kataLaluan || '') !== p.hash) { cache.put(kk, String(cuba + 1), 600); return gagal_(gagalMsg); }
  cache.remove(kk);
  log_(p.emel, 'LOG_MASUK', 'Pengguna', p.emel, '', '');
  return ok_({ token: jadiSesi_(p), pengguna: profilPengguna_(p) }, 'Selamat datang, ' + p.nama + '.');
}
function logout_(pg, a) { return ok_(null, 'Anda telah log keluar.'); }
function tukarKata_(pg, a) {
  var p = cariPengguna_(pg.emel);
  if (hash_(p.garam, a.lama || '') !== p.hash) return gagal_('Kata laluan semasa tidak betul.');
  if (!a.baru || String(a.baru).length < 8) return gagal_('Kata laluan baharu mesti sekurang-kurangnya 8 aksara.');
  var garam = Utilities.getUuid();
  kemas_('Pengguna', 'emel', p.emel, { garam: garam, hash: hash_(garam, a.baru) });
  log_(pg.emel, 'TUKAR_KATA_LALUAN', 'Pengguna', pg.emel, '', '');
  return ok_(null, 'Kata laluan dikemas kini.');
}

// ---------- Akses helaian ----------
function db_() {
  var id = PropertiesService.getScriptProperties().getProperty('DB_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
function benar_(x) { return x === true || x === 'TRUE' || x === 'true'; }
function baca_(nama) {
  var sh = db_().getSheetByName(nama); if (!sh) return [];
  var n = sh.getLastRow(); if (n < 2) return [];
  var kepala = SKEMA[nama], v = sh.getRange(2, 1, n - 1, kepala.length).getValues();
  return v.map(function (r) {
    var o = {}; kepala.forEach(function (k, i) {
      var x = r[i]; if (x instanceof Date) x = Utilities.formatDate(x, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
      o[k] = (TEKS_.indexOf(k) >= 0) ? (x === '' ? '' : String(x)) : x;
    }); return o;
  });
}
function barisKeLarik_(nama, o) { return SKEMA[nama].map(function (k) { return o[k] === undefined || o[k] === null ? '' : o[k]; }); }
function tambah_(nama, objs) {
  if (!objs.length) return;
  var sh = db_().getSheetByName(nama), mula = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(mula, 1, objs.length, SKEMA[nama].length).setValues(objs.map(function (o) { return barisKeLarik_(nama, o); }));
}
function cariBaris_(sh, nama, kunci, nilai) {
  var n = sh.getLastRow(); if (n < 2) return -1;
  var kol = SKEMA[nama].indexOf(kunci) + 1, v = sh.getRange(2, kol, n - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === String(nilai)) return i + 2;
  return -1;
}
function kemas_(nama, kunci, nilai, perubahan) {
  var sh = db_().getSheetByName(nama), b = cariBaris_(sh, nama, kunci, nilai);
  if (b < 0) tolak_('Rekod tidak dijumpai.');
  var r = sh.getRange(b, 1, 1, SKEMA[nama].length), lama = r.getValues()[0], o = {};
  SKEMA[nama].forEach(function (k, i) { o[k] = lama[i]; });
  Object.keys(perubahan).forEach(function (k) { o[k] = perubahan[k]; });
  r.setValues([barisKeLarik_(nama, o)]);
}
function padam_(nama, kunci, nilai) {
  var sh = db_().getSheetByName(nama), b = cariBaris_(sh, nama, kunci, nilai);
  if (b < 0) tolak_('Rekod tidak dijumpai.');
  sh.deleteRow(b);
}
function log_(pengguna, tindakan, entiti, id, sebelum, selepas) {
  try {
    tambah_('LogAudit', [{ masa: new Date(), pengguna: pengguna, tindakan: tindakan, entiti: entiti, idEntiti: id,
      sebelum: typeof sebelum === 'string' ? sebelum : JSON.stringify(sebelum || ''), selepas: typeof selepas === 'string' ? selepas : JSON.stringify(selepas || '') }]);
  } catch (e) { console.error(e); }
}
function tetapan_() {
  var t = {}; Object.keys(TETAPAN_ASAL).forEach(function (k) { t[k] = TETAPAN_ASAL[k]; });
  baca_('Tetapan').forEach(function (r) { t[r.kunci] = r.nilai; });
  return t;
}
function semuaData_() {
  return { staf: baca_('Staf'), jawatankuasa: baca_('Jawatankuasa'), posisi: baca_('Posisi'), tugasan: baca_('Tugasan'), tetapanMerit: baca_('TetapanMerit') };
}
// Tahun diminta -> tahun lalai dalam Tetapan -> tahun terkini dalam data -> tahun semasa
function tahunAktif_(a) {
  var t = Number(a && a.tahun) || Number(tetapan_().tahunAktif);
  if (t) return t;
  var semua = baca_('Jawatankuasa').map(function (j) { return Number(j.tahun); }).filter(Boolean);
  return semua.length ? Math.max.apply(null, semua) : new Date().getFullYear();
}
function senaraiTahun_(d) {
  var t = {}; d.jawatankuasa.forEach(function (j) { t[j.tahun] = 1; }); return Object.keys(t).map(Number).sort();
}
function bersih_(s, maks) { return String(s === undefined || s === null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().substring(0, maks || 200); }
function lindungFormula_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
function janaId_(awalan, senarai, lajur) {
  var maks = 0; senarai.forEach(function (o) { var m = String(o[lajur]).match(/(\d+)(?:-\d+)?$/); if (m && String(o[lajur]).indexOf(awalan) === 0) maks = Math.max(maks, Number(m[1])); });
  return awalan + ('00000' + (maks + 1)).slice(-5);
}

// ---------- Bacaan ----------
function muatAsas_(pg, a) {
  var d = semuaData_(), t = tetapan_();
  var terhad = pg.peranan === 'PELIHAT';
  return ok_({
    tahunAktif: Number(t.tahunAktif), tahun: senaraiTahun_(d), tetapan: t,
    staf: d.staf.map(function (s) { return terhad ? { staffId: s.staffId, nama: s.nama, jawatan: s.jawatan, jabatan: s.jabatan, kategori: s.kategori, status: s.status, pemegangId: s.pemegangId } : s; }),
    posisi: d.posisi, kategoriJK: unik_(d.jawatankuasa.map(function (j) { return j.kategori; })),
    jabatan: unik_(d.staf.map(function (s) { return s.jabatan; })), pengguna: profilPengguna_(pg)
  });
}
function unik_(arr) { var m = {}; arr.forEach(function (x) { if (x) m[x] = 1; }); return Object.keys(m).sort(); }
function dashboard_(pg, a) {
  var d = semuaData_(), t = tetapan_(), tahun = tahunAktif_(a);
  return ok_(ringkasDashboard(d, tahun, t, a.tapis || {}));
}
function senaraiJK_(pg, a) {
  var d = semuaData_(), t = tetapan_(), tahun = tahunAktif_(a);
  var r = ringkasDashboard(d, tahun, t, {});
  var jk = d.jawatankuasa.filter(function (j) { return Number(j.tahun) === tahun; });
  var kom = {}; r.komposisi.forEach(function (k) { kom[k.jkId] = k; });
  var pMap = {}; d.posisi.forEach(function (p) { pMap[p.posisiId] = p; });
  var sMap = {}; d.staf.forEach(function (s) { sMap[s.staffId] = s; });
  var ketua = {};
  d.tugasan.forEach(function (x) {
    if (Number(x.tahun) !== tahun || x.status !== 'AKTIF') return;
    var p = pMap[x.posisiId]; if (!p || Number(p.merit) < 8 || !sMap[x.staffId]) return;
    (ketua[x.jkId] = ketua[x.jkId] || []).push({ p: p.nama, n: sMap[x.staffId].nama, m: Number(p.merit) });
  });
  return ok_(jk.map(function (j) {
    var k = kom[j.jkId] || {}; var kk = (ketua[j.jkId] || []).sort(function (x, y) { return y.m - x.m; }).slice(0, 2);
    return { jkId: j.jkId, kod: j.kod, nama: j.nama, kategori: j.kategori, status: j.status, keterangan: j.keterangan, posisiWajib: j.posisiWajib,
      bil: k.bil || 0, merit: k.merit || 0, lengkap: k.lengkap !== false, kurang: k.kurang || [], pemegangTempat: !!k.pemegangTempat,
      pemimpin: kk.map(function (x) { return x.p + ': ' + x.n; }).join('; ') };
  }));
}
function butiranJK_(pg, a) {
  var d = semuaData_(), t = tetapan_();
  var jk = d.jawatankuasa.filter(function (j) { return j.jkId === a.jkId; })[0]; if (!jk) return gagal_('Jawatankuasa tidak dijumpai.');
  var pMap = {}; d.posisi.forEach(function (p) { pMap[p.posisiId] = p; });
  var sMap = {}; d.staf.forEach(function (s) { sMap[s.staffId] = s; });
  var mm = binaMeritMap(d.tetapanMerit), tahun = Number(jk.tahun);
  var ahli = d.tugasan.filter(function (x) { return x.jkId === jk.jkId; }).map(function (x) {
    var s = sMap[x.staffId] || {}, p = pMap[x.posisiId] || {};
    return { asgId: x.asgId, staffId: x.staffId, nama: s.nama, kategori: s.kategori, posisiId: x.posisiId, posisi: p.nama, kualifikasi: x.kualifikasi,
      merit: meritPosisi(x.posisiId, tahun, pMap, mm), status: x.status, tarikhEfektif: x.tarikhEfektif, tarikhLantik: x.tarikhLantik, catatan: x.catatan, urutan: Number(p.urutan) || 99 };
  }).sort(function (x, y) { return (y.merit - x.merit) || (x.urutan - y.urutan) || String(x.nama).localeCompare(y.nama); });
  var aktif = ahli.filter(function (x) { return x.status === 'AKTIF'; });
  var lg = jkLengkap_(jk, d.tugasan.filter(function (x) { return x.jkId === jk.jkId && x.status === 'AKTIF'; }), sMap, pMap, t);
  return ok_({ jk: jk, ahli: ahli, bil: aktif.length, jumlahMerit: aktif.reduce(function (s, x) { return s + x.merit; }, 0), lengkap: lg });
}
function senaraiStaf_(pg, a) {
  var d = semuaData_(), tahun = tahunAktif_(a), t = tetapan_();
  var r = ringkasDashboard(d, tahun, t, {}), rk = {}; r.ranking.forEach(function (x) { rk[x.staffId] = x; });
  var m = kiraMerit(d, tahun), terhad = pg.peranan === 'PELIHAT';
  return ok_(d.staf.map(function (s) {
    var x = rk[s.staffId], k = m[s.staffId] || { total: 0, bil: 0 };
    return { staffId: s.staffId, nama: s.nama, jawatan: s.jawatan, emel: terhad ? '' : s.emel, telefon: terhad ? '' : s.telefon, jabatan: s.jabatan, kategori: s.kategori, status: s.status,
      pemegangId: s.pemegangId, catatan: terhad ? '' : s.catatan, bil: k.bil, total: k.total, kedudukan: x ? x.kedudukan : null, beban: x ? x.status : '', dianalisis: masukAnalisis(s) };
  }));
}
function profilStaf_(pg, a) {
  var d = semuaData_(), t = tetapan_();
  var s = d.staf.filter(function (x) { return x.staffId === String(a.staffId); })[0]; if (!s) return gagal_('Staf tidak dijumpai.');
  var tahunSemua = senaraiTahun_(d), sejarah = [];
  tahunSemua.forEach(function (th) { var m = kiraMerit(d, th)[s.staffId]; sejarah.push({ tahun: th, total: m ? m.total : 0, bil: m ? m.bil : 0 }); });
  var tahun = tahunAktif_(a), r = ringkasDashboard(d, tahun, t, {}), x = r.ranking.filter(function (y) { return y.staffId === s.staffId; })[0];
  var pembanding = r.ranking.filter(function (y) { return y.kategori === s.kategori; }), purataKat = pembanding.length ? pembanding.reduce(function (p, y) { return p + y.total; }, 0) / pembanding.length : 0;
  var m = kiraMerit(d, tahun)[s.staffId] || { total: 0, bil: 0, butiran: [] };
  var terhad = pg.peranan === 'PELIHAT'; if (terhad) { s = JSON.parse(JSON.stringify(s)); s.emel = ''; s.telefon = ''; s.catatan = ''; }
  return ok_({ staf: s, tahun: tahun, total: m.total, bil: m.bil, butiran: m.butiran.sort(function (p, q) { return q.merit - p.merit; }), kedudukan: x ? x.kedudukan : null, daripada: r.ranking.length,
    beban: x ? x.status : '', purataKategori: purataKat, sasaranMin: t['sasaranMin_' + s.kategori], sasaranMax: t['sasaranMax_' + s.kategori], sejarah: sejarah, dianalisis: masukAnalisis(s) });
}
function senaraiPosisi_(pg, a) {
  var d = semuaData_(), tahun = tahunAktif_(a), mm = binaMeritMap(d.tetapanMerit), pm = {}; d.posisi.forEach(function (p) { pm[p.posisiId] = p; });
  var guna = {}; d.tugasan.forEach(function (t) { if (t.status === 'AKTIF') guna[t.posisiId] = (guna[t.posisiId] || 0) + 1; });
  return ok_(d.posisi.map(function (p) { var o = JSON.parse(JSON.stringify(p)); o.meritTahun = meritPosisi(p.posisiId, tahun, pm, mm); o.diguna = guna[p.posisiId] || 0; return o; })
    .sort(function (x, y) { return Number(x.urutan) - Number(y.urutan); }));
}
function eksportTugasan_(pg, a) {
  var d = semuaData_(), tahun = tahunAktif_(a), pMap = {}, sMap = {}, jMap = {};
  d.posisi.forEach(function (p) { pMap[p.posisiId] = p; }); d.staf.forEach(function (s) { sMap[s.staffId] = s; }); d.jawatankuasa.forEach(function (j) { jMap[j.jkId] = j; });
  var mm = binaMeritMap(d.tetapanMerit);
  return ok_(d.tugasan.filter(function (t) { return Number(t.tahun) === tahun && jMap[t.jkId]; }).map(function (t) {
    var j = jMap[t.jkId], s = sMap[t.staffId] || {}, p = pMap[t.posisiId] || {};
    return [j.kod, j.nama, j.kategori, t.staffId, s.nama, p.nama, t.kualifikasi, meritPosisi(t.posisiId, tahun, pMap, mm), t.status];
  }));
}
function banding_(pg, a) { var d = semuaData_(); return ok_(bandingTahun(d, Number(a.tahunA), Number(a.tahunB))); }
function cadangan_(pg, a) { var d = semuaData_(); return ok_(cadangCalon(d, tahunAktif_(a), a.jkId, tetapan_(), 10)); }
function pratonton_(pg, a) {
  var d = semuaData_(), t = bersihTugasan_(a.tugasan || {});
  var ubah = { jenis: a.jenis || 'tambah', asgId: a.asgId };
  var ralat = (ubah.jenis === 'padam') ? [] : semakTugasan(t, d);
  return ok_({ ralat: ralat, kesan: pratontonKesan(t, d, ubah) });
}

// ---------- Penulisan: tugasan ----------
function bersihTugasan_(t) {
  return { asgId: bersih_(t.asgId, 30), tahun: Number(t.tahun), jkId: bersih_(t.jkId, 30), staffId: bersih_(t.staffId, 30), posisiId: bersih_(t.posisiId, 30),
    kualifikasi: lindungFormula_(bersih_(t.kualifikasi, 150).toUpperCase()), status: t.status === 'TAMAT' ? 'TAMAT' : 'AKTIF',
    tarikhEfektif: bersih_(t.tarikhEfektif, 10), tarikhLantik: bersih_(t.tarikhLantik, 10), catatan: lindungFormula_(bersih_(t.catatan, 300)) };
}
function simpanTugasan_(pg, a) {
  var d = semuaData_(), t = bersihTugasan_(a.tugasan || {}), baharu = !t.asgId;
  if (!baharu && !d.tugasan.some(function (x) { return x.asgId === t.asgId; })) return gagal_('Tugasan tidak dijumpai.');
  var ralat = semakTugasan(t, d); if (ralat.length) return gagal_(ralat.join(' '));
  if (baharu) { t.asgId = janaId_('A', d.tugasan, 'asgId'); t.tarikhLantik = t.tarikhLantik || tarikh_(); tambah_('Tugasan', [t]); log_(pg.emel, 'TAMBAH', 'Tugasan', t.asgId, '', t); }
  else { var lama = d.tugasan.filter(function (x) { return x.asgId === t.asgId; })[0]; kemas_('Tugasan', 'asgId', t.asgId, t); log_(pg.emel, 'SUNTING', 'Tugasan', t.asgId, lama, t); }
  return ok_({ asgId: t.asgId }, baharu ? 'Tugasan ditambah.' : 'Tugasan dikemas kini.');
}
function gantiStaf_(pg, a) {
  var d = semuaData_(), lama = d.tugasan.filter(function (x) { return x.asgId === a.asgId; })[0]; if (!lama) return gagal_('Tugasan tidak dijumpai.');
  var t = { asgId: lama.asgId, tahun: lama.tahun, jkId: lama.jkId, staffId: bersih_(a.staffBaru, 30), posisiId: lama.posisiId, kualifikasi: lama.kualifikasi };
  var ralat = semakTugasan(t, d); if (ralat.length) return gagal_(ralat.join(' '));
  kemas_('Tugasan', 'asgId', lama.asgId, { staffId: t.staffId });
  log_(pg.emel, 'GANTI_STAF', 'Tugasan', lama.asgId, { staffId: lama.staffId }, { staffId: t.staffId });
  return ok_(null, 'Pegawai berjaya diganti.');
}
function padamTugasan_(pg, a) {
  var d = semuaData_(), lama = d.tugasan.filter(function (x) { return x.asgId === a.asgId; })[0]; if (!lama) return gagal_('Tugasan tidak dijumpai.');
  padam_('Tugasan', 'asgId', a.asgId); log_(pg.emel, 'PADAM', 'Tugasan', a.asgId, lama, '');
  return ok_(null, 'Tugasan dipadam.');
}
function tarikh_() { return Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd'); }

// ---------- Penulisan: jawatankuasa ----------
function simpanJK_(pg, a) {
  var d = semuaData_(), j = a.jk || {}, baharu = !j.jkId;
  var o = { jkId: bersih_(j.jkId, 30), tahun: Number(j.tahun) || tahunAktif_(a), kod: lindungFormula_(bersih_(j.kod, 20).toUpperCase()), nama: lindungFormula_(bersih_(j.nama, 250)),
    kategori: lindungFormula_(bersih_(j.kategori, 80)), keterangan: lindungFormula_(bersih_(j.keterangan, 500)), status: j.status === 'TIDAK AKTIF' ? 'TIDAK AKTIF' : 'AKTIF', posisiWajib: lindungFormula_(bersih_(j.posisiWajib, 200)) };
  if (!o.nama) return gagal_('Nama jawatankuasa diperlukan.');
  if (d.jawatankuasa.some(function (x) { return x.jkId !== o.jkId && Number(x.tahun) === o.tahun && String(x.nama).toUpperCase() === o.nama.toUpperCase(); })) return gagal_('Jawatankuasa dengan nama ini sudah wujud pada tahun ' + o.tahun + '.');
  if (baharu) { o.jkId = janaId_('JK', d.jawatankuasa, 'jkId'); tambah_('Jawatankuasa', [o]); log_(pg.emel, 'TAMBAH', 'Jawatankuasa', o.jkId, '', o); }
  else { var lama = d.jawatankuasa.filter(function (x) { return x.jkId === o.jkId; })[0]; if (!lama) return gagal_('Tidak dijumpai.'); o.tahun = Number(lama.tahun); kemas_('Jawatankuasa', 'jkId', o.jkId, o); log_(pg.emel, 'SUNTING', 'Jawatankuasa', o.jkId, lama, o); }
  return ok_({ jkId: o.jkId }, baharu ? 'Jawatankuasa ditambah.' : 'Jawatankuasa dikemas kini.');
}
function padamJK_(pg, a) {
  var d = semuaData_(), jk = d.jawatankuasa.filter(function (x) { return x.jkId === a.jkId; })[0]; if (!jk) return gagal_('Tidak dijumpai.');
  var ts = d.tugasan.filter(function (x) { return x.jkId === a.jkId; });
  if (ts.length && !a.paksa) return gagal_('Jawatankuasa ini mempunyai ' + ts.length + ' tugasan. Sahkan untuk memadam bersama semua tugasan, atau nyahaktifkan sahaja.', 'ADA_TUGASAN');
  var sh = db_().getSheetByName('Tugasan'), n = sh.getLastRow();
  for (var i = n; i >= 2; i--) if (String(sh.getRange(i, 3).getValue()) === a.jkId) sh.deleteRow(i);
  padam_('Jawatankuasa', 'jkId', a.jkId);
  log_(pg.emel, 'PADAM', 'Jawatankuasa', a.jkId, { jk: jk, bilTugasan: ts.length }, '');
  return ok_(null, 'Jawatankuasa dipadam.');
}
function salinJK_(pg, a) {
  var d = semuaData_(), jk = d.jawatankuasa.filter(function (x) { return x.jkId === a.jkId; })[0]; if (!jk) return gagal_('Tidak dijumpai.');
  var nama = bersih_(a.namaBaru, 250) || (jk.nama + ' (SALINAN)'), tahun = Number(a.tahunKe) || Number(jk.tahun);
  if (d.jawatankuasa.some(function (x) { return Number(x.tahun) === tahun && String(x.nama).toUpperCase() === nama.toUpperCase(); })) return gagal_('Nama sudah wujud pada tahun ' + tahun + '.');
  var baru = JSON.parse(JSON.stringify(jk)); baru.jkId = janaId_('JK', d.jawatankuasa, 'jkId'); baru.nama = nama; baru.tahun = tahun;
  tambah_('Jawatankuasa', [baru]);
  var salinStruktur = a.denganAhli !== false, ts = [], mula = janaId_('A', d.tugasan, 'asgId'), no = Number(mula.substring(1));
  if (salinStruktur) d.tugasan.filter(function (x) { return x.jkId === jk.jkId && x.status === 'AKTIF' && Number(x.tahun) === Number(jk.tahun); }).forEach(function (x) {
    var y = JSON.parse(JSON.stringify(x)); y.asgId = 'A' + ('00000' + (no++)).slice(-5); y.jkId = baru.jkId; y.tahun = tahun; y.tarikhLantik = tarikh_(); ts.push(y); });
  tambah_('Tugasan', ts);
  log_(pg.emel, 'SALIN', 'Jawatankuasa', baru.jkId, jk.jkId, { bilTugasan: ts.length });
  return ok_({ jkId: baru.jkId }, 'Jawatankuasa disalin (' + ts.length + ' tugasan).');
}
function salinTahun_(pg, a) {
  var dari = Number(a.dari), ke = Number(a.ke); if (!dari || !ke || dari === ke) return gagal_('Pilih tahun sumber dan sasaran yang berbeza.');
  var d = semuaData_();
  if (d.jawatankuasa.some(function (j) { return Number(j.tahun) === ke; })) return gagal_('Data tahun ' + ke + ' sudah wujud. Salinan tidak akan menimpa data sedia ada.');
  var sumber = d.jawatankuasa.filter(function (j) { return Number(j.tahun) === dari; }); if (!sumber.length) return gagal_('Tiada data tahun ' + dari + '.');
  var peta = {}, no = Number(janaId_('JK', d.jawatankuasa, 'jkId').substring(2)), jkBaru = sumber.map(function (j) {
    var y = JSON.parse(JSON.stringify(j)); y.jkId = 'JK' + ('00000' + (no++)).slice(-5); peta[j.jkId] = y.jkId; y.tahun = ke; return y; });
  var na = Number(janaId_('A', d.tugasan, 'asgId').substring(1)), tsBaru = d.tugasan.filter(function (t) { return Number(t.tahun) === dari && t.status === 'AKTIF' && peta[t.jkId]; }).map(function (t) {
    var y = JSON.parse(JSON.stringify(t)); y.asgId = 'A' + ('00000' + (na++)).slice(-5); y.jkId = peta[t.jkId]; y.tahun = ke; y.tarikhEfektif = ke + '-01-01'; y.tarikhLantik = tarikh_(); return y; });
  tambah_('Jawatankuasa', jkBaru); tambah_('Tugasan', tsBaru);
  var mm = d.tetapanMerit.filter(function (m) { return Number(m.tahun) === dari; }).map(function (m) { return { tahun: ke, posisiId: m.posisiId, merit: m.merit }; });
  tambah_('TetapanMerit', mm);
  log_(pg.emel, 'SALIN_TAHUN', 'Tahun', dari + '->' + ke, '', { jk: jkBaru.length, tugasan: tsBaru.length });
  return ok_({ jk: jkBaru.length, tugasan: tsBaru.length }, 'Disalin: ' + jkBaru.length + ' jawatankuasa, ' + tsBaru.length + ' tugasan ke tahun ' + ke + '.');
}

// ---------- Penulisan: staf ----------
var KATEGORI_STAF = ['GURU', 'SOKONGAN', 'EXOFFICIO', 'PEMEGANG'];
function bersihStaf_(s) {
  return { staffId: bersih_(s.staffId, 30), nama: lindungFormula_(bersih_(s.nama, 200).toUpperCase()), jawatan: lindungFormula_(bersih_(s.jawatan, 100)), emel: bersih_(s.emel, 120).toLowerCase(),
    telefon: lindungFormula_(bersih_(s.telefon, 40)), jabatan: lindungFormula_(bersih_(s.jabatan, 80)), kategori: KATEGORI_STAF.indexOf(s.kategori) >= 0 ? s.kategori : 'GURU',
    status: s.status === 'TIDAK AKTIF' ? 'TIDAK AKTIF' : 'AKTIF', pemegangId: bersih_(s.pemegangId, 30), catatan: lindungFormula_(bersih_(s.catatan, 300)) };
}
function simpanStaf_(pg, a) {
  var d = semuaData_(), s = bersihStaf_(a.staf || {}), baharu = !!a.baharu;
  if (!s.staffId) return gagal_('ID staf diperlukan.'); if (!s.nama) return gagal_('Nama diperlukan.');
  if (s.emel && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.emel)) return gagal_('Format emel tidak sah.');
  var wujud = d.staf.filter(function (x) { return x.staffId === s.staffId; })[0];
  if (baharu && wujud) return gagal_('ID staf ' + s.staffId + ' sudah wujud.');
  if (!baharu && !wujud) return gagal_('Staf tidak dijumpai.');
  var pend = d.staf.filter(function (x) { return x.staffId !== s.staffId && normNama_(x.nama) === normNama_(s.nama); })[0];
  if (pend && !a.sahkanPendua) return gagal_('Nama menyerupai staf sedia ada (' + pend.staffId + '). Semak sebelum menyimpan.', 'MUNGKIN_PENDUA');
  if (baharu) { tambah_('Staf', [s]); log_(pg.emel, 'TAMBAH', 'Staf', s.staffId, '', s); } else { kemas_('Staf', 'staffId', s.staffId, s); log_(pg.emel, 'SUNTING', 'Staf', s.staffId, wujud, s); }
  return ok_({ staffId: s.staffId }, baharu ? 'Staf ditambah.' : 'Staf dikemas kini.');
}
function padamStaf_(pg, a) {
  var d = semuaData_(), s = d.staf.filter(function (x) { return x.staffId === String(a.staffId); })[0]; if (!s) return gagal_('Tidak dijumpai.');
  var n = d.tugasan.filter(function (t) { return t.staffId === s.staffId; }).length;
  if (n) return gagal_('Staf ini mempunyai ' + n + ' tugasan (termasuk tahun lepas). Tukar status kepada TIDAK AKTIF atau buang tugasan dahulu.');
  padam_('Staf', 'staffId', s.staffId); log_(pg.emel, 'PADAM', 'Staf', s.staffId, s, '');
  return ok_(null, 'Staf dipadam.');
}

// ---------- Penulisan: jawatan & merit ----------
function simpanPosisi_(pg, a) {
  var d = semuaData_(), p = a.posisi || {}, baharu = !p.posisiId;
  var merit = Number(p.merit); if (isNaN(merit) || merit < 0 || merit > 1000) return gagal_('Nilai merit mesti nombor 0–1000.');
  var o = { posisiId: bersih_(p.posisiId, 30), nama: lindungFormula_(bersih_(p.nama, 100)), merit: merit, tahap: ['Tinggi', 'Sederhana', 'Rendah'].indexOf(p.tahap) >= 0 ? p.tahap : 'Sederhana',
    keterangan: lindungFormula_(bersih_(p.keterangan, 300)), urutan: Number(p.urutan) || 99, pelbagaPemegang: !!p.pelbagaPemegang,
    bolehBeberapaJK: p.bolehBeberapaJK === '' || p.bolehBeberapaJK === undefined ? '' : !!p.bolehBeberapaJK, hadPerStaf: p.hadPerStaf === '' || !p.hadPerStaf ? '' : Math.max(1, Number(p.hadPerStaf) || 1), aktif: p.aktif !== false };
  if (!o.nama) return gagal_('Nama jawatan diperlukan.');
  if (d.posisi.some(function (x) { return x.posisiId !== o.posisiId && String(x.nama).toUpperCase() === o.nama.toUpperCase(); })) return gagal_('Nama jawatan sudah wujud.');
  var tahun = tahunAktif_(a);
  if (baharu) {
    var no = d.posisi.reduce(function (m, x) { return Math.max(m, Number(String(x.posisiId).substring(1)) || 0); }, 0) + 1; o.posisiId = 'P' + ('00' + no).slice(-2);
    tambah_('Posisi', [o]); senaraiTahun_(d).forEach(function (th) { tambah_('TetapanMerit', [{ tahun: th, posisiId: o.posisiId, merit: o.merit }]); });
    log_(pg.emel, 'TAMBAH', 'Posisi', o.posisiId, '', o);
  } else {
    var lama = d.posisi.filter(function (x) { return x.posisiId === o.posisiId; })[0]; if (!lama) return gagal_('Tidak dijumpai.');
    kemas_('Posisi', 'posisiId', o.posisiId, o); tetapMerit_(tahun, o.posisiId, o.merit, d.tetapanMerit);
    log_(pg.emel, 'SUNTING', 'Posisi', o.posisiId, lama, o);
  }
  return ok_({ posisiId: o.posisiId }, 'Jawatan disimpan. Jumlah merit dikira semula secara automatik.');
}
function tetapMerit_(tahun, posisiId, merit, sedia) {
  var sh = db_().getSheetByName('TetapanMerit'), n = sh.getLastRow(), v = n > 1 ? sh.getRange(2, 1, n - 1, 2).getValues() : [];
  for (var i = 0; i < v.length; i++) if (Number(v[i][0]) === Number(tahun) && String(v[i][1]) === String(posisiId)) { sh.getRange(i + 2, 3).setValue(merit); return; }
  tambah_('TetapanMerit', [{ tahun: tahun, posisiId: posisiId, merit: merit }]);
}
function simpanMerit_(pg, a) {
  var merit = Number(a.merit); if (isNaN(merit) || merit < 0 || merit > 1000) return gagal_('Nilai merit mesti nombor 0–1000.');
  var d = semuaData_(); if (!d.posisi.some(function (p) { return p.posisiId === a.posisiId; })) return gagal_('Jawatan tidak dijumpai.');
  tetapMerit_(tahunAktif_(a), a.posisiId, merit, d.tetapanMerit); log_(pg.emel, 'UBAH_MERIT', 'Posisi', a.posisiId, '', { tahun: tahunAktif_(a), merit: merit });
  return ok_(null, 'Merit dikemas kini untuk tahun ' + tahunAktif_(a) + '.');
}
function padamPosisi_(pg, a) {
  var d = semuaData_(); if (d.tugasan.some(function (t) { return t.posisiId === a.posisiId; })) return gagal_('Jawatan ini sedang digunakan dalam tugasan. Nyahaktifkan sahaja.');
  var lama = d.posisi.filter(function (p) { return p.posisiId === a.posisiId; })[0]; if (!lama) return gagal_('Tidak dijumpai.');
  padam_('Posisi', 'posisiId', a.posisiId);
  var sh = db_().getSheetByName('TetapanMerit'); for (var i = sh.getLastRow(); i >= 2; i--) if (String(sh.getRange(i, 2).getValue()) === a.posisiId) sh.deleteRow(i);
  log_(pg.emel, 'PADAM', 'Posisi', a.posisiId, lama, ''); return ok_(null, 'Jawatan dipadam.');
}

// ---------- Import (peringkat staging, tiada penimpaan) ----------
function semakImport_(pg, a) {
  var d = semuaData_(), baris = (a.baris || []).slice(0, 500).map(function (b) { return bersihStaf_(b); });
  var hasil = semakImportStaf(baris, d.staf);
  return ok_({ hasil: hasil, sah: hasil.filter(function (h) { return h.sah; }).length, tidakSah: hasil.filter(function (h) { return !h.sah; }).length });
}
function lulusImport_(pg, a) {
  var d = semuaData_(), baris = (a.baris || []).slice(0, 500).map(function (b) { return bersihStaf_(b); });
  var hasil = semakImportStaf(baris, d.staf).filter(function (h) { return h.sah; }).map(function (h) { return h.data; });
  tambah_('Staf', hasil); log_(pg.emel, 'IMPORT', 'Staf', '-', '', { bil: hasil.length });
  return ok_({ bil: hasil.length }, hasil.length + ' staf diimport. Rekod sedia ada tidak diubah.');
}

// ---------- Pengguna, tetapan, audit ----------
function senaraiPengguna_(pg, a) { return ok_(baca_('Pengguna').map(function (p) { return { emel: p.emel, nama: p.nama, peranan: p.peranan, aktif: benar_(p.aktif), adaKataLaluan: !!p.hash }; })); }
function simpanPengguna_(pg, a) {
  var emel = bersih_(a.emel, 120).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emel)) return gagal_('Emel tidak sah.');
  if (!PERANAN[a.peranan]) return gagal_('Peranan tidak sah.');
  var sedia = baca_('Pengguna').filter(function (p) { return String(p.emel).toLowerCase() === emel; })[0];
  if (sedia && emel === pg.emel.toLowerCase() && (a.peranan !== 'PENTADBIR' || a.aktif === false)) return gagal_('Anda tidak boleh menurunkan atau menyahaktifkan akaun sendiri.');
  var o = { emel: emel, nama: lindungFormula_(bersih_(a.nama, 100)), peranan: a.peranan, aktif: a.aktif !== false };
  if (a.kataLaluan) { if (String(a.kataLaluan).length < 8) return gagal_('Kata laluan sekurang-kurangnya 8 aksara.'); o.garam = Utilities.getUuid(); o.hash = hash_(o.garam, a.kataLaluan); }
  if (sedia) kemas_('Pengguna', 'emel', sedia.emel, o); else { if (!o.hash) return gagal_('Kata laluan awal diperlukan untuk pengguna baharu.'); tambah_('Pengguna', [o]); }
  log_(pg.emel, sedia ? 'SUNTING' : 'TAMBAH', 'Pengguna', emel, sedia ? { peranan: sedia.peranan } : '', { peranan: o.peranan, aktif: o.aktif });
  return ok_(null, 'Pengguna disimpan.');
}
function simpanTetapan_(pg, a) {
  var kebenaran = Object.keys(TETAPAN_ASAL), diubah = {};
  Object.keys(a.tetapan || {}).forEach(function (k) {
    if (kebenaran.indexOf(k) < 0) return; var v = bersih_(a.tetapan[k], 200);
    if (['ambangTinggi', 'ambangRendah'].indexOf(k) >= 0 && (isNaN(Number(v)) || v === '')) tolak_('Nilai ' + k + ' mesti nombor.');
    if (k === 'tahunAktif' && v !== '' && (isNaN(Number(v)) || Number(v) < 2000 || Number(v) > 2100)) tolak_('Tahun lalai mesti nombor 2000–2100, atau kosong untuk tahun terkini.');
    if (/^sasaran/.test(k) && v !== '' && isNaN(Number(v))) tolak_('Sasaran mesti nombor atau kosong.');
    diubah[k] = lindungFormula_(v);
  });
  var sh = db_().getSheetByName('Tetapan');
  Object.keys(diubah).forEach(function (k) {
    var b = cariBaris_(sh, 'Tetapan', 'kunci', k); if (b < 0) tambah_('Tetapan', [{ kunci: k, nilai: diubah[k] }]); else sh.getRange(b, 2).setValue(diubah[k]);
  });
  log_(pg.emel, 'UBAH_TETAPAN', 'Tetapan', '-', '', diubah); return ok_(null, 'Tetapan disimpan.');
}
function bacaAudit_(pg, a) {
  var sh = db_().getSheetByName('LogAudit'), n = sh.getLastRow(); if (n < 2) return ok_([]);
  var dari = Math.max(2, n - 199), v = sh.getRange(dari, 1, n - dari + 1, 7).getValues().reverse();
  return ok_(v.map(function (r) { return { masa: Utilities.formatDate(new Date(r[0]), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm'), pengguna: r[1], tindakan: r[2], entiti: r[3], idEntiti: r[4], butir: String(r[6] || r[5]).substring(0, 160) }; }));
}

var LALUAN_ = {
  logout: { min: 'PELIHAT', fn: logout_ }, tukarKata: { min: 'PELIHAT', fn: tukarKata_ },
  muatAsas: { min: 'PELIHAT', fn: muatAsas_ }, dashboard: { min: 'PELIHAT', fn: dashboard_ }, senaraiJK: { min: 'PELIHAT', fn: senaraiJK_ },
  butiranJK: { min: 'PELIHAT', fn: butiranJK_ }, senaraiStaf: { min: 'PELIHAT', fn: senaraiStaf_ }, profilStaf: { min: 'PELIHAT', fn: profilStaf_ },
  senaraiPosisi: { min: 'PELIHAT', fn: senaraiPosisi_ }, eksportTugasan: { min: 'PELIHAT', fn: eksportTugasan_ }, banding: { min: 'PELIHAT', fn: banding_ },
  cadangan: { min: 'PENGURUS', fn: cadangan_ }, pratonton: { min: 'PENGURUS', fn: pratonton_ },
  simpanTugasan: { min: 'PENGURUS', fn: simpanTugasan_, tulis: true }, gantiStaf: { min: 'PENGURUS', fn: gantiStaf_, tulis: true },
  padamTugasan: { min: 'PENGURUS', fn: padamTugasan_, tulis: true }, simpanJK: { min: 'PENGURUS', fn: simpanJK_, tulis: true },
  salinJK: { min: 'PENGURUS', fn: salinJK_, tulis: true },
  padamJK: { min: 'PENTADBIR', fn: padamJK_, tulis: true }, salinTahun: { min: 'PENTADBIR', fn: salinTahun_, tulis: true },
  simpanStaf: { min: 'PENTADBIR', fn: simpanStaf_, tulis: true }, padamStaf: { min: 'PENTADBIR', fn: padamStaf_, tulis: true },
  simpanPosisi: { min: 'PENTADBIR', fn: simpanPosisi_, tulis: true }, simpanMerit: { min: 'PENTADBIR', fn: simpanMerit_, tulis: true },
  padamPosisi: { min: 'PENTADBIR', fn: padamPosisi_, tulis: true },
  semakImport: { min: 'PENTADBIR', fn: semakImport_ }, lulusImport: { min: 'PENTADBIR', fn: lulusImport_, tulis: true },
  senaraiPengguna: { min: 'PENTADBIR', fn: senaraiPengguna_ }, simpanPengguna: { min: 'PENTADBIR', fn: simpanPengguna_, tulis: true },
  simpanTetapan: { min: 'PENTADBIR', fn: simpanTetapan_, tulis: true }, bacaAudit: { min: 'PENTADBIR', fn: bacaAudit_ }
};
