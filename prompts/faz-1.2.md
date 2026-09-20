GÖREV — Faz 1.2 "Kapılar ve CI". Beş nöbetçiyi kur, hepsini CI'da maskesiz koştur,
veri katmanını ayağa kaldır. Ürün kodu yazma.
Proje kökü: C:\Users\fxrkqn\Documents\amisostock
Yeni kapsam ekleme. Maddeleri bitir, commit at, dur.

════════ 0 · ÖNCE LİMİTİ GÖR, SIRAYI ONA GÖRE KUR ════════

Kalan limiti görüntüle ve rakamla söyle. (Danışmana verilen bilgi: bu tur başlarken
günlük limitin **%58'i** kalmıştı — doğrula, kopyalama.)

Sıra: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (commit, her hâlükârda)**

Limit yetmeyecek görünüyorsa **1, 2, 3 ve 8'i** bitir, kalanı yapma; yarım kalanları
`docs/CHECKPOINT.md`'ye yaz ve yine de commit at. **Commitsiz kapanma.**

Alt ajan açarsan: **GPT 5.6 · Luna · effort = Max.**

════════ 1 · OKU ════════

`CLAUDE.md` §1.2 (K1–K18), §2.2 (repo ağacı), §2.4 (katman kuralları), §9 (DZ) ·
`docs/ROADMAP.md` → Faz 1, madde 1.2 · `docs/SPEC.md` §9.1–9.2 (test katmanları,
nöbetçiler) · `docs/CHECKPOINT.md` · `PROJECT_MEMORY.md` ·
`docs/reports/1.1-iskelet.md` (önceki turun raporu) · `prompts/SABLON.md`
Kabuk: `git status --porcelain` · `git log --oneline -3` · `git branch --show-current`

════════ 2 · TABAN ════════

**DOĞRULANMIŞ** (danışman 20.09.2026'da depodan ölçtü):

- `refs/heads/develop` = `423c2cc0c1e747888a4cc40470b8e86532eae49d`; reflog iki satır
  (ilk commit `0d866d0`, sonra amend). Tek commit.
- 1.1'in altı kapısı `1.1-command-measurements.json`'da exit 0; 162 test geçti;
  kapsam satır %81,76 · deyim %81,09 · fonksiyon %83,87 · dal %77,16.
- `CLAUDE.md`'de `"9 faz"` araması boş; §2.1 ölçülmüş sürüm bloğu yerinde.
- `pnpm-workspace.yaml`'daki ölü `minimumReleaseAgeExclude` kaldırılmış.
- 9 paket, 3 kapı betiği, 2 yerel ESLint kuralı, `run-check.mjs` yerinde ve
  hepsi kapsam satırı basıyor.

**AĞAÇ KİRLİ — sebebi ve sahibi:** Danışman üç belgeyi düzenledi (`CLAUDE.md`,
`KARARLAR.md`, `PROJE-DEVIR-PROMPTU.md`): emsal proje atıfları kaldırıldı, devir
belgesinden bir bölüm çıkarılıp bölüm numaraları düzeltildi, uygulayıcı adı
güncellendi. Ayrıca `prompts/` klasörü eklendi. **Bu değişiklikler senin kapsamında
değil ama commit'in içine girer** — geri alma, 8. maddede birlikte commit et.

**SEN ÖLÇ** (danışmanın bu makinede kabuğu yok):

- Bütün kapı koşularının gerçek çıktısı.
- **Docker daemon sürümü** — 1.1'de ölçülememişti, `docker version` ile ölç.
- GitHub hesabının **ARM64 runner** sunup sunmadığı.

════════ 3 · YAPILACAKLAR ════════

**1. Düzen: prompt klasörü ve .gitignore.**
`prompt-faz-1.1.md` ve `prompt-faz-1.1-devam.md` kökte duruyor ve **takipsiz**
(`.gitignore`'da `prompt-*.md` var). Bunları `prompts/faz-1.1.md` ve
`prompts/faz-1.1-devam.md` olarak taşı (takipsiz oldukları için `git mv` değil, taşı).
`.gitignore`'dan `prompt-*.md` satırını **kaldır** — bundan sonra promptlar depoda
yaşar, raporlarıyla eşleşsin diye. `prompts/SABLON.md` ve `prompts/faz-1.2.md`
zaten yerinde; hepsini `git add` ile al.

**2. `tools/arch-check` — katman ve saflık denetimi.**
`CLAUDE.md` §2.4'teki bağımlılık yönünü zorla. İki kural kümesi:
(a) **katman:** izin verilmeyen paketler arası `import`; (b) **saflık:**
`packages/engine` içinde `db`/`data` importu, ağ, dosya sistemi, `Date.now()`,
`Math.random()`, global durum. Kapsam satırı bas (kaç dosya, kaç kural).
**Kanarya:** bilinen ihlal dosyasında öter, temiz ağaçta susar — test ile kanıtla.

**3. `tools/money-check` ve `tools/freshness-check`.**

- `money-check`: parasal alanlarda `number` aritmetiği, `parseFloat`, `toFixed`
  kullanımı; `{ amount, currency }` taşımayan tutar (K9).
- `freshness-check`: `value · source · asOf · freshness` dörtlüsünü taşımayan bir
  değerin arayüze/rapora geçmesi (K2).
  Ürün kodu henüz yok; **kanarya fixture'ıyla** iki yönlü sınanırlar (DZ-12) ve gerçek
  kod tarandığında "0 bulundu" ile "bakılmadı" ayrı basılır (DZ-03).

**4. `tools/i18n-check` ve `tools/contract-check` iskeleti.**

- `i18n-check`: eksik anahtar, kullanılmayan anahtar, boş çeviri, görünmez karakter.
  `apps/web/src/locales/tr/` henüz yok — kapı **çalışır** ve _"0 anahtar tarandı,
  yerel dosya bulunamadı"_ der; sessiz geçmez.
- `contract-check`: sağlayıcı cevabı ↔ Zod şeması denetiminin iskeleti. Şema henüz
  yok (2.1), ama kanarya fixture'ıyla iskelet sınanır.

**5. Kablolama ve CI.**
Beş kapıyı `package.json` script'lerine ve `run-check.mjs` zincirine bağla:
`arch:check` · `money:check` · `freshness:check` · `i18n:check` · `contract:check`.
`.github/workflows/ci.yml`: `pnpm install` + tüm kapı zinciri, **matris
`amd64` + `arm64`** (ARM64 runner yoksa ölç, yaz ve amd64 ile devam et — uydurma).
Her kapı **maskesiz `run:`** olacak: `continue-on-error`, `|| true`, koşullu `if:`
**yok**. Kablolamayı iddia eden bir test yaz: `ci.yml`i ayrıştırıp her `*:check`
script'inin maskesiz bir `run:` adımında geçtiğini doğrulasın (DZ-11).

**6. `docker-compose.yml` — veri katmanı.**
PostgreSQL 18 + Redis. `CLAUDE.md` §2.3'teki `DATABASE_URL` ve `REDIS_URL` ile
uyumlu portlar ve kullanıcı/veritabanı adı. **Kur ve çalıştır:** `docker compose up -d`,
`docker version` ile daemon sürümünü ölç, `pg_isready` ve `redis-cli ping` ile iki
servisin de cevap verdiğini göster (DZ-04: build et ve çalıştır). Sonra `down`.
Daemon hâlâ açılmıyorsa **"ölçülemedi"** yaz ve nedenini belirt; tahmin etme.

**7. Nöbetçi kapsamını yükselt.**
1.1'de ölçüldü: `scripts/check-env-file.mjs` **%53,57**,
`tools/eslint-local-rules/no-bare-jsx-text.mjs` **%65,11**. Bir kapıyı koruyan testin
yarısının koşmaması, kapının yarısının ölçülmemiş olmasıdır. İkisini de **≥%80**
satır kapsamına çıkar. Eşik düşürme, test ekle.

**8. Rapor, hafıza, commit.**

- `docs/reports/1.2-kapilar.md` — `prompts/SABLON.md`'deki üç bölümle
  (ÇIKTI · KIRILANLAR · KARARIN GEREKİYOR). Ham loglar `docs/reports/1.2-*.log`.
- `PROJECT_MEMORY.md` ANLIK DURUM + varsa yeni SAPMA/BORÇ (her borcun **hedef alt
  görevi** yazılır).
- `docs/CHECKPOINT.md` güncel; `olculmemis` listesinden Docker daemon maddesi
  ölçüldüyse çıkar.
- `docs/ROADMAP.md`'de 1.2'yi `[x]` işaretle.
- `git add -A` → mesajı dosyaya yaz → `git commit -F <dosya>`:
  `feat(tools): beş kalite kapısı, CI kablolaması ve veri katmanı`
  Danışmanın belge düzenlemeleri de bu commit'e girer.

════════ 4 · KURALLAR ════════

- Bir dosyayı değiştirmeden önce **o anki hâlini oku**; bellekteki kopya bayat olabilir.
- **Atıfı, hedefi yazıldıktan sonra ver.**
- Sayıyı ölçümden kopyala; ölçülmemişe `ÖLÇÜLECEK` yaz.
- Her kapı kapsamını bassın; _"0 bulundu"_ ile _"bakılmadı"_ ayrı.
- Nöbetçi iki yönlü sınanır: bilinen ihlalde öter, temiz kodda susar.
- Türkçe metni kabuk argümanı olarak geçirme.
- **Kapsam dışı — bu turda yok:** veritabanı şeması ve Drizzle migration'ları (1.3) ·
  `MarketDataProvider` ve gerçek sağlayıcılar (2.1) · ürün kodu, bileşen, uç nokta ·
  Docker imajı üretimi ve dağıtım (6.2) · yeni bağımlılık (gerekirse **sor**).
- İyi bir fikrin varsa `docs/SPEC.md` §10'a yaz, yapma.
- Emin değilsen tahmin etme, sor.

════════ 5 · KABUL KRİTERLERİ ════════

☐ `prompts/` klasöründe dört dosya var; kökte `prompt-*.md` kalmadı; `.gitignore`'da
`prompt-*.md` satırı yok
☐ Beş yeni kapı da koşuyor ve **kapsam satırı basıyor**
☐ Beş kanaryanın hepsi iki yönlü kanıtlandı — ihlalde exit≠0, temizde exit 0;
çıktılar raporda
☐ `ci.yml` tüm kapıları maskesiz `run:` olarak taşıyor; bunu iddia eden test geçiyor
☐ ARM64 matris çalışıyor **ya da** çalışmadığı ölçüldü ve nedeni yazıldı
☐ `docker compose up -d` sonrası Postgres ve Redis cevap verdi (ya da "ölçülemedi"

- neden); Docker daemon sürümü ölçüldü
  ☐ `check-env-file.mjs` ve `no-bare-jsx-text.mjs` satır kapsamı **≥%80**
  ☐ Tam kapı zinciri geçiyor: `typecheck · lint · test · build · arch:check ·
i18n:check · contract:check · money:check · freshness:check · format:check`
  ☐ `docs/reports/1.2-kapilar.md` var; `PROJECT_MEMORY.md` ve `CHECKPOINT.md` güncel;
  ROADMAP'te 1.2 `[x]`
  ☐ `git log --oneline` iki commit gösteriyor, dal `develop`, `git status --porcelain` boş

Bitince DUR. 1.3'e geçme. Kapanış mesajında: kalan limit, biten maddeler,
yapılmayan madde varsa hangisi ve neden.
