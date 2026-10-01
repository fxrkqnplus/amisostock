# CHECKPOINT

> Makine için sabit şekilli durum. `PROJECT_MEMORY.md`'deki ANLIK DURUM ile **çakışmaz** —
> orası insan için anlatı, burası makine için alan listesi. Her alt görev sonunda güncellenir.

```yaml
guncelleme: 2026-10-01
faz: 1
faz_adi: Temel
alt_gorev: 1.3
alt_gorev_adi: Veri modeli ve çekirdek tipler
asama: yerel_kapilar_gecti_uzak_ci_duzeltmesi_bekliyor
dal: feature/faz-1-3-veri-modeli
taban_commit: 1829115392a5f4c96304241af7504381eac37ce5
son_tag: null
agac: 51d374905ffde287b930694b00b459c115c79e69_uzerine_belge_duzeltmeleri

kapi_tabani:
  install: gecti
  typecheck: gecti # 9 paket / 20 kaynak
  lint: gecti # 50 dosya / 114 etkin kural
  test: gecti # 12 dosya / 257 test; satır kapsamı %95.70
  build: gecti # 9 paket / 20 kaynak; 9 ESM yükleme testi
  format_check: gecti # 98 dosya; bulgu yok
  arch_check: gecti
  i18n_check: gecti
  contract_check: gecti
  money_check: gecti
  freshness_check: gecti
  drizzle_check: gecti
  db_migrate_pg18_3: gecti # PGlite tabanlı yerel ölçüm
  db_integration_pg18_3: gecti # PGlite tabanlı yerel ölçüm
  db_migrate_pg18_6: gecti # GitHub Actions run 36848139843
  db_integration_pg18_6: gecti # GitHub Actions run 36848139843

biten:
  - karar kütüğü (131 madde) — KARARLAR.md
  - anayasa — CLAUDE.md
  - spesifikasyon — docs/SPEC.md
  - yol haritası (6 faz / 18 alt görev) — docs/ROADMAP.md
  - hafıza ve checkpoint dosyaları
  - 1.1 monorepo iskeleti ve sürüm ölçümü
  - Node/types/ortam kapıları ve K5/K6 kanaryaları
  - docs/reports/1.1-iskelet.md
  - 1.2 beş kapı, iki yönlü kanaryalar, CI kablolaması ve veri katmanı
  - docs/reports/1.2-kapilar.md
  - 1.3 şema: SPEC tabloları + ayrı düzeltilmiş mum serisi (35 tablo)
  - 1.3 Money/Quote/Freshness + K2/K9 negatif tip sözleşmeleri
  - PostgreSQL migration, aylık RANGE/LIST bölümleri, rollup korumalı retention
  - GitHub PostgreSQL 18.6 migration ve integration işi geçti
  - docs/reports/1.3-veri-modeli.md

yarim_kalan:
  - GitHub Actions run 36848139843 içinde PostgreSQL 18.6 işi geçti; amd64 ve arm64 işleri yalnız format_check nedeniyle kaldı
  - docs/CHECKPOINT.md biçimi düzeltildi; yerel 10 kapı zinciri ve db:check geçti
  - Düzeltmeleri push edip GitHub Actions'ı yeniden ölçmek ve CI yeşilse develop hedefli PR açmak gerekiyor; henüz PR yok

siradaki_komut: 'Yalnız faz belgelerini commit edip push et; yeni GitHub Actions sonucunu ölç; CI yeşilse develop PR aç'

acik_karar: null

olculmemis:
  - 'Belge düzeltmelerinden sonraki GitHub Actions amd64 ve arm64 sonuçları'
```
