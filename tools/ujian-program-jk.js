// Ujian tarikh berlangsung jawatankuasa (helaian JKProgram). Guna: node tools/ujian-program-jk.js
const assert = require('assert');
const { buatPersekitaran, EMEL_PEMILIK } = require('./tiruan-gas');
let lulus = 0, gagal = 0;
const ujian = (nama, fn) => { try { fn(); lulus++; console.log('  LULUS  ' + nama); } catch (e) { gagal++; process.exitCode = 1; console.log('  GAGAL  ' + nama + '\n         ' + e.message); } };

const P = buatPersekitaran({ muatBenih: false });
const borang = { namaSekolah: 'MRSM Contoh', namaRingkas: 'MRSM CTH', lokasi: 'Bandar, Negeri', tahun: 2026, pengetuaNama: 'X', pengetuaJawatan: 'Pengetua', suratDaripada: 'Pengetua', suratKepalaKiri: 'a', suratKepalaKanan: 'b', suratCogan: 'c', adminEmel: 'admin@contoh.my', adminNama: 'Admin', kataLaluan: 'KataLaluan1' };
P.rpc('pasangSistem', [borang], EMEL_PEMILIK);
P.kotak.__aktif = EMEL_PEMILIK;
P.jalan("tambah_('Pengguna',[{emel:'pelihat@ujian.my',nama:'P',peranan:'PELIHAT',aktif:true,garam:'g',hash:hash_('g','Ujian12345')},{emel:'pengurus@ujian.my',nama:'E',peranan:'PENGURUS',aktif:true,garam:'g',hash:hash_('g','Ujian12345')}]);");
P.kotak.__aktif = '';
const admin = P.api('login', { emel: 'admin@contoh.my', kataLaluan: 'KataLaluan1' }).data.token;
const editor = P.api('login', { emel: 'pengurus@ujian.my', kataLaluan: 'Ujian12345' }).data.token, pelihat = P.api('login', { emel: 'pelihat@ujian.my', kataLaluan: 'Ujian12345' }).data.token;
['A', 'B', 'C'].forEach((n, i) => { const r = P.api('simpanJK', { tahun: 2026, jk: { tahun: 2026, kod: 'K' + (i + 1), nama: 'JAWATANKUASA ' + n } }, editor); assert.ok(r.success, r.message); });
const jk = P.api('senaraiJK', { tahun: 2026 }, admin).data;
const [A, B, C] = jk.map(x => x.jkId);
const takwimSebelum = JSON.stringify(P.helaian.Takwim ? P.helaian.Takwim.d : null);

console.log('Ujian Tarikh Program JK');
ujian('Helaian belum wujud: bacaan pulangkan senarai kosong', () => {
  delete P.helaian.JKProgram;
  const r = P.api('programJKDapat', { tahun: 2026 }, pelihat); assert.ok(r.success, r.message); assert.deepStrictEqual(r.data.program, []);
});
ujian('Viewer tidak boleh menambah/padam; token palsu ditolak', () => {
  assert.strictEqual(P.api('programJKSimpan', { jkId: A, senarai: [{ mula: '2027-03-01' }] }, pelihat).code, 'TIADA_AKSES');
  assert.strictEqual(P.api('programJKPadam', { progId: 'PG00001' }, pelihat).code, 'TIADA_AKSES');
  assert.strictEqual(P.api('programJKDapat', {}, 'palsu').code, 'TAMAT_SESI');
});
ujian('Editor tambah beberapa tarikh; helaian dicipta; tarikh kekal teks', () => {
  const r = P.api('programJKSimpan', { jkId: A, senarai: [{ mula: '2026-03-02', akhir: '2026-03-04', tajuk: 'Majlis A', sumber: 'TAKWIM' }, { mula: '2026-05-10' }] }, editor);
  assert.ok(r.success, r.message); assert.strictEqual(r.data.bil, 2);
  const s = P.api('programJKDapat', { tahun: 2026 }, pelihat).data.program;
  assert.strictEqual(s.length, 2); assert.strictEqual(s[0].mula, '2026-03-02'); assert.strictEqual(s[0].akhir, '2026-03-04'); assert.strictEqual(s[1].akhir, '2026-05-10');
  assert.strictEqual(s[0].kod, 'K1'); assert.strictEqual(s[0].sumber, 'TAKWIM'); assert.strictEqual(s[1].sumber, 'MANUAL');
});
ujian('Banyak JK serentak ke satu tarikh; pendua dilangkau', () => {
  const r = P.api('programJKSimpan', { jkIds: [A, B, C], senarai: [{ mula: '2026-03-02', akhir: '2026-03-04', tajuk: 'Majlis A' }] }, editor);
  assert.ok(r.success, r.message); assert.strictEqual(r.data.bil, 2); assert.strictEqual(r.data.langkau, 1);
  assert.strictEqual(P.api('programJKSimpan', { jkIds: [A, B], senarai: [{ mula: '2026-03-02', akhir: '2026-03-04', tajuk: 'Majlis A' }] }, editor).success, false);
});
ujian('Tarikh tidak sah, songsang, terlalu panjang dan JK tiada ditolak', () => {
  ['2026-02-30', '03/03/2026', '', 'abc'].forEach(m => assert.strictEqual(P.api('programJKSimpan', { jkId: A, senarai: [{ mula: m }] }, editor).success, false, m));
  assert.strictEqual(P.api('programJKSimpan', { jkId: A, senarai: [{ mula: '2026-04-10', akhir: '2026-04-01' }] }, editor).success, false);
  assert.strictEqual(P.api('programJKSimpan', { jkId: A, senarai: [{ mula: '2026-01-01', akhir: '2026-06-01' }] }, editor).success, false);
  assert.strictEqual(P.api('programJKSimpan', { jkId: 'JK99999', senarai: [{ mula: '2026-04-01' }] }, editor).success, false);
});
ujian('Teks berformula dilindungi', () => {
  assert.ok(P.api('programJKSimpan', { jkId: B, senarai: [{ mula: '2026-06-01', tajuk: '=HYPERLINK("x")' }] }, editor).success);
  P.helaian.JKProgram.d.slice(1).forEach(b => b.forEach(x => assert.ok(!/^[=+\-@]/.test(String(x)), 'sel formula: ' + x)));
});
ujian('Sunting dan padam', () => {
  const p = P.api('programJKDapat', { tahun: 2026 }, pelihat).data.program.filter(x => x.jkId === A && x.mula === '2026-05-10')[0];
  assert.ok(P.api('programJKSimpan', { progId: p.progId, program: { mula: '2026-05-12', tajuk: 'Ubah' } }, editor).success);
  const q = P.api('programJKDapat', { tahun: 2026 }, pelihat).data.program.filter(x => x.progId === p.progId)[0];
  assert.strictEqual(q.mula, '2026-05-12'); assert.strictEqual(q.akhir, '2026-05-12'); assert.strictEqual(q.tajuk, 'Ubah');
  assert.ok(P.api('programJKPadam', { progId: p.progId }, editor).success);
  assert.strictEqual(P.api('programJKPadam', { progId: p.progId }, editor).success, false);
});
ujian('Padam JK turut memadam tarikhnya; JK lain tidak terkesan', () => {
  const sebelum = P.api('programJKDapat', { tahun: 2026 }, pelihat).data.program, bilB = sebelum.filter(x => x.jkId === B).length;
  assert.ok(bilB > 0);
  assert.ok(P.api('padamJK', { jkId: A, paksa: true }, admin).success);
  const kini = P.api('programJKDapat', { tahun: 2026 }, pelihat).data.program;
  assert.strictEqual(kini.filter(x => x.jkId === A).length, 0); assert.strictEqual(kini.filter(x => x.jkId === B).length, bilB);
  assert.strictEqual(P.helaian.JKProgram.d.slice(1).filter(b => b[2] === A).length, 0);
});
ujian('Data Takwim tidak berubah', () => assert.strictEqual(JSON.stringify(P.helaian.Takwim ? P.helaian.Takwim.d : null), takwimSebelum));
console.log(`\n${lulus} lulus, ${gagal} gagal`);
