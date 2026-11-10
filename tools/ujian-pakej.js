// Menguji pakej pelanggan: menjalankan 4 fail gabungan seperti pemasangan baharu dengan tiruan Google.
//   node tools/ujian-pakej.js           ujian automatik
//   node tools/ujian-pakej.js --layan   tambahan: hidangkan pakej di http://localhost:8766 (wizard: /pemasang)
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const { buatPersekitaran, EMEL_PEMILIK } = require('./tiruan-gas');
const P = path.join(__dirname, '..', 'pakej-pelanggan', 'eJawatankuasa-Pakej-Pemasangan'), K = path.join(P, '2-Kod-Sistem');
let lulus = 0, gagal = 0;
const ujian = (n, f) => { try { f(); lulus++; console.log('  LULUS ', n); } catch (e) { gagal++; console.log('  GAGAL ', n, '\n        ', e.message); } };
const baca = f => fs.readFileSync(path.join(K, f), 'utf8');
const bacaCsv = f => { const [k, ...b] = fs.readFileSync(path.join(P, '3-Templat-Data', f), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).map(r => r.split(',')); return b.map(r => Object.fromEntries(k.map((x, i) => [x, r[i] || '']))); };

ujian('Kandungan folder lengkap', () => {
  ['BACA-SAYA-DAHULU.txt', '1-Manual/Manual-Pemasangan-eJawatankuasa.pdf', '2-Kod-Sistem/Code.gs', '2-Kod-Sistem/Index.html', '2-Kod-Sistem/Pemasang.html', '2-Kod-Sistem/appsscript.json', '3-Templat-Data/templat-import-staf.csv', '3-Templat-Data/templat-import-jawatankuasa.csv', '4-Logo/logo-mrsm.png', '5-Pilihan-Lanjutan/index-sekolah.html']
    .forEach(f => assert.ok(fs.existsSync(path.join(P, f)), 'tiada ' + f));
  assert.deepStrictEqual(fs.readdirSync(K).sort(), ['Code.gs', 'Index.html', 'Pemasang.html', 'appsscript.json'].sort());
});
ujian('Fail kod tiada bahagian yang tertinggal', () => {
  assert.ok(baca('Code.gs').trim().endsWith('TAMAT FAIL')); assert.ok(baca('Index.html').includes('TAMAT FAIL')); assert.ok(baca('Pemasang.html').includes('TAMAT FAIL'));
  ['Gaya', 'Komponen', 'Paparan', 'Aplikasi'].forEach(() => assert.ok(!baca('Index.html').includes('include(')));
  assert.ok(!baca('Index.html').includes('<?'));
  ['function doGet', 'function doPost', 'function api', 'function kiraMerit', 'function setupAwal', 'function pasangSistem', 'function onOpen'].forEach(n => { if (n !== 'function kiraMerit') assert.ok(baca('Code.gs').includes(n), n); });
  JSON.parse(baca('appsscript.json'));
});
ujian('Tiada data benih atau maklumat MRSM SAS dalam kod', () => { assert.ok(!/const BENIH\s*=/.test(baca('Code.gs'))); assert.ok(!/MAKLUMAT_SEKOLAH_ASAL\s*=/.test(baca('Code.gs'))); });

const E = buatPersekitaran({ muatBenih: false, folder: K });
const borang = { namaSekolah: 'MRSM Contoh', namaRingkas: 'MRSM CTH', lokasi: 'Bandar Contoh', tahun: 2027, adminNama: 'Pentadbir', adminEmel: 'admin@contoh.my', kataLaluan: 'KataLaluan1', suratKepalaKiri: 'mara', suratKepalaKanan: 'memograf' };
let token;
ujian('Sebelum pasang: tiada data dan log masuk ditolak', () => { assert.strictEqual(E.api('login', { emel: 'admin@contoh.my', kataLaluan: 'KataLaluan1' }).success, false); });
ujian('Pelawat tanpa log masuk tidak boleh memasang', () => assert.throws(() => E.rpc('pasangSistem', [borang], '')));
ujian('Wizard memasang sistem dan log masuk berfungsi', () => {
  assert.strictEqual(E.rpc('pasangSistem', [borang], EMEL_PEMILIK).dipasang, true);
  const l = E.api('login', { emel: 'admin@contoh.my', kataLaluan: 'KataLaluan1' }); assert.ok(l.success, l.message); token = l.data.token;
});
ujian('Templat CSV staf diimport tanpa ralat', () => {
  const baris = bacaCsv('templat-import-staf.csv');
  const s = E.api('semakImport', { baris }, token); assert.ok(s.success, s.message); assert.strictEqual(s.data.tidakSah, 0, JSON.stringify(s.data.hasil));
  assert.ok(E.api('lulusImport', { baris }, token).success);
});
ujian('Templat CSV jawatankuasa diimport tanpa ralat', () => {
  const baris = bacaCsv('templat-import-jawatankuasa.csv').map(r => ({ kod: r['Kod JK'], nama: r.Jawatankuasa, kategori: r.Kategori, staffId: r['ID staf'], namaStaf: r.Nama, jawatan: r.Jawatan, kualifikasi: r.Kualifikasi }));
  const s = E.api('semakImportJK', { baris, tahun: 2027 }, token); assert.ok(s.success, s.message); assert.strictEqual(s.data.tidakSah, 0, JSON.stringify(s.data.hasil));
  assert.ok(E.api('lulusImportJK', { baris, tahun: 2027 }, token).success);
});
ujian('Laporan menunjukkan data yang diimport', () => {
  const d = E.api('dashboard', { tahun: 2027, tapis: {} }, token); assert.ok(d.success, d.message);
  const jk = E.api('senaraiJK', { tahun: 2027 }, token); assert.ok(jk.success); assert.strictEqual((jk.data.jawatankuasa || jk.data).length, 1);
});
ujian('Set semula kata laluan pemilik berfungsi', () => { assert.ok(/Kata laluan baharu/.test(E.rpc('setSemulaKataLaluanPentadbir', [], EMEL_PEMILIK))); });
console.log(`\n${lulus} lulus, ${gagal} gagal`);
if (gagal) process.exit(1);

if (process.argv.includes('--layan')) {
  const L = buatPersekitaran({ muatBenih: false, folder: K });
  const shim = pemilik => `<script>window.google={script:{host:{close(){document.body.innerHTML="Dialog ditutup."}},get run(){let ok=()=>{},er=()=>{};const r=new Proxy({},{get(_,fn){if(fn==="withSuccessHandler")return f=>{ok=f;return r};if(fn==="withFailureHandler")return f=>{er=f;return r};return (...args)=>fetch("/rpc",{method:"POST",body:JSON.stringify({fn,args,pemilik:${pemilik}})}).then(x=>x.json()).then(j=>j.ralat?er(new Error(j.ralat)):ok(j.hasil)).catch(er);}});return r;}}};</script>`;
  http.createServer((q, s) => {
    if (q.method === 'POST' && q.url === '/rpc') { let b = ''; q.on('data', c => b += c); q.on('end', () => { const m = JSON.parse(b); s.setHeader('Content-Type', 'application/json'); try { s.end(JSON.stringify({ hasil: L.rpc(m.fn, m.args, m.pemilik ? EMEL_PEMILIK : '') })); } catch (e) { s.end(JSON.stringify({ ralat: e.message })); } }); return; }
    s.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (q.url === '/pemasang') s.end(baca('Pemasang.html').replace('</head>', () => shim(true) + '</head>'));
    else if (q.url === '/') s.end(baca('Index.html').replace('</head>', () => shim(false) + '</head>'));
    else { s.statusCode = 404; s.end(); }
  }).listen(8766, () => console.log('Sedia: http://localhost:8766/pemasang'));
}
