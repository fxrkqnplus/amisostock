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
Faz            : 1 — Temel
Alt görev      : 1.3 — Veri modeli ve çekirdek tipler (yerel tamam)
Dal            : feature/faz-1-3-veri-modeli
Taban commit   : 1829115392a5f4c96304241af7504381eac37ce5
Son tag        : —
Ağaç           : 1.3 yerel commit hazır; push bekliyor
Kapı tabanı    : typecheck/lint/test/build ve tüm statik kapılar geçti; 257 test, global satır %95,70
Biten          : 1.1 iskelet, 1.2 kapılar ve CI, 1.3 şema/çekirdek tipler/PG18 entegrasyon testi
Yarım kalan    : GitHub token geçersiz; push sonrası PG18.6 ve amd64/arm64 CI işleri ölçülecek
Sıradaki komut : erişim düzelince feature dalını push et, CI işlerini ölç; sonra DUR
Açık karar     : yok
```

---

## Kararların özeti

Tamamı `KARARLAR.md`'de. Yalnız sonraki oturumların bilmesi gerekenler:

- Ürün **al/sat/tut sinyali ve hedef fiyat** üretir; deterministik, yöntemi görünür,
  isabeti ölçülür (`CLAUDE.md` K11 · `SPEC.md` §5). Sinyal **varlık düzeyindedir**.
- Yapay zekâ **sayı üretmez** (K10) ve **kaynaksız konuşmaz** (K12).
  Sağlayıcı: Gemini API ücretsiz kademe; aylık bütçe `$0`.
- BIST verisi **gecikmelidir** ve gecikme her ekranda yazılır (K2).
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
| SAPMA-003 | 19.09.2026 | Yol haritası 9 faz / 57 alt görevdi                            | **6 faz / 18 alt görev**               | Kullanıcı kısalık istedi; kapı zinciri korundu, ajan orkestrasyonu çıkarıldı            |

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
- CI'ya PostgreSQL 18.6 integration işi eklendi. Bu bulut ortamındaki `GH_TOKEN` geçersiz olduğundan değişiklikler push edilemedi; PostgreSQL 18.6 native CI ve amd64/arm64 uzak sonuçları bekliyor.
- Drizzle opsiyonel dialect `.d.ts` hataları nedeniyle yalnız DB paketinde `skipLibCheck: true`; kaynak tip kontrolü açık. Partitioning Drizzle modeliyle temsil edilmediği için ilk SQL migration elle tamamlandı.

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

_(Henüz faz kapanmadı.)_
