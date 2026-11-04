// Membina pakej untuk sekolah lain di folder dist/:
//   dist/templat/            kod Apps Script bersih (tanpa data staf dan tanpa maklumat MRSM SAS)
//   dist/index-sekolah.html  antara muka untuk GitHub Pages (pilihan lanjutan; API_URL perlu diisi)
// Binaan GAGAL jika mana-mana nama, emel atau No. Gaji staf ditemui dalam pakej.
// Guna: node tools/bina-templat.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const akar = path.join(__dirname, '..'), gas = path.join(akar, 'gas'), dist = path.join(akar, 'dist'), keluar = path.join(dist, 'templat');
const DIKECUALIKAN = ['BenihData.gs', 'SekolahIni.gs'];

fs.mkdirSync(keluar, { recursive: true });
// Kekalkan .clasp.json (penunjuk ke projek templat), buang fail lain supaya tiada sisa lama.
fs.readdirSync(keluar).filter(f => f !== '.clasp.json').forEach(f => fs.rmSync(path.join(keluar, f), { force: true }));
fs.readdirSync(gas).filter(f => !DIKECUALIKAN.includes(f)).forEach(f => fs.copyFileSync(path.join(gas, f), path.join(keluar, f)));

const CONTOH_API = 'https://script.google.com/macros/s/ISI_ID_ANDA/exec';
const web = path.join(dist, 'index-sekolah.html');
execFileSync(process.execPath, [path.join(__dirname, 'bina-web.js'), CONTOH_API, web], { stdio: 'ignore' });

// Semakan kebocoran data
const larangan = [/sultan azlan/i, /mrsmsas/i, /mrsm sas/i, /kuala kangsar/i, /khairil/i, /@mara\.gov\.my/i, /AKfycb/, /logo-mrsm/i];
const fBenih = path.join(akar, 'data', 'benih.json');
if (fs.existsSync(fBenih)) {
  const b = JSON.parse(fs.readFileSync(fBenih, 'utf8'));
  b.staf.forEach(s => {
    if (String(s.nama).trim().includes(' ')) larangan.push(new RegExp(String(s.nama).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    if (s.emel) larangan.push(new RegExp(String(s.emel).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    if (/^\d{5,}$/.test(String(s.staffId))) larangan.push(new RegExp('\\b' + s.staffId + '\\b'));
  });
}
const senarai = fs.readdirSync(keluar).filter(f => f !== '.clasp.json').map(f => path.join(keluar, f)).concat(web);
const temuan = [];
senarai.forEach(f => { const t = fs.readFileSync(f, 'utf8'); larangan.forEach(r => { if (r.test(t)) temuan.push(path.basename(f) + ': ' + r.source); }); });
if (temuan.length) { console.error('GAGAL: data khusus sekolah ditemui dalam pakej:\n  ' + temuan.join('\n  ')); fs.rmSync(dist, { recursive: true, force: true }); process.exit(1); }
console.log(`Pakej dibina: ${senarai.length} fail; semakan kebocoran lulus (${larangan.length} corak).`);
