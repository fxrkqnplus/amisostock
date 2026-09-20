# CLAUDE.md — Amisostock

> **Her oturumda otomatik yüklenir.** Anayasa, yığın, veri ve sinyal sözleşmesi, sözlük.
> Kaynak hiyerarşisi: `KARARLAR.md` → `CLAUDE.md` → `docs/SPEC.md`. Çelişkide **üstteki kazanır**;
> alttaki düzeltilir.

## 🚦 Her oturumun ilk işi

1. `docs/CHECKPOINT.md` → faz · aşama · taban commit · sıradaki komut · açık karar
2. `PROJECT_MEMORY.md` → ANLIK DURUM + son faz kaydı
3. `docs/ROADMAP.md` → sıradaki fazın bölümü
4. `docs/SPEC.md` → o fazın atıf verdiği bölümler
5. `KARARLAR.md` → dokunulacak alanın kararları ve *değiştirildi* notları

## 📚 Belge seti (altı dosya — bilinçli olarak yalın) `[K-05]`

| Dosya | İçerik |
|---|---|
| `KARARLAR.md` | 131 kararın kütüğü. Her şeyin kaynağı. Karar silinmez, üzeri çizilir |
| `CLAUDE.md` | Bu dosya: anayasa, yığın, repo yapısı, veri/sinyal/AI sözleşmesi, sözlük |
| `docs/SPEC.md` | Tek dosyalık spesifikasyon — numaralı bölümler, fazlar buraya atıf verir |
| `docs/ROADMAP.md` | 6 faz, 18 alt görev: kapsam, kabul kriterleri |
| `PROJECT_MEMORY.md` | Oturumlar arası devir teslim |
| `docs/CHECKPOINT.md` | Makine için sabit şekilli durum |

---

# 1. ANAYASA

## 1.1 Kimlik

**Amisostock** — web tabanlı, Türkçe, koyu temalı finansal piyasa bilgi, analiz ve
sinyal platformu. Hisse, kripto, döviz ve makro veriyi; haber, şirket bildirimi,
hesaplanmış sinyal ve yapay zekâ yorumuyla tek bir araçta birleştirir.

**Marka yazımı — bağlayıcı:** Ad iki kelimeden gelir (*Amisos* + *Stock*) ama **tek
kelime yazıldığı her yerde tek `s` ile birleşir: `Amisostock`.** `Amisosstock`,
`AmisosStock`, `Amisos Stock` yazımları **kullanılmaz** — logo, başlık, `<title>`,
paket adı, e-posta imzası ve belge başlıkları dahil. Kod tarafı: `amisostock`
(paketler `@amisostock/*`).

- **Dil:** Arayüz **Türkçe**. Kod, değişken, tablo, dosya adları **İngilizce**. İstisna yok. `[I-01, I-02]`
- **Hedef:** `https://fxrkqn.org/amisostock` — **davetli kurulum**, ücretsiz, reklamsız. `[A-02, A-03, A-05]`
- **Ölçek:** 1–5 aktif kullanıcı beklenir; sistem 200 kullanıcıya kadar bozulmadan çalışır. `[A-04]`
- **Öncelik sırası:** 1. Veri doğruluğu · 2. Hatasızlık · 3. Analiz ve sinyal · 4. AI yorumu · 5. Görsellik. `[A-09]`

## 1.2 Değişmez kurallar

**K1 — Sunucu otoritesi mutlaktır.** Para, maliyet, kâr-zarar, risk ve **sinyal**
sunucuda hesaplanır. İstemci görüntüler ve niyet gönderir; istemciden gelen hiçbir
sayıya güvenilmez. `[D-10]`

**K2 — Tazelik sınıfı taşımayan sayı ekrana basılmaz.** `[C-10]`
```ts
{ value: Decimal, source: SourceId, asOf: Date, freshness: 'live'|'delayed'|'close'|'estimate' }
```
Alanlardan biri eksikse değer tip seviyesinde arayüze geçemez. **Veri yok**, **bayat**
ve **gecikmeli** üç ayrı durumdur, üçü ayrı görünür.

**K3 — Motor saftır.** `packages/engine` içinde DB, ağ, dosya sistemi, `Date.now()`,
`Math.random()`, global durum yok. Göstergeler, kâr-zarar, risk, **sinyal skoru ve
hedef fiyat** burada. CI denetler. `[D-08]`

**K4 — Hiçbir modül verinin nereden geldiğini bilmez.** Tüm veri `MarketDataProvider`,
haber `NewsProvider`, yapay zekâ `AiProvider` arkasından gelir. Kullanım şartlarını
ihlal eden kazıyıcı yazılmaz. `[C-01, B-06]`

**K5 — Metin sabit kodlanmaz.** Her arayüz metni `t('ad:anahtar')`. ESLint + `i18n:check`. `[I-02]`

**K6 — Yol sabit kodlanmaz.** Uygulama `/amisostock` alt yolunda; `basePath()` kullanılır. `[A-02]`

**K7 — Her hesaplama gerekçesini üretir.** Gösterge, kâr-zarar, risk ve **sinyal**
hesapları `calcTrace` döner: `{ input, steps:[{name,value,reason}], output, summary }`.

**K8 — `console.log` yasaktır.** Yalnız `logger.*`; her log `correlationId`, veri
hattı logları ayrıca `providerId` ve `symbol` taşır.

**K9 — Para kayan noktalı sayı değildir.** Parasal değerler `numeric` / ondalık tip.
Tutar her zaman `{ amount, currency }`; farklı para birimli iki tutarın kur olmadan
toplanması **derlenmez**.

**K10 — Yapay zekâ sayı üretmez.** Ekrandaki her sayı deterministik kodda hesaplanır.
Modelin metnindeki sayı hatırlanmış sayıdır, arayüze basılmaz. `[E-08]`

**K11 — Sinyal ve hedef fiyat deterministik üretilir, yöntemi görünür.** `[B-03 — değiştirildi 19.09.2026]`
Ürün **al · sat · tut** sinyali ve **hedef fiyat aralığı** verir. Bunlar kural
motorunda hesaplanır ve her biri şunlarla **birlikte** görünür, ayrılmaz:
yöntem adı · girdiler (`calcTrace`) · güven düzeyi · geçerlilik süresi · varsayımlar ·
*"bu sinyali ne çürütür"* · sorumluluk reddi.
Tek bir sihirli sayı gösterilmez: hedef fiyat **en az iki yöntemden** üretilmiş bir
**aralıktır**. Yapay zekâ bu sayıları üretmez, yalnızca açıklar (K10).
**Her sinyal kaydedilir ve sonradan isabeti ölçülür** (`signal_outcomes`) — isabeti
ölçülmeyen sinyal yayımlanmaz sayılır.

**K12 — Yapay zekâ kaynaksız konuşmaz.** Her AI iddiası kendisine verilen kaynak
parçalarından birinin kimliğini taşır; kaynaksız cümle çıktıdan elenir. `[E-06]`

**K13 — Test yazılmadan faz kapanmaz.** Global ≥%70; `packages/engine` ≥%85; para,
tazelik ve sinyal modülleri ≥%85. `[K-03]`

**K14 — Tek seferde tek alt görev.** Alt görev bitince dur, ROADMAP'te işaretle,
onay bekle. Plan sohbette değil ROADMAP'te yaşar. `[K-01]`

**K15 — Kapsam kayması yasak.** Yol haritasında olmayan fikir `docs/SPEC.md` §V2'ye
yazılır, yapılmaz.

**K16 — Emin değilsen sor.** Tahmin etmek, yanlış varsayımla 500 satır yazmaktan iyidir.

**K17 — ARM64 uyumluluğu.** Üretim Oracle Ampere A1. Her bağımlılık `linux/arm64`'te derlenmeli. `[J-01]`

**K18 — Sahte veri işaretlidir ve üretime giremez.** Sahte veri yalnız
`MockMarketDataProvider` gibi adı sahteliğini söyleyen modüllerde yaşar; üretim
derlemesinde bulunması CI'da hata verir. `[N-02]`

## 1.3 Kod standartları

```
Dosya:        kebab-case.ts        (market-data-provider.ts)
Bileşen:      PascalCase.tsx       (PriceTicker.tsx)
Fonksiyon:    camelCase            (calculateDrawdown)
Tip:          PascalCase           (PriceQuote)
Sabit:        SCREAMING_SNAKE_CASE (MAX_WATCHLIST_SIZE)
Veritabanı:   snake_case           (price_candles)
i18n:         ad:nokta.gösterimi   (portfoy:tablo.sutun.maliyet)
Test:         <isim>.test.ts       (yanına)
```

- `any` yasak → `unknown` + daraltma. Tüm dış girdiler (**sağlayıcı cevabı dahil**) Zod ile doğrulanır.
- `Ticker`, `IsoCurrency`, `ProviderId`, `SignalId` markalı (branded) tiplerdir.
- Sessiz `catch` yasak. Tipli hatalar: `DomainError` · `ValidationError` · `EngineError` ·
  `ProviderError` · `StaleDataError` · `QuotaExceededError` · `NotFoundError` · `ForbiddenError`.
- Kullanıcı hatası Türkçe ve eyleme dönüştürülebilir: *"THYAO fiyatı 14 dakikadır
  güncellenmedi; gösterilen değer 14:32 itibarıyladır."*

## 1.4 Git

`main` (kararlı) · `develop` (aktif) · `feature/faz-X-<slug>`.
**Commit alt görev başına, PR faz başına.** Faz kapanışında `git tag -a faz-X-son`.
Conventional Commits: `feat(engine): RSI hesabını ekle`.

## 1.5 Public repo güvenliği `[A-07, F-09]`

Repo public; hiçbir sır commit edilmez. `.gitignore`: `.env*` (`.env.example` hariç),
`/data/cache/`, `*.dump`, `*.sql.gz`, `*.bak`, `*.yedek`. GitHub sır taraması ve push
koruması açık. Lisans **AGPL-3.0** + `NOTICE` (üçüncü taraf veri atıfları). `[A-06, B-09]`

---

# 2. YIĞIN VE REPO

## 2.1 Sürümler

> **Ölçüm tarihi: 20.09.2026.** Aşağıdaki npm sürümleri tek tek `npm view <paket> version`
> ve seçilen sürümün `peerDependencies` / `engines` çıktısından alınmış, bağımlılıklar
> `pnpm install` ile kurulmuştur. Ham kayıt: `docs/reports/1.1-version-measurements.json`.
> En yeni / seçilen karşılaştırması: `docs/reports/1.1-iskelet.md`.
>
> TypeScript **`~6.0.3`**, `^` yasak: en yeni `7.0.2`, ancak
> `typescript-eslint@8.70.0` peer aralığı `>=4.8.4 <6.1.0` (SAPMA-004).
> Node `24.19.0` ve pnpm `11.23.0`, bu makinede ölçülen ve kurulumda kullanılan
> sürümlerdir; registry'nin en yenileri sırasıyla `26.9.0` ve `12.4.2`dir.
> Node tam sürümü `.nvmrc` + `preinstall`, pnpm `packageManager` ile sabittir.
> Diğer doğrudan bağımlılıklar tam sürümle, çözüm ağacı `pnpm-lock.yaml` ile sabittir.

```json
{
  "runtime": {
    "node": "24.19.0",
    "pnpm": "11.23.0",
    "turbo": "2.11.2"
  },
  "language": {
    "typescript": "~6.0.3"
  },
  "frontend": {
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "vite": "8.3.0",
    "react-router": "8.4.0",
    "tailwindcss": "4.3.3",
    "shadcn": "4.21.0",
    "zustand": "5.0.15",
    "@tanstack/react-query": "5.103.1",
    "@tanstack/react-table": "9.2.4",
    "@tanstack/react-virtual": "3.14.13",
    "lightweight-charts": "5.2.1",
    "i18next": "26.4.2",
    "react-i18next": "17.0.14",
    "lucide-react": "1.47.0",
    "react-hook-form": "7.88.0",
    "@hookform/resolvers": "5.9.1"
  },
  "backend": {
    "@nestjs/common": "12.0.3",
    "@nestjs/core": "12.0.3",
    "@nestjs/platform-express": "12.0.3",
    "drizzle-orm": "0.45.2",
    "drizzle-kit": "0.31.10",
    "pg": "8.23.0",
    "ioredis": "6.0.0",
    "bullmq": "6.3.8",
    "zod": "4.6.5",
    "pino": "10.3.1",
    "pino-http": "11.0.0",
    "nestjs-pino": "5.2.0",
    "@node-rs/argon2": "2.2.1",
    "jose": "6.2.12",
    "resend": "6.28.1",
    "decimal.js": "10.6.0",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.2"
  },
  "quality": {
    "vitest": "5.0.1",
    "@vitest/coverage-v8": "5.0.1",
    "@playwright/test": "1.63.0",
    "eslint": "10.11.0",
    "@eslint/js": "10.0.1",
    "typescript-eslint": "8.70.0",
    "prettier": "3.9.8",
    "globals": "17.12.0",
    "@sentry/node": "10.75.0",
    "@sentry/react": "10.75.0"
  },
  "types": {
    "@types/node": "24.13.6",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@types/pg": "8.23.1"
  }
}
```

**Npm dışı:** PostgreSQL için resmi sürüm tablosunda en yeni kararlı sürüm **18.6**
ölçüldü ([kaynak](https://www.postgresql.org/support/versioning/)); sunucu kurulmadı
ve çalıştırılmadı. Container seçimi/kurulumu **1.2** kapsamındadır, kullanılacağı gün
yeniden ölçülür. Yerel Docker istemcisi `29.7.2`; daemon bağlantısı başarısız,
sunucu sürümü **ÖLÇÜLEMEDİ**. `shadcn/ui` için ölçülen npm aracı `shadcn`dir;
bileşen üretilmedi. TanStack Virtual'ın React paketi `@tanstack/react-virtual`dır.

**Yasaklı:** moment.js (→ `date-fns`), lodash tamamı, jQuery, ücretli SDK,
**kaynağı kapalı grafik kütüphaneleri** (AGPL depo ile dağıtım çakışması, `H-01`).

## 2.2 Repo yapısı `[D-07]`

```
amisostock/
├── CLAUDE.md · KARARLAR.md · PROJECT_MEMORY.md · README.md · LICENSE · NOTICE
├── docker-compose.yml / .prod.yml · turbo.json · pnpm-workspace.yaml
├── tsconfig.base.json · .env.example
├── apps/
│   ├── web/      src/{app,screens,features,components,charts,locales/tr,lib}
│   ├── api/      src/{modules,common,main.ts}
│   └── worker/   src/processors/{ingest,news,signals,ai-analysis,alerts,rollup}
├── packages/
│   ├── engine/   src/{indicators,portfolio,risk,signal,valuation,format}   # SAF (K3)
│   ├── data/     src/{providers,normalize,freshness,registry}
│   ├── ai/       src/{provider,prompts,schema,budget}
│   ├── shared/   src/{schemas,constants,money,i18n,logger,errors,base-path}
│   ├── db/       src/{schema,migrations,partitions}
│   └── ui/
├── tools/
│   ├── arch-check/       # katman + saflık
│   ├── i18n-check/       # eksik/kullanılmayan anahtar
│   ├── contract-check/   # sağlayıcı cevap şeması          [K-04]
│   ├── money-check/      # float para aritmetiği avı        [K9]
│   └── freshness-check/  # tazelik alanı taşımayan değer avı [K2]
├── scripts/
└── docs/
    ├── SPEC.md · ROADMAP.md · CHECKPOINT.md
    ├── ADR/            # yalnız geri dönülemez kararlar
    └── LEGAL/          # KVKK, kullanım şartları, sorumluluk reddi
```

## 2.3 Ortam değişkenleri

`.env.example` Zod ile doğrulanır; eksikse uygulama açılmaz. **`NODE_ENV` bu dosyada
tutulmaz** (Vite onu üretim kararına uygular).

```bash
PUBLIC_BASE_PATH=/amisostock
PUBLIC_URL=https://fxrkqn.org/amisostock
API_PORT=3011
WEB_PORT=3010

DATABASE_URL=postgresql://amisostock:password@localhost:5432/amisostock
REDIS_URL=redis://localhost:6379/1            # fms ile aynı örnek, ayrı indeks [J-03]

JWT_SECRET=<32+ karakter rastgele>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
SETUP_TOKEN=<ilk admin için tek kullanımlık>

RESEND_API_KEY=
EMAIL_FROM=noreply@fxrkqn.org
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

SERVER_MODE=private                           # private | public | maintenance [A-03]

PROVIDER_EQUITY_PRIMARY=
PROVIDER_EQUITY_FALLBACK=
PROVIDER_CRYPTO=binance
EVDS_API_KEY=                                 # TCMB — resmî kur + makro
KAP_API_KEY=                                  # şirket bildirimleri
NEWS_FEEDS_FILE=./config/news-feeds.json

# Yapay zekâ [E-01, E-02 — değiştirildi 19.09.2026]
AI_PROVIDER=google                            # google | openai | anthropic | local
AI_API_KEY=
AI_DAILY_REQUEST_CAP=200                      # ücretsiz kademe kotasının altında tutulur
AI_MONTHLY_BUDGET_USD=0                       # 0 = yalnız ücretsiz kademe; aşımda katman kapanır

SENTRY_DSN=
LOG_LEVEL=info
```

## 2.4 Katman kuralları (CI'da denetlenir)

```
apps/web        → shared, ui
apps/api        → shared, db, engine, data, ai
apps/worker     → shared, db, engine, data, ai
data → shared · ai → shared · db → shared · ui → shared
engine → shared          (SADECE tipler ve saf yardımcılar)
shared → (hiçbir şey)    scripts → (hiçbir şey)
```

`engine` asla `db` veya `data` import etmez; veriyi **parametre olarak alır**.
`ai` asla `db` import etmez; bağlamı **parametre olarak alır**.

---

# 3. VERİ SÖZLEŞMESİ

## 3.1 Tazelik sınıfları `[C-10]`

| Sınıf | Anlamı | Arayüzde |
|---|---|---|
| `live` | Gerçek zamanlı | nokta göstergesi + "canlı" |
| `delayed` | Bilinen gecikmeyle | "15 dk gecikmeli · 14:32" |
| `close` | Seans kapanışı | "kapanış · 18 Eyl" |
| `estimate` | Türetilmiş/hesaplanmış | "hesaplanmış" |

Bunların dışında iki **durum** vardır ve değerin **yerini alır**, yanına yazılmaz:
**veri yok** ve **bayat** (beklenen tazeleme süresi aşıldı). `[C-12]`

## 3.2 Kaynak önceliği `[C-11]`

Her varlık sınıfı için kaynak sırası `docs/SPEC.md` §2.2'de yazılıdır ve sabittir.
İkinci kaynak yalnız birincisi yoksa devreye girer. **Ortalama veya medyan alınmaz** —
hiçbir kaynakta bulunmayan sayı üretmek, veriyi uydurmaktır.

## 3.3 Kaynaklar

| Alan | Kaynak | Not |
|---|---|---|
| Hisse fiyatı | Gecikmeli üçüncü taraf | `[B-01]` Lisans gerektirmeyen kademe |
| Şirket bildirimi | KAP resmî veri servisi | `[C-05]` Başvuru gerekir |
| Finansal tablo | KAP | `[C-06]` Oranlar bizde hesaplanır |
| Resmî kur, makro | TCMB EVDS | `[C-03, C-04]` Ücretsiz, anahtarlı |
| Kripto | Borsa WebSocket + yedek toplayıcı | `[C-02]` |
| Haber | Çok kaynaklı RSS | `[C-07]` Başlık + alıntı + bağlantı `[B-05]` |

---

# 4. SİNYAL VE HEDEF FİYAT SÖZLEŞMESİ

> K11'in uygulaması. Formüller, ağırlıklar ve eşikler `docs/SPEC.md` §5'te.

## 4.1 Sinyal

`al · sat · tut` üç değerden biridir; **ara değer yoktur**. Bileşik bir skordan üretilir
ve skorun her bileşeni ekranda açılır:

| Bileşen | Kaynağı | Not |
|---|---|---|
| Teknik | Gösterge kümesi (trend · momentum · oynaklık) | `engine/indicators` |
| Temel | KAP tablolarından hesaplanan oranlar | Veri yoksa **bileşen devre dışı kalır**, uydurulmaz |
| Haber/bildirim | KAP olayları + haber duygusu | Kural tabanlı `[E-12]` |
| Risk | Oynaklık, likidite, işlem durumu | Tedbirli/işleme kapalı ise sinyal **üretilmez** `[L-04]` |

**Sinyal üretilmeyen durumlar** (açıkça yazılır, boş bırakılmaz): yetersiz geçmiş `[L-05]` ·
bayat veri `[DZ-A2]` · piyasa kapalı değilken veri akmıyor · işleme kapalı varlık ·
bileşenlerin çoğu devre dışı.

## 4.2 Hedef fiyat

- **En az iki bağımsız yöntemden** üretilir ve bir **aralık** olarak gösterilir.
- Yöntemler: çarpan tabanlı (sektör medyan F/K × takip eden kazanç) · tarihsel çarpan
  bandı · teknik projeksiyon (ATR ve destek/direnç). Her birinin girdileri görünür.
- Yöntemlerin sonucu birbirinden çok ayrışıyorsa bu **ayrışmanın kendisi gösterilir**;
  ortalaması alınıp tek sayıya indirgenmez.
- Hedef fiyatın **geçerlilik süresi** vardır; süre dolunca "süresi geçti" olur, sessizce durmaz.

## 4.3 Zorunlu birliktelik

Sinyal ve hedef fiyat, şunlardan **ayrılmadan** gösterilir — biri eksikse bileşen
render edilmez: yöntem adı · girdiler · güven düzeyi · geçerlilik süresi ·
"bu sinyali ne çürütür" · sorumluluk reddi.

## 4.4 İsabet takibi

Her sinyal ve hedef fiyat `signals` tablosuna yazılır; geçerlilik süresi dolunca
sonucu `signal_outcomes`'a işlenir. Varlık sayfasında **geçmiş sinyallerin isabeti**
görünür. Gerekçe: isabeti ölçülmeyen sinyal, ölçülmemiş bir iddiadır (DZ-01'in ürün hâli).

---

# 5. YAPAY ZEKÂ SÖZLEŞMESİ

- **Sağlayıcı:** `AiProvider` soyutlaması; v1 birincil **Google Gemini API ücretsiz
  kademesi**. `[E-01 — değiştirildi 19.09.2026]`
  ⚠️ Ücretsiz kademenin güncel istek/gün sınırı ve **verilerin model geliştirme için
  kullanılıp kullanılmadığı** Faz 5.3'te hesap üzerinden **ölçülecek**; buraya sayı
  yazılmadı (DZ-01). Ölçüm sonucu kabul edilemezse sağlayıcı değiştirilir — soyutlama
  bunun için var.
- **Bütçe:** `AI_MONTHLY_BUDGET_USD=0`. Günlük istek sayacı veritabanında; kota
  dolunca katman kapanır ve **ekranda söylenir**, sessizce boş kalmaz. `[E-02]`
- **Ne zaman:** olay tetikli (anlamlı fiyat hareketi · yeni KAP bildirimi · önemli
  haber · sinyal değişimi) + günde bir planlı tazeleme. `[E-03]`
- **Ne için:** izleme listesi, portföy ve gündemdeki varlıklar. `[E-04]`
- **Çıktı:** katı JSON şeması (Zod) — `durum · etkenler · olumlu · olumsuz · riskler ·
  senaryolar · sinyalin gerekçesi · ne değişti`. Şemaya uymayan çıktı reddedilir ve
  bir kez yeniden istenir. `[E-05]`
- **Sürüm:** her analiz versiyonlanır; "önceki yoruma göre ne değişti" otomatik
  çıkarılır; kaynağı değişen haberin analizi yeniden üretilir. `[E-09, L-10]`
- **Sohbet yok** (v1). `[E-10]` · **Görünüm:** her AI bloğu rozet + üretim zamanı +
  kaynak listesi + model adı taşır. `[E-11]`

---

# 6. HUKUKİ SINIRLAR

> `docs/LEGAL/` + `docs/SPEC.md` §9. Bunlar ürün kararıdır.

1. **Sinyal ve hedef fiyat vardır** (K11), ama **kurulum davetlidir** `[A-03]` ve
   çıktı bir **araç çıktısıdır**, kişiye özel yatırım tavsiyesi değildir. Ölçülen
   hukuki durum: Türkiye'de genel piyasa yorumu ve araç çıktısı serbest; **kişiye özel
   al-sat-tut tavsiyesi** yetki ister ve *"yatırım tavsiyesi değildir"* ibaresi tek
   başına koruma sağlamaz — içeriğin fiilî niteliğine bakılır. Bu yüzden:
   **sinyal varlık düzeyindedir, kişi düzeyinde değildir.** Kullanıcının portföyüne,
   risk profiline veya bakiyesine göre kişiselleştirilmiş sinyal üretilmez. `[B-04]`
2. **`SERVER_MODE=public`'e geçiş ayrı ve bilinçli bir karardır** ve bu maddenin
   yeniden değerlendirilmesini gerektirir.
3. **Gecikme saklanmaz.** Gecikmeli veri gecikmeli olduğunu söyler; alarm bildirimi
   tetikleyen değerin ait olduğu anı yazar. `[G-09]`
4. **Haber tam metni kopyalanmaz** — başlık + kısa alıntı + kaynak bağlantısı. `[B-05]`
5. **Kazıma yok** `[B-06]` · **türetilmiş çıktı kapalı devrede kalır** `[B-02]`
6. **KVKK:** aydınlatma metni, hesap silme ve veri indirme v1'de çalışır. `[B-07, F-08]`
7. **Sorumluluk reddi dört yerde:** kayıt onayı · her sinyalin yanı · her AI
   analizinin altı · veri gecikme etiketi.
8. **Vergi hesabı yok** `[G-04]` · **aracı kurum bağlantısı yok** `[G-02]`

---

# 7. TERİM SÖZLÜĞÜ

> Kod İngilizce, arayüz Türkçe. Bu tablo bağlayıcı sözleşmedir; `i18n:check` ve
> `glossary-check` bunu ayrıştırır.

| Kod | Arayüz |
|---|---|
| Asset / Asset Class | Varlık / Varlık Sınıfı |
| Equity / Stock | Hisse Senedi |
| Ticker / Symbol | Sembol |
| Index / Commodity | Endeks / Emtia |
| Mutual Fund | Yatırım Fonu |
| Exchange / Session | Borsa / Seans |
| Market Status | Piyasa Durumu |
| Pre-market / After-hours | Seans Öncesi / Seans Sonrası |
| Circuit Breaker | Devre Kesici |
| Suspended | İşleme Kapalı |
| Quote | Fiyat Kotasyonu |
| Bid / Ask / Spread | Alış / Satış / Makas |
| Last Price | Son Fiyat |
| Open / High / Low / Close | Açılış / Yüksek / Düşük / Kapanış |
| Candle / Timeframe | Mum / Zaman Dilimi |
| Volume / Turnover | Hacim / İşlem Hacmi |
| Market Cap | Piyasa Değeri |
| Free Float | Halka Açıklık Oranı |
| Change (%) | Değişim (%) |
| Freshness / Stale | Tazelik / Bayat |
| Delayed Data | Gecikmeli Veri |
| As Of | Şu An İtibarıyla |
| Data Source / Provider | Veri Kaynağı / Sağlayıcı |
| Derived Data | Türetilmiş Veri |
| Adjusted Price | Düzeltilmiş Fiyat |
| Corporate Action | Sermaye Şirketi İşlemi |
| Bonus Issue / Rights Issue | Bedelsiz / Bedelli Sermaye Artırımı |
| Stock Split | Hisse Bölünmesi |
| Dividend / Dividend Yield | Temettü / Temettü Verimi |
| Ex-Dividend Date | Temettü Hak Kullanım Tarihi |
| Total Return / Price Return | Toplam Getiri / Fiyat Getirisi |
| Disclosure | Bildirim |
| Financial Statement / Earnings | Finansal Tablo / Kâr Açıklaması |
| P/E Ratio | Fiyat/Kazanç Oranı |
| P/B Ratio | Piyasa Değeri/Defter Değeri |
| **Signal** | **Sinyal** |
| **Buy / Sell / Hold** | **Al / Sat / Tut** |
| **Target Price** | **Hedef Fiyat** |
| **Target Range** | **Hedef Aralığı** |
| **Valuation Method** | **Değerleme Yöntemi** |
| **Confidence** | **Güven Düzeyi** |
| **Validity Period** | **Geçerlilik Süresi** |
| **Signal Accuracy** | **Sinyal İsabeti** |
| Indicator | Gösterge |
| Moving Average / EMA | Hareketli Ortalama / Üssel Hareketli Ortalama |
| Relative Strength Index | Göreli Güç Endeksi |
| Volatility / Drawdown | Oynaklık / Zirveden Düşüş |
| Correlation / Benchmark | Korelasyon / Kıyas Ölçütü |
| Support / Resistance | Destek / Direnç |
| Trend Line / Overlay | Trend Çizgisi / Üst Katman |
| Crosshair | Artı İmleç |
| Portfolio / Position / Holding | Portföy / Pozisyon / Varlık Kalemi |
| Cost Basis | Maliyet |
| Weighted Average Cost | Ağırlıklı Ortalama Maliyet |
| Realized / Unrealized P&L | Gerçekleşen / Gerçekleşmemiş Kâr-Zarar |
| Allocation / Exposure | Dağılım / Maruziyet |
| Transaction | İşlem |
| Paper Portfolio | Deneme Portföyü |
| Watchlist | İzleme Listesi |
| Alert / Trigger / Cooldown | Alarm / Tetikleyici / Soğuma Süresi |
| Screener / Heatmap | Tarayıcı / Isı Haritası |
| Dashboard / Widget | Panel / Bileşen |
| Sentiment | Piyasa Duygusu |
| Scenario / Assumption | Senaryo / Varsayım |
| AI Analysis | Yapay Zekâ Yorumu |
| Disclaimer | Sorumluluk Reddi |
| Base Currency | Temel Para Birimi |
| Exchange Rate | Döviz Kuru |
| Official / Free Market Rate | Resmî Kur / Serbest Piyasa Kuru |
| Server Mode / Maintenance Mode | Sunucu Modu / Bakım Modu |
| Allowlist | İzin Listesi |

**Kullanılmayacak Türkçe terimler:** "tavsiye" (→ **sinyal**; ürün tavsiye vermez,
sinyal üretir) · "kesin", "garanti", "kaçırma", "fırsat" (sinyal metninde) ·
"anlık" gecikmeli veri için (→ "gecikmeli") · "realtime" (→ "canlı") ·
"Amisos Stock" / "AmisosStock" (→ **Amisostock**).

---

# 8. KAPSAM VE BAŞARI

## 8.1 v2 kasası (v1'de yapılmaz — K15)

İngilizce dil desteği · AI ile serbest sohbet `[E-10]` · geri test motoru `[M-08]` ·
sosyal medya ve forum içeriği `[B-10]` · aracı kurum entegrasyonu `[G-02]` ·
vergi hesabı `[G-04]` · ekstre/PDF okuma `[G-06]` · ayrı mobil uygulama `[H-08]` ·
ücretli plan `[A-05]` · yatay ölçekleme.

## 8.2 Bilinen belirsizlikler (ölçümle kapanacak)

1. **Gecikmeli BIST kaynağı (Faz 2.2).** Ücretsiz/gecikmeli kaynak taranacak; ücretliyse
   ya bütçe açılır ya BIST v1 dışına alınır. Uydurulmaz.
2. **KAP veri servisi başvurusu (Faz 2.3).** Reddedilir/gecikirse haber katmanı RSS'e kalır.
3. **Gemini ücretsiz kademe sınırları ve veri kullanımı (Faz 5.3).** Ölçülecek; kabul
   edilemezse sağlayıcı değişir.
4. **Sinyal katsayılarının kalibrasyonu (Faz 3.3 · 5.3).** Formüller iyi bir başlangıç
   noktasıdır, mutlak doğru değildir. İsabet takibi `[K11]` ilk gerçek ölçüm kaynağıdır.
5. **Tarihsel düzeltme verisinin kalitesi (Faz 3.1).** Bedelsiz/bölünme kayıtları
   eksikse seri **düzeltilmemiş** diye işaretlenir, uydurulmaz. `[L-02]`
6. **Çizim araçlarının maliyeti (Faz 4.2).** Açık kaynak grafik kütüphanesi seçildi;
   trend çizgisi/Fibonacci elde yazılacak. Fazı aşarsa bölünür.

## 8.3 Başarı tanımı

- 6 fazın tamamı kabul kriterleriyle kapanmış
- `https://fxrkqn.org/amisostock` erişilebilir, PWA yüklenebilir, 360px'te her ekran kullanılabilir
- Uçtan uca test yeşil, Sentry'de açık hata yok
- **Bir hafta veri hattı kesintisiz**; tazelik nöbetçisi yanlış alarm vermemiş
- **Sağlayıcı arızası tatbikatı:** birincil kaynak kapatıldığında ürün bayat veriyi
  doğru etiketle göstermiş, çökmemiş
- **Sinyal isabet tablosu dolu ve görünür** — en az bir geçerlilik döngüsü kapanmış
- Geri yükleme tatbikatı yapılmış ve belgelenmiş
- Aylık maliyet **ölçülmüş** ve tavanın altında
- `freshness:check` ve `money-check` temiz — kaynaksız/tazeliksiz sayı yok

---

# 9. SÜREÇ DEĞİŞMEZLERİ

> fms deposunda altı fazın ölçülmüş bedelinden doğdular. Hiçbir fazın kapsamı onları
> askıya alamaz.

| # | Değişmez |
|---|---|
| **DZ-01** | Sayı ölçüm çıktısından kopyalanır; ölçülmemiş alan `ÖLÇÜLECEK` kalır ve kullanılacağı gün yeniden sayılır |
| **DZ-02** | Araç önce doğrulanır; nöbetçi iki yönlü sınanır; çıkış kodu borusuz okunur |
| **DZ-03** | Her kapı kapsamını söyler; *"0 bulundu"* ile *"bakılmadı"* ayrılır |
| **DZ-04** | Test yeşil ≠ üretim çalışıyor — **build et ve çalıştır**, yüzey adıyla |
| **DZ-05** | Kırmızı test ≠ kod yanlış; kural test için gevşetilmez |
| **DZ-06** | ROADMAP ve PROJECT_MEMORY kendi sesindir; kaynak `KARARLAR.md` + `CLAUDE.md` + `SPEC.md` |
| **DZ-07** | Envanter sayı değil listedir ve kaynaktan türetilir |
| **DZ-08** | Metin kabuktan geçmez; Türkçe/Markdown içerik `Edit`/`Write` ile |
| **DZ-09** | Kural gerekçesinden öğrenilir, örneklerinden değil |
| **DZ-10** | Yazılmış ayar, yüklendiği ölçülene kadar hiçbir şey yapmayan ayardır |
| **DZ-11** | Kapının VAR olması KOŞTUĞUNU göstermez — `ci.yml`de maskesiz `run:` |
| **DZ-12** | Nöbetçi, yakalayacağı hata oluşabilecek hâldeyken yazılır |
| **DZ-13** | Mutasyon ayrıştırılır: yedek → boz → kırılanlar adıyla → geri al |
| **DZ-14** | Kapsam taşıması hedef fazın ROADMAP kapsamında adıyla görünür |
| **DZ-15** | Bir kriter işlevi yerine konmadan silinmez |
| **DZ-16** | Asenkron işin sonucu ölçülmeden önce bittiği ölçülür |
| **DZ-19** | Tek seferde tek alt görev; plan ROADMAP'te; commit alt görev başına; faz sonunda `git tag` |
| **DZ-20** | Bir faz tek koşuya sığar: 15'ten fazla bağımsız iş birimi → faz bölünür |

**Bu projeye özel:**

| # | Değişmez | Gerekçe |
|---|---|---|
| **DZ-A1** | Sağlayıcı cevabı şemadan geçmeden hiçbir yere yazılmaz; şema ihlali `ProviderError`'dır, sessiz `null` değil | Sessiz veri bozulması finansal üründe en pahalı hata |
| **DZ-A2** | **Bayat veri, veri değildir** — hesaplara, sinyale ve alarmlara girmez | K2'nin çalışma zamanı hâli |
| **DZ-A3** | Yetersiz geçmişle gösterge ve sinyal üretilmez; "yeterli geçmiş yok" yazılır | DZ-01'in gösterge hâli `[L-05]` |
| **DZ-A4** | Para birimi taşımayan tutar yoktur; kur olmadan toplama derlenmez | K9 |
| **DZ-A5** | **Yöntemi görünmeyen sinyal yayımlanmaz.** Bir sinyal bileşeni açıklanamıyorsa sinyal üretilmez | K11 |
