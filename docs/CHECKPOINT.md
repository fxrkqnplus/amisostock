# CHECKPOINT

> Makine için sabit şekilli durum. `PROJECT_MEMORY.md`'deki ANLIK DURUM ile **çakışmaz** —
> orası insan için anlatı, burası makine için alan listesi. Her alt görev sonunda güncellenir.

```yaml
guncelleme: 2026-10-01
faz: 1
faz_adi: Temel
alt_gorev: 1.3
alt_gorev_adi: Veri modeli ve çekirdek tipler
asama: teknik_kabul_gecti_pr_acik
dal: feature/faz-1-3-veri-modeli
taban_commit: 1829115392a5f4c96304241af7504381eac37ce5
son_tag: null
agac: feature_dali_origin_ile_esit; yalniz_devir_promptu_kullanici_degisikligi_kaldi
github:
  push_run: 36855404121
  pr: https://github.com/fxrkqnplus/amisostock/pull/1
  pr_run: 36855689769
  pr_state: open
  pr_merged: false
  pr_mergeable: true

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
  db_migrate_pg18_6: gecti # GitHub Actions PR run 36855689769
  db_integration_pg18_6: gecti # GitHub Actions PR run 36855689769

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
  - GitHub push run 36855404121 ve PR run 36855689769: PostgreSQL 18.6, amd64, arm64 geçti
  - PR #1 develop'e açık, mergeable; merge edilmedi
  - docs/reports/1.3-veri-modeli.md

yarim_kalan:
  - PR #1 inceleme/kabulü ve merge kullanıcı kararı bekliyor; resmi Faz 1 etiketi oluşturulmadı
  - Varsayılan daldaki Dependabot bildiriminin paket ayrıntısı ölçülmedi; push çıktısı 1 orta seviye bulgu bildirdi

siradaki_komut: 'PR #1 inceleme ve kullanıcı merge kararını bekle; Faz 1 kabulünden sonra ROADMAP 2.1 ile devam et'

acik_karar: null

olculmemis:
  - 'Varsayılan daldaki Dependabot bulgusunun paket ve advisory ayrıntıları'
```
