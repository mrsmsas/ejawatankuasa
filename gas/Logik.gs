// Logik tulen (tanpa API Google) — dikongsi oleh Apps Script dan ujian Node (tools/ujian.js).
// Semua kiraan merit dan peraturan integriti berada di sini.

function lId_(x) { return String(x === null || x === undefined ? '' : x); }
function lBenar_(x) { return x === true || x === 'TRUE' || x === 'true' || x === 1; }
function lPeta_(arr, kunci) { var m = {}; (arr || []).forEach(function (o) { m[lId_(o[kunci])] = o; }); return m; }

// Staf yang dikira dalam analisis merit. Ex-officio dan pemegang tempat diasingkan.
function masukAnalisis(s) {
  return !!s && s.status !== 'TIDAK AKTIF' && (s.kategori === 'GURU' || s.kategori === 'SOKONGAN');
}

function meritPosisi(posisiId, tahun, posisiMap, meritMap) {
  var k = tahun + '|' + lId_(posisiId);
  if (Object.prototype.hasOwnProperty.call(meritMap, k)) return Number(meritMap[k]) || 0;
  var p = posisiMap[lId_(posisiId)];
  return p ? (Number(p.merit) || 0) : 0;
}

function binaMeritMap(tetapanMerit) {
  var m = {};
  (tetapanMerit || []).forEach(function (r) { m[Number(r.tahun) + '|' + lId_(r.posisiId)] = Number(r.merit); });
  return m;
}

// Kira merit setiap staf bagi satu tahun. Hanya tugasan AKTIF pada JK yang wujud (dan JK tidak 'TIDAK AKTIF') dikira.
function kiraMerit(d, tahun) {
  var posisiMap = lPeta_(d.posisi, 'posisiId'), jkMap = lPeta_(d.jawatankuasa, 'jkId');
  var meritMap = binaMeritMap(d.tetapanMerit);
  var hasil = {};
  (d.staf || []).forEach(function (s) { hasil[lId_(s.staffId)] = { staffId: lId_(s.staffId), total: 0, bil: 0, butiran: [] }; });
  (d.tugasan || []).forEach(function (t) {
    if (Number(t.tahun) !== Number(tahun) || t.status !== 'AKTIF') return;
    var jk = jkMap[lId_(t.jkId)]; if (!jk || jk.status === 'TIDAK AKTIF') return;
    var h = hasil[lId_(t.staffId)]; if (!h) return;
    var p = posisiMap[lId_(t.posisiId)];
    var m = meritPosisi(t.posisiId, tahun, posisiMap, meritMap);
    h.total += m; h.bil += 1;
    h.butiran.push({ asgId: t.asgId, jkId: t.jkId, jkNama: jk.nama, posisiId: t.posisiId, posisiNama: p ? p.nama : '?', kualifikasi: t.kualifikasi || '', merit: m });
  });
  return hasil;
}

// Peraturan integriti tugasan. t = {asgId?, tahun, jkId, staffId, posisiId, kualifikasi}
// Pulangkan senarai ralat (kosong = sah).
function semakTugasan(t, d) {
  var ralat = [];
  var staf = lPeta_(d.staf, 'staffId')[lId_(t.staffId)];
  var posisi = lPeta_(d.posisi, 'posisiId')[lId_(t.posisiId)];
  var jk = lPeta_(d.jawatankuasa, 'jkId')[lId_(t.jkId)];
  if (!jk) ralat.push('Jawatankuasa tidak wujud.');
  if (!staf) ralat.push('Staf tidak wujud.');
  else if (staf.status === 'TIDAK AKTIF') ralat.push('Staf berstatus TIDAK AKTIF.');
  if (!posisi) ralat.push('Jawatan tidak wujud.');
  else if (!lBenar_(posisi.aktif)) ralat.push('Jawatan tidak aktif.');
  if (!t.tahun) ralat.push('Tahun diperlukan.');
  if (jk && Number(jk.tahun) !== Number(t.tahun)) ralat.push('Tahun tugasan tidak sepadan dengan tahun jawatankuasa.');
  if (ralat.length) return ralat;
  var kual = String(t.kualifikasi || '').trim().toUpperCase();
  var lain = (d.tugasan || []).filter(function (x) {
    return x.status === 'AKTIF' && Number(x.tahun) === Number(t.tahun) && lId_(x.asgId) !== lId_(t.asgId);
  });
  var samaJK = lain.filter(function (x) { return lId_(x.jkId) === lId_(t.jkId); });
  if (samaJK.some(function (x) { return lId_(x.staffId) === lId_(t.staffId) && lId_(x.posisiId) === lId_(t.posisiId) && String(x.kualifikasi || '').trim().toUpperCase() === kual; }))
    ralat.push('Tugasan pendua: staf ini sudah memegang jawatan yang sama dalam jawatankuasa ini.');
  if (!lBenar_(posisi.pelbagaPemegang) &&
    samaJK.some(function (x) { return lId_(x.posisiId) === lId_(t.posisiId) && String(x.kualifikasi || '').trim().toUpperCase() === kual; }))
    ralat.push('Jawatan "' + posisi.nama + '" hanya dibenarkan seorang pemegang dalam satu jawatankuasa.');
  var jawatanSama = lain.filter(function (x) { return lId_(x.staffId) === lId_(t.staffId) && lId_(x.posisiId) === lId_(t.posisiId); });
  if (posisi.bolehBeberapaJK !== '' && posisi.bolehBeberapaJK !== undefined && !lBenar_(posisi.bolehBeberapaJK) && jawatanSama.length)
    ralat.push('Staf ini tidak dibenarkan memegang jawatan "' + posisi.nama + '" dalam lebih daripada satu jawatankuasa.');
  var had = Number(posisi.hadPerStaf);
  if (had > 0 && jawatanSama.length >= had)
    ralat.push('Had jawatan "' + posisi.nama + '" bagi seorang staf (' + had + ') telah dicapai.');
  return ralat;
}

// Pratonton kesan perubahan: jumlah merit sebelum/selepas untuk staf terlibat.
// t = tugasan baharu/disunting; asgIdLama = tugasan yang dibuang/diganti (pilihan).
function pratontonKesan(t, d, ubah) {
  // ubah: {jenis:'tambah'|'sunting'|'padam', asgId?}
  var tahun = Number(t.tahun);
  var sebelum = kiraMerit(d, tahun);
  var salin = { staf: d.staf, posisi: d.posisi, jawatankuasa: d.jawatankuasa, tetapanMerit: d.tetapanMerit, tugasan: (d.tugasan || []).slice() };
  if (ubah.jenis === 'padam' || ubah.jenis === 'sunting')
    salin.tugasan = salin.tugasan.filter(function (x) { return lId_(x.asgId) !== lId_(ubah.asgId); });
  if (ubah.jenis === 'tambah' || ubah.jenis === 'sunting')
    salin.tugasan.push({ asgId: '(baharu)', tahun: tahun, jkId: t.jkId, staffId: t.staffId, posisiId: t.posisiId, kualifikasi: t.kualifikasi || '', status: 'AKTIF' });
  var selepas = kiraMerit(salin, tahun);
  var ids = {};
  if (t.staffId) ids[lId_(t.staffId)] = 1;
  if (ubah.asgId) { var lama = (d.tugasan || []).filter(function (x) { return lId_(x.asgId) === lId_(ubah.asgId); })[0]; if (lama) ids[lId_(lama.staffId)] = 1; }
  var stafMap = lPeta_(d.staf, 'staffId');
  return Object.keys(ids).map(function (id) {
    var a = sebelum[id] ? sebelum[id].total : 0, b = selepas[id] ? selepas[id].total : 0;
    return { staffId: id, nama: stafMap[id] ? stafMap[id].nama : id, sebelum: a, selepas: b, beza: b - a,
      bilSebelum: sebelum[id] ? sebelum[id].bil : 0, bilSelepas: selepas[id] ? selepas[id].bil : 0,
      dianalisis: masukAnalisis(stafMap[id]) };
  });
}

function statistikAsas_(nilai) {
  var n = nilai.length; if (!n) return { n: 0, purata: 0, min: 0, max: 0, median: 0 };
  var s = nilai.slice().sort(function (a, b) { return a - b; });
  var jum = s.reduce(function (a, b) { return a + b; }, 0);
  return { n: n, purata: jum / n, min: s[0], max: s[n - 1], median: n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 };
}

// Tentukan status beban: ikut sasaran kategori jika ditetapkan, jika tidak ikut % daripada purata.
function statusBeban(total, kategori, purata, tetapan) {
  var min = tetapan['sasaranMin_' + kategori], max = tetapan['sasaranMax_' + kategori];
  var tinggi = (max !== undefined && max !== '' && max !== null) ? Number(max) : purata * (Number(tetapan.ambangTinggi) || 130) / 100;
  var rendah = (min !== undefined && min !== '' && min !== null) ? Number(min) : purata * (Number(tetapan.ambangRendah) || 50) / 100;
  if (total > tinggi) return 'TINGGI';
  if (total < rendah) return 'RENDAH';
  return 'SEIMBANG';
}

function jkLengkap_(jk, tugasanJK, stafMap, posisiMap, tetapan) {
  var wajib = String(jk.posisiWajib || tetapan.posisiWajib || '').split(',').map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean);
  var ada = {};
  var pemegang = false;
  tugasanJK.forEach(function (t) {
    var p = posisiMap[lId_(t.posisiId)]; if (p) ada[String(p.nama).toUpperCase()] = true;
    var s = stafMap[lId_(t.staffId)]; if (s && s.kategori === 'PEMEGANG') pemegang = true;
  });
  var kurang = wajib.filter(function (w) { return !w.split('|').some(function (a) { return ada[a.trim()]; }); });
  return { lengkap: !kurang.length && !pemegang, kurang: kurang, pemegangTempat: pemegang };
}

// Ringkasan dashboard untuk satu tahun (turas ikut penapis pilihan).
function ringkasDashboard(d, tahun, tetapan, tapis) {
  tapis = tapis || {};
  var merit = kiraMerit(d, tahun);
  var posisiMap = lPeta_(d.posisi, 'posisiId'), stafMap = lPeta_(d.staf, 'staffId');
  var jkTahun = (d.jawatankuasa || []).filter(function (j) { return Number(j.tahun) === Number(tahun) && j.status !== 'TIDAK AKTIF'; });
  if (tapis.kategoriJK) jkTahun = jkTahun.filter(function (j) { return j.kategori === tapis.kategoriJK; });
  var jkIds = lPeta_(jkTahun, 'jkId');
  var aktif = (d.tugasan || []).filter(function (t) { return Number(t.tahun) === Number(tahun) && t.status === 'AKTIF' && jkIds[lId_(t.jkId)]; });
  if (tapis.posisiId) aktif = aktif.filter(function (t) { return lId_(t.posisiId) === lId_(tapis.posisiId); });
  var meritMap = binaMeritMap(d.tetapanMerit);

  var stafAnalisis = (d.staf || []).filter(masukAnalisis);
  if (tapis.jabatan) stafAnalisis = stafAnalisis.filter(function (s) { return s.jabatan === tapis.jabatan; });
  if (tapis.kategoriStaf) stafAnalisis = stafAnalisis.filter(function (s) { return s.kategori === tapis.kategoriStaf; });
  if (tapis.staffId) stafAnalisis = stafAnalisis.filter(function (s) { return lId_(s.staffId) === lId_(tapis.staffId); });
  var penapisanTugasan = tapis.kategoriJK || tapis.posisiId;
  // Jika penapis JK/jawatan digunakan, jumlah dikira semula daripada tugasan yang ditapis sahaja.
  var jumlahStaf = {};
  aktif.forEach(function (t) {
    var k = lId_(t.staffId);
    jumlahStaf[k] = jumlahStaf[k] || { total: 0, bil: 0 };
    jumlahStaf[k].total += meritPosisi(t.posisiId, tahun, posisiMap, meritMap); jumlahStaf[k].bil++;
  });
  var rujuk = function (id) { return penapisanTugasan ? (jumlahStaf[id] || { total: 0, bil: 0 }) : (merit[id] || { total: 0, bil: 0 }); };

  var senarai = stafAnalisis.map(function (s) {
    var m = rujuk(lId_(s.staffId));
    return { staffId: lId_(s.staffId), nama: s.nama, jabatan: s.jabatan, kategori: s.kategori, total: m.total, bil: m.bil, status: '' };
  });
  var st = statistikAsas_(senarai.map(function (x) { return x.total; }));
  var puratKat = {}; senarai.forEach(function (x) { var o = puratKat[x.kategori] = puratKat[x.kategori] || { j: 0, n: 0 }; o.j += x.total; o.n++; });
  senarai.forEach(function (x) { var o = puratKat[x.kategori]; x.status = statusBeban(x.total, x.kategori, o.n ? o.j / o.n : 0, tetapan); });
  senarai.sort(function (a, b) { return b.total - a.total || a.nama.localeCompare(b.nama); });
  senarai.forEach(function (x, i) { x.kedudukan = i + 1; });

  // Taburan jawatan
  var tabJ = {};
  aktif.forEach(function (t) {
    var p = posisiMap[lId_(t.posisiId)]; if (!p) return;
    var o = tabJ[p.nama] = tabJ[p.nama] || { nama: p.nama, bil: 0, merit: meritPosisi(t.posisiId, tahun, posisiMap, meritMap) };
    o.bil++;
  });
  var taburanJawatan = Object.keys(tabJ).map(function (k) { return tabJ[k]; }).sort(function (a, b) { return b.bil - a.bil; });

  // Komposisi JK + liputan
  var perJK = {}; aktif.forEach(function (t) { (perJK[lId_(t.jkId)] = perJK[lId_(t.jkId)] || []).push(t); });
  var komposisi = jkTahun.map(function (j) {
    var ts = perJK[lId_(j.jkId)] || [];
    var lg = jkLengkap_(j, ts, stafMap, posisiMap, tetapan);
    return { jkId: j.jkId, kod: j.kod, nama: j.nama, kategori: j.kategori, bil: ts.length,
      merit: ts.reduce(function (a, t) { return a + meritPosisi(t.posisiId, tahun, posisiMap, meritMap); }, 0), lengkap: lg.lengkap, kurang: lg.kurang, pemegangTempat: lg.pemegangTempat };
  });

  // Perbandingan mengikut jabatan/kategori staf
  var kump = {};
  senarai.forEach(function (x) { var k = x.jabatan || '(Tiada jabatan)'; var o = kump[k] = kump[k] || { nama: k, bil: 0, jumlah: 0 }; o.bil++; o.jumlah += x.total; });
  var jabatan = Object.keys(kump).map(function (k) { var o = kump[k]; return { nama: o.nama, bil: o.bil, jumlah: o.jumlah, purata: o.bil ? o.jumlah / o.bil : 0 }; });

  // Histogram (lebar 10 mata)
  var lebar = 10, hist = {};
  senarai.forEach(function (x) { var b = Math.floor(x.total / lebar) * lebar; hist[b] = (hist[b] || 0) + 1; });
  var histogram = Object.keys(hist).map(Number).sort(function (a, b) { return a - b; }).map(function (b) { return { label: b + '–' + (b + lebar - 1), bil: hist[b] }; });

  var jumlahMerit = senarai.reduce(function (a, x) { return a + x.total; }, 0);
  var tertinggi = senarai[0] || null, terendah = senarai.length ? senarai[senarai.length - 1] : null;
  return {
    tahun: Number(tahun),
    kad: {
      bilJK: jkTahun.length, bilStaf: senarai.length, bilTugasan: aktif.length, jumlahMerit: jumlahMerit,
      purata: st.purata, median: st.median,
      tertinggi: tertinggi ? { nama: tertinggi.nama, total: tertinggi.total } : null,
      terendah: terendah ? { nama: terendah.nama, total: terendah.total } : null,
      tiadaTugasan: senarai.filter(function (x) { return x.bil === 0; }).length,
      bebanTinggi: senarai.filter(function (x) { return x.status === 'TINGGI'; }).length,
      bebanRendah: senarai.filter(function (x) { return x.status === 'RENDAH'; }).length,
      jkTidakLengkap: komposisi.filter(function (k) { return !k.lengkap; }).length,
      diasingkan: (d.staf || []).filter(function (s) { return s.status !== 'TIDAK AKTIF' && !masukAnalisis(s); }).length
    },
    ranking: senarai, taburanJawatan: taburanJawatan, komposisi: komposisi, jabatan: jabatan, histogram: histogram
  };
}

// Banding dua tahun mengikut staf (analisis sahaja).
function bandingTahun(d, tahunA, tahunB) {
  var a = kiraMerit(d, tahunA), b = kiraMerit(d, tahunB);
  var baris = (d.staf || []).filter(masukAnalisis).map(function (s) {
    var id = lId_(s.staffId), x = a[id] || { total: 0, bil: 0 }, y = b[id] || { total: 0, bil: 0 };
    return { staffId: id, nama: s.nama, meritA: x.total, bilA: x.bil, meritB: y.total, bilB: y.bil, beza: y.total - x.total };
  });
  baris.sort(function (p, q) { return Math.abs(q.beza) - Math.abs(p.beza); });
  var jum = function (k) { return baris.reduce(function (s, r) { return s + r[k]; }, 0); };
  return { tahunA: tahunA, tahunB: tahunB, jumlahA: jum('meritA'), jumlahB: jum('meritB'), baris: baris };
}

// Cadangan (bukan pelantikan): calon dengan merit terendah yang belum berada dalam JK ini.
function cadangCalon(d, tahun, jkId, tetapan, bil) {
  var merit = kiraMerit(d, tahun);
  var dalam = {};
  (d.tugasan || []).forEach(function (t) { if (Number(t.tahun) === Number(tahun) && t.status === 'AKTIF' && lId_(t.jkId) === lId_(jkId)) dalam[lId_(t.staffId)] = 1; });
  var calon = (d.staf || []).filter(function (s) { return masukAnalisis(s) && !dalam[lId_(s.staffId)]; })
    .map(function (s) { var m = merit[lId_(s.staffId)]; return { staffId: lId_(s.staffId), nama: s.nama, kategori: s.kategori, jabatan: s.jabatan, total: m.total, bil: m.bil }; });
  var pk = {}; (d.staf || []).filter(masukAnalisis).forEach(function (s) { var o = pk[s.kategori] = pk[s.kategori] || { j: 0, n: 0 }; o.j += merit[lId_(s.staffId)].total; o.n++; });
  calon.forEach(function (c) { var o = pk[c.kategori]; c.status = statusBeban(c.total, c.kategori, o && o.n ? o.j / o.n : 0, tetapan); });
  calon.sort(function (a, b) { return a.total - b.total || a.bil - b.bil; });
  return calon.slice(0, bil || 10);
}

// Semak baris import staf (peringkat 'staging'): pulangkan baris dengan ralat/amaran, tanpa menulis apa-apa.
function semakImportStaf(baris, stafSedia) {
  var idSedia = lPeta_(stafSedia, 'staffId'), emelSedia = {}, namaSedia = {};
  stafSedia.forEach(function (s) { if (s.emel) emelSedia[String(s.emel).toLowerCase()] = s; namaSedia[normNama_(s.nama)] = s; });
  var dalamFail = {};
  return baris.map(function (b, i) {
    var ralat = [], amaran = [];
    var id = lId_(b.staffId).trim(), nama = lId_(b.nama).trim();
    if (!id) ralat.push('ID staf kosong'); if (!nama) ralat.push('Nama kosong');
    if (id && idSedia[id]) ralat.push('ID sudah wujud (tidak akan ditimpa)');
    if (id && dalamFail[id]) ralat.push('ID berulang dalam fail');
    if (id) dalamFail[id] = 1;
    if (nama && namaSedia[normNama_(nama)] && !idSedia[id]) amaran.push('Nama menyerupai staf sedia ada: ' + namaSedia[normNama_(nama)].staffId);
    if (b.emel && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.emel)) ralat.push('Format emel tidak sah');
    if (b.emel && emelSedia[String(b.emel).toLowerCase()]) amaran.push('Emel telah digunakan oleh ' + emelSedia[String(b.emel).toLowerCase()].staffId);
    if (b.kategori && ['GURU', 'SOKONGAN', 'EXOFFICIO', 'PEMEGANG'].indexOf(b.kategori) < 0) ralat.push('Kategori mesti GURU/SOKONGAN/EXOFFICIO/PEMEGANG');
    return { baris: i + 2, data: b, ralat: ralat, amaran: amaran, sah: !ralat.length };
  });
}
function normNama_(n) {
  return String(n || '').toUpperCase().replace(/[‘’`´"']/g, '').replace(/^(EN|PN|DR|USTAZ|USTAZAH)\.?\s+/, '')
    .replace(/\bBT\b\.?/g, 'BINTI').replace(/\bB\b\.?/g, 'BIN').replace(/[^A-Z@ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

if (typeof module !== 'undefined') module.exports = { masukAnalisis: masukAnalisis, kiraMerit: kiraMerit, semakTugasan: semakTugasan, pratontonKesan: pratontonKesan, ringkasDashboard: ringkasDashboard, bandingTahun: bandingTahun, cadangCalon: cadangCalon, semakImportStaf: semakImportStaf, statusBeban: statusBeban, normNama_: normNama_ };

