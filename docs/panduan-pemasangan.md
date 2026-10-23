# Panduan Pemasangan & Penyelenggaraan

## A. Pemasangan (sekali sahaja, ±15 minit)

1. **Cipta pangkalan data.** Dalam Google Drive anda, cipta Google Sheet kosong bernama `DB JK MRSM SAS 2027`. **Jangan kongsi** dengan sesiapa (hanya pemilik).
2. **Buka Apps Script.** Dalam Sheet itu: *Extensions ▸ Apps Script*. Ini mencipta projek terikat pada Sheet tersebut.
3. **Salin kod.** Padamkan `Code.gs` lalai. Untuk setiap fail dalam folder `gas/`:
   - `.gs` → *Add a file ▸ Script*, nama sama tanpa `.gs`, tampal kandungan (`Code`, `Logik`, `Setup`, `BenihData`).
   - `.html` → *Add a file ▸ HTML*, nama sama tanpa `.html` (`Index`, `Gaya`, `Komponen`, `Paparan1`, `Paparan2`, `Aplikasi`).
   - `appsscript.json` → *Project Settings ▸ Show "appsscript.json"*, kemudian tampal kandungannya.
4. **Cipta jadual dan data.** Pilih fungsi `setupAwal` ▸ **Run** ▸ benarkan kebenaran. Lihat *Execution log*: ia memaparkan **emel pentadbir** dan **kata laluan sementara**. Catatkannya.
   - `setupAwal()` selamat dijalankan semula: ia tidak menimpa helaian yang sudah berisi.
5. **Terbitkan.** *Deploy ▸ New deployment ▸ Web app*: *Execute as* = **Me**, *Who has access* = **Anyone**. (Pengesahan dibuat oleh sistem sendiri melalui emel + kata laluan; sesiapa tanpa akaun sistem tidak dapat melihat sebarang data.) Salin URL `…/exec`.
6. **Log masuk** dengan akaun pentadbir, tukar kata laluan (butang *Kata laluan*), kemudian *Pengguna ▸ Pengguna Baharu* untuk mencipta akaun Pengurus JK dan Pelihat.
7. **Semak data** (lihat §C), kemudian edit apa yang perlu.

> Selepas mengubah kod: *Deploy ▸ Manage deployments ▸ Edit ▸ New version* supaya URL yang sama dikemas kini.

## B. Keselamatan — wajib disemak

- Fail Google Sheet DB: *Share* hanya untuk anda (dan pentadbir yang dipercayai). Sesiapa yang boleh menyunting Sheet boleh memintas semua kawalan sistem.
- Jangan letak kata laluan atau kunci dalam kod. Sistem tidak memerlukan sebarang rahsia dalam kod; hash kata laluan disimpan dalam helaian `Pengguna`.
- Lupa kata laluan: di editor Apps Script jalankan `tetapKataLaluan('emel@contoh.my','KataBaharu123')` (edit pemanggilan dalam fungsi pembungkus sementara) atau gunakan *Pengguna ▸ Sunting* oleh pentadbir lain.
- Log masuk dihadkan 5 percubaan salah / 10 minit bagi setiap emel. Sesi tamat selepas 6 jam.
- Semua perubahan direkod dalam helaian `LogAudit` dan dipaparkan di halaman *Log Audit*.
- Jika repo GitHub digunakan untuk simpanan kod, jadikannya **Private**. Data benih (`BenihData.gs`, `data/`) mengandungi nama dan emel rasmi staf — jangan terbitkan secara awam.

## C. Semakan selepas pemasangan (data benih dari 2026)

Buka *Staf & Guru* dan semak:
1. **`T001` (seorang guru)** — ada dalam JK 2026 tetapi tiada dalam senarai NAMA STAF. Isi ID gaji/jawatan/emel sebenar (atau tukar status kepada TIDAK AKTIF jika sudah berpindah).
2. **Pemegang tempat (`R001`–`R017`)** — cth. "GURU PENDIDIKAN ISLAM", "PRESIDEN LDP", "USTAZ X". Gantikan dengan nama sebenar melalui *Jawatankuasa ▸ (JK berkenaan) ▸ Ganti*.
3. **Ex-officio (`J01`–`J09`)** — tetapkan *Pemegang jawatan* bagi 3 Timbalan Pengetua (sistem tidak tahu siapa memegang jawatan yang mana).
4. Kategori JK dan kod (A01…E36) — ubah jika perlu.

## D. Penggunaan harian

- **Tukar/ganti pegawai:** *Jawatankuasa ▸ pilih JK ▸ Ganti* (merit dipindahkan automatik).
- **Tambah pegawai:** *Tambah ahli* → pilih staf & jawatan. Pratonton menunjukkan merit sebelum/selepas. Butang *Cadangkan calon* menyenaraikan staf beban rendah.
- **Buang pegawai:** *Buang* (pengesahan + pratonton merit).
- **Tambah/padam/sunting jawatankuasa:** halaman *Jawatankuasa*. JK yang ada pelantikan hanya boleh dipadam selepas pengesahan tambahan (atau nyahaktifkan).
- **Ubah nilai merit:** *Jawatan & Merit ▸ klik jawatan*. Nilai berlaku bagi tahun yang dipilih di bahagian atas.
- **Tahun 2028:** *Import / Eksport ▸ Peralihan Tahun* (menyalin struktur & pelantikan aktif; tidak menimpa).

## E. Sandaran & penyelenggaraan

- *File ▸ Make a copy* pada Sheet DB setiap bulan (atau sebelum peralihan tahun). *File ▸ Version history* turut menyimpan sejarah.
- Eksport CSV dari *Import / Eksport* untuk arkib tahunan.
- Jika data berkembang >20,000 baris tugasan, tambah `CacheService` pada `semuaData_()`.
- Menjana semula data benih: `node tools/jana-benih.js` (hanya perlu jika sumber 2026 berubah; **jangan** jalankan `setupAwal()` pada DB yang sudah ada data kerana ia akan melangkau helaian berisi).

## F. Pemasangan semula atas Sheet baharu

Ulang langkah A1–A7. Data lama dalam Sheet asal tidak terjejas.

