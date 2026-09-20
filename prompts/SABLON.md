# Prompt şablonu

> Bu klasörün kuralı: **her alt görevin bir promptu, o promptun bir raporu var.**
> Prompt `prompts/faz-X.Y.md`, raporu `docs/reports/X.Y-<slug>.md`. İkisi eşleşir.
> Yarıda kesilen bir alt görevin devamı `prompts/faz-X.Y-devam.md` olur.
>
> Promptları danışman (Cowork oturumu) yazar, uygulayıcı (**GPT-6 Astra · High**) koşar.
> Alt ajan gerekirse **GPT 5.6 · Luna · effort = Max**.

---

## Sabit iskelet

```
GÖREV — Faz X.Y "<ad>". <tek cümle sınır>
Proje kökü: C:\Users\fxrkqn\Documents\amisostock
Yeni kapsam ekleme. Maddeleri bitir, commit at, dur.

════════ 0 · ÖNCE LİMİTİ GÖR, SIRAYI ONA GÖRE KUR ════════
Kalan günlük/5 saatlik limiti görüntüle ve rakamla söyle.
Sıra: 1 → 2 → ... → N (commit, her hâlükârda).
Limit yetmeyecekse: <kritik maddeler> ve commit'i bitir, kalanı CHECKPOINT'e yaz.
Commitsiz kapanma.
Alt ajan açarsan: GPT 5.6 · Luna · effort = Max.

════════ 1 · OKU ════════
CLAUDE.md (ilgili bölümler) · docs/ROADMAP.md (bu alt görev) · docs/CHECKPOINT.md ·
PROJECT_MEMORY.md · docs/SPEC.md (atıf verilen bölümler)
Kabuk: git status --porcelain · git log --oneline -5 · git branch --show-current

════════ 2 · TABAN ════════
DOĞRULANMIŞ  → danışmanın kendi ölçtüğü; komut/araç adıyla
SEN ÖLÇ      → danışmanın ölçemediği her şey
AĞAÇ KİRLİYSE → neden kirli ve o kirin KİMİN kapsamı olduğu

════════ 3 · YAPILACAKLAR ════════
Numaralı, her madde tek bir iş. Ölçülebilir bir bitiş cümlesiyle.

════════ 4 · KURALLAR ════════
Kısa, emir kipinde. Kapsam dışı olanlar adıyla sayılır.

════════ 5 · KABUL KRİTERLERİ ════════
☐ Her biri bir komut çıktısıyla kanıtlanabilir madde

Bitince DUR. Kapanış mesajında: kalan limit, biten maddeler, yapılmayan varsa neden.
```

---

## Değişmeyen kurallar (her prompta girer)

| Kural                                                              | Neden                               |
| ------------------------------------------------------------------ | ----------------------------------- |
| Bir dosyayı değiştirmeden önce **o anki hâlini oku**               | Bellekteki kopya bayat olabilir     |
| **Atıfı, hedefi yazıldıktan sonra ver**                            | Var olmayan dosyaya atıf = ölü atıf |
| **Sayıyı ölçümden kopyala**, ölçülmemişe `ÖLÇÜLECEK` yaz           | DZ-01                               |
| **Her kapı kapsamını bassın** — "0 bulundu" ≠ "bakılmadı"          | DZ-03                               |
| **Nöbetçi iki yönlü sınanır** — ihlalde öter, temizde susar        | DZ-12                               |
| **Kapının VAR olması KOŞTUĞUNU göstermez** — CI'da maskesiz `run:` | DZ-11                               |
| Türkçe metni kabuk argümanı olarak geçirme; dosyaya yaz            | DZ-08                               |
| Emin değilsen tahmin etme, **sor**                                 | K16                                 |

## Raporun sabit bölümleri

```
## ÇIKTI            değişen dosyalar · komutlar ve HAM çıkış satırları · kapsam satırları
                    · koşturulmayan varsa "koşturulmadı"
## KIRILANLAR       ne kırıldı, neden, nasıl çözüldü (hiçbir şey kırılmadıysa onu yaz)
## KARARIN GEREKİYOR  belirsiz kalan her madde
```

## Klasör düzeni

```
prompts/
├── SABLON.md              bu dosya
├── faz-1.1.md             ilk tur
├── faz-1.1-devam.md       yarıda kesilen turun devamı
└── faz-X.Y.md             …
docs/reports/
├── X.Y-<slug>.md          o alt görevin raporu
└── X.Y-*.log / *.json     ham ölçümler
```
