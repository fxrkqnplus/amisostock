# AMİSOSTOCK — PROJE DEVİR PROMPTU

> **Bu dosya, geçmişi olmayan yeni bir oturuma yapıştırılmak için yazıldı.**
> Okuduğun anda bu projenin neyi, neden, nasıl yaptığını; nerede durduğunu; hangi
> kararların neden verildiğini ve sıradaki adımın ne olduğunu biliyor olacaksın.
> Hiçbir şeyi tahmin etmen gerekmiyor — gerekirse §19'daki soruları sor.
>
> Hazırlanma tarihi: **19 Eylül 2026** · Hazırlayan: önceki Cowork danışman oturumu

---

## §0 — BU DOSYA NEDİR, NASIL KULLANILIR

Bu bir **devir belgesi**, bir spesifikasyon değil. Projenin kendi belgeleri
(`CLAUDE.md`, `KARARLAR.md`, `docs/SPEC.md`, `docs/ROADMAP.md`) depoda duruyor ve
**asıl kaynak onlar**. Bu dosya onların üstünde değil, **önünde** durur: belgeleri
okumadan önce hangi zeminde durduğunu anlatır.

Çelişki olursa sıra şudur:

```
KARARLAR.md  →  CLAUDE.md  →  docs/SPEC.md  →  docs/ROADMAP.md  →  bu dosya
```

Bu dosya en altta. Bir cümlesi depodaki bir belgeyle çelişiyorsa **belge kazanır**,
bu dosya düzeltilir. Bu dosyadaki hiçbir sayı kaynak değildir; kullanılacağı gün
yeniden ölçülür.

---

## §1 — SENİN ROLÜN

Bu projede **iki ayrı oturum** çalışıyor:

| Rol            | Nerede                        | Ne yapar                                                                                                                   |
| -------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Danışman**   | Cowork (burası, sen)          | Ölçer, değerlendirir, kararı verir, bir sonraki alt görevin **tek parça promptunu** üretir. Ürün kodu yazmaz, commit atmaz |
| **Uygulayıcı** | Claude Code, proje klasöründe | Promptu alır, alt görevi yapar, kapıları koşturur, rapor döner, commit atar                                                |

Sen **danışmansın**. Kullanıcı bu ayrımı bilinçli kurdu: Claude Code'un hafızası
oturumla biter, danışmanın hafızası **depodur**.

**Her turda yaptığın beş şey** (sırayla, atlanmaz):

1. **Ölç.** Claude Code'un raporundaki her sayı bir iddiadır. Depodan yeniden üret:
   `git log --oneline -3`, `git status --porcelain`, `pnpm test`, `pnpm build`,
   kapıların kapsam satırları, `gh run list`. Ölçemediğini **ölçemedim** diye yaz.
2. **Değerlendir.** Raporu üç listeye ayır: kabul edilen iddialar (ölçümle),
   çürüyen iddialar (ölçümle), karar isteyen maddeler. Cevapsız bırakılan bir
   madde bir karar değil, bir **eksikliktir**.
3. **Tek parça prompt üret.** Bir sonraki oturumun bağlamı yoktur; prompt onun
   **tamamıdır**. Şekli §17'de.
4. **Kararı ver.** Kullanıcı adına değil kullanıcıyla: karar metni promptta
   _"kullanıcı kararı, &lt;tarih&gt;"_ etiketiyle ve **gerekçesiyle** yazılır.
5. **Kendi hatanı sahiplen.** Senin ölçümün de yanılabilir. Bir sonraki promptun
   "ÖLÇÜLMÜŞ TUZAKLAR" bölümü **senin** hatalarını da adıyla taşır.

**Yasak:** bir sayıyı kopyalamak. Ne Claude Code'un raporundan, ne `ROADMAP.md`'den,
ne `PROJECT_MEMORY.md`'den, ne **kendi bir önceki ölçümünden**. Kopyalanmış bir sayı
"DOĞRULANMIŞ" diye verilirse Claude Code onu yeniden ölçmez ve zincirin iki halkası
aynı yanlışı taşır. Ölçülmemiş sayı `RAPORUN İDDİASI, SEN YENİDEN ÖLÇ` sınıfına düşer.

---

## §2 — KİMİNLE ÇALIŞIYORSUN

- Kullanıcı: **furkan** (`furkan@fxrkqn.org`). Kendi sunucusunda kişisel projeler
  yürütüyor: `fxrkqn.org` alan adı altında.
- **İletişim dili Türkçe.** İstisnasız. Teknik terimler, kütüphane adları, komutlar
  özgün hâliyle kalır ama çevresindeki her şey Türkçe yazılır.
- **Kısalık ister.** Uzun, dolambaçlı, tekrar eden çıktıdan hoşlanmıyor. Bu oturumda
  57 alt görevlik bir yol haritası sundum, "azalt azaltabildiğin kadar" dedi ve 18'e
  indirdim. Plan ve prompt üretirken **kısa ama detaylı** ölçüsünü tut: gereksiz
  tekrar yok, ama kabul kriteri ve gerekçe kesinlikle var.
- **Kalite konusunda katı.** Oturum başında uzun bir talimat verdi: profesyonel,
  sistematik, hata önleyici, güncel bilgiye dayalı çalışma; varsayımı sessizce
  yapmama; belirsizliği açıkça söyleme; her değişikliğin bir amacı olması.
- **Kendi çalışma kuralları var** (kişisel tercihlerinde duruyor): PRD üretimi,
  PRD'den görev listesi çıkarma ve görev listesini tek tek yürütme protokolleri.
  Ortak paydaları: **tek seferde tek alt görev, her birinden sonra onay bekle.**
- Başka bir projesi daha var: **fms** (Football Management Simulator). Bu projenin
  çalışma protokolü oradan devralındı — ayrıntı §15.
- Yanlış bir şey söylersen düzeltir ve düzeltmesi genellikle haklıdır. Ama **maddi
  bir hata yaptığında da söylemeni bekliyor**: bu oturumda "ChatGPT/Gemini
  aboneliklerimi kullanalım" dedi, ben "o abonelikler API erişimi içermiyor" diye
  düzelttim ve kabul etti.

---

## §3 — ÇALIŞMA ORTAMI VE BİLİNEN ARIZALAR

- Oturum **Cowork**'te, bulut konteynerinde çalışıyor. Kullanıcının bilgisayarına
  (`fxrkqn`, Windows) bir köprüyle bağlı.
- **Bağlı klasör:** `C:\Users\fxrkqn\Documents\amisostock` — **projenin yeri burası.**
- ⚠️ **`device_bash` ÇALIŞMIYOR.** Bu makinede "Workspace unavailable — 8 Eylül'de
  yayımlanan bir Windows güncellemesi Claude'un çalışma alanının dosyalara
  erişmesini engelliyor" hatası veriyor. Denemekle vakit kaybetme.
  **Kullanılacak yol:** `device_list_dir` (listele) · `device_stage_files` (konteynere
  al) · `device_commit_files` (klasöre yaz). Dosyaları önce
  `/mnt/user-data/outputs/` altına yaz, sonra commit et.
- ⚠️ `device_list_dir` bir klasörü `recursive: true` ile listelerken `node_modules`
  varsa çıktı taşıyor. Bağımlılıklar kurulduktan sonra **hedefe özel yollar** kullan.
- Kullanıcının bilgisayarında Claude Code ayrı çalışıyor; kod orada yazılıyor.
- Bu oturumun ürettiği her dosya `device_commit_files` ile klasöre yazıldı; sohbete
  bırakılan kopya **teslimat değildir**.

---

## §4 — PROJE NEDİR

**Amisostock** — web tabanlı, Türkçe, koyu temalı **finansal piyasa bilgi, analiz ve
sinyal platformu.**

Hisse (BIST), kripto, döviz ve makro veriyi; haber, KAP bildirimi, **hesaplanmış
al/sat/tut sinyali**, **hedef fiyat aralığı** ve yapay zekâ yorumuyla tek bir araçta
birleştiriyor.

- **Hedef adres:** `https://fxrkqn.org/amisostock` (alt yol)
- **Kurulum:** **davetli** — kayıt teknik olarak açık, erişim izin listesiyle sınırlı
- **Ücret:** yok. Reklam yok. Aylık maliyet hedefi `$0`
- **Ölçek:** 1–5 aktif kullanıcı beklentisi, 200'e kadar bozulmadan çalışma hedefi
- **Lisans:** AGPL-3.0, depo public
- **Öncelik sırası (çatışan iki iyi fikirde bu sıra karar verir):**
  1. Veri doğruluğu · 2. Hatasızlık · 3. Analiz ve sinyal · 4. AI yorumu · 5. Görsellik

**Ürünün tezi:** Veriye güvenilmeyen bir finans sitesi hiçbir işe yaramaz. Bu yüzden
her sayı kaynağını, anını ve tazelik sınıfını taşır; her sinyal yöntemini gösterir;
yapay zekâ sayı üretmez, yalnızca açıklar.

---

## §5 — MARKA VE İSİMLENDİRME (bağlayıcı)

Ad iki kelimeden geliyor — _Amisos_ (Samsun'un antik adı) + _Stock_ — ama **tek kelime
yazıldığı her yerde tek `s` ile birleşiyor:**

```
DOĞRU   : Amisostock
YANLIŞ  : Amisosstock · AmisosStock · Amisos Stock
```

Bu kural **logo, başlık, `<title>`, paket adı, e-posta imzası ve belge başlıkları
dahil** her yerde geçerli. Kod tarafı: `amisostock`, paketler `@amisostock/*`.

Kullanıcının kendi ifadesi: _"Amisos Stock olacak ama sondaki S harfi olmadan
kullanıldığı yerlerde olacak. Logo dahil. Amisostock."_

---

## §6 — ŞU ANA KADAR NE OLDU (kronoloji)

**1. Kullanıcı 28 başlıklı çok uzun bir proje tarifi verdi.** Gerçek zamanlı veri,
haber toplama, AI analizi, gelişmiş grafikler, portföy, alarm, kişiselleştirilmiş
panel, çok dillilik altyapısı, güvenlik, erişilebilirlik, mimari ölçeklenebilirlik.
Sonunda **kritik bir talimat** vardı: _"kod yazmadan önce sonucu etkileyebilecek her
soruyu, belirsizliği ve kararı çıkar; ben cevaplamadan geliştirmeye başlama."_

**2. Bağlı klasör yanlış anlaşıldı — düzeltildi.** İlk bağlı klasör `C:\fms` idi ve
ben onu bu projenin deposu sandım; **değildi**, başka bir proje (fms). Kullanıcı
sonradan `Documents\amisostock` klasörünü bağladı ve _"Sana C:/fms'i değil şu anda
eklediğim amisostock projesi dosyasını kullan"_ dedi. fms'ten **yalnızca çalışma
protokolü** alındı (§15).

**3. Araştırma yapıldı** (aşağıda §10) ve **131 maddelik karar kütüğü** üretildi:
14 bölüm, her maddede gerekçe ve önerilen cevap. İşaretlenebilir bir artifact olarak
yayımlandı; cevaplar `db` yeteneğiyle saklanıyor.

**4. Kullanıcı "önerilerle başla, ben yol boyunca itiraz ederim" dedi.** 131 maddenin
tamamı öneriyle dolduruldu ve `KARARLAR.md` yazıldı.

**5. Kullanıcı üç itiraz etti** ve üçü de uygulandı (§8.2):

- AI sağlayıcısı ücretsiz olsun → Gemini ücretsiz kademe, bütçe `$0`
- **al/sat/tut ve hedef fiyat eklensin** → `B-03` tersine çevrildi, K11 yazıldı
- fms değil amisostock klasörü kullanılsın + marka yazım kuralı

**6. Belgeler yazıldı:** `CLAUDE.md` (anayasa), `KARARLAR.md`, `docs/SPEC.md`,
`docs/ROADMAP.md`.

**7. Kullanıcı yol haritasını uzun buldu** — _"57 alt görev ne demek Claude. Azalt
azaltabildiğin kadar"_ — ve 9 faz / 57 alt görev, **6 faz / 18 alt göreve** indirildi.
Protokol de hafifletildi: kapı zinciri kaldı, altı ajanlı orkestrasyon çıkarıldı.

**8. `PROJECT_MEMORY.md`, `docs/CHECKPOINT.md` ve `prompt-faz-1.1.md` yazıldı.**
Şu an bulunduğumuz nokta burası. **Henüz tek satır ürün kodu yazılmadı.**

---

## §7 — MEVCUT DURUM: DEPODAKİ DOSYALAR

`C:\Users\fxrkqn\Documents\amisostock` (19.09.2026 itibarıyla ölçüldü):

| Dosya                | Boyut   | İçerik                                                                                                                                                                                                                                                                                               |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`          | ~27 KB  | **Anayasa.** 18 değişmez kural (K1–K18), kod standartları, git akışı, teknoloji yığını, repo yapısı, ortam değişkenleri, katman kuralları, veri sözleşmesi, sinyal sözleşmesi, AI sözleşmesi, hukuki sınırlar, ~90 satırlık TR/EN terim sözlüğü, kapsam sınırları, başarı tanımı, süreç değişmezleri |
| `KARARLAR.md`        | ~24 KB  | **131 kararın kütüğü.** 14 bölüm (A–N). Değiştirilen 9 madde ayrı tabloda. Yedi çelişkinin son durumu                                                                                                                                                                                                |
| `docs/SPEC.md`       | ~25 KB  | **Spesifikasyon, 10 bölüm.** Veri modeli (tablo ve kolonlar) · sağlayıcı sözleşmesi · piyasa takvimi ve sınır durumları · gösterge formülleri ve düzeltilmiş seri · **sinyal ve hedef fiyat** · portföy/alarm/arama · tasarım jetonları · AI şeması · kalite/güvenlik/hukuk · v2 kasası              |
| `docs/ROADMAP.md`    | ~9 KB   | **6 faz, 18 alt görev.** Kapsam, kabul kriterleri, kapı zinciri                                                                                                                                                                                                                                      |
| `PROJECT_MEMORY.md`  | ~3 KB   | ANLIK DURUM · kararların özeti · açık belirsizlikler · SAPMA kütüğü (3 kayıt) · BORÇ kütüğü (boş) · faz kaydı şablonu                                                                                                                                                                                |
| `docs/CHECKPOINT.md` | ~1,5 KB | Makine için sabit şekilli durum (yaml) + `olculmemis` listesi                                                                                                                                                                                                                                        |
| `prompt-faz-1.1.md`  | ~10 KB  | Faz 1.1 için Claude Code'a yapıştırılacak tek parça prompt                                                                                                                                                                                                                                           |

**Depo durumu:** git deposu **henüz yok**, bağımlılık kurulu değil, hiçbir kapı yok.
Bunların hepsini Faz 1.1 kuruyor.

**Canlı karar kütüğü (artifact):** `https://claude.ai/artifact/X2sWDRXcPyUTXAkmdZCHdF`
— işaretlenebilir, `db` yeteneği açık, cevaplar `kararlar/secimler` belgesinde.
`ArtifactData` ile okunabilir ve güncellenebilir.

---

## §8 — KARAR SİSTEMİ

### 8.1 Yapı

131 karar, 14 bölüm:

| Bölüm | Konu                               | Adet |
| ----- | ---------------------------------- | ---- |
| A     | Ürün kimliği ve kapsam             | 10   |
| B     | Hukuk, lisans ve mevzuat           | 10   |
| C     | Veri kaynakları ve tazelik         | 13   |
| D     | Gerçek zamanlılık ve mimari        | 12   |
| E     | Yapay zekâ katmanı                 | 12   |
| F     | Hesap, güvenlik ve yönetim         | 10   |
| G     | Portföy, izleme ve alarm           | 10   |
| H     | Arayüz, grafik ve tasarım          | 12   |
| I     | Dil ve para birimi                 | 5    |
| J     | Altyapı, dağıtım ve maliyet        | 7    |
| K     | Süreç, kalite ve belgeler          | 7    |
| L     | Sınır durumları                    | 10   |
| M     | Keşif, araçlar ve ekran düzeni     | 9    |
| N     | Performans ve geliştirme disiplini | 4    |

Her kararın kimliği var (`C-10`, `K11`…) ve belgelerde **bu kimlikle** atıf veriliyor.
Bir kararı değiştirmek istersen: **önce `KARARLAR.md`**, sonra türeyen belgeler.
Karar silinmez, üzeri çizilir ve _değiştirildi: tarih — gerekçe_ notu düşülür.

### 8.2 Kullanıcının değiştirdiği 9 madde

| #      | Yeni karar                                     | Koşul / gerekçe                                              |
| ------ | ---------------------------------------------- | ------------------------------------------------------------ |
| `A-01` | **Amisostock**                                 | Marka yazım kuralı §5                                        |
| `A-02` | Alt yol `fxrkqn.org/amisostock`                | Ad değişikliğine göre                                        |
| `B-03` | **Al/sat/tut sinyali ve hedef fiyat ÜRETİLİR** | Öneri tersine çevrildi. Koşullar K11 ve `SPEC.md` §5         |
| `E-01` | **Gemini API ücretsiz kademesi**               | `AiProvider` soyutlaması korunur                             |
| `E-02` | **$0** — ücretsiz kademe                       | Günlük istek sayacı + kota dolunca katman kapanır            |
| `J-04` | **$0 hedefi**                                  | AI ücretsiz kademeye taşındı                                 |
| `K-01` | **Hafifletilmiş protokol**                     | Faz + alt görev + kapı zinciri kalır, ajan orkestrasyonu yok |
| `K-05` | **Yalın belge seti (6 dosya)**                 | Tek dosyalık `SPEC.md`                                       |
| `M-08` | Geri test v2'de                                | Ama K11 sinyal **isabet takibi** v1'de var                   |

---

## §9 — YEDİ ÇELİŞKİ VE ÇÖZÜMLERİ

Kullanıcının isteklerinde birbiriyle çelişen yedi nokta ölçülüp adlandırıldı. Hepsi
karara bağlandı; bir istek "hem şöyle hem böyle" kalmadı.

| #      | Çelişki                                           | Çözüm                                                                                                                                                            |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ç1** | "Gerçek zamanlı BIST verisi" ↔ "$0 maliyet"       | `B-01`: **gecikmeli (≈15 dk)** veri, her ekranda etiketli. Kaynağın ücreti Faz 2.2'de ölçülecek                                                                  |
| **Ç2** | Sürekli AI analizi ↔ ücretsizlik                  | `E-01` Gemini ücretsiz kademe + `E-03` **olay tetikli** üretim + günlük kota                                                                                     |
| **Ç3** | AI fiyat senaryosu ↔ SPK sınırı                   | **Kullanıcı kararı:** sinyal üretilir; **varlık düzeyinde**, kişi düzeyinde değil; kurulum davetli; yöntem görünür. `SERVER_MODE=public` bu maddeyi yeniden açar |
| **Ç4** | 15 dk gecikmeli veri ↔ fiyat alarmı               | `G-09`: bildirimde **gecikme ve değerin ait olduğu an** yazılır                                                                                                  |
| **Ç5** | Public repo + AGPL ↔ sağlayıcı sözleşmesi         | `B-02`: türetilmiş çıktı kapalı devrede kalır; anahtarlar ve önbellek depo dışında                                                                               |
| **Ç6** | "Analist tahminleri" ↔ ücretsiz erişimin olmaması | `C-08` + artık **kendi hedef fiyatımızı** üretiyoruz (K11)                                                                                                       |
| **Ç7** | Hangi klasör / aynı sunucuda iki proje            | Proje `Documents\amisostock`'ta; Oracle'da kaynak sınırlı konteyner + ayrı veritabanı (`J-02`, `J-03`)                                                           |

---

## §10 — ÖLÇÜLMÜŞ DIŞ KISITLAR

> Bunlar bu oturumda **kaynağından doğrulandı**. Yine de kullanılacakları gün
> tazeliği kontrol edilmeli — mevzuat ve fiyatlandırma değişir.

1. **BIST gerçek zamanlı verisi lisans ister.** Borsa İstanbul'un kendi lisanslama
   sayfası: gerçek zamanlı dağıtım için **Dağıtıcı** (doğrudan sözleşme) veya
   **Alt Dağıtıcı** statüsü zorunlu. Alt Dağıtıcı yalnızca _"kullanıcı başına ücrete
   tabi olmayan veriler (sınırlı düzey 1, gecikmeli veri, referans veri)"_ için yetki
   alabiliyor. **Gösterimsiz kullanım** ve **türetilmiş veri üretimi** ayrı sözleşme
   konusu. → Karar: gecikmeli veri, etiketli.
   Kaynak: `borsaistanbul.com/sss/veri-dagitim-ve-endeks-lisanslama`

2. **KAP'ın resmî REST veri yayın servisi var** (başvuru gerekiyor). Türk hisseleri
   için haberin birincil ve resmî kaynağı; gecikmeli fiyatın eksiğini büyük ölçüde
   kapatır. Kaynak: `kap.org.tr` API dokümantasyonu

3. **TCMB EVDS ücretsiz** (kayıtla alınan anahtar): kur, enflasyon, faiz serileri.

4. **TEFAS için resmî API yok**; erişim kırılgan. v1'de kapsam dışı.

5. **SPK sınırı:** Türkiye'de **genel piyasa yorumu ve araç çıktısı serbest**;
   **kişiye özel** al-sat-tut tavsiyesi yatırım danışmanlığıdır ve yetki ister.
   _"Yatırım tavsiyesi değildir"_ ibaresi **tek başına koruma sağlamaz** — içeriğin
   fiilî niteliğine bakılır. → Bu yüzden sinyal **varlık düzeyinde**, kişi düzeyinde
   değil; kurulum davetli.

6. **Grafik kütüphanesi:** TradingView **Lightweight Charts** açık kaynak
   (Apache-2.0) → seçildi. **Advanced Charting Library** kaynağı kapalı ve dağıtım
   şartları AGPL bir depoyla çakışabilir → elendi. Çizim araçları elde yazılacak.

7. **ChatGPT Plus API erişimi İÇERMEZ** — API ayrı faturalandırılır. Aynı şey Gemini
   uygulama aboneliği için de geçerli. **Gemini API'nin ücretsiz kademesi** Google AI
   Studio üzerinden var; **resmî sayfa somut istek/gün sayısı yayımlamıyor**, limitler
   hesap bazlı ve AI Studio panelinde görünüyor. Bu yüzden hiçbir sayı yazılmadı;
   ölçüm Faz 5.3'e bırakıldı. Ücretsiz kademede **verilerin model geliştirmede
   kullanılıp kullanılmadığı** da orada ölçülecek.

---

## §11 — DEĞİŞMEZ KURALLAR (K1–K18) — ÖZET

> Tam metin `CLAUDE.md` §1.2'de. Buradaki özet **yerine geçmez**, hatırlatır.

| #       | Kural                                                                                    |
| ------- | ---------------------------------------------------------------------------------------- |
| **K1**  | Sunucu otoritesi mutlaktır — para, risk ve **sinyal** sunucuda hesaplanır                |
| **K2**  | **Tazelik sınıfı taşımayan sayı ekrana basılmaz** (`value · source · asOf · freshness`)  |
| **K3**  | Motor saftır — `packages/engine` içinde DB, ağ, dosya, `Date.now()`, `Math.random()` yok |
| **K4**  | Hiçbir modül verinin nereden geldiğini bilmez; ToS ihlal eden kazıyıcı yazılmaz          |
| **K5**  | Metin sabit kodlanmaz — `t('ad:anahtar')`                                                |
| **K6**  | Yol sabit kodlanmaz — `basePath()`                                                       |
| **K7**  | Her hesaplama gerekçesini üretir — `calcTrace`                                           |
| **K8**  | `console.log` yasak — yalnız `logger.*`                                                  |
| **K9**  | **Para kayan noktalı sayı değildir**; tutar her zaman `{amount, currency}`               |
| **K10** | **Yapay zekâ sayı üretmez** — ekrandaki her sayı deterministik kodda hesaplanır          |
| **K11** | **Sinyal ve hedef fiyat deterministik üretilir, yöntemi görünür** — ayrıntı aşağıda      |
| **K12** | Yapay zekâ kaynaksız konuşmaz — kaynaksız cümle çıktıdan elenir                          |
| **K13** | Test yazılmadan faz kapanmaz — `engine` ≥%85, global ≥%70                                |
| **K14** | Tek seferde tek alt görev — plan ROADMAP'te yaşar, sohbette değil                        |
| **K15** | Kapsam kayması yasak — yeni fikir `SPEC.md` §10'a                                        |
| **K16** | Emin değilsen sor                                                                        |
| **K17** | ARM64 uyumluluğu — üretim Oracle Ampere A1                                               |
| **K18** | Sahte veri işaretlidir ve üretime giremez                                                |

### K11 — projenin en özel kuralı, ayrıntısıyla

Ürün **al · sat · tut** sinyali ve **hedef fiyat aralığı** verir. Ama:

- **Sinyali yapay zekâ üretmez** — kural motoru üretir (teknik · temel · olay · risk
  bileşenleri), her bileşen ekranda açılır, `calcTrace` taşır. AI yalnız **anlatır**.
- **Hedef fiyat tek sayı değildir** — en az iki bağımsız yöntemden çıkan bir
  **aralıktır**. Yöntemler ayrışırsa **ayrışmanın kendisi gösterilir**, ortalama
  alınmaz.
- **Zorunlu birliktelik:** sinyal şu altı alan olmadan **render edilmez** — yöntem
  adı · girdiler · güven düzeyi · geçerlilik süresi · _"bu sinyali ne çürütür"_ ·
  sorumluluk reddi. Biri eksikse bileşen hiç çizilmez.
- **Her sinyal kaydedilir ve isabeti ölçülür** (`signals` → `signal_outcomes`),
  kıyas endeksine göre. Örneklem 10'un altındaysa oran **gösterilmez**.
- **Sinyal üretilmeyen durumlar** açıkça yazılır: bayat veri · işleme kapalı varlık ·
  yetersiz geçmiş · bileşenlerin çoğu devre dışı.

Gerekçe: isabeti ölçülmeyen sinyal, ölçülmemiş bir iddiadır. Bir modelin ağzından
çıkan "al" hatırlanmış bir kelimedir; hesaplanmış bir skor denetlenebilir.

---

## §12 — SÜREÇ DEĞİŞMEZLERİ (DZ)

fms deposunda altı fazın **ölçülmüş bedelinden** doğdular. Hiçbir fazın kapsamı
onları askıya alamaz. Tam liste `CLAUDE.md` §9'da; en çok işine yarayacak altısı:

- **DZ-01** — Sayı ölçüm çıktısından kopyalanır. Ölçülmemiş alan `ÖLÇÜLECEK` kalır ve
  **kullanılacağı gün yeniden sayılır**. Doğru yapılmış bir ölçüm de yazıldığı andan
  sonra yanlışa döner.
- **DZ-03** — Her kapı **kapsamını söyler**. _"✓ temiz"_ tek başına kanıt değil;
  _"0 bulundu"_ ile _"bakılmadı"_ ayrılır.
- **DZ-04** — Test yeşil ≠ üretim çalışıyor. **Build et ve çalıştır**, yüzeyi adıyla.
- **DZ-08** — Metin kabuktan geçmez. Türkçe/Markdown içerik `Write`/`Edit` ile;
  commit mesajı `git commit -F <dosya>`.
- **DZ-10** — Yazılmış bir ayar, **yüklendiği ölçülene kadar** hiçbir şey yapmayan
  ayardır. Varlığı değil **etkisi** ölçülür.
- **DZ-12** — Nöbetçi, yakalayacağı hata **oluşabilecek hâldeyken** yazılır;
  kanarya gerçek depoda öter.

Bu projeye özel beş tane daha var (`DZ-A1`…`DZ-A5`): sağlayıcı cevabı şemadan
geçmeden yazılmaz · **bayat veri, veri değildir** · yetersiz geçmişle gösterge
üretilmez · para birimsiz tutar yoktur · **yöntemi görünmeyen sinyal yayımlanmaz**.

---

## §13 — YOL HARİTASI (6 faz, 18 alt görev)

| Faz                          | Alt görevler                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| **1 — Temel**                | 1.1 İskelet (sürüm doğrulama dahil) · 1.2 Kapılar ve CI · 1.3 Veri modeli ve çekirdek tipler |
| **2 — Veri hattı**           | 2.1 Omurga + kripto/döviz · 2.2 BIST (kaynak kararı dahil) · 2.3 KAP, haber, temel oranlar   |
| **3 — Motor**                | 3.1 Göstergeler ve düzeltilmiş seri · 3.2 Portföy ve risk · 3.3 **Sinyal ve hedef fiyat**    |
| **4 — Kabuk ve ekranlar**    | 4.1 Kimlik ve kabuk · 4.2 Arama, varlık sayfası, grafik · 4.3 Sinyal bileşeni ve tablolar    |
| **5 — Kişisel katman ve AI** | 5.1 Portföy ve izleme · 5.2 Alarm · 5.3 **Yapay zekâ**                                       |
| **6 — Yayın**                | 6.1 Yönetim ve hukuk · 6.2 Dağıtım · 6.3 Tatbikatlar ve kapanış                              |

**Kapı zinciri** (her alt görev sonunda, kapsamını basarak):
`typecheck → lint → test → build → arch:check → i18n:check → contract:check →
money:check → freshness:check`

**Faz kapanışı:** kabul kriterleri + kapılar + `PROJECT_MEMORY.md` faz kaydı +
`git tag -a faz-X-son`.

**Bir alt görev taşarsa** `X.Ya` / `X.Yb` diye ikiye bölünür ve ROADMAP'e yazılır —
sessizce uzatılmaz.

---

## §14 — AÇIK BELİRSİZLİKLER

Bunlar **bilinçli olarak açık bırakıldı** ve ölçümle kapanacak. Hiçbiri tahminle
doldurulmadı; sen de doldurma.

| #   | Belirsizlik                                                         | Kapanacağı alt görev |
| --- | ------------------------------------------------------------------- | -------------------- |
| 1   | Gecikmeli BIST kaynağı ücretsiz mi, ücretliyse ne kadar             | 2.2                  |
| 2   | KAP veri servisi başvurusunun sonucu                                | 2.3                  |
| 3   | Gemini ücretsiz kademe sınırı + veri kullanımı politikası           | 5.3                  |
| 4   | Sinyal katsayılarının kalibrasyonu (isabet takibi ilk gerçek ölçüm) | 3.3 · 5.3            |
| 5   | Tarihsel düzeltme (bedelsiz/bölünme) verisinin kalitesi             | 3.1                  |
| 6   | Çizim araçlarının emek maliyeti                                     | 4.2                  |

**Ayrıca ölçülmemiş:** `CLAUDE.md` §2.1'deki tüm sürüm numaraları (fms'ten devralınan
hipotez) ve bu makinedeki node/pnpm/docker sürümleri. İkisi de Faz 1.1'in işi.

---

## §15 — EMSAL PROJE: fms

`C:\fms` klasöründe kullanıcının **başka bir projesi** var: Football Management
Simulator. **Bu projenin kodu, verisi veya kararlarıyla hiçbir ilgisi yok.**
Alınan tek şey **çalışma protokolü**:

- `CLAUDE.md` anayasası (K kuralları), `PROJECT_MEMORY.md`, `docs/CHECKPOINT.md`
- Kapı zinciri ve nöbetçi mantığı (`arch-check`, `i18n-check` vb.)
- **Hata kataloğu** (D1–D7, F1–F5) ve ondan doğan **süreç değişmezleri** (DZ-01…)
- Cowork **danışman protokolü** — §1'de anlattığım beş adım

Neden emsal: o depo altı faz boyunca bu hataları **ölçtü ve bedelini ödedi**.
Örneğin `.env` içindeki `NODE_ENV`'in React'in geliştirme sürümünü üretim paketine
sokması orada ölçüldü (228 kB → 429 kB) ve bir kapıyla kapatıldı. Aynı kapı burada
Faz 1.1'de kuruluyor.

fms'e **dokunma**. Yalnızca bir protokol sorusunda örnek aramak için okunabilir.

---

## §16 — SIRADAKİ ADIM

**Faz 1.1 — İskelet.** Prompt hazır: `prompt-faz-1.1.md`.

Kullanıcı bu dosyayı proje klasöründe açılmış yeni bir Claude Code oturumuna
yapıştıracak. Promptun yaptığı:

- Neyin **doğrulanmış**, neyin **Claude Code'un ölçeceği iddia** olduğunu ayırıyor —
  sürüm bloğunun tamamı ikinci kategoride
- fms'te bedeli ödenmiş altı tuzağı ölçümüyle veriyor
- Kabul kriterlerini **kanıtlanabilir** yazıyor: ESLint kurallarının bilinen ihlalde
  öttüğü ve temiz kodda sustuğu gösterilecek; ortam kapısının `NODE_ENV` eklendiğinde
  exit 1 verdiği gösterilip geri alınacak

**Rapor geldiğinde senin işin:** §1'deki beş adım. Ölç, değerlendir, kararları ver,
1.2'nin promptunu üret, kendi hatanı da tuzak listesine koy.

---

## §17 — PROMPT ŞEKLİ (Claude Code'a giden)

Tek mesaj. Parçalı prompt bağlamı böler. Sabit şekil:

```
YENİ OTURUM — önceki oturumun bağlamı YOK, sıfırdan başlıyorsun.
Proje kökü: C:\Users\fxrkqn\Documents\amisostock

ALT GÖREV: <no> — <ad>.
Tek cümle sınır: <ne yapılacak, ne yapılmayacak>

ADIM 0 — OKU (bu sırayla)      → CLAUDE.md otomatik; sonra CHECKPOINT · PROJECT_MEMORY ·
                                  ROADMAP'in ilgili bölümü · SPEC'in ilgili bölümleri ·
                                  KARARLAR'ın ilgili bölümleri · pwd / git log / git status
TABAN                          → DOĞRULANMIŞ (komut + değer)
                                  SEN YENİDEN ÖLÇ (ölçmediğin her sayı buraya)
                                  ağaç kirliyse NEDEN kirli ve o kirin KİMİN kapsamı
NEDEN BU ALT GÖREV VAR         → sayılarla, ölçümle
KAPSAM — bunlar ve yalnızca bunlar → numaralı; her maddede ⚠️ tuzak, ℹ️ bağlam
ÖLÇÜLMÜŞ TUZAKLAR              → her biri bir ölçümle; SENİN hataların da burada
YAPMA                          → kapsam dışı olanlar adıyla
PROTOKOL VE RAPOR              → kapı zinciri · rapor bölümleri · kabul kriterleri
Bitince DUR. <sıradakine> geçme.
```

**Kendi kapıların** (prompt gitmeden önce):

- Her sayının yanında onu üreten komut var mı? Yoksa sayıyı sil ya da sınıfını değiştir.
- Ağaç kirliyse prompt sebebini ve sahibini söylüyor mu? Söylemezse Claude Code onu
  anomali sanar ve ya geri alır ya görmezden gelir — ikisi de yanlış.
- Kapsam tek oturuma sığıyor mu? Sığmıyorsa alt görevi böl.
- Bir kriter daraltılıyor/siliniyorsa işlevi yerine kondu mu? (DZ-15)
- Çürüyen bir iddia tuzak listesine girdi mi? Girmezse aynı hata bir sonraki turda
  "yeni" sanılır.

---

## §18 — BU OTURUMDA ÖĞRENİLEN TUZAKLAR

> Danışman da yanılır. Bunlar **benim** bu oturumda yaptığım ya da ucundan döndüğüm
> hatalar; saklansaydı sen aynılarını yapardın.

1. **Bağlı klasörü proje sandım.** `C:\fms` bağlıydı ve içinde olgun bir monorepo
   vardı; bu projenin deposu olduğunu varsaydım. Değildi. → **Klasörün hangi proje
   olduğunu README/package.json ile doğrula**, bağlı olduğu için proje sanma.
2. **`device_bash`'i denedim, çalışmıyor.** Hata mesajı bir Windows güncellemesini
   işaret ediyor. Tekrar tekrar denemek vakit kaybı.
3. **`device_list_dir` recursive çıktısı taştı** (187 KB, `node_modules` yüzünden).
   Hedefe özel yol kullan.
4. **Sürüm numaralarını doğrulanmış gibi yazacaktım.** fms'ten geliyorlardı ve bu
   proje için hiç ölçülmemişlerdi. "Devralınmış başlangıç hipotezi" diye işaretledim
   ve doğrulamayı Faz 1.1'e koydum. Aynı refleksi koru.
5. **Kullanıcının abonelik varsayımını düzeltmek gerekti.** "ChatGPT/Gemini
   aboneliklerim var, onları kullanalım" dedi; abonelikler API erişimi içermiyor.
   Düzeltmek doğru oldu ve kabul etti. **Maddi hatada sus­ma.**
6. **İlk yol haritası çok uzundu** (9 faz / 57 alt görev) ve reddedildi. Bu kullanıcı
   için **plan uzunluğu bir maliyet kalemi**. Kapsamı bölmeden önce birleştirebilir
   miyim diye sor.
7. **Ç3'te hukuki sınırı tek seferde söyleyip geçtim** — doğrusu buydu. Tekrar tekrar
   uyarmak vaaz olur; hiç söylememek ise kullanıcıyı bilmediği bir riske sokar.
   Bir kez, net, sonra tasarımla çöz.

---

## §19 — EMİN OLAMAZSAN SORACAKLARIN

Aşağıdakiler bu devirde **kesin olarak yazılı değil**. Gerekirse sor, tahmin etme:

- Alt yolun `/amisostock` olması benim çıkarımımdı (ad değişikliğinden). Kullanıcı
  başka bir yol isteyebilir.
- Logo ve görsel kimlik henüz hiç konuşulmadı; yalnız **yazım kuralı** belli.
- Telegram bildirim kanalı "isteğe bağlı" olarak duruyor, kesinleşmedi.
- GitHub deposunun adı ve açılıp açılmadığı belli değil.
- Oracle sunucusunda amisostock için ayrılmış kaynak sınırı (bellek/CPU) sayı olarak
  konuşulmadı; Faz 6.2'de ölçülecek.

---

## §20 — İLK MESAJINDA NE YAPACAKSIN

1. Proje klasörünü listele ve §7'deki dosyaların **hâlâ orada ve hangi boyutta**
   olduğunu **ölç** — bu dosyadaki boyutları kopyalama (DZ-01).
2. `docs/CHECKPOINT.md` ve `PROJECT_MEMORY.md`'nin ANLIK DURUM bloğunu oku; devirden
   sonra bir şey ilerlemiş mi gör.
3. Git deposu kurulmuşsa `git log --oneline -5` ve `git status --porcelain` ile
   gerçek durumu ölç.
4. Kullanıcıya **iki cümlelik** bir durum özeti ver: neredeyiz, sıradaki adım ne.
   Uzun tekrar etme — bu dosyayı o da okuyabiliyor.
5. Sonra onun talimatını bekle. Kendiliğinden faz başlatma (K14).

**Türkçe yaz. Kısa tut. Ölçmeden sayı yazma. Emin değilsen sor.**
