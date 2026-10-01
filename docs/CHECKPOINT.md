# CHECKPOINT

> Her alt görev sonunda güncellenen makinece okunabilir durum. Sayılar ölçüm
> çıktısına aittir; yorumlar karar kaynağı değildir.

```yaml
guncelleme: 2026-10-01
faz: 2
faz_adi: Veri hattı
alt_gorev: '2.1a'
alt_gorev_adi: Sağlayıcı omurgası, kripto ve resmî kur
asama: yerel_kapilar_ve_runtime_gecti
dal: feature/faz-2-veri-hatti
taban_commit: 7149333dfebe9bba5c85c81dd2d7445435c2f902
onceki_faz_tag:
  ad: faz-1-son
  commit: 7149333dfebe9bba5c85c81dd2d7445435c2f902
git:
  eski_faz_dali_yerel: bulunamadi
  eski_faz_dali_uzak: bulunamadi
  devir_promptu: kullanıcı_degisikligi_korundu_commit_disinda
github:
  faz_1_pr: 1
  faz_1_pr_durumu: merged
  faz_1_merge_commit: 7149333dfebe9bba5c85c81dd2d7445435c2f902
  faz_1_basarili_ci_runlari: [36855404121, 36855689769, 36856094428]
  faz_1_merge_commit_ci: bulunamadi
  faz_2_pr: yok_faz_kapanisinda_acilacak
  faz_2_remote_ci: 'run 36869221755 başarısız; amd64 ve arm64 typecheck temiz checkout hatası'
  faz_2_ci_duzeltme: 'turbo typecheck bağımlı paket build görevini bekliyor; temiz çıktı yerel doğrulaması geçti; uzak tekrar push sonrası bekleniyor'

runtime:
  node: v24.19.0
  pnpm: 11.23.0
  nvmrc: 24.19.0
  postgres_image: postgres:18
  postgres_server: 18.6
  redis_image: redis:8
  postgres_redis_durumu: healthy
  redis_ping: PONG
  env_dosyasi: yok
  evds_api_key: yok
  coingecko_api_key: yok
  aktif_provider_eslemesi: 0
  var_provider_tablosu: public.asset_provider_symbols
  volume_durumu: postgres_ve_redis_volume_korundu

kapi_tabani:
  typecheck: 'gecti; 9 paket, 32 TS kaynak'
  lint: 'gecti; 67 dosya, 114 kural, 0 hata, 0 uyari'
  test: 'gecti; 17 dosya, 288 test; stmt 94.91%, branch 90.76%, func 97.11%, line 95.76%'
  build: 'gecti; 9 paket, 9 ESM yuklemesi; urun sunucusu 0, browser bundle 0'
  arch_check: 'gecti; 38 dosya, 7 kural, 0 bulgu'
  i18n_check: 'gecti; 34 dosya, 4 kural; 0 aday, ceviri dosyasi yok'
  contract_check: 'gecti; ayri tarama alaninda 0 dosya/0 sema/0 cevap'
  money_check: 'gecti; 34 dosya, 4 kural, 13 aday, 0 bulgu'
  freshness_check: 'gecti; 34 dosya, 3 kural, 6 aday, 0 bulgu'
  format_check: 'gecti; 117 dosya, 0 hata'
  db_check: gecti
  db_migrate: gecti
  db_integration: 'gecti; partitioning, rollup guard, retention, audit'
  runtime_smoke: 'worker Postgres/Redis baglandi; tek sentetik Redis yayini 2 SSE istemcisine ulasti'

sinirlar:
  - 'Gercek Binance, EVDS ve CoinGecko cagri/anahtar dogrulamasi yapilmadi; aktif esleme yok.'
  - 'CoinGecko fallback kapali; attribution UI ve dis kullanici sartlari hazir degil.'
  - 'Faz 1.3 rollup kaniti tarihsel duzeltmelerle gecersizlesmiyor P1 bulgusu acik.'
  - 'Serbest piyasa FX 2.1b; gecikmeli BIST 2.2.'
siradaki_is: '2.1a tamamlandi; 2.1b icin kullanici yonlendirmesini bekle'
```
