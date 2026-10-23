// Menjana data benih 2027 daripada sheet "JK TERKINI" (dump teks) + senarai staf.
// Guna: node tools/jana-benih.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dump = fs.readFileSync(path.join(root, 'data', '_jkterkini-dump.txt'), 'utf8').split(/\r?\n/);
const stafCsv = fs.readFileSync(path.join(root, 'data', 'nama-staf.csv'), 'utf8').trim().split(/\r?\n/).slice(1);

const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

// ---------- Staf ----------
const staf = stafCsv.map(l => {
  const [staffId, nama, jawatan, emel] = l.split(',');
  const j = jawatan.toUpperCase();
  const kategori = /^(GURU MARA|KETUA JABATAN)$/.test(j) ? 'GURU'
    : /^(PENGETUA|TIMBALAN PENGETUA)$/.test(j) ? 'EXOFFICIO' : 'SOKONGAN';
  return { staffId, nama, jawatan, emel: emel.toLowerCase(), jabatan: kategori === 'GURU' ? 'Akademik' : kategori === 'EXOFFICIO' ? 'Pengurusan Tertinggi' : 'Sokongan', kategori, status: 'AKTIF', catatan: '' };
});

function norm(n) {
  return clean(n).toUpperCase()
    .replace(/[‘’`´"]/g, "'").replace(/'/g, '')
    .replace(/^(EN|PN|DR|CIK|ENCIK|PUAN|USTAZ|USTAZAH)\.?\s+/, '')
    .replace(/\bBT\b\.?/g, 'BINTI').replace(/\bB\b\.?/g, 'BIN')
    .replace(/[^A-Z@ ]/g, ' ').replace(/\s+/g, ' ').trim();
}
const byNorm = new Map(staf.map(s => [norm(s.nama), s]));
function cariStaf(raw) {
  const n = norm(raw);
  if (byNorm.has(n)) return byNorm.get(n);
  // padanan token: semua token nama dalam dump wujud dalam satu staf sahaja
  const tk = n.split(' ').filter(t => !['BIN', 'BINTI', '@'].includes(t));
  const c = staf.filter(s => { const st = norm(s.nama).split(' '); return tk.every(t => st.includes(t)); });
  return c.length === 1 ? c[0] : null;
}

// Ejaan berbeza antara JK TERKINI dan NAMA STAF
const fAlias = path.join(root, 'data', 'alias.json');
const ALIAS = fs.existsSync(fAlias) ? JSON.parse(fs.readFileSync(fAlias, 'utf8').replace(/^﻿/, '')) : {};
// Nama tiada dalam NAMA STAF: orang sebenar (BIN/BINTI) -> staf baru untuk disahkan; selain itu -> pemegang tempat
const tambahan = new Map();
function stafBaru(raw, kod, laporan) {
  const asal = clean(raw).toUpperCase();
  const nm = asal.replace(/^(EN|PN)\.?\s+/, '');
  if (!tambahan.has(nm)) {
    const orang = /\b(BIN|BINTI|BT)\b/.test(nm) && !/^USTAZ X/.test(nm);
    const n = [...tambahan.values()].filter(x => x.kategori === (orang ? 'GURU' : 'PEMEGANG')).length + 1;
    tambahan.set(nm, orang
      ? { staffId: 'T' + String(n).padStart(3, '0'), nama: nm, jawatan: '', emel: '', jabatan: '', kategori: 'GURU', status: 'AKTIF', catatan: 'Tiada dalam NAMA STAF — sahkan ID, jawatan dan emel' }
      : { staffId: 'R' + String(n).padStart(3, '0'), nama: nm, jawatan: 'PEMEGANG TEMPAT', emel: '', jabatan: '', kategori: 'PEMEGANG', status: 'AKTIF', catatan: 'Pemegang tempat dari JK 2026 — gantikan dengan nama sebenar' });
    laporan.tidakPadan.push(kod + ' | ' + raw + ' -> ' + tambahan.get(nm).staffId);
  }
  return tambahan.get(nm);
}

// ---------- Jawatan pegawai (ex-officio) ----------
const POS_RE = /^(PENGETUA|TIMB\.?\s*PENGETUA|TIMBALAN\s+PENGETUA|PENOLONG PEGAWAI TADBIR|(EN\.?\s+)?PEMBANTU TADBIR|EN\.?\s+PEMBANTU TADBIR|(EN\.?\s*)?(TIMBALAN )?PENGARAH|TIM\.\s*PENGETUA)/;
const POS_NORM = r => {
  let s = clean(r).toUpperCase().replace(/^EN\.?\s+/, '').replace(/TIM[B]?\.\s*/, 'TIMBALAN ');
  return s;
};
const exo = new Map();
function exoStaf(raw) {
  const nm = POS_NORM(raw);
  if (!exo.has(nm)) {
    const id = 'J' + String(exo.size + 1).padStart(2, '0');
    let pemegang = '';
    const j = nm === 'PENGETUA' ? 'PENGETUA' : nm === 'PENOLONG PEGAWAI TADBIR' ? 'PEN. PEGAWAI TADBIR' : nm === 'PEMBANTU TADBIR (K)' ? 'PEMBANTU TADBIR (K)' : null;
    if (j) { const c = staf.filter(s => s.jawatan.toUpperCase() === j); if (c.length === 1) pemegang = c[0].staffId; }
    exo.set(nm, { staffId: id, nama: nm, jawatan: 'JAWATAN EX-OFFICIO', emel: '', jabatan: 'Pengurusan Tertinggi', kategori: 'EXOFFICIO', status: 'AKTIF', catatan: pemegang ? 'Pemegang: ' + pemegang : 'Tetapkan pemegang jawatan', pemegangId: pemegang });
  }
  return exo.get(nm);
}

// ---------- Jawatan dalam jawatankuasa ----------
const POSISI = [
  // [nama, merit, tahap]
  ['Pengerusi', 10, 'Tinggi'], ['Penaung', 10, 'Tinggi'], ['Presiden', 10, 'Tinggi'], ['Pengurus Besar', 10, 'Tinggi'],
  ['Penyelaras', 10, 'Tinggi'], ['Timbalan Pengerusi', 8, 'Tinggi'], ['Timbalan Presiden', 8, 'Tinggi'],
  ['Setiausaha', 8, 'Tinggi'], ['Ketua Jabatan/Unit', 8, 'Tinggi'], ['Ketua Guru Asrama', 8, 'Tinggi'],
  ['Bendahari', 7, 'Sederhana'], ['Ketua Unit', 7, 'Sederhana'], ['Timbalan Ketua Guru Asrama', 6, 'Sederhana'],
  ['Ahli Jawatankuasa', 5, 'Sederhana'], ['Setiausaha Unit', 5, 'Sederhana'], ['Guru Kanan', 5, 'Sederhana'], ['Pemeriksa Kira-kira', 5, 'Sederhana'],
  ['Ketua Penasihat', 4, 'Rendah'], ['Guru Penasihat (K)', 4, 'Rendah'], ['Guru Penasihat', 3, 'Rendah'], ['Penasihat', 3, 'Rendah'],
  ['Juri', 3, 'Rendah'], ['Pemerhati', 3, 'Rendah'],
];
const RULES = [
  [/^TIMBALAN PRESIDEN/, 'Timbalan Presiden'], [/^PRESIDEN/, 'Presiden'], [/^PENGURUS BESAR/, 'Pengurus Besar'],
  [/^TIMBALAN KETUA GURU ASRAMA/, 'Timbalan Ketua Guru Asrama'], [/^KETUA GURU ASRAMA/, 'Ketua Guru Asrama'],
  [/^KETUA PENASIHAT/, 'Ketua Penasihat'], [/^GURU PENASIHAT \(K\)/, 'Guru Penasihat (K)'], [/^GURU PENASIHAT/, 'Guru Penasihat'],
  [/^PENASIHAT/, 'Penasihat'], [/^PENAUNG/, 'Penaung'], [/^TIMBALAN PENGERUSI/, 'Timbalan Pengerusi'], [/^PENGERUSI/, 'Pengerusi'],
  [/^SETIAUSAHA/, 'Setiausaha'], [/^BENDAHARI/, 'Bendahari'], [/^PENYELARAS/, 'Penyelaras'],
  [/^KETUA (UPPM|JABATAN)/, 'Ketua Jabatan/Unit'], [/^GURU KANAN/, 'Guru Kanan'], [/^JURI/, 'Juri'], [/^PEMERHATI/, 'Pemerhati'],
  [/^UNIT .*\(K\)$/, 'Ketua Unit'], [/^UNIT .*\(SU\)$/, 'Setiausaha Unit'], [/^PEMERIKSA KIRA/, 'Pemeriksa Kira-kira'],
];
function petaPosisi(raw) {
  const r = clean(raw).toUpperCase();
  for (const [re, nama] of RULES) {
    if (re.test(r)) {
      let q = r.replace(re, '').trim();
      if (/^UNIT /.test(r)) q = r.replace(/\s*\((K|SU)\)\s*$/, '');
      return { nama, qual: q };
    }
  }
  return { nama: 'Ahli Jawatankuasa', qual: r === 'AHLI JAWATANKUASA' ? '' : r, jatuh: r !== 'AHLI JAWATANKUASA' };
}
const posId = Object.fromEntries(POSISI.map((p, i) => [p[0], 'P' + String(i + 1).padStart(2, '0')]));

// ---------- Jawatankuasa ----------
const BLOK = [
  ['JAWATANKUASA PELAKSANA', 'A', 'Pentadbiran & Pengurusan'],
  ['KETUA JABATAN AKADEMIK', 'B', 'Akademik'],
  ['JAWATANKUASA PENGURUSAN ASRAMA', 'C', 'Hal Ehwal Pelajar & Asrama'],
  ['JAWATANKUASA PENGURUSAN KOKURIKULUM', 'D', 'Kokurikulum & Kepimpinan Pelajar'],
  ['JAWATANKUASA PENDAFTARAN TINGKATAN 2, 3, 4 (PELAJAR LAMA) DAN 5', 'E', 'Program & Majlis'],
];
const rows = [];
for (const l of dump) {
  const h = {}; for (const p of l.split(' | ')) { const m = p.match(/^([A-Z]+)(\d+)=(.*)$/); if (m) { h[m[1]] = m[3]; h._r = +m[2]; } }
  rows.push(h);
}
const jk = []; const asg = []; const laporan = { tidakPadan: [], posisiJatuh: [] };
let cur = null, blok = null; const seq = {};
for (const h of rows) {
  if (h.B && !/^\d+$/.test(h.B)) {
    const nama = clean(h.B).replace(/&'/g, '& ').replace(/\s+/g, ' ');
    const b = BLOK.find(x => clean(x[0]).toUpperCase() === nama.toUpperCase()); if (b) blok = b;
    if (!blok) continue;
    seq[blok[1]] = (seq[blok[1]] || 0) + 1;
    cur = { jkId: 'JK' + blok[1] + String(seq[blok[1]]).padStart(2, '0'), kod: blok[1] + String(seq[blok[1]]).padStart(2, '0'), nama, kategori: blok[2], keterangan: '', status: 'AKTIF', tahun: 2027 };
    jk.push(cur);
  } else if (h.B && /^\d+$/.test(h.B) && h.C && cur) {
    const raw = clean(h.C);
    let s;
    if (POS_RE.test(raw.toUpperCase()) ) s = exoStaf(raw);
    else {
      s = ALIAS[norm(raw)] ? staf.find(x => x.staffId === ALIAS[norm(raw)]) : cariStaf(raw);
      if (!s) s = stafBaru(raw, cur.kod, laporan);
    }
    const p = petaPosisi(h.E || 'AHLI JAWATANKUASA');
    if (p.jatuh) laporan.posisiJatuh.push(p.qual);
    asg.push({ asgId: 'A' + String(asg.length + 1).padStart(5, '0'), tahun: 2027, jkId: cur.jkId, staffId: s.staffId, posisiId: posId[p.nama], kualifikasi: p.qual, status: 'AKTIF', tarikhEfektif: '2027-01-01' });
  }
}
const semuaStaf = staf.concat([...exo.values()], [...tambahan.values()]);
const posisi = POSISI.map((p, i) => ({ posisiId: 'P' + String(i + 1).padStart(2, '0'), nama: p[0], merit: p[1], tahap: p[2], urutan: i + 1, pelbagaPemegang: !['Pengerusi','Penaung','Presiden','Pengurus Besar'].includes(p[0]), aktif: true }));
const benih = { tahun: 2027, staf: semuaStaf, jawatankuasa: jk, posisi, tugasan: asg };
fs.writeFileSync(path.join(root, 'data', 'benih.json'), JSON.stringify(benih));
fs.writeFileSync(path.join(root, 'gas', 'BenihData.gs'), '// DIJANA oleh tools/jana-benih.js — jangan edit tangan.\nconst BENIH = ' + JSON.stringify(benih) + ';\n');
console.log('staf', semuaStaf.length, '(ex-officio', exo.size + ')', 'jk', jk.length, 'tugasan', asg.length);
console.log('Tidak dipadankan:', laporan.tidakPadan.length); laporan.tidakPadan.forEach(x => console.log('  ' + x));
console.log('Posisi jatuh ke Ahli (kualifikasi):', [...new Set(laporan.posisiJatuh)].length);
console.log('Ex-officio:', [...exo.values()].map(e => e.staffId + ' ' + e.nama + ' ' + e.pemegangId).join('\n  '));
const cnt = {}; jk.forEach(j => cnt[j.kategori] = (cnt[j.kategori] || 0) + 1); console.log(cnt);

