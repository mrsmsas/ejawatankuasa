# Sistem Pengurusan Jawatankuasa (eJawatankuasa)

Digunakan oleh MRSM Sultan Azlan Shah dan boleh dipasang oleh sekolah lain melalui templat Google Sheet: lihat [Manual Pemasangan](docs/manual-pemasangan/Manual-Pemasangan-eJawatankuasa.pdf).

Sistem web (Bahasa Melayu) untuk mengurus jawatankuasa, pelantikan staf dan analisis beban kerja berasaskan **merit berpemberat**.

Data jawatankuasa dan nama dalam sistem ini diambil **terus daripada sheet `JK TERKINI` (JK Induk 2026)** dan senarai `NAMA STAF`. Semua nama kekal dalam setiap jawatankuasa; anda hanya perlu menukar/menambah jika ada perubahan.

## Seni bina (dan sebab ia dipilih)

| Lapisan | Teknologi |
|---|---|
| Antara muka | HTML/CSS/JavaScript satu fail (`index.html`), dihoskan di **GitHub Pages** (`https://mrsmsas.github.io/ejawatankuasa/`) — tiada notis "created by a Google Apps Script user" |
| Backend (API) | Google Apps Script `doPost` — JSON, token sesi, kebenaran disemak di pelayan (`gas/Code.gs`, `Logik.gs`, `Setup.gs`) |
| Pangkalan data | Google Sheets peribadi |
| Carta | Chart.js (cdnjs) |

**Bagaimana ia selamat walaupun antara muka awam?** Halaman di GitHub hanya kod paparan; tiada data. Semua data hanya dipulangkan oleh API selepas log masuk (emel + kata laluan bergaram, token sesi 6 jam), dan **setiap tindakan disemak peranannya di pelayan**. Kunci/rahsia tidak ada dalam kod. Apps Script juga masih boleh menghidangkan antara muka sendiri (`doGet`) sebagai sandaran.

**Menjana semula `index.html` selepas mengubah fail dalam `gas/`:** `node tools/bina-web.js` (kemudian `clasp push`, dan `clasp deploy --deploymentId <ID>` untuk mengekalkan URL API yang sama).

## Struktur projek

```
mrsmsas-jk-2027/
├── index.html              ← antara muka untuk GitHub Pages (dijana oleh tools/bina-web.js)
├── gas/                    ← SEMUA yang disalin ke projek Apps Script
│   ├── Code.gs             API, pengesahan, kebenaran, audit, penulisan data
│   ├── Logik.gs            Kiraan merit & peraturan integriti (tulen, diuji)
│   ├── Setup.gs            Penyediaan helaian, fungsi pemilik (dilindungi pemilikSahaja_)
│   ├── Pasang.gs           Menu Google Sheet dan pemasangan sekolah baharu
│   ├── Pemasang.html       Wizard pemasangan
│   ├── BenihData.gs        Data benih MRSM SAS (tidak dalam templat, tidak dalam git)
│   ├── SekolahIni.gs       Maklumat lalai MRSM SAS (tidak dalam templat)
│   ├── Index.html          Rangka halaman
│   ├── Gaya.html           CSS (pembolehubah CSS, responsif, cetak)
│   ├── Komponen.html       Komponen UI: jadual, modal, combobox, carta, CSV
│   ├── Paparan1.html       Papan pemuka, jawatankuasa, staf, profil merit
│   ├── Paparan2.html       Analisis, jawatan & merit, import/eksport, pengguna, tetapan, audit
│   ├── Paparan5.html       Takwim Sekolah: pembaca Excel takwim, paparan Excel/bulanan/senarai, cetak
│   ├── Aplikasi.html       Penghalaan, log masuk, permulaan
│   └── appsscript.json     Manifest
├── data/                   nama-staf.csv, benih.json, _jkterkini-dump.txt (sumber penjanaan)
├── tools/                  bina-web.js, jana-benih.js, ujian.js, pelayan-ujian.js
└── docs/                   panduan-pemasangan.md, senarai-semak-ujian.md, analisis-spreadsheet-2026.md
```

## Konsep merit

- Setiap **jawatan** ada nilai merit (boleh diubah di halaman *Jawatan & Merit*). Tiada nilai ditetapkan dalam kod.
- Merit staf = jumlah merit semua jawatan aktif tahun itu. Dikira semula automatik setiap kali tugasan atau nilai merit berubah.
- Nilai merit disimpan **mengikut tahun** (`TetapanMerit`), jadi mengubah 2027 tidak mengubah laporan 2026.
- Nilai awal (semua boleh diubah): Pengerusi/Penaung/Presiden/Pengurus Besar/Penyelaras **10**, Timbalan Pengerusi/Setiausaha **8**, Bendahari **7**, Ahli Jawatankuasa **5**, Guru Penasihat/Penasihat/Juri/Pemerhati **3** (+ beberapa jawatan khas; lihat halaman Jawatan).
- **Dikecualikan daripada analisis** (diasingkan): jawatan ex-officio (Pengetua, Timbalan Pengetua, Penolong Pegawai Tadbir, Pembantu Tadbir (K), Pengarah MARA Negeri) dan *pemegang tempat* (cth. "GURU PENDIDIKAN ISLAM", "PRESIDEN LDP"). Pelantikan mereka tetap direkodkan.
- Beban TINGGI/RENDAH ditentukan berbanding purata **kategori** (GURU/SOKONGAN) menggunakan ambang peratus, atau julat sasaran jika ditetapkan di *Tetapan*.
- Sistem hanya **mencadangkan** calon (beban rendah) — pelantikan tetap dibuat oleh pentadbir dengan pratonton kesan merit sebelum simpan.

## Modul Takwim Sekolah

- Menu **📅 Takwim Sekolah**. Editor/System Admin memuat naik fail Excel takwim tahunan (format grid biasa: lajur Hari, dua lajur setiap bulan, legend berwarna di bawah). Fail dibaca **dalam pelayar** (SheetJS dari cdnjs): tarikh, acara, penanda minggu [α]/[β], warna → kategori (nama dari legend), jumlah hari persekolahan dan nota. Tiada kemasukan manual.
- Tarikh dikira mengikut kedudukan baris (bukan nombor dalam sel), jadi sel tarikh yang dibiarkan kosong dalam Excel tetap betul. Tahun diambil daripada tajuk ("SESI 2026 / 2027") — berfungsi untuk mana-mana tahun.
- Tiga paparan cetak: **Format Excel** (1 halaman A3 landskap), **Kalendar Bulanan** (A4, 2 bulan sehalaman), **Senarai Acara** (A4, cari/tapis, muat turun Excel).
- Pembetulan: klik tarikh (Editor ke atas). Padam takwim: System Admin. Viewer baca sahaja. Semua perubahan direkod dalam Log Audit.
- Storan: helaian `Takwim`, satu baris setahun (data hari JSON dipecah ke `hari1..hari4`, setiap sel diawali `~` supaya tidak dianggap formula). Helaian dicipta automatik pada simpanan pertama — pemasangan sedia ada tidak perlu dipasang semula.

## Peranan

| Peranan | Kebenaran |
|---|---|
| System Admin | Semua: staf, jawatan & merit, tetapan, pengguna, salin/padam tahun, import, log audit |
| Editor | Urus jawatankuasa dan pelantikan (tambah/sunting/ganti/buang), lihat laporan |
| Viewer | Baca sahaja; emel/telefon/catatan staf disembunyikan |

(Kod dalaman dalam helaian `Pengguna` ialah `PENTADBIR` = System Admin, `PENGURUS` = Editor, `PELIHAT` = Viewer — jangan ubah kod ini.)

Semua semakan dibuat di **pelayan** (`LALUAN_` dalam `Code.gs`); menyembunyikan butang di UI hanyalah kemudahan.

## Data benih (dari spreadsheet 2026)

- 125 jawatankuasa/unit, 1,151 pelantikan, 94 staf (NAMA STAF) + 9 jawatan ex-officio + 1 guru tiada dalam senarai (`T001`) + 17 pemegang tempat.
- Data 2026 dan 2027 dimuatkan sebagai dua set berasingan (2027 ialah salinan 2026 untuk anda ubah).
- **Sistem ini umum untuk mana-mana tahun.** Tahun dipilih dari menu di bahagian atas; tahun baharu dicipta melalui *Import / Eksport ▸ Peralihan Tahun* (salin struktur dari tahun lain tanpa menimpa). Merit, laporan dan sejarah setiap tahun disimpan berasingan.
- Jana semula: `node tools/jana-benih.js` (membaca `data/_jkterkini-dump.txt` dan `data/nama-staf.csv`).

## Pemasangan

- **Sekolah lain:** [Manual Pemasangan](docs/manual-pemasangan/Manual-Pemasangan-eJawatankuasa.pdf). Buat salinan templat, jalankan wizard dalam Google Sheet, kemudian Deploy.
- **Penyelenggaraan pemasangan MRSM SAS dan templat:** [docs/panduan-pemasangan.md](docs/panduan-pemasangan.md).

## Ujian

```
node tools/ujian.js                    # 14 ujian logik merit
node tools/ujian-pasang.js             # 15 ujian pemasangan sekolah baharu dan keselamatan
node tools/ujian-takwim.js             # 8 ujian modul Takwim (simpan, peranan, had sel, input tidak sah)
node tools/pelayan-ujian.js            # sistem penuh dengan data benih di http://localhost:8765
node tools/pelayan-ujian.js --kosong   # seperti templat baharu; wizard di http://localhost:8765/pemasang
```
