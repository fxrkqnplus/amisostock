# KARARLAR — Amisostock

> **Durum:** 131 maddenin tamamı karara bağlandı. **Kullanıcı kararı, 19.09.2026.**
> 122 maddede öneri kabul edildi; **9 madde kullanıcı tarafından değiştirildi** (aşağıda DEĞİŞTİ).
>
> Bu dosya kararların kütüğüdür; `CLAUDE.md`, `docs/SPEC.md` ve `docs/ROADMAP.md` bundan türer.
> Bir karar değişirse **önce burası** değişir. Karar silinmez, üzeri çizilir.

## Değiştirilen kararlar

| #      | Yeni karar                                               | Gerekçe / koşul                                                                                                                                                                                                                                                                    |
| ------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `A-01` | **Amisostock**                                           | Ad iki kelimeden gelir (Amisos + Stock) ama tek kelime yazıldığı her yerde TEK s ile: Amisostock. Logo dahil.                                                                                                                                                                      |
| `A-02` | **Alt yol — fxrkqn.org/amisostock**                      | Ad değişikliğine göre güncellendi.                                                                                                                                                                                                                                                 |
| `B-03` | **DEĞİŞTİ — Al/sat/tut sinyali ve hedef fiyat ÜRETİLİR** | Kullanıcı kararı 19.09.2026. Koşul: deterministik üretim, yöntem ve girdiler görünür, hedef fiyat en az iki yöntemden bir ARALIK, geçerlilik süresi ve isabet takibi zorunlu, kurulum davetli kalır, sinyal varlık düzeyinde — kişi düzeyinde değil (B-04 korunur). CLAUDE.md K11. |
| `E-01` | **DEĞİŞTİ — Google Gemini API ücretsiz kademesi**        | Kullanıcı kararı 19.09.2026. AiProvider soyutlaması korunur. UYARI: ChatGPT Plus / Gemini uygulama aboneliği API erişimi İÇERMEZ — ayrı faturalandırılır. Ücretsiz kademe sınırları ve veri kullanımı Faz 7.1 de ölçülecek.                                                        |
| `E-02` | **DEĞİŞTİ — /bin/bash, ücretsiz kademe**                 | Yerel model değil, sağlayıcının ücretsiz kademesi. Günlük istek sayacı + kota dolunca katman kapanır ve ekranda söylenir.                                                                                                                                                          |
| `J-04` | **DEĞİŞTİ — /bin/bash hedefi geri geldi**                | AI ücretsiz kademeye taşındığı için tavan serbest kaldı. Gecikmeli BIST kaynağı ücretliyse karar Faz 2.1 de yeniden verilir.                                                                                                                                                       |
| `K-01` | **DEĞİŞTİ — Hafifletilmiş protokol**                     | Kullanıcı 19.09.2026: kısa tutulsun. Faz + alt görev + kapı zinciri kalır; altı ajanlı orkestrasyon uygulanmaz.                                                                                                                                                                    |
| `K-05` | **DEĞİŞTİ — Yalın belge seti (6 dosya)**                 | KARARLAR.md · CLAUDE.md · docs/SPEC.md · docs/ROADMAP.md · PROJECT_MEMORY.md · docs/CHECKPOINT.md                                                                                                                                                                                  |
| `M-08` | **Geri test v2de**                                       | Ancak K11 sinyal isabet takibi v1de var — sinyaller kaydedilir ve sonucu ölçülür.                                                                                                                                                                                                  |

## Çelişkilerin son durumu

| #   | Çelişki                                   | Çözüm                                                                                                                                                      |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ç1  | Gerçek zamanlı BIST ↔ maliyet             | B-01: gecikmeli (≈15 dk) veri, etiketli. Kaynak maliyeti Faz 2.1 de ölçülecek                                                                              |
| Ç2  | Sürekli AI ↔ ücretsizlik                  | **ÇÖZÜLDÜ** — E-01: Gemini ücretsiz kademe + E-03 olay tetikli üretim + günlük kota                                                                        |
| Ç3  | Sinyal/hedef fiyat ↔ SPK                  | **KULLANICI KARARI** — sinyal üretilir; varlık düzeyinde, kişi düzeyinde değil; davetli kurulum; yöntem görünür; public moda geçiş bu maddeyi yeniden açar |
| Ç4  | Gecikmeli veri ↔ alarm                    | G-09: bildirimde gecikme ve değerin ait olduğu an yazılır                                                                                                  |
| Ç5  | Public repo + AGPL ↔ sağlayıcı sözleşmesi | B-02: türetilmiş çıktı kapalı devrede kalır                                                                                                                |
| Ç6  | Analist tahminleri ↔ ücretsiz erişim yok  | C-08 + artık kendi hedef fiyatımızı üretiyoruz (K11)                                                                                                       |
| Ç7  | Konum                                     | **ÇÖZÜLDÜ** — proje C:\Users\fxrkqn\Documents\amisostock altında; başka hiçbir depoyla ilgisi yok                                                          |

## A — Ürün kimliği ve kapsam

Projenin ne olduğu, kimin için olduğu ve neyin v1'de olmadığı. Bu bölüm cevaplanmadan hiçbir teknik karar anlam taşımıyor.

| #      | Karar                                                                  | Kabul edilen                                                                                                    |
| ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `A-01` | Ürünün adı ne olacak?                                                  | **Amisostock**                                                                                                  |
| `A-02` | Adres biçimi: alt yol mu, alt alan adı mı?                             | **Alt yol — fxrkqn.org/amisostock**                                                                             |
| `A-03` | Kimler kullanacak?                                                     | **Davetli — izin listesindeki hesaplar**                                                                        |
| `A-04` | Sistem kaç kullanıcıya kadar bozulmadan çalışacak şekilde tasarlansın? | **200'e kadar**                                                                                                 |
| `A-05` | Ticari bir taraf olacak mı?                                            | **Hayır — ücretsiz, reklamsız, kapalı devre**                                                                   |
| `A-06` | Lisans ne olacak?                                                      | **AGPL-3.0**                                                                                                    |
| `A-07` | Depo düzeni ve görünürlüğü?                                            | **Ayrı repo, public**                                                                                           |
| `A-08` | v1'de hangi varlık sınıfları olacak?                                   | **BIST hisseleri** · **Kripto paralar** · **Döviz kurları** · **Makro göstergeler (enflasyon, faiz, işsizlik)** |
| `A-09` | Öncelik sırası nedir?                                                  | **1) Veri doğruluğu 2) Hatasızlık 3) Grafik/analiz araçları 4) AI yorumu 5) Görsellik**                         |
| `A-10` | v1 ne zaman bitmiş sayılacak?                                          | **Ölçülebilir kontrol listesi yazılsın, ben onaylarım**                                                         |

## B — Hukuk, lisans ve mevzuat

Bu bölüm teknik değil ama teknik kararların hepsini kilitliyor. Yanlış cevap; kodun değil, projenin kendisinin yeniden yazılması demek.

| #      | Karar                                          | Kabul edilen                                                                                        |
| ------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `B-01` | BIST verisi nasıl alınacak?                    | **Gecikmeli veri (≈15 dk), üçüncü taraf sağlayıcıdan, her ekranda 'gecikmeli' etiketiyle**          |
| `B-02` | 'Türetilmiş veri' nasıl ele alınacak?          | **Türetilmiş çıktı yalnız kapalı devrede (davetli/özel mod) üretilir, kamuya yayılmaz**             |
| `B-03` | AI çıktısı 'al / sat / tut' diyebilecek mi?    | **DEĞİŞTİ — Al/sat/tut sinyali ve hedef fiyat ÜRETİLİR**                                            |
| `B-04` | AI kullanıcının portföyünü görecek mi?         | **Görür ama yalnız tanımlar: dağılım, yoğunlaşma, kur/sektör maruziyeti, oynaklık — işlem önermez** |
| `B-05` | Haber içeriği nasıl gösterilecek?              | **Başlık + kısa alıntı + kaynak bağlantısı (+ kaynak adı ve zamanı)**                               |
| `B-06` | Kazıyıcı (scraper) politikası?                 | **Aynı kural aynen geçerli**                                                                        |
| `B-07` | KVKK yükümlülükleri v1'de nereye kadar?        | **Kapalı devrede asgari: aydınlatma metni + hesap silme + veri indirme çalışır durumda**            |
| `B-08` | Sorumluluk reddi metni nerede görünecek?       | **Kayıtta onay + her AI analizinin altında kalıcı ibare + veri gecikme etiketi**                    |
| `B-09` | Kaynak atfı nasıl yapılacak?                   | **NOTICE dosyası + arayüzde 'Veri kaynakları' sayfası + her veri yanında kaynak rozeti**            |
| `B-10` | Sosyal medya ve forum içeriği kullanılacak mı? | **v1'de yok — v2 kasasına**                                                                         |

## C — Veri kaynakları ve tazelik

Bir finans sitesinin gerçek ürünü veridir. Bu bölüm hangi kaynaktan ne alınacağını, kaynak çöktüğünde ne olacağını ve kullanıcının neye baktığını nasıl anlayacağını belirliyor.

| #      | Karar                                             | Kabul edilen                                                                                                    |
| ------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `C-01` | Hisse verisi için sağlayıcı stratejisi?           | **Mimari MarketDataProvider soyutlaması; birincil + yedek olmak üzere iki sağlayıcı**                           |
| `C-02` | Kripto verisi nereden?                            | **Borsa WebSocket akışı (ör. Binance) + yedek olarak toplayıcı API**                                            |
| `C-03` | Döviz kuru kaynağı?                               | **TCMB resmî kur (referans) + serbest piyasa için ikinci kaynak; ikisi ayrı etiketle gösterilir**               |
| `C-04` | Makroekonomik veri kaynağı?                       | **TCMB EVDS (birincil) + TÜİK (tamamlayıcı)**                                                                   |
| `C-05` | Şirket bildirimleri (KAP) alınacak mı?            | **Evet — resmî KAP veri servisi için başvurulacak; bildirimler varlık sayfasına bağlanacak**                    |
| `C-06` | Bilanço ve finansal tablo verisi v1'de olacak mı? | **Evet — KAP tablolarından temel oranlar hesaplanır**                                                           |
| `C-07` | Haber kaynakları?                                 | **Çok kaynaklı RSS + KAP bildirimleri, tekilleştirme ve varlık eşleştirmesi bizde**                             |
| `C-08` | Analist beklentileri ve hedef fiyatlar?           | **v1'de yok; yerine 'kamuya açık aracı kurum raporlarından derlenen görüşler' bölümü, elle/yarı otomatik**      |
| `C-09` | Tarihsel veri derinliği?                          | **Sağlayıcının verdiği kadar al, en az 5 yıl hedefle**                                                          |
| `C-10` | Veri tazeliği ekranda nasıl gösterilecek?         | **Dört sınıf zorunlu: canlı · gecikmeli · kapanış · tahmini + kaynak + zaman damgası, her sayının yanında**     |
| `C-11` | İki kaynak farklı değer verirse hangisi kazanır?  | **Kaynak önceliği sabit, belgelenmiş ve ekranda görünür; ikinci kaynak yalnız birincisi yoksa devreye girer**   |
| `C-12` | Sağlayıcı çöktüğünde ne olur?                     | **Son bilinen değer 'bayat' etiketi ve yaşıyla gösterilir + yedek sağlayıcıya geçilir + durum çubuğunda uyarı** |
| `C-13` | Ham veri arşivlenecek mi?                         | **Evet — kendi zaman serimizi kurarız (mum verisi + gösterge girdileri)**                                       |

## D — Gerçek zamanlılık ve mimari

Verinin sağlayıcıdan ekrana hangi yoldan geldiği, projenin performansını ve maliyetini doğrudan belirliyor.

| #      | Karar                                               | Kabul edilen                                                                                     |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `D-01` | Canlı yayın tekniği?                                | **SSE — sunucudan istemciye tek yön**                                                            |
| `D-02` | Güncelleme sıklığı nasıl belirlensin?               | **Varlık sınıfına göre farklı: kripto ~2 sn, döviz ~60 sn, gecikmeli hisse 15 dk, makro günlük** |
| `D-03` | Sağlayıcıya kim bağlanır?                           | **Yalnız sunucu (worker) bağlanır; tüm istemciler tek kanaldan beslenir**                        |
| `D-04` | Zaman serisi nerede saklanacak?                     | **PostgreSQL + zaman bazlı bölümlenmiş (partitioned) tablolar + toplulaştırma**                  |
| `D-05` | Önbellek katmanı?                                   | **Redis — sağlayıcı cevapları, hesaplanmış göstergeler ve yayın kanalları için**                 |
| `D-06` | Zamanlanmış işler ve kuyruk?                        | **BullMQ + Redis, ayrı worker uygulaması**                                                       |
| `D-07` | Repo yapısı ne olacak?                              | **Aynı yapı, aynı katman kuralları, aynı arch:check denetimi**                                   |
| `D-08` | Saf hesaplama motoru (packages/engine) ne içerecek? | **Teknik göstergeler + portföy/kâr-zarar + risk metrikleri + geri test — hepsi saf**             |
| `D-09` | Hesaplar deterministik olmak zorunda mı?            | **Geri test ve senaryo üretiminde determinizm zorunlu (tohumlu üreteç); gerisi serbest**         |
| `D-10` | Para ve portföy hesapları nerede yapılacak?         | **Para, maliyet ve kâr-zarar hesapları yalnız sunucuda; istemci yalnız gösterir**                |
| `D-11` | API biçimi?                                         | **REST + Zod şemaları**                                                                          |
| `D-12` | Kullanıcı verisi izolasyonu?                        | **Depo katmanında zorunlu kullanıcı filtresi + tip düzeyinde koruma + sızıntı testi**            |

## E — Yapay zeka katmanı

Ürünün ayırt edici tarafı burası; aynı zamanda en kolay yanlış yapılan ve en hızlı para harcayan katman.

| #      | Karar                                      | Kabul edilen                                                                                                                      |
| ------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `E-01` | Hangi model sağlayıcısı kullanılacak?      | **DEĞİŞTİ — Google Gemini API ücretsiz kademesi**                                                                                 |
| `E-02` | Aylık AI maliyet tavanı?                   | **DEĞİŞTİ — /bin/bash, ücretsiz kademe**                                                                                          |
| `E-03` | Analiz ne zaman üretilecek?                | **Olay tetikli (anlamlı fiyat hareketi, yeni KAP bildirimi, önemli haber) + günde bir planlı tazeleme**                           |
| `E-04` | Hangi varlıklar için analiz üretilecek?    | **Yalnız izleme listesi + portföy + gündemdeki (en çok hareket eden) varlıklar**                                                  |
| `E-05` | AI çıktısının biçimi?                      | **Katı JSON şeması (Zod ile doğrulanır): durum · etkenler · olumlu · olumsuz · riskler · senaryolar · ne değişti**                |
| `E-06` | Halüsinasyona karşı hangi kural konacak?   | **AI yalnız kendisine verilen kaynak parçalarından konuşur; her iddia bir kaynak kimliği taşır, kaynaksız cümle çıktıdan elenir** |
| `E-07` | Belirsizlik nasıl ifade edilecek?          | **Her senaryo: varsayımlar + yaklaşık olasılık bandı + zaman ufku + 'bu senaryoyu ne çürütür' satırı**                            |
| `E-08` | Ekrandaki sayıları kim üretecek?           | **Tüm sayılar deterministik kodda hesaplanır; AI yalnız yorumlar. AI'ın ürettiği hiçbir sayı ekrana basılmaz**                    |
| `E-09` | Analizler saklanacak mı?                   | **Her analiz versiyonlanır; 'bir önceki yoruma göre ne değişti' otomatik çıkarılır**                                              |
| `E-10` | Kullanıcı AI'a soru sorabilecek mi?        | **v1'de hayır — yalnız üretilmiş, şemalı analiz. Sohbet v2 kasasında**                                                            |
| `E-11` | AI içeriği görsel olarak nasıl ayrışacak?  | **Her AI bloğu: ayrı rozet + üretim zamanı + kullanılan kaynakların listesi + model adı**                                         |
| `E-12` | Duygu (sentiment) analizi nasıl yapılacak? | **Önce kural tabanlı/sözlük yöntemi (ücretsiz, deterministik), yalnız belirsiz kalanlar modele gider**                            |

## F — Hesap, güvenlik ve yönetim

Giriş yapılmadan kullanılamayan bir ürün istedin; bu, hesap güvenliğini ürünün çekirdeğine taşıyor.

| #      | Karar                                        | Kabul edilen                                                                                   |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `F-01` | Kayıt modeli?                                | **Kayıt açık, erişim izin listesiyle sınırlı**                                                 |
| `F-02` | E-posta doğrulama ve bildirim gönderimi?     | **Resend (alan adı doğrulamasıyla)**                                                           |
| `F-03` | İki adımlı doğrulama (2FA)?                  | **TOTP desteği v1'de, isteğe bağlı**                                                           |
| `F-04` | Dış kimlik sağlayıcı (Google ile giriş vb.)? | **v1'de yok, yalnız e-posta + parola**                                                         |
| `F-05` | Oturum yönetimi?                             | **Kısa ömürlü erişim jetonu + httpOnly çerezde yenileme jetonu + jeton iptali**                |
| `F-06` | Bot ve kötüye kullanım koruması?             | **Cloudflare Turnstile (kayıt/sıfırlama) + uç nokta bazlı hız sınırı + IP/hesap kotası**       |
| `F-07` | Yönetim paneli v1'de olacak mı?              | **Evet — asgari panel: kullanıcılar, sağlayıcı sağlığı, kota/maliyet sayaçları, bakım modu**   |
| `F-08` | Hesap silme ve veri dışa aktarma?            | **İkisi de v1'de çalışır (silme: onaylı, geri alınamaz; dışa aktarma: JSON + CSV)**            |
| `F-09` | Sır (API anahtarı) yönetimi?                 | **Aynı disiplin: .env + Zod doğrulaması, eksik anahtarda uygulama açılmaz, sır taraması açık** |
| `F-10` | Denetim kaydı (audit log)?                   | **Evet — güvenlik ve para ile ilgili tüm olaylar kayıt altına alınır**                         |

## G — Portföy, izleme ve alarmlar

Kişiselleştirmenin somut karşılığı. Burada verilen kararlar KVKK ve SPK sınırlarına doğrudan temas ediyor.

| #      | Karar                                                   | Kabul edilen                                                                                             |
| ------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `G-01` | Portföy gerçek mi, sanal mı?                            | **İkisi de var ama ayrı: 'Portföyüm' (gerçek kayıt) ve 'Deneme portföyü' (kâğıt üstünde)**               |
| `G-02` | Aracı kurum entegrasyonu?                               | **Kesinlikle yok — pozisyonlar elle veya dosyayla girilir**                                              |
| `G-03` | Maliyet hesabı yöntemi?                                 | **Ağırlıklı ortalama maliyet (varsayılan) + FIFO seçeneği, hangisi olduğu ekranda yazılı**               |
| `G-04` | Vergi hesabı (stopaj, değer artış kazancı) olacak mı?   | **Hayır — v1'de vergi hesabı yok, yalnız brüt kâr-zarar**                                                |
| `G-05` | Birden fazla portföy?                                   | **Evet — çoklu portföy, veri modeli baştan buna göre**                                                   |
| `G-06` | İşlem girişi nasıl olacak?                              | **Elle giriş + CSV içe aktarma (sütun eşleme ekranıyla)**                                                |
| `G-07` | İzleme listesi sınırları?                               | **Çoklu liste, kullanıcı başına toplam ~100 varlık sınırı (ayarlanabilir)**                              |
| `G-08` | Alarm bildirimi hangi kanallardan gitsin?               | **Uygulama içi bildirim merkezi** · **E-posta**                                                          |
| `G-09` | Gecikmeli veride fiyat alarmı ne yapacak?               | **Alarm kurulabilir ama bildirimde gecikme süresi ve 'tetikleyen değerin ait olduğu an' açıkça yazılır** |
| `G-10` | Gösterge paneli kişiselleştirmesi ne kadar derin olsun? | **Bileşen aç/kapa + sıralama (sürükle-bırak), düzen kullanıcıda saklanır; mobilde otomatik tek sütun**   |

## H — Arayüz, grafik ve tasarım

"Modern, minimal, premium, koyu tema" isteğinin somut karşılıkları. Grafik kütüphanesi seçimi, bu bölümün en pahalı kararı.

| #      | Karar                                                  | Kabul edilen                                                                                                                                                   |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `H-01` | Grafik kütüphanesi hangisi olacak?                     | **TradingView Lightweight Charts — açık kaynak, hafif; çizim araçları ve göstergeler bizim tarafımızda yazılır**                                               |
| `H-02` | v1'de hangi grafik araçları olacak?                    | **Mum, çizgi, alan grafikleri + hacim** · **Çoklu zaman dilimi + yakınlaştırma/kaydırma + artı imleç** · **Temel göstergeler (HO, ÜHO, RSI, MACD, Bollinger)** |
| `H-03` | Tema: yalnız koyu mu?                                  | **Koyu birincil + açık tema desteği (jeton tabanlı, kullanıcı seçer)**                                                                                         |
| `H-04` | Vurgu rengi ailesi?                                    | **Sıcak pirinç/amber — klasik piyasa ekranı çağrışımı, yeşil/kırmızıyla çakışmaz**                                                                             |
| `H-05` | Yükseliş/düşüş renk yönü ve renk körlüğü?              | **Yeşil yükseliş / kırmızı düşüş + her değerde işaret (▲▼) ve yüzde; renk asla tek gösterge değil**                                                            |
| `H-06` | "Piyasaya göre değişen görünüm" ne kadar ileri gitsin? | **Sınırlı ve kurallı: durum rozetleri, küçük vurgu alanları, kısa geçiş animasyonları. Arka plan ve ana yüzeyler asla değişmez**                               |
| `H-07` | Tipografi yönü?                                        | **Tek aile, üç rol: arayüz · rakam/veri (eş aralıklı) · başlık. Tüm sayılarda tabular rakam**                                                                  |
| `H-08` | Mobil deneyim?                                         | **Duyarlı web + PWA (çevrimdışı kabuk, ana ekrana ekleme, web push)**                                                                                          |
| `H-09` | En küçük desteklenen ekran genişliği?                  | **360px — her ekran bu genişlikte kullanılabilir olacak**                                                                                                      |
| `H-10` | Erişilebilirlik hedefi?                                | **WCAG 2.1 AA hedefi; otomatik denetim CI kapısı olarak koşar**                                                                                                |
| `H-11` | Büyük tablolar nasıl çizilecek?                        | **Sanallaştırılmış tablo (TanStack Table + Virtual), mobilde kart görünümüne dönüşür**                                                                         |
| `H-12` | Sayı ve tarih biçimi?                                  | **tr-TR biçimi + kısaltmalar (bin/mn/mr) + para birimi simgesi konumu tek yerden yönetilir**                                                                   |

## I — Dil ve para birimi

Arayüz Türkçe, mimari çok dilli. Para birimi ise finansal doğruluğun parçası.

| #      | Karar                                                  | Kabul edilen                                                                                          |
| ------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `I-01` | v1'de kaç dil olacak?                                  | **Altyapı çok dilli, v1'de yalnız Türkçe**                                                            |
| `I-02` | Metin sabit kodlama yasağı uygulanacak mı?             | **Aynen uygulanacak — ESLint kuralı + i18n denetim aracı**                                            |
| `I-03` | Varsayılan ve desteklenen para birimleri?              | **Varsayılan TRY; USD ve EUR her zaman yan gösterim; kullanıcı temel para birimini değiştirebilir**   |
| `I-04` | Dönüşüm hangi anın kuruyla yapılacak?                  | **Anlık değerler güncel kurla; geçmiş işlemler işlem anının kuruyla saklanır; ikisi ayrı gösterilir** |
| `I-05` | Türkçe dil bilgisi kuralları (ek uyumu, tarih, çoğul)? | **Ek uyumu ve tarih biçimlendirme için ayrı modül + testleri**                                        |

## J — Altyapı, dağıtım ve maliyet

Bu bölüm, ürünün gerçekten yayına çıkıp çıkamayacağını belirliyor.

| #      | Karar                                      | Kabul edilen                                                                                             |
| ------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `J-01` | Nerede barınacak?                          | **Aynı Oracle Always Free hesabı**                                                                       |
| `J-02` | Sunucu başka bir projeyle paylaşılacak mı? | **Aynı makine ama kaynak sınırlı konteynerler (bellek/CPU limiti) + öncelik kuralı yazılı**              |
| `J-03` | Veritabanı paylaşımı?                      | **Aynı PostgreSQL örneği, ayrı veritabanı ve ayrı kullanıcı; yedekler ayrı alınır**                      |
| `J-04` | Toplam aylık maliyet tavanı?               | **DEĞİŞTİ — /bin/bash hedefi geri geldi**                                                                |
| `J-05` | Yedekleme ve geri yükleme?                 | **Günlük otomatik yedek + nesne depolamaya (R2 vb.) gönderim + belgelenmiş geri yükleme tatbikatı**      |
| `J-06` | İzleme ve uyarı?                           | **Sentry (hata) + sağlık uç noktası + veri tazelik nöbetçisi (veri N dakikadır güncellenmediyse uyarı)** |
| `J-07` | CI ve dağıtım?                             | **Aynı düzen: GitHub Actions + çok mimarili imaj + Docker Compose**                                      |

## K — Süreç, kalite ve belgeler

Devralınan çalışma protokolünün bu projeye ne kadarının taşınacağı. Bu bölüm cevaplanmadan faz listesi çıkarılamaz.

| #      | Karar                                               | Kabul edilen                                                                                                                                                                                                                                                                                                       |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `K-01` | Devralınan protokol aynen uygulanacak mı?           | **DEĞİŞTİ — Hafifletilmiş protokol**                                                                                                                                                                                                                                                                               |
| `K-02` | Bu projenin değişmez kuralları (K1, K2…) ne olacak? | **Ben taslağı hazırlayayım, sen onaylayasın**                                                                                                                                                                                                                                                                      |
| `K-03` | Test kapsam eşikleri?                               | **Aynı eşikler; saf motor (göstergeler, kâr-zarar) ≥%85**                                                                                                                                                                                                                                                          |
| `K-04` | Bu projeye özel hangi kalite kapıları eklenecek?    | **Veri sağlayıcı sözleşme testi (sağlayıcı cevabı şemadan saparsa CI kırılır)** · **Veri tazelik nöbetçisi** · **Para/biçim nöbetçisi (yuvarlama, para birimi karıştırma, tabular rakam)** · **AI çıktı şeması nöbetçisi (şemaya uymayan çıktı reddedilir)** · **Sır tarama ve istemci paketinde anahtar araması** |
| `K-05` | Belge seti ne kadar geniş olacak?                   | **DEĞİŞTİ — Yalın belge seti (6 dosya)**                                                                                                                                                                                                                                                                           |
| `K-06` | Bu oturumdaki rolüm ne olsun?                       | **Danışman — spesifikasyonu ve faz promptlarını ben üretirim, kodu Claude Code yazar**                                                                                                                                                                                                                             |
| `K-07` | Geliştirme ortamı nasıl sabitlenecek?               | **Sürümler faz başında npm registry'den ölçülerek sabitlenir**                                                                                                                                                                                                                                                     |

## L — Sınır durumları

Finansal veride asıl hatalar burada çıkar. Her biri, yazılmazsa sessizce yanlış sayı üreten bir durum.

| #      | Karar                                                                    | Kabul edilen                                                                                                                   |
| ------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `L-01` | Piyasa kapalıyken ne gösterilecek?                                       | **Piyasa durumu her varlıkta görünür (açık · kapalı · seans öncesi · seans sonrası · tatil) + son kapanış açıkça etiketlenir** |
| `L-02` | Sermaye artırımı, bedelsiz ve bölünme tarihsel seriyi nasıl etkileyecek? | **Düzeltilmiş (adjusted) fiyat serisi tutulur; ham ve düzeltilmiş seri ayrı saklanır, kullanıcı hangisine baktığını görür**    |
| `L-03` | Temettü getiriye dahil edilecek mi?                                      | **Hem fiyat getirisi hem toplam getiri (temettü dahil) ayrı gösterilir**                                                       |
| `L-04` | İşlem görmeyen, askıya alınan veya tedbirli hisseler?                    | **Durum ayrı bir alan olarak taşınır ve ekranda rozetle gösterilir; alarm ve analiz bu durumda durur**                         |
| `L-05` | Yeni halka arzlar ve kısa geçmişli varlıklar?                            | **Yetersiz veri durumunda gösterge hesaplanmaz ve 'yeterli geçmiş yok' yazılır**                                               |
| `L-06` | Zaman dilimi nasıl ele alınacak?                                         | **Her şey UTC saklanır, gösterim Europe/Istanbul; piyasa takvimleri kendi diliminde tanımlanır**                               |
| `L-07` | Tatil ve yarım gün takvimi?                                              | **Piyasa takvimi tablosu tutulur (tatil + yarım gün), yıllık güncellenir**                                                     |
| `L-08` | Aşırı oynaklıkta alarm fırtınası?                                        | **Alarm başına soğuma süresi + kullanıcı başına saatlik üst sınır + toplu özet bildirim**                                      |
| `L-09` | Aynı haberin birden çok kaynaktan gelmesi?                               | **Tekilleştirme: içerik parmak izi + zaman penceresi + varlık eşleşmesi; tekrarlar tek kayıt altında gruplanır**               |
| `L-10` | Çelişen bilgi (düzeltilen/yalanlanan haber)?                             | **Haberin durumu izlenir; ilgili analizler 'kaynağı değişti' işaretiyle yeniden üretilir**                                     |

## M — Keşif, araçlar ve ekran düzeni

İsteğinde geçen ama teknik karşılığı henüz kararlaştırılmamış başlıklar: arama, tarayıcılar, takvimler, haritalar ve varlık sayfasının kendisi.

| #      | Karar                                                 | Kabul edilen                                                                                                                  |
| ------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `M-01` | Arama altyapısı ne olacak?                            | **PostgreSQL tam metin arama + eş anlamlı/takma ad sözlüğü (ticker, eski unvan, halk arasındaki ad) + Türkçe normalleştirme** |
| `M-02` | Arama neyi kapsayacak?                                | **Varlıklar (hisse, kripto, döviz, fon, endeks)** · **Haberler ve KAP bildirimleri**                                          |
| `M-03` | Varlık sayfası nasıl kurgulanacak?                    | **Tek sayfa iskeleti + türe göre açılan bölüm kümesi (yapılandırma ile); olmayan bölüm hiç çizilmez**                         |
| `M-04` | Tarama (screener) araçları v1'de olacak mı?           | **Teknik tarama v1'de, temel tarama C-06'ya bağlı olarak v1 sonunda**                                                         |
| `M-05` | Isı haritası, sektör haritası ve korelasyon araçları? | **Piyasa ısı haritası (günlük değişime göre)** · **Sektör performans haritası**                                               |
| `M-06` | Takvimler (ekonomik, bilanço, temettü)?               | **Bilanço ve temettü takvimi KAP'tan türetilir; ekonomik takvim TCMB/TÜİK yayın takviminden**                                 |
| `M-07` | Hesaplayıcılar v1'de olacak mı?                       | **Evet — bileşik getiri, kur çevirici, kâr-zarar; hepsi saf motorda test edilir**                                             |
| `M-08` | Geri test (backtest) v1'de olacak mı?                 | **Geri test v2de**                                                                                                            |
| `M-09` | Ana gezinme yapısı?                                   | **Beş ana bölüm: Panel · Piyasalar · Varlık · Portföy · Haberler; gerisi bu bölümlerin içinde**                               |

## N — Performans ve geliştirme disiplini

Ölçülmeyen hedef, hedef değildir. Bu bölüm neyin CI'da kapı hâline geleceğini belirliyor.

| #      | Karar                                          | Kabul edilen                                                                                                                               |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `N-01` | Performans bütçesi konacak mı?                 | **Evet: istemci paketi, ilk anlamlı veri süresi ve grafik ilk çizim süresi için sayısal tavan; CI kapısı olarak koşar**                    |
| `N-02` | Geliştirme sırasında sahte veri politikası?    | **Sahte veri yalnız açıkça işaretlenmiş bir sağlayıcı uygulamasında (MockProvider) yaşar; üretim derlemesinde bulunması CI'da hata verir** |
| `N-03` | Sağlayıcı cevapları testte nasıl kullanılacak? | **Gerçek cevaplar bir kez kaydedilir ve testte oynatılır + haftalık bir 'sözleşme testi' gerçek API'ye gider**                             |
| `N-04` | Yük ve dayanıklılık testi?                     | **Eşzamanlı SSE bağlantısı ve zaman serisi sorgusu için bir kerelik yük ölçümü + sonucun belgelenmesi**                                    |
