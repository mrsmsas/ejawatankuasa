// Persediaan pangkalan data dan fungsi penyelenggaraan yang dijalankan oleh pemilik.

// PENTING: google.script.run boleh memanggil mana-mana fungsi global yang namanya tidak berakhir dengan "_",
// termasuk oleh pelawat tanpa log masuk apabila antara muka dihidangkan oleh doGet.
// Fungsi global yang mengubah data atau kata laluan MESTI memanggil pemilikSahaja_() dahulu.
function pemilikSahaja_() {
  var aktif = '', kesan = '';
  try { aktif = Session.getActiveUser().getEmail(); } catch (e) {}
  try { kesan = Session.getEffectiveUser().getEmail(); } catch (e) {}
  if (!aktif || aktif !== kesan) throw new Error('Fungsi ini hanya boleh dijalankan oleh pemilik dari Google Sheet atau editor Apps Script.');
}

// Cipta semua helaian yang belum wujud. Tidak menimpa data sedia ada.
function ciptaHelaian_() {
  var ss = db_();
  Object.keys(SKEMA).forEach(function (nama) {
    var sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SKEMA[nama].length).setValues([SKEMA[nama]]).setFontWeight('bold').setBackground('#0f2c63').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    // Lajur ID/teks sebagai teks supaya ID seperti 0123 tidak ditukar kepada nombor.
    SKEMA[nama].forEach(function (k, i) { if (TEKS_.indexOf(k) >= 0) sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@'); });
  });
  return ss;
}

// Khusus pemasangan yang mempunyai data benih sendiri (gas/BenihData.gs). Sekolah baharu menggunakan menu eJawatankuasa.
// Idempotent: helaian yang sudah ada isi akan dilangkau.
function setupAwal() {
  pemilikSahaja_();
  if (typeof BENIH === 'undefined') throw new Error('Gunakan menu eJawatankuasa ▸ Pasang sistem dalam Google Sheet.');
  var ss = ciptaHelaian_();
  var ada = function (n) { return ss.getSheetByName(n).getLastRow() > 1; };
  var laporan = [];

  if (!ada('Posisi')) { tambah_('Posisi', BENIH.posisi.map(function (p) { p.bolehBeberapaJK = ''; p.hadPerStaf = ''; p.keterangan = ''; return p; })); laporan.push('Posisi: ' + BENIH.posisi.length); }
  if (!ada('Staf')) { tambah_('Staf', BENIH.staf); laporan.push('Staf: ' + BENIH.staf.length); }
  if (!ada('Jawatankuasa')) {
    var jk27 = BENIH.jawatankuasa.map(function (j) { j.posisiWajib = ''; return j; });
    var jk26 = jk27.map(function (j) { var y = JSON.parse(JSON.stringify(j)); y.jkId = j.jkId + '-26'; y.tahun = 2026; return y; });
    tambah_('Jawatankuasa', jk26.concat(jk27));
    var ts27 = BENIH.tugasan, ts26 = ts27.map(function (t) { var y = JSON.parse(JSON.stringify(t)); y.asgId = t.asgId + '-26'; y.jkId = t.jkId + '-26'; y.tahun = 2026; y.tarikhEfektif = '2026-01-01'; return y; });
    tambah_('Tugasan', ts26.concat(ts27));
    laporan.push('Jawatankuasa: ' + (jk26.length + jk27.length) + ' (2026 + 2027)', 'Tugasan: ' + (ts26.length + ts27.length));
  }
  if (!ada('TetapanMerit')) {
    var mm = []; [2026, 2027].forEach(function (th) { BENIH.posisi.forEach(function (p) { mm.push({ tahun: th, posisiId: p.posisiId, merit: p.merit }); }); });
    tambah_('TetapanMerit', mm); laporan.push('TetapanMerit: ' + mm.length);
  }
  if (!ada('Tetapan')) tambah_('Tetapan', [].concat.apply([], Object.keys(TETAPAN_ASAL).map(function (k) { return TETAPAN_ASAL[k] === '' ? [] : [{ kunci: k, nilai: TETAPAN_ASAL[k] }]; })));

  if (!ada('Pengguna')) {
    var emel = Session.getEffectiveUser().getEmail(), kata = Utilities.getUuid().replace(/-/g, '').substring(0, 12);
    var garam = Utilities.getUuid();
    tambah_('Pengguna', [{ emel: emel, nama: 'System Admin', peranan: 'PENTADBIR', aktif: true, garam: garam, hash: hash_(garam, kata) }]);
    laporan.push('PENTADBIR PERTAMA — emel: ' + emel + ' | kata laluan sementara: ' + kata + ' (tukar selepas log masuk)');
  }
  var ringkas = laporan.join('\n'); Logger.log(ringkas); return ringkas;
}

// Tetapkan / tetap semula kata laluan seorang pengguna (jalankan dari editor jika terlupa).
function tetapKataLaluan(emel, kata) {
  pemilikSahaja_();
  var p = cariPengguna_(emel); if (!p) throw new Error('Pengguna tidak dijumpai: ' + emel);
  if (!kata || kata.length < 8) throw new Error('Kata laluan sekurang-kurangnya 8 aksara.');
  var garam = Utilities.getUuid(); kemas_('Pengguna', 'emel', p.emel, { garam: garam, hash: hash_(garam, kata) });
}

// Terlupa kata laluan pentadbir? Jalankan fungsi ini: kata laluan baharu dipaparkan dalam Execution log.
function setSemulaKataLaluanPentadbir() {
  pemilikSahaja_();
  var admin = baca_('Pengguna').filter(function (p) { return p.peranan === 'PENTADBIR' && benar_(p.aktif); })[0];
  if (!admin) throw new Error('Tiada pentadbir. Pasang sistem dahulu.');
  var kata = Utilities.getUuid().replace(/-/g, '').substring(0, 12);
  tetapKataLaluan(admin.emel, kata);
  var mesej = 'Emel: ' + admin.emel + ' | Kata laluan baharu: ' + kata;
  Logger.log(mesej); console.log(mesej); return mesej;
}

// Pilihan: letak ID pangkalan data jika skrip BUKAN terikat (bound) pada helaian.
function tetapDB(id) { pemilikSahaja_(); PropertiesService.getScriptProperties().setProperty('DB_ID', id); }
