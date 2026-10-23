# Sistem Pengurusan Jawatankuasa MRSM Sultan Azlan Shah 2027

Sistem web (Bahasa Melayu) untuk mengurus jawatankuasa, pelantikan staf dan analisis beban kerja berasaskan **merit berpemberat**.

Data jawatankuasa dan nama dalam sistem ini diambil **terus daripada sheet `JK TERKINI` (JK Induk 2026)** dan senarai `NAMA STAF`. Semua nama kekal dalam setiap jawatankuasa; anda hanya perlu menukar/menambah jika ada perubahan.

## Seni bina (dan sebab ia dipilih)

| Lapisan | Teknologi |
|---|---|
| Antara muka | HTML/CSS/JavaScript, dihidangkan oleh **Google Apps Script itu sendiri** (`doGet`) |
| Backend | Google Apps Script (`gas/Code.gs`, `gas/Logik.gs`, `gas/Setup.gs`) |
| Pangkalan data | Google Sheets (dikurung dalam fail DB peribadi) |
| Carta | Chart.js (cdnjs) |

**Mengapa bukan GitHub Pages?** Aplikasi web Apps Script tidak boleh mengesahkan pemanggil merentas domain dengan boleh dipercayai (CORS, pengepala khas dan identiti Google tidak dijamin). Menghidangkan UI dari Apps Script menjadikan semua kebenaran dikuatkuasakan di pelayan. GitHub hanya digunakan untuk menyimpan kod dan versi (`git`) — repo boleh peribadi.

## Struktur projek

```
mrsmsas-jk-2027/
├── gas/                    ← SEMUA yang disalin ke projek Apps Script
│   ├── Code.gs             API, pengesahan, kebenaran, audit, penulisan data
│   ├── Logik.gs            Kiraan merit & peraturan integriti (tulen, diuji)
│   ├── Setup.gs            setupAwal(): cipta helaian + data benih (tidak menimpa)
│   ├── BenihData.gs        Data benih 2026/2027 (dijana oleh tools/jana-benih.js)
│   ├── Index.html          Rangka halaman
│   ├── Gaya.html           CSS (pembolehubah CSS, responsif, cetak)
│   ├── Komponen.html       Komponen UI: jadual, modal, combobox, carta, CSV
│   ├── Paparan1.html       Papan pemuka, jawatankuasa, staf, profil merit
│   ├── Paparan2.html       Analisis, jawatan & merit, import/eksport, pengguna, tetapan, audit
│   ├── Aplikasi.html       Penghalaan, log masuk, permulaan
│   └── appsscript.json     Manifest
├── data/                   nama-staf.csv, benih.json, _jkterkini-dump.txt (sumber penjanaan)
├── tools/                  jana-benih.js, ujian.js, pelayan-ujian.js
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

## Peranan

| Peranan | Kebenaran |
|---|---|
| Pentadbir Sistem | Semua: staf, jawatan & merit, tetapan, pengguna, salin/padam tahun, import, log audit |
| Pengurus JK | Urus jawatankuasa dan pelantikan (tambah/sunting/ganti/buang), lihat laporan |
| Pelihat | Baca sahaja; emel/telefon/catatan staf disembunyikan |

Semua semakan dibuat di **pelayan** (`LALUAN_` dalam `Code.gs`); menyembunyikan butang di UI hanyalah kemudahan.

## Data benih (dari spreadsheet 2026)

- 125 jawatankuasa/unit, 1,151 pelantikan, 94 staf (NAMA STAF) + 9 jawatan ex-officio + 1 guru tiada dalam senarai (`T001`) + 17 pemegang tempat.
- Data 2026 dan 2027 dimuatkan sebagai dua set berasingan (2027 ialah salinan 2026 untuk anda ubah).
- Jana semula: `node tools/jana-benih.js` (membaca `data/_jkterkini-dump.txt` dan `data/nama-staf.csv`).

## Pemasangan

Lihat [docs/panduan-pemasangan.md](docs/panduan-pemasangan.md). Ringkasnya: cipta Google Sheet kosong → Extensions ▸ Apps Script → tampal fail dalam `gas/` → jalankan `setupAwal()` → Deploy ▸ Web app.

## Ujian

```
node tools/ujian.js            # 14 ujian logik merit
node tools/pelayan-ujian.js    # sistem penuh dengan data tiruan di http://localhost:8765
```
Senarai semak penuh: [docs/senarai-semak-ujian.md](docs/senarai-semak-ujian.md).

## Had yang diketahui

- Kata laluan disimpan sebagai hash SHA-256 bergaram (had 5 percubaan/10 minit) — memadai untuk kegunaan dalaman, bukan setaraf SSO. Jika sekolah ada Google Workspace sendiri, pengesahan akaun Google boleh ditambah.
- Skrip dilindungi `LockService` (satu penulisan pada satu masa); helaian dibaca penuh setiap permintaan (sesuai untuk ≈ 2,500 baris; pertimbang pengcacheannya jika data berkembang >20,000 baris).
- Fail DB Google Sheet **mesti peribadi** (hanya pemilik/pentadbir). Sesiapa yang boleh menyunting helaian terus boleh memintas sistem.
- Chart.js dimuat dari CDN; tanpa internet, jadual tetap berfungsi tetapi carta memaparkan mesej.
- Import hanya untuk staf (CSV). Import pelantikan secara pukal belum disediakan — gunakan *Peralihan Tahun* atau antara muka.
- Kategori jawatankuasa (Pentadbiran, Akademik, Hal Ehwal Pelajar & Asrama, Kokurikulum, Program & Majlis) ditentukan oleh blok dalam JK TERKINI; kod (A01…E36) dijana baharu dan bukan kod 2026 (A01–E33) — semak dan ubah mengikut keperluan.

