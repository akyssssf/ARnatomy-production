# Perbandingan LLM pada RAG ARnatomy

Pipeline sama untuk semua penyedia (mode retrieval: hybrid, 5 chunk, jenjang SMP, temperature 0). 12 pertanyaan: 8 dalam cakupan (benar bila jawaban memuat kata kunci fakta) dan 4 di luar cakupan (benar bila ditolak).

| Penyedia | Model | Benar (fakta/penolakan) | Gagal (null) | Median latensi | Jawaban > 4 kalimat |
| --- | --- | --- | --- | --- | --- |
| gemini | (bawaan) | 11/12 | 1 | 4856 ms | 0 |

Metrik otomatis hanya memeriksa kata kunci dan penolakan; akurasi seluruh fakta terhadap konteks buku perlu dinilai manual dari jawaban di bawah.

## 1. Jantung manusia terdiri atas berapa ruang? (kunci: empat|4)
- **gemini** ✓ (8826 ms): Jantung kita memiliki empat ruang, yaitu dua serambi (atrium) dan dua bilik (ventrikel). Bagian serambi berfungsi untuk menerima darah yang masuk ke dalam jantung. Sedangkan, bagian bilik bertugas memompa darah keluar dari jantung. Kamu bisa membayangkan serambi seperti pintu masuk penerima tamu, dan bilik sebagai pompa yang mendorong darah pergi.

## 2. Tekanan darah berapa yang disebut hipertensi? (kunci: 140)
- **gemini** ✓ (6917 ms): Seseorang disebut mengalami hipertensi atau darah tinggi kalau tekanan darahnya sama atau di atas 140/90. Angka atas menunjukkan saat ventrikel (bilik jantung) memompa darah, sedangkan angka bawah saat ventrikel rileks menerima darah. Penyakit ini sering dijuluki "silent killer" atau pembunuh diam-diam karena biasanya tidak bergejala sampai kondisinya parah. Makanya, yuk cegah dengan rajin olahraga, makan makanan sehat, dan kurangi konsumsi garam!

## 3. Apa fungsi trombosit? (kunci: pembekuan|membeku|menghentikan|menutup)
- **gemini** ✓ (5192 ms): Trombosit, atau keping darah, berfungsi untuk menghentikan pendarahan dan menutup luka saat kamu terluka. Ketika terluka, trombosit akan mengeluarkan zat kimia yang menghasilkan protein bernama fibrin. Fibrin ini akan membentuk jaring-jaring di sekitar lukamu untuk menutupnya. Dengan begitu, darah bisa berhenti mengalir dan lukamu cepat tertutup!

## 4. Di mana pertukaran gas terjadi di paru-paru? (kunci: alveol)
- **gemini** ✓ (4856 ms): Pertukaran gas di paru-paru terjadi di dalam bagian bernama alveolus. Dinding alveolus dan pembuluh darah kapiler di sekitarnya itu sangat tipis, mirip saringan halus yang mudah dilewati zat. Di sinilah oksigen dari udara masuk ke dalam darah, sedangkan karbon dioksida keluar dari darah. Proses perpindahan ini disebut difusi, yang terjadi karena adanya perbedaan konsentrasi gas.

## 5. Bakteri apa penyebab tuberkulosis? (kunci: mycobacterium)
- **gemini** ✓ (4516 ms): Penyebab penyakit tuberkulosis atau TB adalah bakteri bernama *Mycobacterium tuberculosis*. Bakteri ini sangat kecil dan tidak kasat mata, jadi kamu hanya bisa melihatnya memakai mikroskop. Bentuk kuman ini seperti batang kecil. Di dalam tubuh, bakteri ini menyerang paru-paru sehingga bisa mengganggu pertukaran gas saat kita bernapas.

## 6. Apa fungsi epiglotis? (kunci: menutup|tertutup)
- **gemini** ✓ (5123 ms): Epiglotis itu seperti katup atau pintu pembatas di tenggorokanmu. Saat kamu bernapas, katup ini akan terbuka supaya udara bisa masuk ke paru-paru. Nah, saat kamu makan atau menelan, epiglotis akan menutup saluran napas. Fungsinya adalah mencegah makanan dan minuman masuk ke dalam saluran pernapasanmu.

## 7. Kenapa perokok mudah terkena gangguan paru-paru? (kunci: silia|dahak|oksigen)
- **gemini** ✓ (4958 ms): Asap rokok bisa merusak silia, yaitu rambut-rambut halus di saluran napas yang berfungsi seperti sapu pembersih. Karena "sapu" ini tidak berfungsi, kotoran menumpuk sehingga perokok mudah batuk, berdahak, dan terkena infeksi paru-paru. Selain itu, asap rokok membuat kadar oksigen di dalam darah berkurang. Akibatnya, perokok harus bernapas lebih berat agar tubuhnya tetap mendapatkan cukup oksigen.

## 8. Bagaimana jalur peredaran darah kecil? (kunci: paru)
- **gemini** ✗ (366 ms): _LLM gagal_

## 9. Berapa jumlah tulang pada tubuh manusia dewasa? (harus ditolak)
- **gemini** ✓ (8 ms): Maaf, materi itu belum ada di ARnatomy. Saat ini baru tersedia sistem peredaran darah dan sistem pernapasan.

## 10. Apa fungsi ginjal pada manusia? (harus ditolak)
- **gemini** ✓ (2687 ms): Maaf, materi itu belum ada di ARnatomy. Saat ini baru tersedia sistem peredaran darah dan sistem pernapasan.

## 11. Apa fungsi lambung dalam pencernaan? (harus ditolak)
- **gemini** ✓ (2782 ms): Maaf, materi itu belum ada di ARnatomy. Saat ini baru tersedia sistem peredaran darah dan sistem pernapasan.

## 12. Bagaimana cara kerja otak? (harus ditolak)
- **gemini** ✓ (2842 ms): Maaf, materi itu belum ada di ARnatomy. Saat ini baru tersedia sistem peredaran darah dan sistem pernapasan.
