// Ujian logik merit. Guna: node tools/ujian.js
const assert = require('assert');
const L = require('../gas/Logik.gs');
const b = require('../data/benih.json');
let lulus = 0;
const ujian = (nama, fn) => { try { fn(); lulus++; console.log('  LULUS  ' + nama); } catch (e) { console.log('  GAGAL  ' + nama + '\n         ' + e.message); process.exitCode = 1; } };
const ID = b.staf[0].staffId;
const klon = o => JSON.parse(JSON.stringify(o));
const data = () => ({ staf: klon(b.staf), jawatankuasa: klon(b.jawatankuasa), posisi: klon(b.posisi),
  tetapanMerit: b.posisi.map(p => ({ tahun: 2027, posisiId: p.posisiId, merit: p.merit })), tugasan: klon(b.tugasan) });
const T = { ambangTinggi: 130, ambangRendah: 50, posisiWajib: 'Pengerusi|Penyelaras|Presiden|Ketua Jabatan/Unit|Guru Penasihat' };
const posId = n => b.posisi.find(p => p.nama === n).posisiId;

console.log('Ujian logik merit');
ujian('Contoh brief: Pengerusi 10 + Setiausaha 8 + Ahli 5 = 23', () => {
  const d = { staf: [{ staffId: 'X', nama: 'X', kategori: 'GURU', status: 'AKTIF' }],
    jawatankuasa: [1, 2, 3].map(i => ({ jkId: 'J' + i, tahun: 2027, nama: 'J' + i, status: 'AKTIF' })), posisi: b.posisi,
    tetapanMerit: [], tugasan: [['J1', 'Pengerusi'], ['J2', 'Setiausaha'], ['J3', 'Ahli Jawatankuasa']].map(([j, p], i) => ({ asgId: 'a' + i, tahun: 2027, jkId: j, staffId: 'X', posisiId: posId(p), status: 'AKTIF' })) };
  assert.strictEqual(L.kiraMerit(d, 2027).X.total, 23);
  assert.strictEqual(L.kiraMerit(d, 2027).X.bil, 3);
});
ujian('Menambah tugasan mengemas kini jumlah', () => {
  const d = data(); const id = ID; const a = L.kiraMerit(d, 2027)[id].total;
  d.tugasan.push({ asgId: 'Z1', tahun: 2027, jkId: d.jawatankuasa[0].jkId, staffId: id, posisiId: posId('Bendahari'), kualifikasi: 'UJIAN', status: 'AKTIF' });
  assert.strictEqual(L.kiraMerit(d, 2027)[id].total, a + 7);
});
ujian('Membuang tugasan mengira semula', () => {
  const d = data(); const t = d.tugasan.find(x => x.staffId === ID); const a = L.kiraMerit(d, 2027)[ID].total;
  const m = L.kiraMerit(d, 2027)[ID].butiran.find(x => x.asgId === t.asgId).merit;
  d.tugasan = d.tugasan.filter(x => x !== t);
  assert.strictEqual(L.kiraMerit(d, 2027)[ID].total, a - m);
});
ujian('Mengubah merit jawatan menjejaskan semua pemegang', () => {
  const d = data(); const a = L.kiraMerit(d, 2027); d.tetapanMerit.find(x => x.posisiId === posId('Ahli Jawatankuasa')).merit = 6;
  const c = L.kiraMerit(d, 2027); const id = ID;
  const bilAhli = a[id].butiran.filter(x => x.posisiNama === 'Ahli Jawatankuasa').length;
  assert.strictEqual(c[id].total - a[id].total, bilAhli);
});
ujian('Tugasan tidak AKTIF dan tahun lain tidak dikira', () => {
  const d = data(); const a = L.kiraMerit(d, 2027)[ID].total;
  d.tugasan.push({ asgId: 'Z2', tahun: 2026, jkId: d.jawatankuasa[0].jkId, staffId: ID, posisiId: posId('Pengerusi'), status: 'AKTIF' });
  d.tugasan.push({ asgId: 'Z3', tahun: 2027, jkId: d.jawatankuasa[0].jkId, staffId: ID, posisiId: posId('Pengerusi'), status: 'DIBATALKAN' });
  assert.strictEqual(L.kiraMerit(d, 2027)[ID].total, a);
});
ujian('Pendua dikesan', () => {
  const d = data(); const t = d.tugasan.find(x => x.staffId === ID);
  assert.ok(L.semakTugasan({ tahun: 2027, jkId: t.jkId, staffId: t.staffId, posisiId: t.posisiId, kualifikasi: t.kualifikasi }, d).some(r => /pendua/.test(r)));
  assert.strictEqual(L.semakTugasan({ asgId: t.asgId, tahun: 2027, jkId: t.jkId, staffId: t.staffId, posisiId: t.posisiId, kualifikasi: t.kualifikasi }, d).length, 0, 'sunting diri sendiri mesti sah');
});
ujian('Jawatan seorang pemegang ditolak jika sudah ada', () => {
  const d = data(); const pg = d.tugasan.find(x => x.posisiId === posId('Pengerusi') && x.tahun === 2027);
  const r = L.semakTugasan({ tahun: 2027, jkId: pg.jkId, staffId: ID, posisiId: pg.posisiId, kualifikasi: pg.kualifikasi }, d);
  assert.ok(r.some(x => /seorang pemegang/.test(x)), r.join('|'));
});
ujian('Had per staf dan input tidak sah ditolak', () => {
  const d = data(); d.posisi.find(p => p.nama === 'Bendahari').hadPerStaf = 1;
  const x = d.tugasan.find(t => t.posisiId === posId('Bendahari') && t.staffId !== 'J05');
  const r = L.semakTugasan({ tahun: 2027, jkId: d.jawatankuasa[5].jkId, staffId: x.staffId, posisiId: x.posisiId }, d);
  assert.ok(r.some(y => /Had jawatan/.test(y)), r.join('|'));
  assert.ok(L.semakTugasan({ tahun: 2027, jkId: 'XX', staffId: 'XX', posisiId: 'XX' }, d).length >= 3);
});
ujian('Pratonton kesan tepat', () => {
  const d = data(); const k = L.pratontonKesan({ tahun: 2027, jkId: d.jawatankuasa[0].jkId, staffId: ID, posisiId: posId('Bendahari') }, d, { jenis: 'tambah' });
  assert.strictEqual(k[0].beza, 7); assert.strictEqual(k[0].bilSelepas, k[0].bilSebelum + 1);
});
ujian('Ex-officio/pemegang tempat diasingkan daripada analisis', () => {
  const d = data(); const r = L.ringkasDashboard(d, 2027, T);
  assert.ok(!r.ranking.some(x => /^[JR]\d/.test(x.staffId)));
  assert.strictEqual(r.kad.bilStaf, d.staf.filter(L.masukAnalisis).length);
});
ujian('Dashboard sepadan dengan rekod tugasan', () => {
  const d = data(); const r = L.ringkasDashboard(d, 2027, T);
  const jumlah = r.ranking.reduce((a, x) => a + x.total, 0);
  const m = L.kiraMerit(d, 2027); const ms = Object.values(m).filter((_, i) => true);
  let jangka = 0; d.staf.filter(L.masukAnalisis).forEach(s => jangka += m[s.staffId].total);
  assert.strictEqual(jumlah, jangka); assert.strictEqual(r.kad.jumlahMerit, jangka);
  assert.strictEqual(r.kad.bilJK, d.jawatankuasa.filter(j => j.tahun === 2027).length);
});
ujian('Cadangan calon mengecualikan ahli sedia ada & ex-officio', () => {
  const d = data(); const jk = d.jawatankuasa[3].jkId; const c = L.cadangCalon(d, 2027, jk, T, 10);
  const dalam = new Set(d.tugasan.filter(t => t.jkId === jk).map(t => t.staffId));
  assert.ok(c.length === 10 && c.every(x => !dalam.has(x.staffId)) && c.every((x, i) => i === 0 || c[i - 1].total <= x.total));
});
ujian('Import: ID pendua & emel tidak sah dikesan, tiada penimpaan', () => {
  const r = L.semakImportStaf([{ staffId: ID, nama: 'BARU', emel: 'x' }, { staffId: '9', nama: 'A', emel: 'a@b.co' }, { staffId: '9', nama: 'B' }], b.staf);
  assert.ok(!r[0].sah && !r[2].sah && r[1].sah);
});
ujian('Banding tahun', () => {
  const d = data(); const r = L.bandingTahun(d, 2026, 2027); assert.strictEqual(r.jumlahA, 0); assert.ok(r.jumlahB > 0);
});
console.log('\n' + lulus + ' ujian lulus');
const r = L.ringkasDashboard(data(), 2027, T);
console.log('Ringkasan 2027:', JSON.stringify(r.kad));
console.log('Teratas:', r.ranking.slice(0, 3).map(x => x.nama + ' ' + x.total).join(' | '));


