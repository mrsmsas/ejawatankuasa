// Membina index.html tunggal untuk GitHub Pages daripada fail dalam gas/.
// Antara muka yang sama; panggilan google.script.run diganti dengan fetch ke API Apps Script (doPost).
// Guna: node tools/bina-web.js [URL_API] [fail_keluaran]
const fs = require('fs'), path = require('path');
const gas = path.join(__dirname, '..', 'gas');
const API = process.argv[2] || 'https://script.google.com/macros/s/AKfycbzCuairOJICK8VT7zKa7SoSRNr5LOKgloDOxfMmeGujneSAXYQsUiSCoVm9NBbP0biZkQ/exec';
const keluar = process.argv[3] || path.join(__dirname, '..', 'index.html');
if (!/^https?:\/\//.test(API)) throw new Error('URL API tidak sah');
const inc = n => fs.readFileSync(path.join(gas, n + '.html'), 'utf8');
let t = inc('Index').replace(/<\?!= include\('(\w+)'\) \?>/g, (_, n) => inc(n));
const shim = `<script>
/* Pengganti google.script.run untuk dihoskan di luar Apps Script: POST teks biasa ke API (tiada preflight CORS). */
window.API_URL = ${JSON.stringify(API)};
window.google = { script: { get run() {
  var ok = function () {}, er = function () {}, r = {
    withSuccessHandler: function (f) { ok = f; return r; }, withFailureHandler: function (f) { er = f; return r; },
    api: function (a) {
      var kawal = new AbortController(), tamat = setTimeout(function () { kawal.abort(); }, 60000);
      fetch(window.API_URL, { method: 'POST', body: JSON.stringify(a), redirect: 'follow', signal: kawal.signal })
        .then(function (x) { return x.json(); }).then(function (j) { clearTimeout(tamat); ok(j); })
        .catch(function (e) { clearTimeout(tamat); er(e); });
    } };
  return r;
} } };
</script>`;
t = t.replace('<base target="_top">', '').replace('</head>', shim + '\n</head>');
fs.writeFileSync(keluar, t);
console.log('Dibina:', keluar, (t.length / 1024).toFixed(0) + ' KB', '→', API);
