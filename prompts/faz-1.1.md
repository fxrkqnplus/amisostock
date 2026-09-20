YENİ OTURUM — önceki oturumun bağlamı YOK, sıfırdan başlıyorsun.
Proje kökü: C:\Users\fxrkqn\Documents\amisostock

ALT GÖREV: 1.1 — İskelet.
Tek cümle sınır: Monorepo iskeletini, sürüm bloğunu ÖLÇEREK ve ESLint/ortam kapılarını
kurarak aç; hiçbir ürün kodu yazma.

════════════════════════════════════════
ADIM 0 — OKU (bu sırayla, başka bir şey okumadan)
════════════════════════════════════════

1. CLAUDE.md → otomatik yüklenir. §1.2 (K1–K18), §1.3, §2.1, §2.2, §2.4, §9
2. docs/CHECKPOINT.md → makine durumu
3. PROJECT_MEMORY.md → ANLIK DURUM + SAPMA kütüğü
4. docs/ROADMAP.md → "Faz 1 — Temel" bölümü
5. docs/SPEC.md → §9.1, §9.2 (test katmanları ve nöbetçiler)
6. KARARLAR.md → A, D, K bölümleri
7. Kabuk: `pwd`, `ls`, `git status` (depo var mı yok mu ÖLÇ)

════════════════════════════════════════
TABAN
════════════════════════════════════════
DOĞRULANMIŞ (danışman ölçtü):
• Proje klasörü 19.09.2026 itibarıyla BOŞTU (device_list_dir → entries: []).
Sonrasına yalnız şu belgeler yazıldı: CLAUDE.md, KARARLAR.md, PROJECT_MEMORY.md,
docs/SPEC.md, docs/ROADMAP.md, docs/CHECKPOINT.md, prompt-faz-1.1.md
• Git deposu YOK, hiçbir bağımlılık kurulu DEĞİL, hiçbir kapı mevcut DEĞİL.

SEN YENİDEN ÖLÇ (bunlar iddia, kaynak değil — DZ-01):
• CLAUDE.md §2.1'deki TÜM sürümler. Başka bir projeden devralındı, bu proje için
HİÇ doğrulanmadı. Bu alt görevin asıl işi budur.
• Bu makinedeki node / pnpm / docker sürümleri. Emsal proje Node 24.19.0 + pnpm 11 +
PowerShell 7 + Docker Desktop/WSL2 diyor; DOĞRU OLDUĞUNU VARSAYMA, `node -v`,
`pnpm -v`, `docker version --format '{{.Server.Version}}'` ile ölç.

════════════════════════════════════════
NEDEN BU ALT GÖREV VAR — ölçüldü
════════════════════════════════════════
Depo boş. Sürüm bloğu yazılı ama doğrulanmamış; bu hâliyle kurulursa peer aralığı
ihlalleri ve derleme kırılmaları kurulum gününde değil, üçüncü fazda ortaya çıkar.
Kapılar (K5 metin, K6 yol, ortam değişkeni) ilk ürün kodundan ÖNCE kurulmazsa,
yakalayacakları hata çoktan oluşmuş olur (DZ-12).

════════════════════════════════════════
KAPSAM — bunlar ve yalnızca bunlar (K15)
════════════════════════════════════════

1. Git: `git init`, `develop` dalı, `.gitignore` (`.env*` ama `.env.example` hariç,
   `node_modules/`, `dist/`, `.turbo/`, `coverage/`, `/data/cache/`, `*.dump`,
   `*.sql.gz`, `*.bak`, `*.yedek`, `prompt-*.md`), `.editorconfig`, `.npmrc`, `.nvmrc`.
   İlk commit'e belgeler dahil.

2. Çalışma alanı: kök `package.json` (private, type: module, packageManager alanı),
   `pnpm-workspace.yaml`, `turbo.json`, `scripts/check-node-version.mjs` +
   kökte `preinstall` kancası.
   Paketler (hepsi iskelet, yalnız package.json + tsconfig + src/index.ts):
   apps/web · apps/api · apps/worker
   packages/shared · packages/data · packages/engine · packages/ai · packages/db · packages/ui

3. ⚠️ SÜRÜM DOĞRULAMA — bu alt görevin çekirdeği.
   CLAUDE.md §2.1'deki her paketi TEK TEK `npm view <paket> version` ile ölç.
   Raporda bir tablo üret: paket · kayıtlı en yeni sürüm · SEÇİLEN sürüm · fark
   varsa GEREKÇE. Sonra CLAUDE.md §2.1 bloğunu bu ÖLÇÜM ÇIKTISINDAN yeniden yaz ve
   başına ölçüm tarihini koy. Tahmin, hatırlama veya "muhtemelen" yasak (DZ-01).
   TypeScript kuralı: `~` ile pinlenir, `^` YASAKTIR (peer aralığı taşması).
   Bir sürüm uyumsuzluk yaratıyorsa: düşür, gerekçesini yaz, PROJECT_MEMORY'ye
   SAPMA olarak ekle.

4. TypeScript: `tsconfig.base.json` + her paketin kendi `tsconfig.json`'ı.
   Her pakette `types` dizisi AÇIKÇA yazılır (TS 6'da varsayılan boştur) +
   `scripts/check-tsconfig-types.mjs` bunu denetler.

5. ESLint flat config + `tools/eslint-local-rules/`:
   • `no-hardcoded-path` → K6: kodda `/api/...`, `/giris` gibi mutlak yol yasak,
   `basePath()` kullanılır
   • `no-bare-jsx-text` → K5: JSX içinde çıplak Türkçe metin yasak, `t()` gerekir
   Her iki kuralın da kendi testi olacak ve test HEM pozitif HEM negatif durumu
   iddia edecek (bilinen ihlalde öter, temiz kodda susar — DZ-12).
   Prettier + `format:check`.

6. Ortam: `.env.example` (CLAUDE.md §2.3'teki liste) + `packages/shared/src/env.ts`
   (Zod şeması, eksik değişkende uygulama açılmaz) + `scripts/check-env-file.mjs`
   (`.env` ve `.env.example` içinde `NODE_ENV` görürse exit 1).

7. Kök `package.json` script'leri: `typecheck` · `lint` · `lint:fix` · `test` ·
   `build` · `format` · `format:check` (+ sonraki alt görevlerin ekleyeceği
   `arch:check` vb. için yer bırak, boş script YAZMA).

════════════════════════════════════════
ÖLÇÜLMÜŞ TUZAKLAR (emsal projede bedeli ödendi)
════════════════════════════════════════
⚠️ `.env` veya `.env.example` içinde `NODE_ENV` → Vite bunu kendi üretim kararına
uyguluyor ve React'in GELİŞTİRME sürümü üretim paketine giriyor. Emsalde ölçüldü:
228 kB → 429 kB. Bu yüzden 6. maddedeki kapı var; kapıyı yazıp değişkeni de
koymak, kendi kapını kırmaktır.
⚠️ TypeScript'e `^` yazmak peer aralığının dışına taşıyor ve tip-farkında lint
kurallarını kırıyor. `~` kullan.
⚠️ TS 6'da `types: []` varsayılanı BOŞ. Açıkça yazmazsan `node` tipleri gelmez ve
hata üçüncü fazda anlaşılmaz bir yerde çıkar.
⚠️ Turbo önbelleği "başarılı" diyebilir ama ölçtüğün şey eski koşu olabilir. Ölçüm
yaparken SOĞUK koş ve çıktının `Cached:` satırını rapora yaz (D2).
⚠️ Türkçe metin hiçbir kabuk argümanından geçmez. Markdown, Türkçe içerik ve commit
mesajı `Write`/`Edit` ile yazılır; commit mesajı `git commit -F <dosya>` (DZ-08).
⚠️ Yazılmış bir ayar, yüklendiği ÖLÇÜLENE kadar hiçbir şey yapmayan ayardır.
ESLint kuralının config'e girmiş olması KOŞTUĞUNU göstermez — bilinen bir ihlal
dosyasında öttüğünü göster (DZ-10, DZ-12).
⚠️ `grep -c` satır sayar, eşleşme değil. Çıkış kodunu borusuz oku.

════════════════════════════════════════
YAPMA
════════════════════════════════════════
• Ürün kodu yok. Bileşen, uç nokta, iş mantığı yok.
• Veritabanı şeması yok — o 1.3.
• CI / GitHub Actions yok — o 1.2. `arch-check`, `money-check`, `freshness-check`,
`i18n-check`, `contract-check` de 1.2'de.
• Sahte/örnek veri yok (K18). Paket `index.ts`'leri yalnız tip veya sabit ihraç eder.
• Bağımlılık KURMADAN sürüm yazma; ölçmeden sürüm bloğuna dokunma.
• Kapsamda olmayan bir iyi fikir → `docs/SPEC.md` §10'a yaz, yapma (K15).

════════════════════════════════════════
PROTOKOL VE RAPOR
════════════════════════════════════════
Bitirmeden önce şu sırayla koş ve HER BİRİNİN KAPSAMINI raporla (kaç dosya, kaç
kural): `pnpm install` → `typecheck` → `lint` → `test` → `build` → `format:check`

Raporun (terminale basmadan önce aynısını `docs/reports/1.1-iskelet.md`'ye yaz):

## ÇIKTI

    • Değişen/oluşan dosyaların listesi
    • Koşturulan komutlar ve HAM çıkış satırları (uydurma özet değil)
    • SÜRÜM TABLOSU: paket · en yeni · seçilen · gerekçe
    • Kapıların kapsam satırları
    • Koşturulmayan bir şey varsa "koşturulmadı" diye YAZ (DZ-04)

## KIRILANLAR

    • Ne kırıldı, neden, nasıl çözüldü. Hiçbir şey kırılmadıysa bunu yaz.

## KARARIN GEREKİYOR

    • Kapsam dışına taşan, çelişen veya belirsiz kalan her madde.

Sonra `docs/CHECKPOINT.md` ve `PROJECT_MEMORY.md` ANLIK DURUM bloğunu güncelle,
`git add -A` + `git commit -F <mesaj-dosyası>` (`chore(repo): monorepo iskeleti ve
sürüm doğrulaması`).

KABUL KRİTERLERİ (hepsi ölçümle kanıtlanacak):
✓ `pnpm install` temiz, `preinstall` node sürüm kapısı çalışıyor (yanlış sürümde durduğu gösterildi)
✓ `typecheck` · `lint` · `test` · `build` · `format:check` geçiyor ve kapsam basıyor
✓ İki ESLint kuralı da bilinen ihlalde ÖTÜYOR, temiz kodda SUSUYOR (test çıktısıyla)
✓ `.env.example` içine `NODE_ENV` eklenince kapı exit 1 veriyor (gösterildi, sonra geri alındı)
✓ CLAUDE.md §2.1 bloğu ölçüm çıktısından yeniden yazılmış ve tarihli
✓ `git log` tek commit gösteriyor, `develop` dalında

Emin değilsen tahmin etme, SOR (K16).
Bitince DUR. 1.2'ye geçme.
