// Membina pakej pemasangan pelanggan dalam satu folder (dan ZIP): manual, kod, templat data, logo.
// Kod digabungkan kepada 4 fail supaya mudah ditampal ke dalam Apps Script. Tiada data staf atau maklumat MRSM SAS.
// Binaan GAGAL jika data khusus sekolah ditemui.
// Guna: node tools/bina-pakej.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const akar = path.join(__dirname, '..'), gas = path.join(akar, 'gas');
const NAMA = 'eJawatankuasa-Pakej-Pemasangan';
const induk = path.join(akar, 'pakej-pelanggan'), P = path.join(induk, NAMA);
const baca = f => fs.readFileSync(path.join(gas, f), 'utf8').replace(/^\uFEFF/, '');
const tulis = (r, isi) => { const f = path.join(P, r); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, isi); };

fs.rmSync(induk, { recursive: true, force: true });

// ---------- 2-Kod-Sistem ----------
const code = '// eJawatankuasa: kod pelayan. Tampal keseluruhan fail ini ke dalam Code.gs. Jangan ubah.\n\n' +
  ['Code.gs', 'Logik.gs', 'Setup.gs', 'Pasang.gs'].map(baca).join('\n\n') + '\n// TAMAT FAIL\n';
const inc = n => baca(n + '.html');
const index = inc('Index').replace(/<\?!= include\('(\w+)'\) \?>/g, (_, n) => inc(n)) + '\n<!-- TAMAT FAIL -->\n';
if (index.includes('<?')) throw new Error('Index.html masih mengandungi scriptlet; templat Apps Script akan rosak.');
tulis('2-Kod-Sistem/Code.gs', code);
tulis('2-Kod-Sistem/Index.html', index);
tulis('2-Kod-Sistem/Pemasang.html', baca('Pemasang.html') + '\n<!-- TAMAT FAIL -->\n');
tulis('2-Kod-Sistem/appsscript.json', baca('appsscript.json'));

// ---------- 3-Templat-Data ----------
const csv = (kepala, baris) => '\uFEFF' + [kepala].concat(baris).map(r => r.join(',')).join('\r\n') + '\r\n';
tulis('3-Templat-Data/templat-import-staf.csv', csv(['staffId', 'nama', 'jawatan', 'emel', 'telefon', 'jabatan', 'kategori'], [
  ['123456', 'NAMA CONTOH BIN ABU', 'GURU MARA', 'contoh@maktab.edu.my', '', 'Akademik', 'GURU'],
  ['123457', 'NAMA CONTOH BINTI ALI', 'PEMBANTU TADBIR', '', '', 'Sokongan', 'SOKONGAN'],
  ['123458', 'NAMA PENGETUA', 'PENGETUA', '', '', 'Pengurusan Tertinggi', 'EXOFFICIO']]));
tulis('3-Templat-Data/templat-import-jawatankuasa.csv', csv(['Kod JK', 'Jawatankuasa', 'Kategori', 'ID staf', 'Nama', 'Jawatan', 'Kualifikasi'], [
  ['A01', 'JAWATANKUASA PENGURUSAN', 'Pentadbiran', '123458', 'NAMA PENGETUA', 'Pengerusi', ''],
  ['A01', 'JAWATANKUASA PENGURUSAN', 'Pentadbiran', '123456', 'NAMA CONTOH BIN ABU', 'Setiausaha', ''],
  ['A01', 'JAWATANKUASA PENGURUSAN', 'Pentadbiran', '123457', 'NAMA CONTOH BINTI ALI', 'Ahli Jawatankuasa', '']]));

// ---------- 4-Logo, 5-Pilihan-Lanjutan ----------
fs.mkdirSync(path.join(P, '4-Logo'), { recursive: true });
fs.copyFileSync(path.join(akar, 'logo-mrsm-sas.png'), path.join(P, '4-Logo', 'logo-mrsm.png')); // Lambang umum MRSM, tiada nama maktab.
fs.mkdirSync(path.join(P, '5-Pilihan-Lanjutan'), { recursive: true });
execFileSync(process.execPath, [path.join(__dirname, 'bina-web.js'), 'https://script.google.com/macros/s/ISI_ID_ANDA/exec', path.join(P, '5-Pilihan-Lanjutan', 'index-sekolah.html')], { stdio: 'ignore' });

// ---------- 1-Manual: PDF daripada sumber HTML ----------
const sumber = path.join(akar, 'docs', 'manual-pemasangan', 'manual-pemasangan.html');
const pdf = path.join(akar, 'docs', 'manual-pemasangan', 'Manual-Pemasangan-eJawatankuasa.pdf');
const pelayar = [process.env.PELAYAR, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(f => f && fs.existsSync(f));
if (!pelayar) throw new Error('Tiada Edge atau Chrome untuk menjana PDF.');
// Dicetak daripada salinan sementara; pelayar tanpa kepala tidak boleh dipercayai pada pemacu Google Drive dan mungkin pulang sebelum fail siap.
const os = require('os'), sem = fs.mkdtempSync(path.join(os.tmpdir(), 'ejk-pdf-')), semPdf = path.join(sem, 'm.pdf');
fs.copyFileSync(sumber, path.join(sem, 'm.html'));
fs.cpSync(path.join(path.dirname(sumber), 'gambar'), path.join(sem, 'gambar'), { recursive: true });
const url = 'file:///' + path.join(sem, 'm.html').split(path.sep).join('/');
execFileSync(pelayar, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--user-data-dir=' + path.join(sem, 'p'), '--print-to-pdf=' + semPdf, url], { stdio: 'ignore', timeout: 120000 });
const tamat = Date.now() + 60000, tidur = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let saiz = -1; while (Date.now() < tamat) { const n = fs.existsSync(semPdf) ? fs.statSync(semPdf).size : 0; if (n > 50000 && n === saiz) break; saiz = n; tidur(1500); }
if (!fs.existsSync(semPdf) || fs.statSync(semPdf).size < 50000) throw new Error('PDF manual gagal dijana.');
fs.copyFileSync(semPdf, pdf); try { fs.rmSync(sem, { recursive: true, force: true }); } catch (e) {}
fs.mkdirSync(path.join(P, '1-Manual'), { recursive: true });
fs.copyFileSync(pdf, path.join(P, '1-Manual', 'Manual-Pemasangan-eJawatankuasa.pdf'));

// ---------- BACA SAYA ----------
tulis('BACA-SAYA-DAHULU.txt', `SISTEM eJAWATANKUASA - PAKEJ PEMASANGAN
Sistem pengurusan jawatankuasa, pelantikan staf dan analisis beban kerja.

MULA DI SINI
Buka 1-Manual\\Manual-Pemasangan-eJawatankuasa.pdf dan ikut langkah demi langkah.
Tempoh pemasangan: kira-kira 20 minit. Tiada pengaturcaraan diperlukan.

KANDUNGAN FOLDER
1-Manual            Manual pemasangan dan penggunaan awal (PDF)
2-Kod-Sistem        4 fail kod untuk ditampal ke dalam Google Apps Script
                      appsscript.json, Code.gs, Index.html, Pemasang.html
3-Templat-Data      Templat CSV untuk import staf dan jawatankuasa
4-Logo              Logo MRSM untuk borang pemasangan (pilihan)
5-Pilihan-Lanjutan  Halaman untuk dihoskan di GitHub Pages (pilihan, Lampiran A manual)

RINGKASAN LANGKAH
1. Cipta Google Sheet kosong, kemudian Extensions > Apps Script.
2. Tampal 4 fail daripada folder 2-Kod-Sistem dan simpan.
3. Muat semula Google Sheet, kemudian eJawatankuasa > Pasang sistem / Semakan.
4. Beri kebenaran dan isi borang pemasangan.
5. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
6. Log masuk, import staf dan jawatankuasa, cipta akaun pengguna.

PENTING
- Gunakan akaun Google khas maktab, bukan akaun peribadi guru.
- Jangan kongsi fail Google Sheet. Staf hanya memerlukan pautan web /exec.
- Jangan buka fail kod dengan Word atau Excel. Gunakan Notepad.
`.replace(/\n/g, '\r\n'));

// ---------- Semakan kebocoran ----------
const larangan = [/sultan azlan/i, /mrsmsas/i, /mrsm sas/i, /kuala kangsar/i, /khairil/i, /@mara\.gov\.my/i, /AKfycb/, /logo-mrsm-sas/i, /akramprog/i, /1Q4kTtZY/, /1jb5pJyc/, /15sxEMd/];
const fBenih = path.join(akar, 'data', 'benih.json');
if (fs.existsSync(fBenih)) JSON.parse(fs.readFileSync(fBenih, 'utf8')).staf.forEach(s => {
  const esc = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (String(s.nama).trim().includes(' ') && !/^[JR]\d+$/.test(String(s.staffId))) larangan.push(new RegExp(esc(s.nama), 'i'));
  if (s.emel) larangan.push(new RegExp(esc(s.emel), 'i'));
  if (/^\d{5,}$/.test(String(s.staffId))) larangan.push(new RegExp('\\b' + s.staffId + '\\b'));
});
const senarai = []; (function jalan(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); if (e.isDirectory()) jalan(f); else senarai.push(f); }); })(P);
// Google Drive kadang-kadang memadam fail baharu selepas rmSync folder lama; pastikan pakej lengkap.
const wajib = ['1-Manual/Manual-Pemasangan-eJawatankuasa.pdf', '2-Kod-Sistem/Code.gs', '2-Kod-Sistem/Index.html', '2-Kod-Sistem/Pemasang.html', '2-Kod-Sistem/appsscript.json',
  '3-Templat-Data/templat-import-staf.csv', '3-Templat-Data/templat-import-jawatankuasa.csv', '4-Logo/logo-mrsm.png', '5-Pilihan-Lanjutan/index-sekolah.html', 'BACA-SAYA-DAHULU.txt'];
const hilang = wajib.filter(r => !fs.existsSync(path.join(P, r)));
if (hilang.length) { console.error('GAGAL: pakej tidak lengkap (mungkin isu penyegerakan Google Drive). Jalankan semula.\n  ' + hilang.join('\n  ')); process.exit(1); }
const temuan = [];
senarai.filter(f => /\.(gs|html|json|csv|txt)$/.test(f)).forEach(f => { const t = fs.readFileSync(f, 'utf8'); larangan.forEach(r => { if (r.test(t)) temuan.push(path.relative(P, f) + ': corak #' + larangan.indexOf(r)); }); });
// Manual: kredit pembangun dibenarkan; emel, ID dan nama staf tidak.
const man = fs.readFileSync(sumber, 'utf8'); larangan.slice(1).forEach(r => { if (r.test(man)) temuan.push('manual: corak #' + larangan.indexOf(r)); });
if (temuan.length) { console.error('GAGAL: data khusus ditemui:\n  ' + temuan.join('\n  ')); fs.rmSync(induk, { recursive: true, force: true }); process.exit(1); }

// ---------- ZIP ----------
const zip = path.join(induk, NAMA + '.zip');
execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${P.replace(/'/g, "''")}' -DestinationPath '${zip.replace(/'/g, "''")}' -Force`], { stdio: 'ignore' });
console.log(`Pakej dibina: ${P}\n${senarai.length} fail; semakan kebocoran lulus (${larangan.length} corak). ZIP ${(fs.statSync(zip).size / 1024).toFixed(0)} KB.`);
