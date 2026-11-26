// Ujian cache data pelayan (CacheService + memo setiap permintaan). Guna: node tools/ujian-cache.js
const assert = require('assert');
const { buatPersekitaran, EMEL_PEMILIK } = require('./tiruan-gas');
let lulus = 0, gagal = 0;
const ujian = (nama, fn) => { try { fn(); lulus++; console.log('  LULUS  ' + nama); } catch (e) { gagal++; process.exitCode = 1; console.log('  GAGAL  ' + nama + '\n         ' + e.message); } };

const P = buatPersekitaran({ muatBenih: true });
P.rpc('setupAwal', [], EMEL_PEMILIK);
P.rpc('tetapKataLaluan', [EMEL_PEMILIK, 'Ujian12345'], EMEL_PEMILIK);
P.kotak.__aktif = EMEL_PEMILIK;
P.jalan("tambah_('Pengguna',[{emel:'pelihat@ujian.my',nama:'P',peranan:'PELIHAT',aktif:true,garam:'g',hash:hash_('g','Ujian12345')}]);");
P.kotak.__aktif = '';
const masuk = emel => P.api('login', { emel, kataLaluan: 'Ujian12345' }).data.token;
const admin = masuk(EMEL_PEMILIK), pelihat = masuk('pelihat@ujian.my');

// Kira bacaan helaian sebenar (getValues) bagi setiap helaian.
let bacaan = {};
const Julat = Object.getPrototypeOf(P.helaian.Staf.getRange(1, 1));
const asal = Julat.getValues;
Julat.getValues = function () { bacaan[this.sh.n] = (bacaan[this.sh.n] || 0) + 1; return asal.call(this); };
const kira = fn => { bacaan = {}; const r = fn(); return { r, bacaan: Object.assign({}, bacaan) }; };

console.log('Ujian cache');
ujian('Permintaan pertama membaca helaian, permintaan kedua diambil dari cache', () => {
  P.rpc('batalCache_', [], '');
  const a = kira(() => P.api('muatAsas', {}, pelihat));
  assert.ok(a.r.success, a.r.message); assert.ok(a.bacaan.Staf >= 1, 'bacaan pertama dari helaian');
  const b = kira(() => P.api('muatAsas', {}, pelihat));
  assert.ok(b.r.success); assert.deepStrictEqual(b.r.data, a.r.data, 'data sama');
  assert.deepStrictEqual(b.bacaan, {}, 'tiada bacaan helaian: ' + JSON.stringify(b.bacaan));
});
ujian('Satu permintaan tidak membaca helaian yang sama dua kali', () => {
  P.rpc('batalCache_', [], '');
  const a = kira(() => P.api('laporanInduk', {}, pelihat));
  assert.ok(a.r.success, a.r.message);
  Object.keys(a.bacaan).forEach(n => assert.strictEqual(a.bacaan[n], 1, n + ' dibaca ' + a.bacaan[n] + ' kali'));
});
ujian('Penulisan membatalkan cache: semua pengguna terus nampak data baharu', () => {
  P.api('muatAsas', {}, pelihat);
  const s = P.api('muatAsas', {}, admin).data.staf[0];
  const r = P.api('simpanStaf', { staf: Object.assign({}, s, { nama: 'NAMA UJIAN CACHE' }) }, admin);
  assert.ok(r.success, r.message);
  const x = P.api('muatAsas', {}, pelihat).data.staf.filter(t => t.staffId === s.staffId)[0];
  assert.strictEqual(x.nama, 'NAMA UJIAN CACHE');
});
ujian('Simpan: semakan guna cache; hanya helaian yang diubah dibaca semula (write-through)', () => {
  P.api('muatAsas', {}, pelihat);
  const s = P.api('muatAsas', {}, admin).data.staf[1];
  const a = kira(() => P.api('simpanStaf', { staf: Object.assign({}, s, { catatan: 'x' }) }, admin));
  assert.ok(a.r.success, a.r.message);
  ['Jawatankuasa', 'Tugasan', 'Posisi', 'TetapanMerit', 'Tetapan', 'Pengguna'].forEach(n => assert.ok(!a.bacaan[n], n + ' tidak patut dibaca dari helaian'));
  const b = kira(() => P.api('muatAsas', {}, pelihat));
  assert.deepStrictEqual(b.bacaan, {}, 'muat semula selepas simpan terus dari cache: ' + JSON.stringify(b.bacaan));
  assert.strictEqual(b.r.data.staf.filter(t => t.staffId === s.staffId)[0].staffId, s.staffId);
});
ujian('Padam JK bersama banyak tugasan: semua tugasan JK itu sahaja dibuang', () => {
  const d = P.api('muatAsas', {}, admin).data;
  const jk = P.jalan("JSON.stringify(baca_('Jawatankuasa').filter(function(j){return Number(j.tahun)===2027;}).map(function(j){return j.jkId;}))");
  const ts = JSON.parse(P.jalan("JSON.stringify(baca_('Tugasan'))"));
  const id = JSON.parse(jk).sort((x, y) => ts.filter(t => t.jkId === y).length - ts.filter(t => t.jkId === x).length)[0];
  const bil = ts.filter(t => t.jkId === id).length, jumlah = ts.length;
  assert.ok(bil > 3, 'JK ujian ada ' + bil + ' tugasan');
  const r = P.api('padamJK', { jkId: id, paksa: true }, admin); assert.ok(r.success, r.message);
  const baki = JSON.parse(P.jalan("JSON.stringify(baca_('Tugasan'))"));
  assert.strictEqual(baki.length, jumlah - bil); assert.ok(!baki.some(t => t.jkId === id));
  assert.strictEqual(P.helaian.Tugasan.d.length - 1, jumlah - bil, 'helaian sebenar selaras');
  assert.ok(!P.api('laporanInduk', {}, pelihat).data.jk?.some?.(j => j.jkId === id));
});
ujian('Pengguna dinyahaktif atau tukar kata laluan berkesan serta-merta', () => {
  assert.ok(P.api('muatAsas', {}, pelihat).success);
  const r = P.api('simpanPengguna', { emel: 'pelihat@ujian.my', nama: 'P', peranan: 'PELIHAT', aktif: false }, admin);
  assert.ok(r.success, r.message);
  assert.strictEqual(P.api('muatAsas', {}, pelihat).code, 'TAMAT_SESI');
  const t = masuk(EMEL_PEMILIK);
  assert.ok(P.api('tukarKata', { lama: 'Ujian12345', baru: 'Baharu123' }, t).success);
  assert.ok(!P.api('login', { emel: EMEL_PEMILIK, kataLaluan: 'Ujian12345' }).success, 'kata laluan lama ditolak');
  assert.ok(P.api('login', { emel: EMEL_PEMILIK, kataLaluan: 'Baharu123' }).success, 'kata laluan baharu diterima');
});
ujian('Ubah Tetapan terus kelihatan', () => {
  assert.ok(P.api('simpanTetapan', { tetapan: { ambangTinggi: '140' } }, admin).success);
  assert.strictEqual(String(P.api('muatAsas', {}, admin).data.tetapan.ambangTinggi), '140');
});
ujian('Data besar dipecah kepada beberapa cebisan cache dan dicantum semula', () => {
  P.rpc('batalCache_', [], '');
  const a = P.api('laporanInduk', {}, admin).data;
  const b = kira(() => P.api('laporanInduk', {}, admin));
  assert.deepStrictEqual(b.r.data, a); assert.deepStrictEqual(b.bacaan, {});
  const tugasan = P.jalan("JSON.stringify(baca_('Tugasan')).length");
  assert.ok(tugasan > 30000, 'Tugasan melebihi satu cebisan (' + tugasan + ' aksara)');
});
ujian('Kegagalan CacheService tidak menjejaskan bacaan', () => {
  const c = P.kotak.CacheService, simpan = c.getScriptCache, ralat = P.kotak.console.error; let bilRalat = 0;
  P.kotak.console.error = () => { bilRalat++; };
  const sesi = simpan();
  c.getScriptCache = () => ({ get: k => (/^s_|^cuba_/.test(k) ? sesi.get(k) : (() => { throw new Error('rosak'); })()), put: (k, v, s) => sesi.put(k, v, s), remove: k => sesi.remove(k),
    getAll() { throw new Error('rosak'); }, putAll() { throw new Error('rosak'); } });
  try { const r = P.api('muatAsas', {}, admin); assert.ok(r.success, r.message); } finally { c.getScriptCache = simpan; P.kotak.console.error = ralat; }
  assert.ok(bilRalat <= 2, 'cache rosak dicuba ' + bilRalat + ' kali dalam satu permintaan');
});

console.log(`\n${lulus} lulus, ${gagal} gagal`);
