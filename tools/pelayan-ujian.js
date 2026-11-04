// Pelayan ujian TEMPATAN: menjalankan kod .gs sebenar dengan tiruan Google (helaian dalam memori)
// dan menghidangkan antara muka sebenar, supaya keseluruhan sistem boleh diuji tanpa akaun Google.
//   node tools/pelayan-ujian.js            → data benih; http://localhost:8765 (admin: pemilik@ujian.my / Ujian12345)
//   node tools/pelayan-ujian.js --kosong   → seperti templat sekolah baharu; wizard di http://localhost:8765/pemasang
const http = require('http'), fs = require('fs'), path = require('path');
const { buatPersekitaran, halamanUtama, halamanPemasang, EMEL_PEMILIK } = require('./tiruan-gas');

const kosong = process.argv.includes('--kosong'), PORT = Number(process.env.PORT) || 8765;
const P = buatPersekitaran({ muatBenih: !kosong });
if (!kosong) {
  console.log('Menyedia pangkalan data ujian…');
  P.rpc('setupAwal', [], EMEL_PEMILIK);
  P.rpc('tetapKataLaluan', [EMEL_PEMILIK, 'Ujian12345'], EMEL_PEMILIK);
  P.kotak.__aktif = EMEL_PEMILIK;
  P.jalan("tambah_('Pengguna',[{emel:'pelihat@ujian.my',nama:'Pelihat Ujian',peranan:'PELIHAT',aktif:true,garam:'g',hash:hash_('g','Ujian12345')},{emel:'pengurus@ujian.my',nama:'Pengurus Ujian',peranan:'PENGURUS',aktif:true,garam:'g',hash:hash_('g','Ujian12345')}]);");
  P.kotak.__aktif = '';
}

// Pengganti google.script.run: fungsi dalam dialog Sheet berjalan sebagai pemilik, antara muka web sebagai pelawat.
const shim = pemilik => `<script>window.google={script:{host:{close(){document.body.innerHTML="Dialog ditutup."}},get run(){let ok=()=>{},er=()=>{};const r=new Proxy({},{get(_,fn){if(fn==="withSuccessHandler")return f=>{ok=f;return r};if(fn==="withFailureHandler")return f=>{er=f;return r};return (...args)=>fetch("/rpc",{method:"POST",body:JSON.stringify({fn,args,pemilik:${pemilik}})}).then(x=>x.json()).then(j=>j.ralat?er(new Error(j.ralat)):ok(j.hasil)).catch(er);}});return r;}}};</script>`;

http.createServer((q, s) => {
  if (q.method === 'POST' && q.url === '/rpc') {
    let b = ''; q.on('data', c => b += c); q.on('end', () => {
      const m = JSON.parse(b); s.setHeader('Content-Type', 'application/json');
      try { s.end(JSON.stringify({ hasil: P.rpc(m.fn, m.args, m.pemilik ? EMEL_PEMILIK : '') })); }
      catch (e) { s.end(JSON.stringify({ ralat: e.message })); }
    });
  } else if (q.url === '/ujian/url-web' && q.method === 'POST') { P.kotak.__urlWeb = 'https://script.google.com/macros/s/CONTOH/exec'; s.end('ok');
  } else if (q.url.endsWith('.png')) {
    const f = path.join(__dirname, '..', path.basename(q.url));
    if (fs.existsSync(f)) { s.setHeader('Content-Type', 'image/png'); s.end(fs.readFileSync(f)); } else { s.statusCode = 404; s.end(); }
  } else if (q.url === '/pemasang') { s.setHeader('Content-Type', 'text/html; charset=utf-8'); s.end(halamanPemasang(shim(true)));
  } else { s.setHeader('Content-Type', 'text/html; charset=utf-8'); s.end(halamanUtama(shim(false))); }
}).listen(PORT, () => console.log(`Sedia (${kosong ? 'templat kosong' : 'data benih'}): http://localhost:${PORT}` + (kosong ? '/pemasang' : '')));
