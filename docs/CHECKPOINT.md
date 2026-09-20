# CHECKPOINT

> Makine için sabit şekilli durum. `PROJECT_MEMORY.md`'deki ANLIK DURUM ile **çakışmaz** —
> orası insan için anlatı, burası makine için alan listesi. Her alt görev sonunda güncellenir.

```yaml
guncelleme: 2026-09-20
faz: 1
faz_adi: Temel
alt_gorev: 1.2
alt_gorev_adi: Kapılar ve CI
asama: yerel_tamam_ci_olculecek
dal: develop
taban_commit: 423c2cc0c1e747888a4cc40470b8e86532eae49d
son_tag: null
agac: commit_hazirlaniyor

kapi_tabani:
  install: gecti
  typecheck: gecti # 9 paket / 10 kaynak, 0 cached
  lint: gecti # 34 dosya / 114 etkin kural; yerel 2 kural / 10 dosya
  test: gecti # 9 dosya / 206 test, 12 dosyalık coverage kapsamı
  build: gecti # 9 paket / 10 kaynak, 0 cached; 9 ESM yükleme testi
  format_check: gecti
  arch_check: gecti
  i18n_check: gecti
  contract_check: gecti
  money_check: gecti
  freshness_check: gecti

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

yarim_kalan: ['push sonrası CI iş ölçümü ve uzak dal eşitliği']

siradaki_komut: 'commit, push, CI işlerini ölç; sonra DUR'

acik_karar: null

olculmemis:
  - 'CI amd64 ve arm64 işleri: push sonrası ÖLÇÜLECEK'
```
