# PROJECT_MEMORY — Amisostock

> Oturumlar arası devir teslim (K16). Oturum başında **okunur**, her alt görev sonunda
> ANLIK DURUM güncellenir, her faz sonunda faz kaydı eklenir.
>
> ⚠️ Bu dosya **kendi sesimizdir** (DZ-06). Buradaki hiçbir sayı kaynak değildir;
> kullanılacağı gün **yeniden ölçülür** (DZ-01).

---

## ANLIK DURUM

```
Tarih          : 01.10.2026
Faz            : 2 — Veri hattı
Alt görev      : 2.1a — Sağlayıcı omurgası, kripto ve resmî kur (yerel kabul geçti)
Aktif klon     : C:\Sistem\Projeler\amisostock-lf
Dal            : feature/faz-2-veri-hatti
Taban commit   : 7149333dfebe9bba5c85c81dd2d7445435c2f902 (Faz 1 merge commit'i)
Faz 1 etiketi  : faz-1-son → 7149333dfebe9bba5c85c81dd2d7445435c2f902
Ağaç           : 2.1a kodu/belgeleri bu görev; kullanıcıya ait PROJE-DEVIR-PROMPTU.md değişikliği korunuyor ve commit dışında kalacak
Faz 1 PR/CI    : PR #1 merge edildi; run 36855404121, 36855689769, 36856094428 PostgreSQL 18.6/amd64/arm64 kapılarını geçti
Faz 2 PR/CI    : PR yok (faz kapanışında açılacak); run 36869221755 temiz checkout'ta kaldı, düzeltme run 36869911308 ile PostgreSQL 18.6/amd64/arm64 geçti
Yerel kapılar   : typecheck 9 paket/32 kaynak; lint 67 dosya/114 kural/0 hata-uyarı; test 17 dosya/288 test; build 9 paket/9 ESM yüklemesi
Kapsam         : ifade %94,91; dal %90,76; fonksiyon %97,11; satır %95,76
Statik kapılar  : arch 38 dosya/0 bulgu; i18n 34 dosya/0 aday; contract alanı 0 dosya; money 34 dosya/13 aday/0 bulgu; freshness 34 dosya/6 aday/0 bulgu; format 117 dosya/0 hata
DB/runtime     : db:check, db:migrate, db:integration geçti; Postgres 18.6 ve Redis PONG; worker başlatıldı, tek Redis olayı 2 gerçek SSE istemcisine ulaştı
Ortam          : Node v24.19.0, pnpm 11.23.0; .env ve gerçek sağlayıcı anahtarları yok; aktif sağlayıcı eşlemesi 0; volume'lar korundu
Sınır          : canlı Binance/EVDS/CoinGecko çağrısı yapılmadı; CoinGecko yedeği varsayılan kapalı ve dış kullanıcı koşulları/atıf UI bekliyor
Açık bulgu     : 1.3 rollup kanıtı tarihsel düzeltmeyle geçersizleşmiyor P1 inceleme bulgusu açık
Sıradaki       : 2.1a tamamlandı; 2.1b için kullanıcı yönlendirmesini bekle
Açık karar     : yok; EVDS günlük gözlemi bir sonraki resmî yayına kadar close
```

---

## Kararların özeti

Tamamı `KARARLAR.md`'de. Yalnız sonraki oturumların bilmesi gerekenler:

- Ürün **al/sat/tut sinyali ve hedef fiyat** üretir; deterministik, yöntemi görünür,
  isabeti ölçülür (`CLAUDE.md` K11 · `SPEC.md` §5). Sinyal **varlık düzeyindedir**.
- Yapay zekâ **sayı üretmez** (K10) ve **kaynaksız konuşmaz** (K12).
  Sağlayıcı: Gemini API ücretsiz kademe; aylık bütçe `$0`.
- BIST verisi **gecikmelidir** ve gecikme her ekranda yazılır (K2).
- TCMB EVDS günlük referans kuru, sonraki resmî günlük yayına kadar `close` kalır;
  serbest piyasa FX ayrı kaynak olarak 2.1b'de ölçülür.
- Kurulum **davetlidir**; `SERVER_MODE=public`'e geçiş hukuki maddeleri yeniden açar.
- Marka **tek `s`**: `Amisostock`. Alt yol `/amisostock`.

---

## Açık belirsizlikler

| #   | Belirsizlik                                               | Kapanacağı alt görev |
| --- | --------------------------------------------------------- | -------------------- |
| 1   | Gecikmeli BIST kaynağı ücretsiz mi, ücretliyse ne kadar   | 2.2                  |
| 2   | KAP veri servisi başvurusunun sonucu                      | 2.3                  |
| 3   | Gemini ücretsiz kademe sınırı + veri kullanımı politikası | 5.3                  |
| 4   | Sinyal katsayılarının kalibrasyonu                        | 3.3 · 5.3            |
| 5   | Tarihsel düzeltme (bedelsiz/bölünme) verisinin kalitesi   | 3.1                  |
| 6   | Çizim araçlarının emek maliyeti                           | 4.2                  |

---

## SAPMA kütüğü

Karara bağlanmış her sapma buraya. Boşsa boş kalır — doldurulmaz.

| #         | Tarih      | Sapma                                                          | Karar                                  | Gerekçe                                                                                 |
| --------- | ---------- | -------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| SAPMA-001 | 19.09.2026 | `B-03` önerisi "sinyal verilmesin" idi                         | Sinyal ve hedef fiyat **verilir**      | Kullanıcı kararı; koşullar K11'e yazıldı, kişi düzeyinde kişiselleştirme yasağı korundu |
| SAPMA-002 | 19.09.2026 | `E-01`/`E-02` ücretli bulut sağlayıcı ve $10 tavan öngörüyordu | Gemini **ücretsiz kademe**, bütçe `$0` | Kullanıcı kararı. Not: ChatGPT Plus / Gemini uygulama aboneliği API erişimi içermez     |
| SAPMA-003 | 19.09.2026 | Yol haritası 9 faz / 57 alt görevdi                            | **6 faz / 19 alt görev**               | Kullanıcı kısalık istedi; 2.1 kaynak koşulları nedeniyle 2.1a/2.1b olarak ayrıldı       |

---

### SAPMA-004 — 20.09.2026

- Registry en yeni TypeScript: `7.0.2`; seçilen: `~6.0.3`.
- Gerekçe: `typescript-eslint@8.70.0` peer aralığı `>=4.8.4 <6.1.0`.
- Kanıt: `docs/reports/1.1-version-measurements.json`; bağımlılık kurulumunda katı peer kontrolü açık.

## BORÇ kütüğü

Bilinçli ertelenen teknik borç. Her satırın **hedef alt görevi** olmak zorundadır (DZ-14).

| #   | Borç | Hedef alt görev |
| --- | ---- | --------------- |
| —   | —    | —               |

---

## 1.1 ölçüm ve çözülen bulgular — 20.09.2026

- `pnpm install` ve beş kapı geçti; ham çıktı ve sürüm tablosu `docs/reports/1.1-iskelet.md` içinde.
- Typecheck/build: 9 paket, 10 kaynak; ikisinde `Cached: 0 cached, 9 total`.
- Lint: 26 dosya, 114 etkin kural; yerel K5/K6: 10 dosya, 2 kural.
- Test: 7 dosya, 162 vaka. Global satır kapsamı %81,76; dört %70 eşik korundu. Coverage paydası 6 ortam/kapı dosyasıdır; ürün kapsamı iddia edilmez.
- Çözülen kurulum bulgusu: `msgpackr-extract@3.0.4` betiği açık allowBuilds listesine alındı; genel betik izni açılmadı.
- Çözülen tip bulgusu: Zod'un `URL` tipi için shared paketinde `types: ["node"]`; `skipLibCheck: false` korundu.
- Kullanılmayan `minimumReleaseAgeExclude` kaldırıldı; kurulum geçti ve ayarı geri eklemedi.
- NODE_ENV mutasyonu lint'i exit 1 ile durdurdu; dosya hash'i geri alındı, lint geçti. Gerçek ESLint config kanaryasında ihlal 2 hata, temiz kod 0 hata.
- Node preinstall: yanlış tam sürüm pini exit 1, geri alınan `24.19.0` exit 0.
- CLAUDE.md'nin 11 satırı düzeltildi; §2.1 korundu. Toplu yeniden yazmama talimatı nedeniyle yalnız CLAUDE.md Prettier dışında.
- Docker daemon sürümü ölçülemedi; yeniden ölçüm ve ARM64/CI zaten 1.2 kapsamı. Yeni teknik borç eklenmedi; 1.2 başlatılmadı.

---

## 1.3 veri modeli ve çekirdek tipler — 01.10.2026

- `SPEC.md §1` tabloları Drizzle ile eklendi; L-02 için ham ve düzeltilmiş mum tabloları ayrıdır (35 tablo).
- `Money`, `Quote`, `Freshness`, branded `SourceId`/`ProviderId` ve K2/K9 negatif tip sözleşmeleri eklendi. İlgili üç shared modül %100 kapsam ölçtü; root test toplamı 257.
- PostgreSQL 18.3 PGlite üzerinde `db:migrate` ve `db:integration` geçti. Bölümleme `RANGE(ts)` ay + `LIST(timeframe)` alt bölüm; retention kanıtsız silmeyi reddediyor ve `1d`'yi koruyor.
- Root quality gates: typecheck 9 paket; lint 50 dosya; build 9 paket; arch/i18n/contract/money/freshness geçti. `drizzle-kit check` geçti.
- CI run `36848139843` ilk commit'te `docs/CHECKPOINT.md` format bulgusu nedeniyle kaldı. Biçim düzeltildikten sonra push run `36855404121` ve PR run `36855689769`, PostgreSQL 18.6 migration/integration ile amd64/arm64 kapılarını başarıyla tamamladı.
- PR #1 (`feature/faz-1-3-veri-modeli` → `develop`) kullanıcı tarafından
  `7149333dfebe9bba5c85c81dd2d7445435c2f902` merge commit'iyle kapatıldı; `faz-1-son`
  bu commit'i gösteriyor. Üç başarılı run PostgreSQL 18.6, amd64 ve arm64 kapılarını
  geçti; merge commit'ine bağlı ayrı workflow run'ı yok.
- Drizzle opsiyonel dialect `.d.ts` hataları nedeniyle yalnız DB paketinde `skipLibCheck: true`; kaynak tip kontrolü açık. Partitioning Drizzle modeliyle temsil edilmediği için ilk SQL migration elle tamamlandı.

GitHub erişim ölçümü: yerel `gh` komutu kurulu değil. PR #1'in merge'i ve faz etiketi yerel Git nesnelerinden doğrulandı. Push çıktısı varsayılan dalda bir orta seviye Dependabot bulgusu bildirmişti; paket/advisory ayrıntıları hâlâ ölçülmedi. Bağımlılık güncellemesi yapılmadı.

---

## 2.1a sağlayıcı omurgası — 01.10.2026

- `packages/data` sağlayıcı sözleşmeleri, registry/öncelik, `ProviderError`, Zod
  yanıt doğrulaması; Binance Spot WebSocket, CoinGecko Demo (isteğe bağlı) ve
  TCMB EVDS sağlayıcıları eklendi. Ücret/attribution koşulları ve 30 saniyelik
  stale politikası `docs/reports/2.1a-saglayici-omurgasi.md` içinde.
- BullMQ ingest, Redis cache/pubsub/kota/sağlık/backoff ve istemcilere çoğaltılan
  `/amisostock/api/market-data/events` SSE eklendi. Mevcut varlık sağlayıcı sembolü
  taşımadığından `asset_provider_symbols` ve `0003` migration'ı eklendi. Worker
  başlangıçta etkin sembollerin Redis cache'ini Zod ile hydrate eder; yaşlı cache
  stale olarak yeniden yayımlanır. İki restart/cache testi eklendi.
- Güncel kalite ölçümü: typecheck 9 paket; lint 67 dosya/114 kural, 0 hata/uyarı;
  test 17 dosya/288 test; kapsam stmt %94,91, branch %90,76, func %97,11, line
  %95,76; build 9 paket/9 ESM yüklemesi; arch 38 dosya/0 bulgu; i18n 34 dosyada
  0 aday; contract taraması 0 dosya; money 34 dosya/13 aday/0 bulgu; freshness
  34 dosya/6 aday/0 bulgu; format 117 dosya/0 hata.
- DB: `db:check`, migration ve entegrasyon geçti. Yerel sunucu PostgreSQL 18.6,
  Redis health `PONG`. Runtime smoke worker bağlantısını ve tek sentetik Redis
  yayınını iki SSE istemcisine doğruladı. Aktif provider eşlemesi 0 ve gerçek dış
  servis anahtarı olmadığından canlı sağlayıcı isteği yapılmadı.
- CoinGecko yedeği kapalı kaldı; demo tazeliği, görünür atıf UI'si ve dış
  kullanıcılara dönük şartlar hazır olmadan açılmamalı. Serbest piyasa FX 2.1b'de.
- İlk GitHub run `36869221755`, temiz checkout'ta `@amisostock/shared` bildirimleri
  eksik olduğundan amd64/arm64 typecheck aşamasında başarısız oldu. `turbo.json`
  `typecheck` görevi, `^build` ve `^typecheck` görevlerini bekleyecek şekilde
  düzeltildi. Dokuz eski `dist` klasörü dışarı taşınarak yapılan yerel temiz-çıktı
  denemesinde typecheck 9/9 paket ve 15/15 Turbo görevinde geçti. Uzak düzeltme
  run'ı `36869911308` PostgreSQL 18.6, amd64 ve arm64 işlerini geçirdi; üç Node.js
  20 deprecation uyarısı bıraktı.
- Faz 2 henüz kapanmadı ve PR açılmadı. Faz 1 feature branch'inin yerel/uzak
  kopyası ölçümde bulunmadı.

---

## Faz kayıtları

1.2 yerel ölçümü: `docs/reports/1.2-kapilar.md`. Env kapısı satır %96,55;
JSX metin kuralı %100. Docker daemon 29.7.2 ölçüldü. Postgres 18.6 ve Redis 8.10.1
sağlık yanıtı verdi ve kapatıldı; host portları başka servislerce tutulduğu için
yalnız ölçümde ports override kullanıldı. Ürün kodu veya bağımlılık eklenmedi.

> Her faz sonunda, aşağıdaki başlıklarla eklenir. Faz kaydı yazılmadan faz kapanmaz.
>
> **Şablon:** 1. Kapsam · 2. Ne yapıldı · 3. Ölçümler (komut + ham çıktı) · 4. Kabul kriterleri denetimi · 5. Hata günlüğü (sınıf + reçete) · 6. Kırılan/düzelen
> nöbetçiler · 7. SAPMA/BORÇ eklemeleri · 8. Devredilenler ve hedefleri · 9. Sonraki faza not

Faz 1, PR #1 merge'i ve `faz-1-son` etiketiyle kapandı. Faz 2 açıktır; 2.1a bitti,
2.1b/2.2/2.3 tamamlanmadan faz PR'si oluşturulmayacak.
