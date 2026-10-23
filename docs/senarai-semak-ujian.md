# Senarai Semak Ujian

Tanda ✅ = telah disahkan secara automatik dalam sesi pembangunan (`tools/ujian.js` dan `tools/pelayan-ujian.js`, dengan kod .gs sebenar dan helaian tiruan dalam memori). Tanda ☐ = perlu disahkan oleh anda pada pemasangan sebenar Google.

## Logik merit (node tools/ujian.js — 14 ujian lulus)
- ✅ Contoh brief: Pengerusi 10 + Setiausaha 8 + Ahli 5 = 23
- ✅ Tambah tugasan mengemas kini jumlah; buang tugasan mengira semula
- ✅ Ubah nilai merit jawatan menjejaskan semua pemegang; tahun lain tidak terjejas
- ✅ Tugasan tidak aktif / tahun lain tidak dikira
- ✅ Pendua dikesan; jawatan seorang pemegang; had per staf; input tidak sah ditolak
- ✅ Pratonton kesan tepat
- ✅ Ex-officio & pemegang tempat diasingkan daripada analisis
- ✅ Angka dashboard sepadan dengan jumlah rekod tugasan
- ✅ Cadangan calon mengecualikan ahli sedia ada
- ✅ Import: ID pendua / emel tidak sah dikesan, tiada penimpaan
- ✅ Banding tahun

## Hujung-ke-hujung (sistem penuh, data benih sebenar)
- ✅ Log masuk, semua 10 halaman dimuatkan tanpa ralat konsol
- ✅ Dashboard: 125 JK, 91 staf dianalisis, 1,151 tugasan, 5,002 merit (sepadan dengan ujian logik)
- ✅ Tambah ahli melalui dialog: pratonton 85→92 (+7), simpan, bilangan ahli 14→15
- ✅ Ubah merit Bendahari 7→9 untuk 2027: merit staf 99→101; 2026 kekal 85
- ✅ Buang tugasan: merit dikira semula
- ✅ Tanpa token / token palsu → sesi tamat; Pelihat tidak boleh simpan; Pengurus tidak boleh ubah jawatan/baca audit (kawalan di pelayan)
- ✅ Pelihat tidak melihat emel staf
- ✅ Log masuk salah ditolak dengan mesej selamat
- ✅ Pengerusi kedua dalam JK sama ditolak; input tidak sah ditolak; merit negatif ditolak
- ✅ Padam staf yang ada tugasan ditolak; salin tahun tidak menimpa tahun sedia ada
- ✅ Peralihan tahun 2027→2028 menyalin 126 JK dan 1,152 tugasan
- ✅ Formula (`=HYPERLINK…`) diperlakukan sebagai teks
- ✅ Log audit merekod perubahan

## Perlu diuji pada pemasangan Google sebenar
- ☐ `setupAwal()` berjaya dan memaparkan kata laluan sementara
- ☐ Penerbitan Web App (*Execute as: Me*, *Anyone*) — URL boleh dibuka tanpa log masuk Google; log masuk sistem berfungsi
- ☐ Carta dipaparkan (cdnjs boleh dicapai dari rangkaian sekolah)
- ☐ Kelajuan: muat Papan Pemuka < 5 saat dengan data penuh
- ☐ Dua pengguna menyimpan serentak (LockService) — tiada data hilang
- ☐ Fail DB Google Sheet tidak dikongsi dengan sesiapa
- ☐ Paparan telefon (lebar ≈375px): menu sisi boleh dibuka, jadual boleh digulung
- ☐ Cetak (Ctrl+P) pada halaman Papan Pemuka, Butiran JK dan Profil Staf: menu & butang tidak dicetak
- ☐ CSV dibuka dengan betul dalam Excel (huruf Melayu & koma)
- ☐ Sandaran: salinan Sheet DB dibuat

## Had diketahui
Lihat bahagian "Had yang diketahui" dalam README.
