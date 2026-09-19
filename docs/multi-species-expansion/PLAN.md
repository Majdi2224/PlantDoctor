# Multi-species expansion: Lebanon orchard crops

## Goal

Cover the tree/orchard crops actually grown in Lebanon, so Lebanese farmers can use the app, not
just the four species PlantVillage happens to include alongside tomato.

## Which crops, and why

Lebanon's major fruit tree/orchard crops (confirmed via FAO/trade.gov agricultural sector
sources, not assumed): **citrus** (orange, lemon - major), **apple** (Chouf/mountain regions),
**grape** (Bekaa Valley, wine and table), **olive** (north Lebanon and the Shouf - one of the most
culturally/economically significant crops), **banana** (south coast), **stone fruit** - apricot
(northern Bekaa), **peach/nectarine** (growing since the 90s), and **cherry** (Lebanon is a major
Mediterranean sweet cherry producer). Also **fig** (grown in the south).

## Dataset research (verified directly via the Kaggle API, not just search results)

Every dataset below was inspected with `kaggle datasets files <slug>` to confirm its *actual*
folder structure before writing any notebook code against it - search-result summaries turned out
to be wrong or incomplete for more than one of these (see notes).

| Species | Source | Classes | Structure (verified) |
|---|---|---|---|
| Tomato | `abdallahalidev/plantvillage-dataset` | 10 (healthy + 9 diseases) | flat, already in production |
| Apple | same | 4 (healthy, scab, black rot, cedar apple rust) | flat, already in production |
| Cherry | same | 2 (healthy, powdery mildew) | flat, already in production |
| Peach | same | 2 (healthy, bacterial spot) | flat, already in production |
| Grape | same | 4 (healthy, black rot, esca/black measles, leaf blight) | flat - **free addition**, same dataset already attached |
| Olive | `habibulbasher01644/olive-leaf-image-dataset` | 3 (Healthy, aculus_olearius/bud mite, olive_peacock_spot) | `dataset/{train,test}/<class>` - pre-split, real field data (~3,400 images, Turkey) |
| Banana | `shifatearman/bananalsd` | 4 (healthy, cordana, pestalotiopsis, sigatoka) | `BananaLSD/{OriginalSet,AugmentedSet}/<class>` - use OriginalSet only, ~937 real images |
| Citrus | `dtrilsbeek/citrus-leaves-prepared` | 4 (healthy, blackspot, canker, greening) | `citrus_leaves_prepared/{train,validation}/<class>` - pre-split |
| Fig | `farziahossain/fig-leaf-original-dataset` | 2 (healthy, infected - **not** disease-specific) | flat, no split, ~1,942 images |
| Apricot | **none found** | - | Searched specifically; no clean labeled Kaggle dataset exists yet. Gap, not solved. |

**Rejected/superseded during research** (kept here so nobody re-discovers the same dead end):
- `jonathansilva2020/dataset-for-classification-of-citrus-diseases` - only 2 classes
  (black-spot, citrus-canker), **no healthy class at all**. A search-result summary claimed it
  also had greening/melanose/healthy - that was wrong; verified via the API. Would have made the
  citrus branch unable to ever say "healthy." Replaced by `dtrilsbeek/citrus-leaves-prepared`,
  which genuinely has all 4 classes including healthy.
- PlantVillage's own `Orange___Haunglongbing` class - real, but only 1 class with **no healthy
  Orange class either** (a known PlantVillage gap). Superseded by the same
  `dtrilsbeek/citrus-leaves-prepared` dataset, which is strictly better for citrus coverage - not
  included separately to avoid two different "citrus greening" sources with inconsistent labels.
- `oarcanjomiguel/citrus-greening` - only greening + healthy (2 classes), narrower than
  `dtrilsbeek/citrus-leaves-prepared`'s 4. Not needed once the better source was found.

**Total: 35 classes across 9 species.**

## Real design problem found and fixed (before adding any new species)

The old `remedies.js` matched on a single global keyword table (`'bacterial'` -> tomato's
bacterial spot entry, `'healthy'` -> one shared entry). That breaks immediately with more than one
species, since disease names collide (Peach also has `Bacterial_spot`; every species has its own
`healthy` class with different care advice - dormant-spray timing for stone fruit vs. sanitation
for orchard trees vs. annual-vegetable mulching). Fixed by scoping the keyword table per species,
parsed from the label's `Species___Disease` structure that PlantVillage (and our own
`metadata.json`) already uses - see `remedies.js` and the collision-regression tests in
`remedies.test.js`, including one that verifies every species' "healthy" entry actually has
distinct, species-appropriate advice rather than a shared generic string.

## Data engineering: combining 5 different dataset conventions

Each of the 5 sources has a different folder layout (PlantVillage's flat `Species___Disease`
siblings; Olive's and Citrus's own train/test-or-validation splits; Banana's Original vs.
pre-augmented copies; Fig's no split at all). Rather than teaching the training pipeline five
conventions, `notebooks/train_lebanon_orchard_model_kaggle.ipynb` symlinks every class from every
source into one common `/kaggle/working/combined_data/<Species>___<Disease>/` directory first
(merging any existing train/test/validation split back into one pool, since we apply our own
20% validation split afterward, consistently across all 9 species) - then the rest of the
pipeline (dataset building, model, training, export) is byte-for-byte identical to the earlier
tomato and multi-species notebooks. That reuse is deliberate: every fix already made there
(fast directory discovery, the double-normalization bug, the clean inference-only export, the
local TF.js conversion steps) applies here unchanged, with nothing new to debug on the Kaggle
side.

## Status

- [x] Identified Lebanon's actual major tree/orchard crops from agricultural sector sources
      (not assumed).
- [x] Found and **verified via the Kaggle API** (not just search summaries) real datasets for
      apple/cherry/peach/grape (PlantVillage) and olive/banana/citrus/fig (four separate
      datasets) - exact folder structures confirmed, not guessed.
- [x] Restructured `assets/remedies.json` with real, researched home + market remedies for all
      17 new classes across grape/olive/banana/citrus/fig (tree/vine-specific: mancozeb + mummy
      removal for grape black rot, no-cure trunk-disease framing for esca, copper timing for
      olive peacock spot and citrus canker/black spot, honest no-cure/vector-control framing for
      citrus greening like the existing tomato viral diseases, generic-but-honest framing for
      fig's non-specific "infected" class).
- [x] Extended `remedies.js`'s species-aware matching to all 9 species; added collision tests
      (including a same-cause-text check that would catch a copy-pasted "healthy" entry).
- [x] Created `notebooks/train_lebanon_orchard_model_kaggle.ipynb` (35 classes, 5 combined
      dataset sources).
- [x] **Run the notebook on Kaggle** (`majdizeinedeen/multi-species-model-disease`, completed
      2026-09-18) - 36,831 combined images across 35 classes.
- [x] Convert the downloaded `model.h5` locally and install into `public/model/`.
- [x] Checked **per-class** accuracy via the notebook's own held-out validation split (20%,
      seed=123, never seen during training - no leakage): 96.0% overall. As expected, the
      smaller non-PlantVillage sources lag: `Citrus___black_spot` 0.71 (31 val images),
      `Citrus___healthy` 0.79 (14 val images), `Citrus___canker` 0.80 (30 val images),
      `Banana___pestalotiopsis` 0.86 (29 val images). One PlantVillage class also came in low -
      `Tomato___Early_blight` 0.73 (198 val images) - worth another look since it has a normal
      sample size, unlike the small-dataset species above. Everything else is 0.91-1.00.
- [x] Update `CLAUDE.md` status now that the 35-class model is deployed.

## Known gaps / honest limitations

- **Apricot**: no usable dataset found despite being one of Lebanon's named crops (northern
  Bekaa). Worth another look later, or as a candidate for manually collecting/labeling a small
  set if this matters enough.
- **Fig**: the only available dataset is a generic healthy/infected binary, not a specific
  disease name - `remedies.json`'s `fig_infected` entry is written honestly around that
  limitation (general fungal-leaf guidance + "get a local diagnosis" rather than pretending to
  identify a specific fig disease it can't actually distinguish).
- **Small per-class counts**: Olive (~3,400 images / 3 classes), Banana (~937 images / 4
  classes), and Fig (~1,942 images / 2 classes) are all much smaller than PlantVillage's tomato
  class average - expect these branches to be less accurate than tomato/apple until/unless a
  larger dataset is found for them.
