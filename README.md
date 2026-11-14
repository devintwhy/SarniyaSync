# SarniyaSync - Sistem Manajemen Inventaris & POS Terpadu

Sistem Enterprise Resource Planning (ERP) dan Point of Sale (POS) multi-tenant berbasis web yang dirancang untuk mengelola dan mengintegrasikan rantai pasok (supply chain) dari gudang pusat ke jaringan gerai toko mitra retail secara terpusat, terisolasi, dan real-time.

---

## Latar Belakang & Ruang Lingkup

Pengelolaan operasional rantai pasok dari distributor pusat ke cabang mitra sering menghadapi kendala desentralisasi data inventaris, ketidaksesuaian pencatatan stok fisik (penyusutan/rusak), serta lambatnya rekonsiliasi transaksi penjualan harian. 

SarniyaSync dibangun untuk menjawab permasalahan tersebut dengan memfasilitasi:
1. Sentralisasi data persediaan barang dari gudang utama ke seluruh cabang mitra.
2. Isolasi data ketat antar gerai mitra guna menjaga privasi komersial dan keamanan data inventaris masing-masing pihak.
3. Pencatatan transaksi penjualan kasir (Point of Sale) secara real-time yang langsung memperbarui kuantitas inventaris toko yang bersangkutan.

### Batasan Hak Akses (Role-Based Access Control)
Sistem membatasi hak operasional ke dalam dua peran utama tanpa peran perantara:
- Admin Utama (Pusat): Bertanggung jawab atas pengelolaan katalog master produk, otorisasi akun mitra, alokasi pasokan barang, pengawasan status pengiriman logistik, audit stock opname, serta analisis performa finansial global.
- Mitra (cabang): Bertanggung jawab atas operasional gerai masing-masing, meliputi kasir POS, konfirmasi penerimaan barang fisik yang dikirim pusat, pengajuan laporan penyesuaian stok fisik (stock opname), serta pemantauan arus kas harian toko.

---

## Arsitektur & Teknologi (Tech Stack)

### Frontend
- Next.js 14 (App Router, Server Components, dan Server Actions)
- React 18
- Tailwind CSS (Desain antarmuka modular, responsif, dan standar enterprise)

### Backend & Basis Data
- Supabase (BaaS berbasis PostgreSQL)
- Supabase Authentication (Autentikasi berbasis sesi terenkripsi)
- PostgreSQL Row Level Security (RLS untuk penegakan keamanan tingkat basis data)
- PostgreSQL Stored Procedures / Remote Procedure Calls (RPC untuk mutasi transaksi atomik)

### Pustaka Pendukung
- Lucide React (Sistem ikonografi antarmuka)
- Recharts (Visualisasi grafik tren omzet harian dan performa produk)
- XLSX / SheetJS (Pembangkitan dan ekspor laporan transaksi penjualan dalam format spreadsheet)

---

## Fitur Utama Berdasarkan Peran

### 1. Admin Pusat
- Manajemen Master Katalog: Penambahan, pembaruan, dan pengaturan status produk, termasuk penetapan Harga Pokok Penjualan (HPP), harga jual, kategori hijab/busana, dan dokumentasi visual produk.
- Alokasi Stok Massal (Bulk Allocation): Mekanisme pengiriman multi-item dari gudang pusat ke gerai mitra target dengan validasi ketersediaan stok fisik pusat.
- Monitoring Pengiriman Stok: Pelacakan status logistik secara terstruktur (DIKIRIM, DITERIMA, DIBATALKAN) dilengkapi prosedur pengembalian kuantitas otomatis ke pusat jika pengiriman dibatalkan oleh Admin.
- Verifikasi & Manajemen Mitra: Otorisasi aktivasi toko mitra baru, penonaktifan outlet, serta pengiriman pesan status operasional.
- Audit Laporan Penyesuaian: Rekapitulasi laporan kerusakan, kehilangan, atau penyusutan stok fisik dari seluruh mitra beserta kalkulasi estimasi kerugian nominal berdasarkan HPP.
- Analisis Penjualan Global: Dasbor agregasi pendapatan harian lintas metode (QRIS, Transfer Bank, Tunai), identifikasi produk terlaris keseluruhan, riwayat struk, serta pembatalan transaksi dengan mekanisme pemulihan stok.

### 2. Mitra Cabang
- Point of Sale (POS) Kasir: Antarmuka kasir cepat dengan fitur pencarian produk, kalkulator kembalian pembayaran tunai, pemilihan metode bayar instan, dan pratinjau struk belanja thermal.
- Konfirmasi Penerimaan Barang: Verifikasi penerimaan paket kiriman dari pusat secara atomik yang langsung memasukkan kuantitas ke dalam saldo inventaris toko mitra.
- Pelaporan Penyesuaian Stok (Stock Opname): Formulir pencatatan selisih stok fisik yang langsung memutasi saldo inventaris dan mencatat log audit ke sistem secara aman.
- Dasbor Kinerja Toko: Ringkasan pendapatan hari ini, omzet bulanan, kuantitas produk etalase aktif, grafik tren 30 hari lokal gerai, serta daftar produk dengan stok kritis (kurang dari atau sama dengan 10 unit).

---

## Keamanan & Isolasi Data

Keamanan dan pemisahan data antar mitra (multi-tenancy isolation) diimplementasikan melalui pendekatan berlapis (defense-in-depth). Pada lapisan aplikasi, Middleware Next.js memvalidasi status autentikasi sesi dan membatasi akses rute berdasarkan role pengguna yang dinormalisasi dari tabel profil. Pada lapisan basis data, Row Level Security (RLS) pada PostgreSQL diterapkan secara ketat pada tabel transaksi, transfer logistik, inventaris, dan penyesuaian stok. Setiap kueri mutasi maupun pembacaan data oleh mitra secara otomatis dibatasi hanya pada baris yang memiliki relasi kepemilikan yang sah (`owner_id = auth.uid()`), sehingga mencegah secara mutlak kebocoran data maupun manipulasi ID silang antar gerai mitra. Seluruh mutasi kritis (penerimaan kiriman dan penyesuaian fisik) dikunci dalam Stored Procedure database dengan parameter transaksi atomik.

---

## Panduan Instalasi Lokal

Berikut adalah panduan langkah demi langkah untuk menjalankan proyek SarniyaSync pada lingkungan pengujian lokal:

### 1. Kloning Repositori
Buka terminal dan jalankan perintah berikut untuk mengunduh kode sumber proyek:
```bash
git clone https://github.com/username/sarniyasync.git
cd sarniyasync
```

### 2. Instalasi Dependensi
Pastikan Node.js (versi 18.17.0 atau lebih baru) telah terpasang pada komputer Anda. Pasang seluruh pustaka dependensi proyek:
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin berkas template environment ke berkas `.env.local`:
```bash
cp .env.example .env.local
```

Buka berkas `.env.local` dan masukkan kredensial proyek Supabase yang valid:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Menjalankan Server Pengembangan
Jalankan server Next.js pada mode development:
```bash
npm run dev
```

Buka peramban web (browser) dan akses alamat:
```
http://localhost:3000
```

### 5. Pengujian Kompilasi Produksi (Opsional)
Untuk memastikan tidak terdapat kendala tipe data (TypeScript) atau proses build produksi, jalankan perintah:
```bash
npm run build
```
