GÖREV — Faz 1.1 "İskelet", DEVAM. Önceki oturum kota bitince yarıda kesildi.
Proje kökü: C:\Users\fxrkqn\Documents\amisostock
Yeni kapsam ekleme. Yedi maddeyi bitir, commit at, dur.

════════ 0 · ÖNCE LİMİTİ GÖR, SIRAYI ONA GÖRE KUR ════════

İlk iş: **kalan 5 saatlik kullanım limitini görüntüle ve bana rakamla söyle.**
Sonra aşağıdaki sırayla çalış — sıra, limit yetmezse en değerli işin bitmiş
olmasına göre dizildi:

1 → 2 → 3 → 4 → 5 → 6 → **7 (commit, her hâlükârda)**

Limit yetmeyecek görünüyorsa: **1, 2, 3 ve 7'yi bitir**, kalanları yapma.
Yarım bıraktıklarını `docs/CHECKPOINT.md`'ye yaz ve yine de commit at.
**Commitsiz kapanma** — commit edilmemiş iş, yapılmamış iştir.

Alt ajan açarsan: **GPT 5.6 · Luna · effort = Max**. Başka model veya effort kullanma.

════════ 1 · OKU ════════

`CLAUDE.md` (§1.2, §2.1, §2.2, §8.2, §8.3) · `docs/ROADMAP.md` (Faz 1, madde 1.1) ·
`docs/CHECKPOINT.md` · `PROJECT_MEMORY.md`
Sonra: `git status --porcelain` · `git log --oneline -5` · `git branch -a`

════════ 2 · TABAN ════════

**DOĞRULANMIŞ** (danışman 20.09.2026'da dosya listesi ve içerikle ölçtü):

- İskelet kurulu: 14 kök dosyası, 9 paket (`apps/{api,web,worker}`,
  `packages/{ai,data,db,engine,shared,ui}`), `scripts/` altında 3 kapı + 3 test +
  `run-check.mjs`, `tools/eslint-local-rules/` altında 2 kural + 3 test.
- `packages/shared/src/env.ts` ve `env.test.ts` var.
- Açık `types` kuralı uygulanmış (`shared` → `["node"]`, `web` → `["react","react-dom","vite/client"]`).
- `check-env-file.mjs` ve `run-check.mjs` kapsam satırı basıyor.
- `CLAUDE.md` §2.1 ölçümle yeniden yazılmış, 20.09.2026 tarihli;
  `docs/reports/1.1-version-measurements.json` (51 KB) yerinde.
- `node_modules/`, `.turbo/`, `coverage/`, `pnpm-lock.yaml` (216 KB) var.
- `.git/` var ama `refs/heads` **boş**, `index` ve `logs` **yok** → hiç commit yok.

**SEN ÖLÇ** (danışmanın bu makinede kabuğu yok, ölçemedi):
Kapıların gerçekten geçtiği · `pnpm install`ın temiz bittiği · iki ESLint kuralının
davranışı · coverage eşiklerinin tuttuğu. Dosyanın var olması, çalıştığını göstermez.

════════ 3 · YAPILACAKLAR ════════

**1. `CLAUDE.md`'de geri giden 11 satırı düzelt.**
§2.1'e dokunma, o doğru. Dosyayı bütün olarak yeniden yazma; **satır satır düzelt.**

| Yer                    | Şu an (yanlış)                                        | Doğrusu                                                  |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Belge seti tablosu     | `9 faz: kapsam, kabul kriterleri, dokunulan paketler` | `6 faz, 18 alt görev: kapsam, kabul kriterleri`          |
| §3.2                   | `` `docs/SPEC.md` §2'de yazılıdır ``                  | `` `docs/SPEC.md` §2.2'de yazılıdır ``                   |
| §4 giriş notu          | `Formüller ve katsayılar `docs/SPEC.md` §4'te.`       | `Formüller, ağırlıklar ve eşikler `docs/SPEC.md` §5'te.` |
| §5, AI ücretsiz kademe | `Faz 7'de hesap üzerinden **ölçülecek**`              | `Faz 5.3'te hesap üzerinden **ölçülecek**`               |
| §8.2 madde 1           | `(Faz 2)`                                             | `(Faz 2.2)`                                              |
| §8.2 madde 2           | `(Faz 2)`                                             | `(Faz 2.3)`                                              |
| §8.2 madde 3           | `(Faz 7)`                                             | `(Faz 5.3)`                                              |
| §8.2 madde 4           | `(Faz 3 · 7)`                                         | `(Faz 3.3 · 5.3)`                                        |
| §8.2 madde 5           | `(Faz 3)`                                             | `(Faz 3.1)`                                              |
| §8.2 madde 6           | `(Faz 5)`                                             | `(Faz 4.2)`                                              |
| §8.3 ilk madde         | `- 9 fazın tamamı kabul kriterleriyle kapanmış`       | `- 6 fazın tamamı kabul kriterleriyle kapanmış`          |

Bitince `grep -n "9 faz" CLAUDE.md` çalıştır; **boş dönmeli.** Çıktıyı rapora koy.

**2. Kapıları koş, ham çıktıları sakla.**
`pnpm install` → `typecheck` → `lint` → `test` → `build` → `format:check`
Soğuk koş. Her birinin kapsam satırını (`[scope:...] files=N rules=N`) ve turbo
çıktısındaki `Cached:` satırını kaydet. Geçmeyen varsa **düzelt**, gizleme.

**3. İki kapıyı kanıtla — iddia etme, göster.**
a) `.env.example`'a geçici `NODE_ENV=development` ekle → `pnpm lint` **exit 1**
vermeli → satırı geri al → tekrar geçtiğini göster → `git status` temiz olmalı.
b) Bilinen ihlal içeren bir dosyayla iki ESLint kuralının öttüğünü, temiz dosyada
sustuğunu göster. `tools/eslint-local-rules/config.test.mjs` bunu yapıyorsa
çıktısını al; yapmıyorsa tamamla.

**4. `pnpm-workspace.yaml`'daki ölü ayarı kapat.**
`minimumReleaseAgeExclude` var ama `minimumReleaseAge` hiçbir yerde yok — istisna
listesi hiçbir şey yapmıyor. Ya ayarı ekle ya istisnayı kaldır; **hangisini neden
yaptığını yaz.**

**5. `docs/reports/1.1-iskelet.md` yaz.**
`CLAUDE.md` §2.1 bu dosyayı kaynak gösteriyor ama dosya yok. İçeriği:

- **ÇIKTI** — oluşan/değişen dosyalar · koşturulan komutlar ve **ham** çıkış satırları ·
  kapsam satırları · koşturulmayan varsa "koşturulmadı"
- **SÜRÜM TABLOSU** — paket · registry'deki en yeni · seçilen · fark varsa gerekçe.
  Tabloyu `1.1-version-measurements.json`'dan **türet**, hatırlayarak yazma.
- **KIRILANLAR** — `msgpackr-extract` izin listesi ve Zod `URL` tipi için
  `types: ["node"]` bulguları dahil
- **KARARIN GEREKİYOR** — varsa

**6. `PROJECT_MEMORY.md` ve `docs/CHECKPOINT.md`'yi güncelle.**

- ANLIK DURUM'u gerçek duruma getir (faz, alt görev, dal, taban commit, kapı durumu —
  hepsi ölçümden).
- **SAPMA-004'ü ekle:** TypeScript en yeni `7.0.2`, seçilen `~6.0.3`; gerekçe
  `typescript-eslint@8.70.0` peer aralığı `>=4.8.4 <6.1.0`. Tarih 20.09.2026.
  (`CLAUDE.md` §2.1 bu kayda atıf veriyor ama kütükte yok.)
- Kurulumdaki iki bulguyu uygun kütüğe yaz; borç bırakıyorsan **hedef alt görevini** de yaz.
- CHECKPOINT'teki `olculmemis` listesinden kapananları çıkar; Docker daemon sürümü
  hâlâ ölçülemedi, o kalsın.

**7. Commit.**
Dal `develop`. `git add -A`, sonra mesajı bir dosyaya yaz ve `git commit -F <dosya>`
ile at (Türkçe metni kabuk argümanı olarak geçirme).
Mesaj: `chore(repo): monorepo iskeleti, kapılar ve ölçülmüş sürüm bloğu`
Ardından `git log --oneline` ve `git branch --show-current` çıktısını rapora koy.

════════ 4 · KURALLAR ════════

- **Bir dosyayı değiştirmeden önce o anki hâlini oku.** Önceki oturum `CLAUDE.md`'yi
  bayat bir kopyadan yazdı ve 11 satır geriye döndü. Bellekteki kopya kaynak değildir.
- **Atıfı, hedefi yazıldıktan sonra ver.** §2.1 iki dosyaya atıf verdi; biri yoktu.
- **Sayıyı ölçümden kopyala.** Ölçmediğin alana "ÖLÇÜLECEK" yaz, tahmin yazma.
- **Kapsam dışına çıkma.** Bu turda yok: `arch-check`, `money-check`,
  `freshness-check`, `i18n-check`, `contract-check`, GitHub Actions,
  `docker-compose.yml` (hepsi 1.2) · ürün kodu · veritabanı şeması (1.3) ·
  yeni bağımlılık (gerekirse **sor**).
- İyi bir fikrin varsa `docs/SPEC.md` §10'a yaz, yapma.
- Emin değilsen tahmin etme, sor.

════════ 5 · KABUL KRİTERLERİ ════════

☐ `grep -n "9 faz" CLAUDE.md` boş dönüyor
☐ Beş kapı da geçiyor ve kapsamını basıyor; ham satırlar raporda
☐ `.env.example`'a `NODE_ENV` eklenince exit 1 — gösterildi ve geri alındı
☐ İki ESLint kuralı ihlalde ötüyor, temiz kodda susuyor — çıktısı raporda
☐ `minimumReleaseAge` meselesi kapandı, gerekçesi yazıldı
☐ `docs/reports/1.1-iskelet.md` var ve sürüm tablosunu içeriyor
☐ `PROJECT_MEMORY.md` güncel, SAPMA-004 kütükte
☐ `docs/CHECKPOINT.md` güncel
☐ `git log --oneline` tek commit gösteriyor, dal `develop`
☐ `git status --porcelain` boş

Bitince DUR. 1.2'ye geçme. Kapanış mesajında: kalan limit, biten maddeler,
yapılmayan madde varsa hangisi ve neden.
