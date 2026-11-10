// Pemasangan untuk sekolah baharu: menu dalam Google Sheet dan wizard (Pemasang.html).
// Aliran: Buat salinan templat → menu eJawatankuasa ▸ Pasang sistem → Deploy ▸ Web app.

var HALAMAN_MULA_ = 'MULA DI SINI';

// Senarai jawatan dan nilai merit awal. Semua boleh diubah di halaman Jawatan & Merit.
var POSISI_ASAL = [
  ['Pengerusi', 10, 'Tinggi', false], ['Penaung', 10, 'Tinggi', false], ['Presiden', 10, 'Tinggi', false], ['Pengurus Besar', 10, 'Tinggi', false],
  ['Penyelaras', 10, 'Tinggi', true], ['Timbalan Pengerusi', 8, 'Tinggi', true], ['Timbalan Presiden', 8, 'Tinggi', true], ['Setiausaha', 8, 'Tinggi', true],
  ['Ketua Jabatan/Unit', 8, 'Tinggi', true], ['Ketua Guru Asrama', 8, 'Tinggi', true], ['Bendahari', 7, 'Sederhana', true], ['Ketua Unit', 7, 'Sederhana', true],
  ['Timbalan Ketua Guru Asrama', 6, 'Sederhana', true], ['Ahli Jawatankuasa', 5, 'Sederhana', true], ['Setiausaha Unit', 5, 'Sederhana', true], ['Guru Kanan', 5, 'Sederhana', true],
  ['Pemeriksa Kira-kira', 5, 'Sederhana', true], ['Ketua Penasihat', 4, 'Rendah', true], ['Guru Penasihat (K)', 4, 'Rendah', true], ['Guru Penasihat', 3, 'Rendah', true],
  ['Penasihat', 3, 'Rendah', true], ['Juri', 3, 'Rendah', true], ['Pemerhati', 3, 'Rendah', true]
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('eJawatankuasa')
    .addItem('Pasang sistem / Semakan', 'bukaPemasang')
    .addSeparator()
    .addItem('Set semula kata laluan System Admin', 'menuSetSemulaKataLaluan')
    .addToUi();
  // Simple trigger tidak memerlukan kebenaran untuk menyunting Sheet ini.
  try { if (!db_().getSheetByName('Pengguna')) tulisHalamanMula_(false); } catch (e) { console.error(e); }
}

function bukaPemasang() {
  var html = HtmlService.createHtmlOutputFromFile('Pemasang').setWidth(680).setHeight(660);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pemasangan eJawatankuasa');
}

function menuSetSemulaKataLaluan() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Set semula kata laluan', 'Jana kata laluan baharu untuk System Admin? Kata laluan lama tidak lagi boleh digunakan.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  ui.alert('Kata laluan baharu', setSemulaKataLaluanPentadbir() + '\n\nLog masuk dan tukar kata laluan ini dengan segera.', ui.ButtonSet.OK);
}

// Dipanggil oleh wizard apabila dibuka.
function maklumatPemasang() {
  pemilikSahaja_();
  var dipasang = baca_('Pengguna').length > 0, t = tetapan_();
  var hasil = { dipasang: dipasang, emel: Session.getEffectiveUser().getEmail(), tahun: new Date().getFullYear(), editor: 'https://script.google.com/d/' + ScriptApp.getScriptId() + '/edit', logoMaks: LOGO_MAKS_ };
  if (dipasang) { hasil.namaSekolah = t.namaSekolah; hasil.bilStaf = baca_('Staf').length; hasil.bilJK = baca_('Jawatankuasa').length; hasil.bilPengguna = baca_('Pengguna').length; }
  // Jangan guna ScriptApp.getService().getUrl(): ia memulangkan URL /exec yang 404, walaupun sistem belum atau sudah di-Deploy.
  return hasil;
}

function pasangSistem(b) {
  pemilikSahaja_();
  b = b || {};
  var kunci = LockService.getScriptLock();
  if (!kunci.tryLock(20000)) throw new Error('Pemasangan lain sedang berjalan. Cuba sekejap lagi.');
  try {
    if (baca_('Pengguna').length) throw new Error('Sistem sudah dipasang pada Sheet ini. Tiada data diubah.');
    var namaSekolah = bersih_(b.namaSekolah, 200), namaRingkas = bersih_(b.namaRingkas, 40), nama = bersih_(b.adminNama, 100), emel = bersih_(b.adminEmel, 120).toLowerCase(), tahun = Number(b.tahun);
    if (!namaSekolah) throw new Error('Nama sekolah diperlukan.');
    if (!namaRingkas) throw new Error('Nama ringkas diperlukan.');
    if (!nama) throw new Error('Nama System Admin diperlukan.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emel)) throw new Error('Emel System Admin tidak sah.');
    if (!b.kataLaluan || String(b.kataLaluan).length < 8) throw new Error('Kata laluan sekurang-kurangnya 8 aksara.');
    if (!(tahun >= 2000 && tahun <= 2100)) throw new Error('Tahun mesti antara 2000 dan 2100.');
    var logo = String(b.logo || '');
    if (logo && (logo.length > LOGO_MAKS_ || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(logo))) throw new Error('Logo tidak sah atau terlalu besar.');

    var ss = ciptaHelaian_();
    var isi = function (n) { return ss.getSheetByName(n).getLastRow() > 1; };

    if (!isi('Posisi')) tambah_('Posisi', POSISI_ASAL.map(function (p, i) {
      return { posisiId: 'P' + ('00' + (i + 1)).slice(-2), nama: p[0], merit: p[1], tahap: p[2], keterangan: '', urutan: i + 1, pelbagaPemegang: p[3], bolehBeberapaJK: '', hadPerStaf: '', aktif: true };
    }));
    if (!isi('TetapanMerit')) tambah_('TetapanMerit', baca_('Posisi').map(function (p) { return { tahun: tahun, posisiId: p.posisiId, merit: p.merit }; }));

    var nilai = {}; Object.keys(TETAPAN_ASAL).forEach(function (k) { nilai[k] = TETAPAN_ASAL[k]; });
    nilai.namaSekolah = namaSekolah; nilai.namaRingkas = namaRingkas; nilai.logo = logo;
    ['lokasi', 'pengetuaNama', 'pengetuaJawatan', 'suratDaripada', 'suratKepalaKiri', 'suratKepalaKanan', 'suratCogan'].forEach(function (k) { nilai[k] = lindungFormula_(bersih_(b[k], 200)); });
    if (!isi('Tetapan')) tambah_('Tetapan', Object.keys(nilai).map(function (k) { return { kunci: k, nilai: nilai[k] }; }));

    var garam = Utilities.getUuid();
    tambah_('Pengguna', [{ emel: emel, nama: nama, peranan: 'PENTADBIR', aktif: true, garam: garam, hash: hash_(garam, String(b.kataLaluan)) }]);
    log_(emel, 'PASANG_SISTEM', 'Sistem', '-', '', { sekolah: namaSekolah, tahun: tahun });

    ss.rename('DB eJawatankuasa - ' + namaRingkas);
    ss.getSheets().forEach(function (sh) { if (/^(Sheet|Helaian)\d*$/.test(sh.getName()) && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh); });
    tulisHalamanMula_(true);
    return maklumatPemasang();
  } finally { kunci.releaseLock(); }
}

function tulisHalamanMula_(dipasang) {
  var ss = db_(), sh = ss.getSheetByName(HALAMAN_MULA_) || ss.insertSheet(HALAMAN_MULA_, 0);
  var baris = dipasang ? [
    ['Sistem telah dipasang'],
    ['Langkah terakhir: terbitkan sistem jika belum. Pilih menu eJawatankuasa ▸ Pasang sistem / Semakan untuk arahan. Pautan sistem ada di Extensions ▸ Apps Script ▸ Deploy ▸ Manage deployments.'],
    [''],
    ['PENTING: JANGAN kongsi fail Google Sheet ini. Sesiapa yang boleh menyunting Sheet ini boleh memintas semua kawalan sistem.'],
    ['Staf menggunakan sistem melalui pautan web sahaja. Akaun mereka dicipta di halaman Pengguna dalam sistem.'],
    ['Jangan ubah nama helaian atau lajur secara manual.']
  ] : [
    ['eJawatankuasa — Sistem Pengurusan Jawatankuasa Sekolah'],
    ['Langkah 1: Tunggu beberapa saat sehingga menu "eJawatankuasa" muncul di bar menu (di sebelah kanan menu Help / Bantuan).'],
    ['Langkah 2: Klik eJawatankuasa ▸ Pasang sistem / Semakan.'],
    ['Langkah 3: Benarkan kebenaran Google apabila diminta, kemudian klik menu yang sama sekali lagi.'],
    ['Langkah 4: Isi borang pemasangan dan ikut arahan pada skrin.'],
    [''],
    ['Rujuk Manual Pemasangan untuk arahan lengkap.']
  ];
  sh.clear();
  sh.getRange(1, 1, baris.length, 1).setValues(baris).setWrap(true);
  sh.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor('#0f2c63');
  sh.setColumnWidth(1, 760);
  ss.setActiveSheet(sh);
}
