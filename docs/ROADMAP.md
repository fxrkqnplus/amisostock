# ROADMAP — Amisostock

> **6 faz, 19 alt görev.** Her alt görev bir oturum, bir Conventional Commit. Bir
> fazın alt görevleri aynı feature dalında ilerler; fazın son alt görevi bitmeden PR
> açılmaz. PR merge edilince sonraki faz dalına geçilir ve eski faz dalı silinir.
> Bu sayı tabandır:
> daha aza indirmek tek oturuma sığmayan birimler üretir. Bir alt görev taşarsa
> `X.Ya` / `X.Yb` diye ikiye bölünür — ROADMAP'e yazılır, sessizce uzatılmaz.
>
> Kaynak: `KARARLAR.md` → `CLAUDE.md` → `docs/SPEC.md`. Bu dosya kendi sesimizdir
> (DZ-06); çelişkide kaynak kazanır.

## 0. Yürütme

- Tek seferde tek alt görev → dur → burada işaretle → onay bekle (K14).
- **Kapı zinciri**, her alt görev sonunda, kapsamını basarak (DZ-03):
  `typecheck → lint → test → build → arch:check → i18n:check → contract:check → money:check → freshness:check`
- Faz kapanışı: kabul kriterleri + kapılar + `PROJECT_MEMORY.md` kaydı + `git tag -a faz-X-son`.
- Kabul kriterlerindeki her sayı **ölçüm çıktısından** gelir (DZ-01).

`[ ]` yapılmadı · `[x]` kapandı · `[~]` yarım (sebebi `CHECKPOINT.md`'de)

---

## Faz 1 — Temel

**Amaç:** Yanlışı yakalayacak düzenek ve veri modeli, tek satır ürün kodundan önce.

- [x] **1.1 İskelet.** pnpm workspace + Turborepo; `CLAUDE.md` §2.1'deki her sürüm npm registry'den doğrulanır ve blok **ölçümle yeniden yazılır**; `tsconfig.base.json` + paket başına açık `types`; ESLint flat config + iki yerel kural (`no-hardcoded-path` K6, `no-bare-jsx-text` K5); `.env.example` + Zod ortam şeması (eksikte açılmaz) + `NODE_ENV` yasağı kapısı. Ölçüm: `docs/reports/1.1-iskelet.md` (20.09.2026).
- [x] **1.2 Kapılar ve CI.** `arch-check` (katman + saflık), `money-check` (float para avı), `freshness-check` (tazeliksiz değer avı), `i18n-check`, `contract-check` iskeleti — **her biri kanaryalı ve iki yönlü** (DZ-12); CI `amd64`+`arm64`, tüm kapılar **maskesiz `run:`** + kablolamayı iddia eden test (DZ-11); `docker-compose` (postgres + redis). Uzak ölçüm: [`docs/reports/1.2-kapilar.md`](reports/1.2-kapilar.md), run `35487311059`.
- [x] **1.3 Veri modeli ve çekirdek tipler.** `SPEC.md` §1'deki tabloların tamamı + zaman bazlı bölümleme + saklama süreleri; `packages/shared`: `Money`, `Quote`, `Freshness`, markalı tipler — **tazelik alanı olmayan değer arayüze geçemez** (K2), farklı para birimli toplama **derlenmez** (K9). Ayrı ham/düzeltilmiş seri (L-02); PostgreSQL migration ve saklama entegrasyon testi. PR #1 `7149333` merge commit'iyle `develop`'e alındı, `faz-1-son` etiketi eklendi; üç PR CI run'ının PostgreSQL 18.6, amd64 ve arm64 işleri geçti. Merge commit'ine bağlı ayrı workflow run'ı bulunmadı. Rollup kanıtının sonradan gelen düzeltmelerle geçersiz kılınmaması hakkında açık P1 inceleme bulgusu raporda kayıtlıdır; ölçüm: [`docs/reports/1.3-veri-modeli.md`](reports/1.3-veri-modeli.md).

**Kabul:** tüm kapılar temiz ve kapsamını basıyor · üç nöbetçinin kanaryası gerçek depoda ötüyor · CI'da her kapı `run:` olarak görünüyor · sürüm bloğu ölçümle yazılmış · `K2`/`K9` ihlali derlenmiyor (negatif test).
**Atıf:** `SPEC.md` §1, §9

---

## Faz 2 — Veri hattı

**Amaç:** Bir fiyatın kaynağı, anı ve tazeliğiyle ekrana kadar akması. Ürünün geri kalanı buna bağlanır.

- [x] **2.1a Sağlayıcı omurgası, kripto ve resmî kur.** `MarketDataProvider`, Zod doğrulama, öncelik/registry; Binance Spot WebSocket kripto; TCMB EVDS günlük referans kuru (`close`, sonraki günlük yayına dek); BullMQ worker, Redis cache/kota/sağlık ve paylaşımlı SSE. CoinGecko Demo yedeği yalnız açık sunucu ayarı ve anahtarla etkinleşir, 30 saniyeyi aşınca bayat olur ve kullanıcı şartları/atıf gereklidir. Ayrıntı: `docs/reports/2.1a-saglayici-omurgasi.md`.
- [x] **2.1b Serbest piyasa FX kaynağı.** Open Exchange Rates saatlik USD tabanlı kur tahmini; EVDS `close` değerinden ayrı `estimate` kaydı/etiketi, kaynak zamanı ve atıf. Ücretsiz küçük ölçekli/açık kaynak kullanımı, 1.000 istek/ay sınırı ve yeniden satış koşulları ölçüldü; uygulama kotası 900/ay. Tahmin sinyal veya işlem kararında kullanılmaz. Ayrıntı: `docs/reports/2.1b-serbest-fx.md`.
- [ ] **2.2 BIST.** Gecikmeli kaynak **taranır, ölçülür, seçilir** ve karar `KARARLAR.md`'ye işlenir (açık belirsizlik #1); hisse ingest; **piyasa takvimi** (tatil, yarım gün) ve işlem durumu (tedbirli, işleme kapalı, sırası kapalı).
- [ ] **2.3 Olay ve haber.** KAP bildirim hattı + bildirimin varlığa eşleştirilmesi; çok kaynaklı RSS + **tekilleştirme** (parmak izi + zaman penceresi) + kural tabanlı duygu; KAP finansal tablolarından temel oranlar (veri yoksa hesaplanmaz); `NOTICE` + "Veri kaynakları" sayfası.

**2.1 kabulü:** kripto WebSocket akışı `live`; resmi EVDS kuru günlük `close`; serbest piyasa kuru ayrı kaynak ve etiket · sağlayıcı kesilince son değer yaşına göre **bayat**, sayısal değeri gizli ve hesaplamadan çıkar · bozuk şema `ProviderError`, sessiz `null` veya kısmi yazım yok · tek worker sağlayıcıya bağlanır, Redis SSE'yi istemcilere çoğaltır · `freshness:check` ve `contract:check` temiz.
**Atıf:** `SPEC.md` §2, §3

---

## Faz 3 — Motor

**Amaç:** Ürünün ürettiği her sayıyı saf, test edilebilir ve gerekçeli kılmak. Sinyal burada doğar.

- [ ] **3.1 Göstergeler ve düzeltilmiş seri.** SMA, EMA, RSI, MACD, Bollinger, ATR — `SPEC.md` §4 formülleriyle, `minBars`/`warmupBars` kuralı dahil (DZ-A3); bedelsiz, bedelli, bölünme ve temettü düzeltmesi; ham ve düzeltilmiş seri ayrı, eksikse "düzeltilmemiş" işaretli.
- [ ] **3.2 Portföy ve risk.** Ağırlıklı ortalama maliyet + FIFO; gerçekleşen/gerçekleşmemiş kâr-zarar; işlem anı kuruyla dönüşüm; oynaklık, zirveden düşüş, korelasyon, dağılım ve maruziyet.
- [ ] **3.3 Sinyal ve hedef fiyat.** Bileşik skor (teknik · temel · olay · risk) + eşikler + histerezis; **hedef fiyat: üç yöntem → aralık** + ayrışma uyarısı + geçerlilik süresi; `signals` / `signal_outcomes` ve **kıyas ölçütüne göre isabet hesabı** (K11).

**Kabul:** `packages/engine` kapsamı ≥%85 (ölçümle) · saflık ihlali yok · 20 barlık geçmişle 200 barlık ortalama hesaplanmıyor, "yeterli geçmiş yok" dönüyor · bayat veriyle sinyal üretilmiyor · her sinyal `calcTrace` taşıyor · isabet hesabı test edilmiş.
**Atıf:** `SPEC.md` §4, §5

---

## Faz 4 — Kabuk ve ekranlar

**Amaç:** Girişsiz hiçbir veri ekranının açılmadığı, iki temalı Türkçe arayüz ve grafik.

- [ ] **4.1 Kimlik ve kabuk.** argon2 + kısa ömürlü erişim jetonu + httpOnly yenileme + iptal; izin listesi + `SERVER_MODE` + Turnstile + hız sınırı; e-posta doğrulama, parola sıfırlama, TOTP, **hesap silme ve veri indirme**; tasarım jetonları (`SPEC.md` §7, koyu birincil + açık tema aynı jetonlardan) + tek biçimlendirme modülü (tr-TR, tabular rakam); i18n + Türkçe ek modülü; beş bölümlü gezinme + PWA.
- [ ] **4.2 Arama, varlık sayfası, grafik.** Tam metin arama + takma ad sözlüğü + Türkçe normalleştirme; varlık sayfası **tek şablon, türe göre açılan bölümler**; mum/çizgi/alan + hacim + zaman dilimleri + yakınlaştırma + artı imleç; göstergelerin bağlanması (motordan gelir, istemcide hesaplanmaz); çizim araçları (yatay/dikey/trend + not).
- [ ] **4.3 Sinyal bileşeni ve tablolar.** `SPEC.md` §5.6 zorunlu birlikteliği — eksik alanla **render edilmez**; skor bileşenlerinin açılabilir dökümü; isabet geçmişi; sanallaştırılmış tablolar + mobilde kart görünümü; panel (bileşen aç/kapa + sıralama, mobilde tek sütun).

**Kabul:** oturumsuz istek hiçbir veri ucuna ulaşmıyor (test) · iki tema yalnız jetonlardan türüyor · 360px'te grafik, tablo ve gezinme kullanılabilir, sayfa yatay kaymıyor · sinyal bileşeni eksik alanla çizilmiyor (negatif test) · `i18n:check` temiz, sabit kodlanmış Türkçe metin yok.
**Atıf:** `SPEC.md` §5, §6, §7

---

## Faz 5 — Kişisel katman ve yapay zekâ

**Amaç:** Ürünü kişiye bağlamak — kişiye özel tavsiye üretmeden — ve anlamı eklemek.

- [ ] **5.1 Portföy ve izleme.** Portföy + deneme portföyü + çoklu portföy; işlem girişi + **CSV içe aktarma** (sütun eşleme); kâr-zarar, dağılım, maruziyet, kıyas karşılaştırması; izleme listeleri + varlık sınırı.
- [ ] **5.2 Alarm.** Kurulum ve değerlendirme; **gecikme etiketi** (tetikleyen değerin ait olduğu an); soğuma süresi + saatlik üst sınır; uygulama içi + e-posta bildirimi (Telegram isteğe bağlı).
- [ ] **5.3 Yapay zekâ.** Ücretsiz kademe **ölçümü** (istek sınırı + veri kullanımı politikası; kabul edilemezse sağlayıcı değişir); `AiProvider` + istem şablonları + bağlam derleyici (yalnız kaynak parçaları); Zod çıktı şeması + reddetme ve **bir kez** yeniden isteme; kota sayacı + kapanma + ekranda görünürlük; olay tetikleme + versiyonlama + "ne değişti"; sinyalin anlatımı — **sayı üretmeden** (K10), kaynak kimlikleriyle (K12).

**Kabul:** gecikmeli varlıkta alarm bildirimi gecikmeyi ve değerin anını yazıyor · alarm fırtınası sınırlanıyor (test) · `money-check` temiz · şemaya uymayan AI çıktısı reddediliyor (test) · kaynaksız cümle eleniyor (test) · **AI metnindeki hiçbir sayı arayüze geçmiyor** (nöbetçi) · kota dolunca ekran söylüyor.
**Atıf:** `SPEC.md` §6, §8

---

## Faz 6 — Yayın

**Amaç:** Ürünü yayına almak ve **çalıştığını kanıtlamak**.

- [ ] **6.1 Yönetim ve hukuk.** Yönetim paneli (kullanıcılar, izin listesi, sağlayıcı sağlığı, kota/maliyet sayaçları, bakım modu); KVKK aydınlatma + kullanım şartları + sorumluluk reddi ve **dört yerde gösterimi**; ısı haritası, sektör performansı, KAP türevli bilanço/temettü takvimi, hesaplayıcılar.
- [ ] **6.2 Dağıtım.** Oracle: kaynak sınırlı konteynerler, Caddy alt yol, ayrı veritabanı ve kullanıcı; Sentry + sağlık ucu + **veri tazelik nöbetçisi**; günlük yedek + nesne deposuna gönderim + **geri yükleme tatbikatı**.
- [ ] **6.3 Tatbikatlar ve kapanış.** Sağlayıcı arızası tatbikatı; yük ölçümü (eşzamanlı SSE + zaman serisi sorgusu); performans bütçesi kapısı; `CLAUDE.md` §8.3 başarı tanımının madde madde denetimi.

**Kabul:** başarı tanımındaki **her madde** işaretli ve ölçümle belgelenmiş · geri yükleme tatbikatı yazılı · sinyal isabet tablosu dolu ve görünür.
**Atıf:** `SPEC.md` §7, §9

---

v1.0.0 etiketlenir. Yeni fikirler `SPEC.md` §10'a (v2 kasası) yazılır, v1'e sokulmaz (K15).
