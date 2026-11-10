// Ujian modul Takwim Sekolah (API pelayan). Guna: node tools/ujian-takwim.js
const assert = require('assert');
const { buatPersekitaran, EMEL_PEMILIK } = require('./tiruan-gas');
let lulus = 0, gagal = 0;
const ujian = (nama, fn) => { try { fn(); lulus++; console.log('  LULUS  ' + nama); } catch (e) { gagal++; process.exitCode = 1; console.log('  GAGAL  ' + nama + '\n         ' + e.message); } };

// Pemasangan lama (data benih) yang belum mempunyai helaian Takwim
const P = buatPersekitaran({ muatBenih: true });
P.rpc('setupAwal', [], EMEL_PEMILIK);
P.rpc('tetapKataLaluan', [EMEL_PEMILIK, 'Ujian12345'], EMEL_PEMILIK);
P.kotak.__aktif = EMEL_PEMILIK;
P.jalan("tambah_('Pengguna',[{emel:'pelihat@ujian.my',nama:'P',peranan:'PELIHAT',aktif:true,garam:'g',hash:hash_('g','Ujian12345')},{emel:'pengurus@ujian.my',nama:'E',peranan:'PENGURUS',aktif:true,garam:'g',hash:hash_('g','Ujian12345')}]);");
P.kotak.__aktif = '';
const masuk = emel => P.api('login', { emel, kataLaluan: 'Ujian12345' }).data.token;
const admin = masuk(EMEL_PEMILIK), editor = masuk('pengurus@ujian.my'), pelihat = masuk('pelihat@ujian.my');

const bulan = [{ y: 2026, m: 1, label: 'Februari' }, { y: 2026, m: 2, label: 'Mac' }];
const contoh = () => ({
  title: 'TAKWIM CONTOH SESI 2026 / 2027', months: bulan, notes: ['SG : Sekolah Ganti'],
  cats: [{ id: 'FF0000', name: 'PEPERIKSAAN', color: '#FF0000', legend: true }],
  days: { '2026-02-16': { t: 'Mula Persekolahan\nT1', mk: 'α', s: 1 }, '2026-02-17': { c: 'FF0000', s: 1 }, '2026-03-02': { t: '=HYPERLINK("x")', c: 'TIADA' } }
});

console.log('Ujian Takwim');
ujian('Helaian Takwim belum wujud: bacaan pulangkan kosong', () => {
  delete P.helaian.Takwim;
  const r = P.api('takwimDapat', { tahun: 2026 }, pelihat);
  assert.ok(r.success, r.message); assert.deepStrictEqual(r.data, { senarai: [], takwim: null });
});
ujian('Viewer tidak boleh menyimpan; Editor tidak boleh memadam', () => {
  assert.strictEqual(P.api('takwimSimpan', { takwim: contoh() }, pelihat).code, 'TIADA_AKSES');
  assert.strictEqual(P.api('takwimPadam', { tahun: 2026 }, editor).code, 'TIADA_AKSES');
  assert.strictEqual(P.api('takwimDapat', { tahun: 2026 }, 'token-palsu').code, 'TAMAT_SESI');
});
ujian('Editor menyimpan takwim; helaian dicipta automatik; data dibersihkan', () => {
  const r = P.api('takwimSimpan', { takwim: contoh() }, editor);
  assert.ok(r.success, r.message); assert.strictEqual(r.data.tahun, 2026);
  assert.ok(P.helaian.Takwim, 'helaian dicipta');
  const d = P.api('takwimDapat', { tahun: 2026 }, pelihat).data.takwim;
  assert.strictEqual(d.title, 'TAKWIM CONTOH SESI 2026 / 2027');
  assert.strictEqual(d.days['2026-02-16'].t, 'Mula Persekolahan\nT1');   // baris baharu dikekalkan
  assert.strictEqual(d.days['2026-02-16'].mk, 'α');
  assert.strictEqual(d.days['2026-03-02'].c, undefined);                  // kategori tidak wujud dibuang
  assert.deepStrictEqual(d.notes, ['SG : Sekolah Ganti']);
  // Tiada sel bermula dengan aksara formula
  P.helaian.Takwim.d.slice(1).forEach(b => b.forEach(x => assert.ok(!/^[=+\-@]/.test(String(x)), 'sel formula: ' + x)));
});
ujian('Simpan semula tahun sama menggantikan baris (tiada pendua) dan direkod dalam audit', () => {
  const t = contoh(); t.days['2026-02-18'] = { t: 'Acara baharu' };
  assert.ok(P.api('takwimSimpan', { takwim: t }, editor).success);
  assert.strictEqual(P.helaian.Takwim.d.length, 2);
  assert.strictEqual(P.api('takwimDapat', { tahun: 2026 }, pelihat).data.takwim.days['2026-02-18'].t, 'Acara baharu');
  const log = P.helaian.LogAudit.d.map(b => b[2]);
  assert.ok(log.includes('TAMBAH_TAKWIM') && log.includes('UBAH_TAKWIM'));
});
ujian('Beberapa tahun disimpan berasingan dan disenaraikan', () => {
  const t = contoh(); t.months = [{ y: 2027, m: 0, label: 'Januari' }]; t.days = { '2027-01-04': { t: 'Mula 2027', s: 1 } };
  assert.ok(P.api('takwimSimpan', { takwim: t }, admin).success);
  const r = P.api('takwimDapat', { tahun: 2027 }, pelihat).data;
  assert.deepStrictEqual(r.senarai.map(x => x.tahun), [2026, 2027]);
  assert.strictEqual(r.takwim.days['2027-01-04'].t, 'Mula 2027');
});
ujian('Takwim besar dipecah ke beberapa sel di bawah had 50,000 aksara', () => {
  const t = contoh(); t.days = {};
  for (let i = 0; i < 365; i++) { const d = new Date(2026, 1, 1 + i); t.days[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = { t: 'X'.repeat(380) + i, s: 1 }; }
  const r = P.api('takwimSimpan', { takwim: t }, editor);
  assert.ok(r.success, r.message);
  const d = P.api('takwimDapat', { tahun: 2026 }, pelihat).data.takwim;
  assert.strictEqual(Object.keys(d.days).length, 365);
  assert.ok(d.days['2026-12-31'].t.endsWith('333'));
});
ujian('Input tidak sah ditolak', () => {
  [{ months: [] }, { months: [{ y: 1800, m: 0 }] }, { months: [{ y: 2026, m: 12 }] }, { days: { 'bukan-tarikh': { t: 'x' } } },
    { cats: [{ id: 'A B', name: 'x', color: '#fff' }] }].forEach(u => {
    const r = P.api('takwimSimpan', { takwim: Object.assign(contoh(), u) }, editor);
    assert.strictEqual(r.success, false, JSON.stringify(u));
  });
  assert.strictEqual(P.api('takwimSimpan', { takwim: null }, editor).success, false);
});
ujian('Tahun simpanan mengikut pilihan pengguna (±1 tahun sahaja)', () => {
  const r = P.api('takwimSimpan', { takwim: contoh(), tahun: 2027 }, editor);   // takwim bermula Feb 2026, disimpan sebagai 2027
  assert.ok(r.success, r.message); assert.strictEqual(r.data.tahun, 2027);
  const d = P.api('takwimDapat', { tahun: 2027 }, pelihat).data.takwim;
  assert.strictEqual(d.tahun, 2027); assert.ok(d.days['2026-02-16'], 'tarikh asal tidak diubah');
  assert.strictEqual(P.api('takwimSimpan', { takwim: contoh(), tahun: 2030 }, editor).success, false);
  assert.strictEqual(P.api('takwimSimpan', { takwim: contoh(), tahun: 'abc' }, editor).success, false);
  // Sunting semula takwim 2027 kekal sebagai 2027 (tidak kembali ke 2026)
  assert.ok(P.api('takwimSimpan', { takwim: Object.assign(contoh(), { title: 'Diubah' }), tahun: 2027 }, editor).success);
  assert.strictEqual(P.api('takwimDapat', { tahun: 2027 }, pelihat).data.takwim.title, 'Diubah');
});
ujian('Edit serentak: simpanan berdasarkan salinan lama ditolak, edit pertama tidak hilang', () => {
  assert.ok(P.api('takwimSimpan', { takwim: contoh(), tahun: 2026 }, editor).success);   // set semula data
  const a = P.api('takwimDapat', { tahun: 2026 }, editor).data.takwim;   // Editor A buka
  const b = P.api('takwimDapat', { tahun: 2026 }, admin).data.takwim;    // Admin B buka serentak
  assert.ok(a.versi && a.versi === b.versi);
  a.days['2026-04-01'] = { t: 'Edit A' };
  assert.ok(P.api('takwimSimpan', { takwim: a, tahun: 2026, versi: a.versi }, editor).success);
  b.days['2026-04-02'] = { t: 'Edit B' };
  const r = P.api('takwimSimpan', { takwim: b, tahun: 2026, versi: b.versi }, admin);
  assert.strictEqual(r.success, false); assert.ok(/muat semula/.test(r.message), r.message);
  const d = P.api('takwimDapat', { tahun: 2026 }, pelihat).data.takwim;
  assert.strictEqual(d.days['2026-04-01'].t, 'Edit A'); assert.strictEqual(d.days['2026-04-02'], undefined);
  // Selepas muat semula (versi baharu), B boleh menyimpan dan edit A kekal
  d.days['2026-04-02'] = { t: 'Edit B' };
  assert.ok(P.api('takwimSimpan', { takwim: d, tahun: 2026, versi: d.versi }, admin).success);
  const e = P.api('takwimDapat', { tahun: 2026 }, pelihat).data.takwim;
  assert.strictEqual(e.days['2026-04-01'].t, 'Edit A'); assert.strictEqual(e.days['2026-04-02'].t, 'Edit B');
  // Import/ganti Excel (versi '') tetap dibenarkan
  assert.ok(P.api('takwimSimpan', { takwim: contoh(), tahun: 2026, versi: '' }, editor).success);
});
ujian('Admin memadam takwim', () => {
  assert.ok(P.api('takwimPadam', { tahun: 2027 }, admin).success);
  assert.deepStrictEqual(P.api('takwimDapat', { tahun: 2027 }, pelihat).data.senarai.map(x => x.tahun), [2026]);
});
console.log(`\n${lulus} lulus, ${gagal} gagal`);
