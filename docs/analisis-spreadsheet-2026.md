# Analisis Spreadsheet JK INDUK MRSM SAS 2026

Sumber: `JK INDUK MRSM SAS 2026.xlsx` (Drive pemilik) dan `NAMA STAF` (94 staf). Fail asal tidak diubah; analisis dibuat pada salinan.

## Helaian (4)
| Helaian | Keadaan | Kandungan | Digunakan? |
|---|---|---|---|
| `JK TERKINI` | nampak | **Struktur 2026 yang sah**: 125 jawatankuasa/unit, 1,151 baris pelantikan. B = bil., C = nama/jawatan, D = peranan lama (stale; 14 sel `#REF!`), E = peranan 2026 | **Ya — sumber utama** |
| `Jawatankuasa` | nampak | Eksport lama/mail-merge (72 JK, 1,109 baris, kod A01–E33, tajuk lajur `Text61…`) | Tidak (rujukan sahaja) |
| `TENAGA PENGAJAR T1`, `TING. 2` | tersembunyi | Matriks guru subjek bagi kelas | Tidak (bukan data JK) |

## Pemetaan ke sistem 2027
- Setiap tajuk jawatankuasa dalam `JK TERKINI` → satu baris `Jawatankuasa`. Nama dikekalkan seperti dalam sumber (termasuk ejaan).
- Setiap baris nama + peranan → satu `Tugasan`. **Semua 1,151 baris dikekalkan.**
- Nama dipadankan dengan `NAMA STAF` selepas normalisasi (buang EN./PN., BT→BINTI, B→BIN, tanda baca) + alias ejaan bagi 2 nama (fail data/alias.json, tidak dimuat naik).
- ~140 rentetan peranan dipetakan kepada **23 jawatan asas** + kualifikasi (cth. "UNIT AUDIT (K)" → *Ketua Unit* + "UNIT AUDIT"; "PENYELARAS ROBOTIK" → *Penyelaras* + "ROBOTIK"). Peranan tidak dikenali → *Ahli Jawatankuasa* dengan teks asal sebagai kualifikasi (semak di halaman Jawatan).
- Blok kategori JK mengikut susunan sheet: Pentadbiran & Pengurusan (14), Akademik (15), Hal Ehwal Pelajar & Asrama (11), Kokurikulum & Kepimpinan Pelajar (49), Program & Majlis (36).

## Dapatan kualiti data
1. 212 baris ialah **jawatan** (Pengetua, Timbalan Pengetua ×3, Penolong Pegawai Tadbir, Pembantu Tadbir (K), Pengarah MARA Negeri) — dimodelkan sebagai staf *ex-officio* (J01–J09) dan diasingkan daripada analisis merit.
2. **Seorang guru (T001)** tiada dalam NAMA STAF → rekod `T001` untuk disahkan.
3. 17 entri bukan nama orang ("GURU PENDIDIKAN ISLAM", "PRESIDEN LDP", "SEMUA GURU SKP", "USTAZ X" …) → *pemegang tempat* `R001–R017` untuk diganti dengan nama sebenar.
4. Peranan ganda orang yang sama dalam satu JK (cth. Sebut Harga Maktab) dikekalkan sebagai pelantikan berasingan.
5. Tahun tertanam dalam nama JK (cth. "SEM 1 2026", "SPM 2025") — semak semasa menyediakan 2027.
6. Dua jawatan mempunyai ejaan berbeza antara helaian (JDM "Displin"/"Disiplin", MQS) — nama diambil daripada `JK TERKINI`.
7. Tiada ID staf, jabatan atau nilai merit dalam sheet 2026; ID diambil daripada NO GAJI (NAMA STAF); kategori ditentukan oleh jawatan (GURU MARA/KETUA JABATAN = GURU; selain itu SOKONGAN).
8. Pelajar SKP di luar skop (hanya guru/staf).

## Jumlah data benih
94 staf + 9 ex-officio + 1 guru baharu (T001) + 17 pemegang tempat = **121 rekod staf**; 125 JK × 2 tahun (2026, 2027); 1,151 pelantikan × 2 tahun.

