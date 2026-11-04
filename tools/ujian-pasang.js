// Ujian pemasangan sekolah baharu (seperti templat: tanpa BenihData dan SekolahIni). Guna: node tools/ujian-pasang.js
const assert = require('assert');
const { buatPersekitaran, EMEL_PEMILIK } = require('./tiruan-gas');
let lulus = 0, gagal = 0;
const ujian = (nama, fn) => { try { fn(); lulus++; console.log('  LULUS  ' + nama); } catch (e) { gagal++; process.exitCode = 1; console.log('  GAGAL  ' + nama + '\n         ' + e.message); } };
const P = buatPersekitaran({ muatBenih: false });
const borang = { namaSekolah: 'MRSM Contoh', namaRingkas: 'MRSM CTH', lokasi: 'Bandar, Negeri', tahun: 2027, pengetuaNama: 'NAMA PENGETUA', pengetuaJawatan: 'Pengetua', suratDaripada: 'Pengetua MRSM Contoh', suratKepalaKiri: 'mara', suratKepalaKanan: 'memograf', suratCogan: 'A|B', adminNama: 'Admin Contoh', adminEmel: 'admin@contoh.my', kataLaluan: 'KataLaluan1', logo: '' };
const ditolak = (fn, args, emel) => assert.throws(() => P.rpc(fn, args, emel), /pemilik/);

console.log('Ujian pemasangan');
ujian('Sebelum pasang: jenama memberitahu sistem belum dipasang', () => { assert.strictEqual(P.api('jenama').data.dipasang, false); });
ujian('Pelawat tanpa log masuk tidak boleh memasang atau menukar kata laluan', () => {
  ditolak('pasangSistem', [borang]); ditolak('tetapKataLaluan', ['admin@contoh.my', 'Godam12345']);
  ditolak('setSemulaKataLaluanPentadbir', []); ditolak('tetapDB', ['ID']); ditolak('setupAwal', []); ditolak('maklumatPemasang', []);
  ditolak('pasangSistem', [borang], 'lain@domain.my');
  assert.strictEqual(P.helaian.Pengguna, undefined);
});
ujian('Borang tidak lengkap ditolak dan tiada akaun dicipta', () => {
  [{ namaSekolah: '' }, { adminEmel: 'salah' }, { kataLaluan: 'pendek' }, { tahun: 1900 }, { logo: 'javascript:alert(1)' }, { logo: 'data:image/svg+xml;base64,AAAA' }]
    .forEach(u => assert.throws(() => P.rpc('pasangSistem', [Object.assign({}, borang, u)], EMEL_PEMILIK)));
  assert.strictEqual((P.helaian.Pengguna || { d: [] }).d.length, 0);
});
let token;
ujian('Pemasangan berjaya dan log masuk berfungsi', () => {
  const r = P.rpc('pasangSistem', [borang], EMEL_PEMILIK);
  assert.strictEqual(r.dipasang, true);
  assert.strictEqual(P.ss.nama, 'DB eJawatankuasa - MRSM CTH');
  const l = P.api('login', { emel: 'ADMIN@contoh.my', kataLaluan: 'KataLaluan1' });
  assert.ok(l.success, l.message); token = l.data.token;
  assert.strictEqual(P.api('login', { emel: 'admin@contoh.my', kataLaluan: 'salah' }).success, false);
});
ujian('Pasang kali kedua ditolak; data sedia ada kekal', () => {
  assert.throws(() => P.rpc('pasangSistem', [Object.assign({}, borang, { adminEmel: 'lain@contoh.my' })], EMEL_PEMILIK), /sudah dipasang/);
  assert.strictEqual(P.helaian.Pengguna.d.length, 2);
});
ujian('Jenama awam hanya mendedahkan nama dan logo', () => {
  const d = P.api('jenama').data;
  assert.deepStrictEqual(Object.keys(d).sort(), ['dipasang', 'logo', 'namaRingkas', 'namaSekolah']);
  assert.strictEqual(d.namaSekolah, 'MRSM Contoh');
});
ujian('Sistem kosong: tahun pilihan wujud dan semua halaman membaca tanpa ralat', () => {
  const a = P.api('muatAsas', {}, token); assert.ok(a.success, a.message);
  assert.deepStrictEqual(a.data.tahun, [2027]); assert.strictEqual(a.data.tetapan.namaRingkas, 'MRSM CTH'); assert.strictEqual(a.data.posisi.length, 23);
  ['dashboard', 'senaraiJK', 'senaraiStaf', 'senaraiPosisi', 'laporanInduk', 'eksportTugasan', 'senaraiPengguna', 'bacaAudit'].forEach(f => {
    const r = P.api(f, { tahun: 2027, tapis: {} }, token); assert.ok(r.success, f + ': ' + r.message);
  });
  assert.strictEqual(P.api('dashboard', { tahun: 2027, tapis: {} }, token).data.kad.purata, 0);
});
const staf = [{ staffId: '1001', nama: 'ALI BIN ABU', jawatan: 'GURU', emel: 'ali@contoh.my', kategori: 'GURU', status: 'AKTIF' }, { staffId: '1002', nama: 'SITI BINTI AHMAD', jawatan: 'GURU', kategori: 'GURU', status: 'AKTIF' }, { staffId: '1003', nama: 'AMINAH BINTI ALI', jawatan: 'PEMBANTU', kategori: 'SOKONGAN', status: 'AKTIF' }];
const baris = [
  { kod: 'A01', nama: 'JK KURIKULUM', kategori: 'Akademik', staffId: '1001', namaStaf: 'ALI BIN ABU', jawatan: 'Pengerusi' },
  { kod: 'A01', nama: 'jk kurikulum', kategori: 'Akademik', staffId: '', namaStaf: 'SITI BT AHMAD', jawatan: 'Ahli' },
  { kod: 'A01', nama: 'JK KURIKULUM', kategori: 'Akademik', staffId: '1003', jawatan: 'Pengerusi' },
  { kod: 'A02', nama: 'JK HANYA ROSAK', staffId: '9999', jawatan: 'Ahli' },
  { kod: 'A03', nama: 'JK TANPA AHLI', kategori: 'Akademik' },
  { kod: 'A01', nama: 'JK KURIKULUM', staffId: '1002', jawatan: 'Jawatan Tiada' }
];
ujian('Import staf kemudian semakan JK & pelantikan melaporkan ralat setiap baris', () => {
  assert.ok(P.api('lulusImport', { baris: staf }, token).success);
  const r = P.api('semakImportJK', { baris, tahun: 2027 }, token); assert.ok(r.success, r.message);
  assert.deepStrictEqual(r.data.hasil.map(x => x.sah), [true, true, false, false, true, false]);
  assert.strictEqual(r.data.bilJKBaru, 2); assert.strictEqual(r.data.bilTugasanBaru, 2);
  assert.match(r.data.hasil[2].ralat.join(), /seorang pemegang/); assert.match(r.data.hasil[3].ralat.join(), /import staf dahulu/); assert.match(r.data.hasil[5].ralat.join(), /Jawatan Tiada/);
  assert.strictEqual(P.api('senaraiJK', { tahun: 2027 }, token).data.length, 0, 'semakan tidak boleh menulis');
});
ujian('Import diluluskan menulis baris sah; merit dikira; ulang import tidak menggandakan', () => {
  const r = P.api('lulusImportJK', { baris, tahun: 2027 }, token); assert.ok(r.success, r.message); assert.deepStrictEqual(r.data, { jk: 2, tugasan: 2 });
  const jk = P.api('senaraiJK', { tahun: 2027 }, token).data; assert.deepStrictEqual(jk.map(j => j.nama).sort(), ['JK KURIKULUM', 'JK TANPA AHLI']);
  const s = P.api('senaraiStaf', { tahun: 2027 }, token).data, ali = s.find(x => x.staffId === '1001'); assert.strictEqual(ali.total, 10);
  const u = P.api('lulusImportJK', { baris, tahun: 2027 }, token); assert.deepStrictEqual(u.data, { jk: 0, tugasan: 0 });
});
ujian('Eksport Semua pelantikan boleh diimport semula ke tahun lain (format sama)', () => {
  const ex = P.api('eksportTugasan', { tahun: 2027 }, token).data;
  const b2 = ex.map(r => ({ kod: r[0], nama: r[1], kategori: r[2], staffId: r[3], namaStaf: r[4], jawatan: r[5], kualifikasi: r[6] }));
  assert.deepStrictEqual(P.api('lulusImportJK', { baris: b2, tahun: 2028 }, token).data, { jk: 1, tugasan: 2 });
  assert.deepStrictEqual(P.api('muatAsas', {}, token).data.tahun, [2027, 2028]);
});
ujian('Import melebihi had ditolak dengan mesej yang jelas', () => {
  const r = P.api('lulusImportJK', { baris: new Array(3001).fill({ nama: 'X' }), tahun: 2027 }, token);
  assert.strictEqual(r.success, false); assert.match(r.message, /maksimum 3000/);
});
ujian('Viewer tidak boleh mengimport atau menukar tetapan', () => {
  assert.ok(P.api('simpanPengguna', { emel: 'v@contoh.my', nama: 'V', peranan: 'PELIHAT', kataLaluan: 'KataLaluan1', aktif: true }, token).success);
  const tv = P.api('login', { emel: 'v@contoh.my', kataLaluan: 'KataLaluan1' }).data.token;
  assert.strictEqual(P.api('lulusImportJK', { baris, tahun: 2027 }, tv).code, 'TIADA_AKSES');
  assert.strictEqual(P.api('simpanTetapan', { tetapan: { namaSekolah: 'X' } }, tv).code, 'TIADA_AKSES');
});
ujian('Tetapan: logo sah disimpan dan tidak masuk log audit; logo berbahaya ditolak', () => {
  const logo = 'data:image/png;base64,' + 'A'.repeat(40000);
  assert.ok(P.api('simpanTetapan', { tetapan: { logo, namaRingkas: 'CTH' } }, token).success);
  assert.strictEqual(P.api('jenama').data.logo, logo);
  assert.ok(!JSON.stringify(P.helaian.LogAudit.d).includes('AAAAAAAA'));
  assert.strictEqual(P.api('simpanTetapan', { tetapan: { logo: 'data:image/svg+xml;base64,AA' } }, token).success, false);
  assert.strictEqual(P.api('simpanTetapan', { tetapan: { logo: 'data:image/png;base64,' + 'A'.repeat(46000) } }, token).success, false);
});
ujian('Set semula kata laluan oleh pemilik berfungsi', () => {
  const m = P.rpc('setSemulaKataLaluanPentadbir', [], EMEL_PEMILIK), kata = m.split('Kata laluan baharu: ')[1];
  assert.ok(P.api('login', { emel: 'admin@contoh.my', kataLaluan: kata }).success);
});
ujian('MRSM SAS kekal: nilai asal sekolah muncul tanpa perubahan pangkalan data', () => {
  const Q = buatPersekitaran({ muatBenih: true }); Q.rpc('setupAwal', [], EMEL_PEMILIK);
  Q.rpc('tetapKataLaluan', [EMEL_PEMILIK, 'Ujian12345'], EMEL_PEMILIK);
  assert.strictEqual(Q.api('jenama').data.namaRingkas, 'MRSM SAS');
  const t = Q.api('login', { emel: EMEL_PEMILIK, kataLaluan: 'Ujian12345' }).data.token, a = Q.api('muatAsas', {}, t).data;
  assert.deepStrictEqual(a.tahun, [2026, 2027]); assert.strictEqual(a.tetapan.suratKepalaKiri, 'mara');
});
console.log(`\n${lulus} lulus, ${gagal} gagal`);
