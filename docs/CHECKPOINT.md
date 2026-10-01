# CHECKPOINT

> Makine için sabit şekilli durum. `PROJECT_MEMORY.md`'deki ANLIK DURUM ile **çakışmaz** —
> orası insan için anlatı, burası makine için alan listesi. Her alt görev sonunda güncellenir.

```yaml
guncelleme: 2026-10-01
faz: 1
faz_adi: Temel
alt_gorev: 1.3
alt_gorev_adi: Veri modeli ve çekirdek tipler
asama: yerel_tamam_push_uzak_ci_bekliyor
dal: feature/faz-1-3-veri-modeli
taban_commit: 1829115392a5f4c96304241af7504381eac37ce5
son_tag: null
agac: yerel_commit_push_bekliyor

kapi_tabani:
  install: gecti
  typecheck: gecti # 9 paket / 20 kaynak
  lint: gecti # 50 dosya / 114 etkin kural
  test: gecti # 12 dosya / 257 test; satır kapsamı %95.70
  build: gecti # 9 paket / 20 kaynak; 9 ESM yükleme testi
  format_check: gecti
  arch_check: gecti
  i18n_check: gecti
  contract_check: gecti
  money_check: gecti
  freshness_check: gecti
  drizzle_check: gecti
  db_migrate_pg18_3: gecti
  db_integration_pg18_3: gecti

biten:
  - karar kütüğü (131 madde) — KARARLAR.md
  - anayasa — CLAUDE.md
  - spesifikasyon — docs/SPEC.md
  - yol haritası (6 faz / 18 alt görev) — docs/ROADMAP.md
  - hafıza ve checkpoint dosyaları
  - 1.1 monorepo iskeleti ve 52 npm sürüm ölçümü
  - Node/types/ortam kapıları ve K5/K6 kanaryaları
  - docs/reports/1.1-iskelet.md
  - 1.2 beş kapı, iki yönlü kanaryalar, CI kablolaması ve veri katmanı
  - Docker daemon 29.7.2; Postgres 18.6 ve Redis 8.10.1 sağlık yanıtları
  - docs/reports/1.2-kapilar.md
  - 1.3 şema: SPEC tabloları + ayrı düzeltilmiş mum serisi (35 tablo)
  - 1.3 Money/Quote/Freshness + K2/K9 negatif tip sözleşmeleri
  - PostgreSQL migration, aylık RANGE/LIST bölümleri, rollup korumalı retention
  - PostgreSQL 18.3 PGlite migration ve retention entegrasyon ölçümü
  - docs/reports/1.3-veri-modeli.md

yarim_kalan:
  - GitHub token geçersiz olduğundan feature dalı push edilemedi
  - 1.3 PostgreSQL 18.6 migration/retention CI işi ölçülmedi
  - Feature dalındaki amd64/arm64 uzak CI işleri ölçülmedi

siradaki_komut: 'erişim düzelince push et, CI işlerini ölç; sonra DUR'

acik_karar: null

olculmemis:
  - 'GitHub Actions: PostgreSQL 18.6 migration/retention işi'
  - "1.3 feature dalı için CI amd64 ve arm64 işleri"
```
