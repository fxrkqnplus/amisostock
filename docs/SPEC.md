# SPEC — Amisostock

> Tek dosyalık spesifikasyon. `CLAUDE.md` **ne yapılmayacağını**, bu dosya **nasıl
> yapılacağını** söyler. Fazlar buraya bölüm numarasıyla atıf verir.
> Çelişkide sıra: `KARARLAR.md` → `CLAUDE.md` → bu dosya.
>
> **Katsayı ve eşik uyarısı:** §4 ve §5'teki sayılar **kalibrasyondur**, kanun değil.
> İlk gerçek ölçüm günü Faz 3'tür; isabet takibi (§5.7) bunları düzeltmenin tek meşru
> yoludur. Bir katsayıyı "çalışıyor gibi göründüğü için" değiştirmek yasaktır — ölçüm
> çıktısı gerekir (DZ-01).

---

## §1 Veri modeli

PostgreSQL 18. Tüm para alanları `numeric(20,6)`; **hiçbir yerde `float`/`double`
yok** (K9). Zaman alanları `timestamptz`, **UTC saklanır**, gösterim `Europe/Istanbul`.

### 1.1 Referans tabloları

| Tablo             | Anahtar alanlar                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources`         | `id` · `kind` (market/news/macro/disclosure) · `name` · `priority` (küçük = öncelikli) · `license_note` · `attribution_text`                                                                              |
| `markets`         | `id` (BIST, CRYPTO, FX) · `timezone` · `currency` · `session_open` · `session_close` · `has_delay` · `delay_minutes`                                                                                      |
| `assets`          | `id` · `market_id` · `ticker` · `name` · `asset_class` (equity/crypto/fx/index/fund/commodity) · `sector` · `currency` · `status` (active/suspended/restricted/delisted) · `listed_at` · `free_float_pct` |
| `asset_aliases`   | `asset_id` · `alias` · `alias_kind` (ticker/former_name/common_name/isin) — arama sözlüğü (§6.5)                                                                                                          |
| `market_calendar` | `market_id` · `date` · `kind` (full/half/holiday) · `note`                                                                                                                                                |

### 1.2 Fiyat tabloları

| Tablo                | Alanlar                                                                                                                      | Not                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `quotes`             | `asset_id` · `price` · `change_abs` · `change_pct` · `day_high` · `day_low` · `volume` · `as_of` · `source_id` · `freshness` | **Son durum**, varlık başına tek satır (upsert)                            |
| `price_candles`      | `asset_id` · `timeframe` (1m/5m/1h/1d) · `ts` · `open` · `high` · `low` · `close` · `volume` · `source_id`                   | PK `(asset_id, timeframe, ts)`; **aylık `RANGE` bölümleme** `ts` üzerinden |
| `corporate_actions`  | `asset_id` · `ex_date` · `kind` (bonus/rights/split/dividend) · `ratio` · `amount` · `subscription_price` · `source_id`      | §4.5 düzeltmesinin girdisi                                                 |
| `adjustment_factors` | `asset_id` · `ex_date` · `price_factor` · `volume_factor`                                                                    | `corporate_actions`'tan **türetilir**, elle yazılmaz                       |

**Saklama:** `1m` 90 gün · `5m` 1 yıl · `1h` 3 yıl · `1d` süresiz.
Eski bölümler `1d`'ye toplulaştırıldıktan sonra düşürülür; düşürme işi `ingest_runs`'a yazılır.

### 1.3 İçerik tabloları

| Tablo                | Alanlar                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `disclosures`        | `id` · `asset_id` · `kap_id` · `category` · `title` · `summary` · `published_at` · `url` · `source_id`                            |
| `news`               | `id` · `title` · `excerpt` · `url` · `published_at` · `source_id` · `fingerprint` · `group_id` · `sentiment` · `sentiment_method` |
| `news_assets`        | `news_id` · `asset_id` · `match_confidence`                                                                                       |
| `financials`         | `asset_id` · `period` · `revenue` · `net_income` · `equity` · `total_debt` · `shares_outstanding` · `eps_ttm` · `source_id`       |
| `fundamental_ratios` | `asset_id` · `as_of` · `pe` · `pb` · `roe` · `debt_to_equity` · `dividend_yield` · `earnings_growth_yoy` — **türetilir**          |

### 1.4 Kullanıcı tabloları

`users` · `sessions` · `allowlist` · `portfolios` · `positions` · `transactions` ·
`watchlists` · `watchlist_items` · `alerts` · `alert_events` · `notifications` ·
`user_preferences` (temel para birimi, tema, panel düzeni) · `audit_log`

### 1.5 Sinyal ve analiz tabloları

| Tablo             | Alanlar                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signals`         | `id` · `asset_id` · `verdict` (buy/sell/hold) · `score` · `confidence` · `components` (jsonb, `calcTrace`) · `created_at` · `valid_until` · `inputs_hash` |
| `price_targets`   | `signal_id` · `method` · `value` · `inputs` (jsonb) · `valid_until`                                                                                       |
| `signal_outcomes` | `signal_id` · `evaluated_at` · `asset_return_pct` · `benchmark_return_pct` · `excess_pct` · `hit` (bool)                                                  |
| `ai_analyses`     | `id` · `asset_id` · `version` · `payload` (jsonb, §8.3 şeması) · `sources` (jsonb) · `model` · `created_at` · `superseded_by`                             |
| `ai_usage`        | `day` · `requests` · `input_tokens` · `output_tokens` · `est_cost_usd`                                                                                    |

### 1.6 İşletme tabloları

`ingest_runs` (`source_id` · `started_at` · `finished_at` · `status` · `rows` · `error`) ·
`provider_health` (`source_id` · `last_success_at` · `consecutive_failures` · `state`)

---

## §2 Sağlayıcı sözleşmesi

### 2.1 Arayüz

```ts
interface MarketDataProvider {
  readonly id: ProviderId;
  readonly capabilities: {
    classes: AssetClass[];
    live: boolean;
    delayMinutes: number;
    timeframes: Timeframe[];
    historyDays: number;
  };
  getQuote(t: Ticker): Promise<Quote>;
  getCandles(t: Ticker, tf: Timeframe, from: Date, to: Date): Promise<Candle[]>;
  subscribe?(tickers: Ticker[], onTick: (q: Quote) => void): Unsubscribe;
}
```

Her dönüş değeri **Zod şemasından geçer**. Şema ihlali `ProviderError`'dır; sessiz
`null` veya kısmi kayıt **yazılmaz** (DZ-A1). `contract-check` kaydedilmiş gerçek
cevapları şemaya karşı koşar; şema saparsa CI kırılır.

### 2.2 Kaynak önceliği (C-11)

```
equity : PROVIDER_EQUITY_PRIMARY → PROVIDER_EQUITY_FALLBACK
crypto : borsa WebSocket → toplayıcı REST
fx     : TCMB EVDS (resmî kur) ‖ serbest piyasa sağlayıcısı   [ikisi AYRI değerdir, yedek değil]
macro  : TCMB EVDS → TÜİK
haber  : RSS kümesi (hepsi eşdeğer, tekilleştirme §3.4)
bildirim: KAP (tek kaynak)
```

İkinci kaynak **yalnız birincisi yoksa** devreye girer. Ortalama/medyan alınmaz.
Aktif kaynak her değerde `source_id` olarak taşınır ve ekranda görünür.

### 2.3 Tazelik ve bayatlama

| Sınıf      | Koşul                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| `live`     | Sağlayıcı gerçek zamanlı **ve** `now − as_of ≤ 2 × beklenen aralık`    |
| `delayed`  | Sağlayıcı bilinen gecikmeyle veriyor; ekranda gecikme dakikası yazılır |
| `close`    | Piyasa kapalı; değer son seans kapanışı                                |
| `estimate` | Türetilmiş değer (gösterge, oran, hedef fiyat)                         |

**Bayat:** `now − as_of > staleAfter`. Varsayılanlar: kripto 30 sn · döviz 5 dk ·
gecikmeli hisse 25 dk · makro 2 gün. Bayat değer **hesaplara, sinyale ve alarmlara
girmez** (DZ-A2); ekranda değerin **yerine** "güncellenmedi · son: HH:MM" gösterilir.

### 2.4 Kota, hata ve geri çekilme

- Sağlayıcı başına `requestsPerMinute` ve `requestsPerDay`; Redis'te sayaç.
- Hata: üstel geri çekilme `2^n` sn, tavan 300 sn, `n ≤ 6`.
- Ardışık 3 hata → `provider_health.state = degraded` (yedek devreye girer).
  Ardışık 10 → `down` + yönetim panelinde uyarı.
- **429 asla döngüde tekrarlanmaz**; kota penceresi dolana kadar beklenir.

---

## §3 Piyasa takvimi ve sınır durumları

### 3.1 Piyasa durumu

`open` · `closed` · `pre` · `post` · `holiday` · `halted`.
Her varlık sayfasında ve her fiyatın yanında durum rozetle görünür.
Kripto `open` sabittir; BIST takvimi `market_calendar`'dan okunur (yıllık güncellenir).

### 3.2 İşlem görmeyen varlık (L-04)

`assets.status ∈ {suspended, restricted}` iken: fiyat son bilinen değerdir ve
`close` sınıfıyla, durum rozetiyle gösterilir. **Sinyal üretilmez, alarm tetiklenmez,
AI analizi tazelenmez.**

### 3.3 Yetersiz geçmiş (L-05 · DZ-A3)

Her gösterge iki eşik taşır: `minBars` (hesaplanabilir) ve `warmupBars` (güvenilir).

- `bars < minBars` → değer **üretilmez**; "yeterli geçmiş yok (N/M bar)" yazılır.
- `minBars ≤ bars < warmupBars` → değer üretilir, `freshness: 'estimate'` + "ısınma" rozeti.
- Sinyalde: ısınmadaki bileşen **yarı ağırlıkla** girer (§5.2).

### 3.4 Haber tekilleştirme (L-09)

`fingerprint = sha256(normalize(başlık) + '|' + ilk_200_karakter(özet))`.
`normalize`: küçük harf (tr-TR), noktalama ve fazla boşluk atılır, Türkçe karakterler
korunur. Aynı `fingerprint` **48 saat** penceresinde → aynı `group_id`.
Grup ekranda **tek satır**, kaynak sayısıyla ("5 kaynak") gösterilir. AI'ya grup
**bir kez** verilir — aynı olayı beş kez saymaz.

### 3.5 Çelişen ve düzeltilen haber (L-10)

Haberin kaynağı düzeltme/yalanlama yayımlarsa `news.status = corrected`;
o habere dayanan `ai_analyses` kayıtları **yeniden üretilir** ve eskisi
`superseded_by` ile işaretlenir. Ekranda "kaynağı değişti" rozeti görünür.

### 3.6 Zaman dilimi (L-06)

Saklama UTC; gösterim `Europe/Istanbul`; piyasa takvimleri kendi diliminde tanımlanır.
Günlük mumun `ts`'i o piyasanın **yerel seans tarihinin** UTC karşılığıdır — kayma
testi zorunludur (yaz saati geçişi dahil).

---

## §4 Göstergeler ve düzeltilmiş seri

Tümü `packages/engine`, saf (K3), `calcTrace` döner (K7). Girdi **düzeltilmiş kapanış**
serisidir (§4.5).

### 4.1 Hareketli ortalamalar

```
SMA(n)_t = (1/n) · Σ_{i=0}^{n-1} C_{t-i}                    minBars = n      warmupBars = n
EMA(n)_t = α·C_t + (1-α)·EMA(n)_{t-1},  α = 2/(n+1)         minBars = n      warmupBars = 2n
  tohum: EMA(n)_n = SMA(n)_n
```

### 4.2 RSI (Wilder, n = 14)

```
G_t = max(C_t - C_{t-1}, 0)      K_t = max(C_{t-1} - C_t, 0)
İlk:  AG_n = ort(G_1..G_n)       AK_n = ort(K_1..K_n)
Sonra: AG_t = (AG_{t-1}·(n-1) + G_t)/n      AK_t aynı biçimde
RS = AG/AK        RSI = 100 - 100/(1+RS)        AK = 0 ise RSI = 100
minBars = n+1     warmupBars = 3n
```

### 4.3 MACD (12, 26, 9)

```
MACD_t   = EMA(12)_t - EMA(26)_t
Sinyal_t = EMA(9)(MACD)_t
Histogram_t = MACD_t - Sinyal_t
minBars = 26+9 = 35      warmupBars = 70
```

### 4.4 Bollinger (20, 2) ve ATR (14)

```
Orta = SMA(20)          σ = ana kütle standart sapması (n ile bölünür, n-1 DEĞİL)
Üst / Alt = Orta ± 2σ        minBars = 20      warmupBars = 20

TR_t  = max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)
ATR(14): Wilder yumuşatması (§4.2 ile aynı biçim)
ATR% = ATR / C · 100         minBars = 15      warmupBars = 42
```

### 4.5 Düzeltilmiş fiyat serisi (L-02 · L-03)

Her `corporate_actions` satırından bir `price_factor` türetilir:

| Olay                                   | `price_factor`                                  |
| -------------------------------------- | ----------------------------------------------- |
| Bedelsiz sermaye artırımı, oran `r`    | `1 / (1 + r)`                                   |
| Hisse bölünmesi, oran `k`              | `1 / k`                                         |
| Temettü `D`, önceki kapanış `C`        | `(C − D) / C`                                   |
| Bedelli, oran `r`, kullanım fiyatı `P` | `TERP / C`, burada `TERP = (C + r·P) / (1 + r)` |

**Geriye dönük düzeltme:** `ex_date`'ten **önceki** tüm fiyatlar, o tarihten sonraki
tüm faktörlerin **çarpımıyla** çarpılır. Hacim ters yönde düzeltilir
(`volume_factor = 1 / price_factor`).

İki seri ayrı saklanır ve ekranda hangisine bakıldığı yazılır. `corporate_actions`
eksikse seri **"düzeltilmemiş"** işaretlenir ve getiri hesapları bu işareti taşır —
uydurulmaz.

**Getiri tanımları:** _fiyat getirisi_ düzeltilmemiş fiyattan; _toplam getiri_
temettü dahil düzeltilmiş seriden. İkisi ayrı gösterilir (L-03).

---

## §5 Sinyal ve hedef fiyat

> K11'in uygulaması. Çıktı **al · sat · tut**; ara değer yoktur.

### 5.1 Bileşenler

Her bileşen `[-100, +100]` aralığında bir alt skor üretir.

**Teknik `T`** — üç alt bileşenin ortalaması:

| Alt bileşen | Kural                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Trend       | `EMA50 > EMA200` → +60, tersi → −60; `C > EMA50` → +40, tersi → −40 (toplanır, `[-100,100]`'e kırpılır)                                |
| Momentum    | `RSI` eşlemesi: ≤30 → +70 · 30–45 → +30 · 45–55 → 0 · 55–70 → −30 · ≥70 → −70. `Histogram > 0` → +30, `< 0` → −30 (toplanır, kırpılır) |
| Konum       | Bollinger içindeki konum `p = (C − Alt)/(Üst − Alt)`: `skor = (0.5 − p) · 200`, kırpılır                                               |

> Momentum eşlemesi **karşıt yönlüdür** (aşırı alım negatif). Trend ile çeliştiğinde
> bu bir bilgi kaybı değil, skorun gerçek belirsizliğidir — güven düzeyine yansır (§5.4).

**Temel `F`** — sektör medyanına göre, her oran `[-100,100]`'e eşlenir ve ortalanır:
`pe` (düşük iyi) · `pb` (düşük iyi) · `roe` (yüksek iyi) · `debt_to_equity` (düşük iyi) ·
`earnings_growth_yoy` (yüksek iyi). Sektörde **en az 5 karşılaştırılabilir varlık**
yoksa `F` devre dışı kalır.

**Olay `N`** — son 14 günün KAP ve haber olayları, üstel zaman ağırlığıyla:

```
ağırlık(gün d) = exp(-d / 5)
N = Σ (olay_skoru × ağırlık) / Σ ağırlık
```

KAP kategori skorları `config/kap-weights.json`'da tutulur ve **versiyonlanır**;
haber duygusu kural tabanlıdır (E-12), `sentiment_method` alanında yazılır.

**Risk çarpanı `R ∈ [0,1]`** — çarpımdır, skoru değil **güveni** kısar:

```
R = R_likidite × R_oynaklık × R_durum × R_halka_açıklık
R_oynaklık: ATR% ≤ 3 → 1.0 · 3–6 → 0.8 · 6–10 → 0.6 · > 10 → 0.4
R_durum:    active → 1.0 · restricted → 0 (sinyal üretilmez) · suspended → 0
```

### 5.2 Bileşik skor

```
S = Σ(w_i · s_i) / Σ(w_i)      yalnız AKTİF bileşenler üzerinden
w_T = 0.45    w_F = 0.35    w_N = 0.20
Isınmadaki bileşen (§3.3) yarı ağırlıkla girer.
```

### 5.3 Eşikler ve histerezis

```
S ≥ +25  → AL        S ≤ −25 → SAT        aksi → TUT
Histerezis: mevcut karar AL ise, TUT'a düşmek için S < +15 gerekir (SAT için simetrik).
```

Histerezisin sebebi: eşik çevresinde salınan skorun her gün sinyal değiştirmesi,
kullanıcıya bilgi değil gürültü verir.

### 5.4 Güven düzeyi

```
Güven = R × (aktif ağırlık toplamı / 1.0) × Q
Q (veri kalitesi): tüm bileşenler taze ve düzeltilmiş seri varsa 1.0 ·
                   seri düzeltilmemişse 0.8 · bileşenlerden biri ısınmadaysa 0.9
Gösterim: < 0.45 düşük · 0.45–0.70 orta · > 0.70 yüksek
```

### 5.5 Sinyal ÜRETİLMEYEN durumlar

Aşağıdaki her durumda sinyal üretilmez ve **sebebi ekranda yazılır**:
bayat veri · `R_durum = 0` · aktif ağırlık toplamı `< 0.45` · teknik bileşende
`minBars` sağlanmıyor · `inputs_hash` değişmemiş (yeni hesap gereksiz).

### 5.6 Hedef fiyat

Üç yöntem; **en az ikisi** üretilebiliyorsa aralık gösterilir, biri veya hiçbiri
üretilemiyorsa hedef fiyat **gösterilmez**.

| #   | Yöntem                | Formül                                                    | Geçerlilik    |
| --- | --------------------- | --------------------------------------------------------- | ------------- |
| Y1  | Sektör çarpanı        | `sektör_medyan_FK × EPS_ttm`                              | 30 gün        |
| Y2  | Tarihsel çarpan bandı | varlığın 3 yıllık F/K'sının 25./75. yüzdeliği `× EPS_ttm` | 30 gün        |
| Y3  | Teknik projeksiyon    | `C ± 3 × ATR(14)`, en yakın destek/dirençte kırpılır      | 10 işlem günü |

```
Aralık = [min(yöntemler), max(yöntemler)]
Ayrışma = (max − min) / ((max + min)/2)
Ayrışma > 0.30 → "yöntemler ayrışıyor" rozeti; ortalama ALINMAZ
```

Geçerlilik dolunca hedef "süresi geçti" olur — sessizce durmaz.

### 5.7 Zorunlu birliktelik (K11 §4.3)

Sinyal veya hedef fiyat şu altı alan **olmadan render edilmez**; biri eksikse bileşen
hiç çizilmez:

1. Yöntem adı · 2. Girdiler (`calcTrace`, açılabilir) · 3. Güven düzeyi ·
2. Geçerlilik süresi · 5. _"Bu sinyali ne çürütür"_ · 6. Sorumluluk reddi

Madde 5 kuralla üretilir: skoru en çok taşıyan bileşenin **ters yöne dönme koşulu**
(örn. _"EMA50 EMA200'ün altına inerse trend bileşeni +60'tan −60'a döner ve karar
TUT'a geçer"_).

### 5.8 İsabet takibi (K11 §4.4)

`valid_until` dolunca `signal_outcomes` yazılır. Kıyas ölçütü varlığın piyasasının
ana endeksidir (BIST → XU100; kripto → BTC; fx → yok, mutlak getiri).

```
excess = asset_return_pct − benchmark_return_pct
AL  → hit = excess > 0
SAT → hit = excess < 0
TUT → hit = |excess| < 5
```

Varlık sayfasında görünen: son 20 sinyalin isabet oranı, ortalama aşırı getiri ve
**örneklem sayısı**. Örneklem `< 10` ise oran **gösterilmez**, "yeterli geçmiş yok" yazılır.

---

## §6 Portföy, alarm ve arama

### 6.1 Maliyet ve kâr-zarar (G-03)

Varsayılan **ağırlıklı ortalama maliyet**; portföy başına FIFO seçilebilir, seçim
ekranda yazılıdır.

```
Alışta:  yeni_maliyet = (eski_adet·eski_maliyet + adet·fiyat + komisyon) / (eski_adet + adet)
Satışta: gerçekleşen = adet · (satış_fiyatı − maliyet) − komisyon      (maliyet değişmez)
Gerçekleşmemiş = adet · (güncel_fiyat − maliyet)
```

Güncel fiyat **bayatsa** kâr-zarar hesaplanmaz; "fiyat güncel değil" gösterilir.

### 6.2 Para birimi (I-03 · I-04)

Temel para birimi kullanıcı tercihidir (varsayılan TRY). **Geçmiş işlemler işlem
anının kuruyla** saklanır; anlık değerler güncel kurla çevrilir. Kur kaynaklı fark
**ayrı satır** olarak gösterilir — hisse kazancı gibi sunulmaz.

### 6.3 Risk metrikleri

```
Oynaklık     = günlük getirilerin std sapması × √252
Zirveden düşüş = min over t of (V_t / max_{s≤t} V_s − 1)
Korelasyon   = Pearson, günlük getiriler, pencere 90 gün (minBars = 60)
Yoğunlaşma   = en büyük pozisyonun ve ilk 3'ün portföy payı
```

### 6.4 Alarm (G-09 · L-08)

Türler: fiyat eşiği · yüzde değişim · hacim sıçraması · yeni KAP bildirimi ·
**sinyal değişimi** · gösterge kesişimi.

- Değerlendirme yalnız **taze** veriyle yapılır (DZ-A2).
- Bildirim metni zorunlu iki alan taşır: **veri gecikmesi** ve **tetikleyen değerin
  ait olduğu an** — _"₺100 eşiği aşıldı (₺100,40 · 14:32 · 15 dk gecikmeli veri)"_.
- Soğuma: alarm başına 60 dk. Kullanıcı başına saatte en çok 20 bildirim; aşımda
  bildirimler tek **özet** bildirimde toplanır.

### 6.5 Arama (M-01)

PostgreSQL tam metin + `asset_aliases`. Türkçe normalleştirme: küçük harf `tr-TR`,
`ı/i` ve `İ/I` eşlenir, noktalama atılır. Sıra: tam sembol eşleşmesi → takma ad →
unvan öneki → tam metin. Sonuçlar sınıfa göre gruplanır.

---

## §7 Tasarım sistemi

### 7.1 Jetonlar

Koyu birincil; açık tema **aynı jeton adlarından** türer. Sabit renk yazmak yasaktır.

| Jeton               | Koyu      | Açık      |
| ------------------- | --------- | --------- |
| `--ink` (zemin)     | `#090C12` | `#FAF8F3` |
| `--panel`           | `#111722` | `#FFFFFF` |
| `--panel-2`         | `#161E2B` | `#F3F0E8` |
| `--line`            | `#212B3B` | `#E0DACD` |
| `--text`            | `#E7ECF4` | `#14171D` |
| `--muted`           | `#8C97A9` | `#5C6473` |
| `--accent` (pirinç) | `#D8A23C` | `#8A6410` |
| `--up`              | `#35B584` | `#1D7A57` |
| `--down`            | `#E0604E` | `#B33D2C` |
| `--warn`            | `#D8A23C` | `#8A6410` |

**Vurgu rengi yeşil/kırmızıdan ayrı bir ailedir** (H-04) — aksi hâlde her şey uyarı
gibi görünür.

### 7.2 Tipografi ve sayı

- Arayüz ve başlık: tek aile, üç ağırlık. Veri ve sembol: eş aralıklı aile.
- **Tüm sayılarda `font-variant-numeric: tabular-nums`.**
- Biçim `tr-TR`: `1.234,56`. Kısaltma: `bin` · `mn` · `mr`. Yüzde iki hane.
- Para: `₺1.234,56` · `$1.234,56` · `€1.234,56`. Simge **tutardan ayrılmaz** (K9).

### 7.3 Yön ve erişilebilirlik (H-05 · H-10)

Yeşil yükseliş, kırmızı düşüş. **Renk asla tek gösterge değildir**: her değişim
değeri `▲`/`▼` işareti ve yüzdeyle birlikte gelir. Hedef WCAG 2.1 AA: metin kontrastı
≥ 4.5:1, odak halkası her etkileşimli öğede, tüm akışlar klavyeyle tamamlanabilir.

### 7.4 Dinamik görünüm sınırı (H-06)

Piyasa durumuna göre değişebilen: durum rozetleri, küçük vurgu alanları, 150 ms'lik
değer geçişleri. **Değişmeyen:** zemin, panel yüzeyleri, tipografi, gezinme.
`prefers-reduced-motion` tüm geçişleri kapatır.

### 7.5 Duyarlılık (H-08 · H-09)

En küçük hedef **360px**. Tablolar mobilde kart görünümüne döner; grafik dokunmayla
yakınlaşır ve kaydırılır; panel tek sütuna iner. Sayfa gövdesi **asla yatay kaymaz**.

---

## §8 Yapay zekâ sözleşmesi

### 8.1 Bağlam derleyici

Modele **yalnızca** şunlar gider: varlık künyesi · son fiyat ve değişim (tazelik
sınıfıyla) · hesaplanmış gösterge değerleri · hesaplanmış sinyal ve bileşen dökümü ·
son 14 günün KAP/haber grupları (başlık + özet + kaynak kimliği) · sektör bağlamı.
Her parça bir `source_ref` taşır. **Ham metin dosyası, kullanıcı verisi veya sır gitmez.**

### 8.2 Zorunlu kurallar

- Her iddia bir `source_ref` taşır; taşımayan cümle çıktıdan **elenir** (K12).
- Model **sayı üretmez** (K10). Çıktıdaki sayısal alanlar, verilen girdilerden
  **birebir** eşleşmelidir; eşleşmeyen değer nöbetçi tarafından reddedilir.
- Model **al/sat/tut kararı vermez** — kararı motor verir, model **açıklar**.

### 8.3 Çıktı şeması

```ts
const AiAnalysis = z.object({
  durum: z.string().max(400),
  etkenler: z
    .array(
      z.object({
        baslik: z.string(),
        aciklama: z.string(),
        yon: z.enum(['olumlu', 'olumsuz', 'notr']),
        source_ref: z.string(),
      }),
    )
    .min(1)
    .max(6),
  riskler: z
    .array(z.object({ baslik: z.string(), source_ref: z.string() }))
    .max(4),
  senaryolar: z
    .array(
      z.object({
        ad: z.string(),
        varsayimlar: z.array(z.string()).min(1),
        olasilik_bandi: z.enum(['düşük', 'orta', 'yüksek']),
        zaman_ufku: z.enum(['1 hafta', '1 ay', '3 ay']),
        ne_curutur: z.string(),
      }),
    )
    .min(2)
    .max(3),
  sinyal_gerekcesi: z.string().max(600),
  ne_degisti: z.string().max(300).nullable(),
});
```

Şemaya uymayan çıktı reddedilir ve **bir kez** yeniden istenir; yine uymazsa analiz
üretilmez ve bölüm "analiz üretilemedi" der — boş kalmaz.

### 8.4 Tetikleme ve kota (E-02 · E-03)

Tetikleyiciler: `|değişim| ≥ 2 × ortalama günlük oynaklık` · yeni KAP bildirimi ·
`group_id` bazında yeni önemli haber · **sinyal kararının değişmesi** · günde bir
planlı tazeleme. Kapsam: izleme listesi + portföy + gündemdekiler (E-04).

Kota: `AI_DAILY_REQUEST_CAP` sayacı `ai_usage`'da. Kota %80'de yalnız sinyal
değişimi tetikler; %100'de katman kapanır ve ekranda **"günlük AI kotası doldu,
yarın yenilenir"** yazar.

### 8.5 Versiyonlama (E-09)

Her analiz `version` alır; bir öncekiyle farkı `ne_degisti` alanına **kurallı**
yazılır (hangi bileşen değişti, hangi yeni olay geldi). Kaynağı düzeltilen haberin
analizi yeniden üretilir (§3.5).

---

## §9 Kalite, güvenlik ve hukuk

### 9.1 Test katmanları

| Katman      | Kapsam                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------- |
| Birim       | `engine` ≥%85 · para/tazelik/sinyal ≥%85 · global ≥%70                                       |
| Sözleşme    | Kaydedilmiş gerçek sağlayıcı cevapları → şema (`contract-check`)                             |
| Entegrasyon | Veritabanı, bölümleme, göç, kaynak önceliği, bayatlama                                       |
| Uçtan uca   | Giriş → arama → varlık → sinyal → alarm → portföy                                            |
| Negatif     | Tazeliksiz değer · eksik alanlı sinyal · float para · kaynaksız AI cümlesi · yetersiz geçmiş |

### 9.2 Nöbetçiler (CI kapısı)

`arch-check` (katman + saflık) · `money-check` (float para) · `freshness-check`
(tazeliksiz değer) · `i18n-check` (eksik/kullanılmayan anahtar) · `contract-check`
(sağlayıcı şeması) · AI sayı nöbetçisi (§8.2). **Her biri kanaryalı** (DZ-12) ve
`ci.yml`'de maskesiz `run:` (DZ-11).

### 9.3 Güvenlik

- Sunucuda: argon2id · kısa ömürlü erişim jetonu + httpOnly `SameSite=Lax` yenileme
  çerezi + iptal listesi · uç nokta bazlı hız sınırı · Turnstile (kayıt ve sıfırlama).
- **Sağlayıcı anahtarı istemciye hiçbir koşulda geçmez** (D-03). İstemci paketinde
  anahtar araması CI kapısıdır.
- Kullanıcı verisi: depo katmanında zorunlu `user_id` filtresi + sızıntı testi (D-12).
- `audit_log`: kimlik, para ve yönetim olayları.

### 9.4 Performans bütçesi (N-01)

| Ölçüt                 | Tavan                             |
| --------------------- | --------------------------------- |
| İlk yükleme JS (gzip) | 250 kB                            |
| İlk anlamlı veri      | 2,0 sn (yerel ağ, soğuk önbellek) |
| Grafik ilk çizim      | 400 ms (1.000 mum)                |
| Zaman serisi sorgusu  | 200 ms (1 yıl, günlük)            |

Tavanlar CI'da ölçülür; aşım kapıyı kırar.

### 9.5 Hukuk

- **Sorumluluk reddi dört yerde:** kayıt onayı · her sinyalin yanı · her AI analizinin
  altı · veri gecikme etiketi.
- Sinyal **varlık düzeyindedir**; kullanıcının portföyüne göre kişiselleştirilmiş
  öneri üretilmez (`CLAUDE.md` §6.1).
- Haber: başlık + kısa alıntı + kaynak bağlantısı; tam metin saklanmaz (B-05).
- KVKK: aydınlatma metni, hesap silme (onaylı, geri alınamaz), veri indirme
  (JSON + CSV) v1'de çalışır.
- `NOTICE` + "Veri kaynakları" sayfası; her sağlayıcının istediği atıf metni birebir.

---

## §10 v2 kasası

İngilizce dil desteği · AI ile serbest sohbet · geri test motoru · sosyal medya ve
forum içeriği · aracı kurum entegrasyonu · vergi hesabı · ekstre/PDF okuma · ayrı
mobil uygulama · ücretli plan · yatay ölçekleme · özel gösterge tanımlama ·
kayıtlı grafik düzenleri.

Buraya yazılan **v1'de yapılmaz** (K15).
