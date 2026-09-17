# Multi-species expansion (Apple, Cherry, Peach)

## Goal

Extend PlantDoctor beyond tomato to cover apple, cherry, and peach - the same PlantVillage
dataset already used for tomato includes all three, so this is a retrain + content task, not
a new pipeline.

## Feasibility (why this works)

- **Same dataset, zero new sourcing work.** `abdallahalidev/plantvillage-dataset` on Kaggle - the
  exact dataset already used and proven for tomato - also contains Apple (4 classes: healthy,
  scab, black rot, cedar apple rust), Cherry (2 classes: healthy, powdery mildew), and Peach
  (2 classes: healthy, bacterial spot). All species' class folders sit as siblings under the
  same `color/` directory, so training on more species is a class-list change, not a new
  download/merge/preprocessing step.
- **Same training pipeline, already debugged.** `notebooks/train_multi_species_model_kaggle.ipynb`
  reuses every fix already made for the tomato notebook (fast directory discovery, the
  double-normalization bug fix, the clean inference-only export). No new failure modes expected
  on the Kaggle side.
- **Same conversion pipeline, already debugged.** The Keras 2 vs. 3 H5 incompatibility, the
  `tensorflow_decision_forests`/`tensorflow_hub` stale-import issue, and the `np.object`
  deprecation were all solved once for the tomato model's `model_export/` scripts
  (`export_weights.py`, `build_keras2.py`, `convert.py`) - the same scripts work unchanged on
  the new model.h5, just with `NUM_CLASSES` read from `metadata.json` instead of hardcoded.
- **Zero app code changes required.** `App.js` reads labels generically from `metadata.json` and
  has no tomato-specific UI copy. The only real code change needed was `remedies.js`'s matching
  logic (see below) - already done.

## Real design problem found and fixed

The old `remedies.js` matched on a single global keyword table (`'bacterial'` -> tomato's
bacterial spot entry, `'healthy'` -> the one shared healthy entry). That breaks the moment a
second species is added: Peach also has a `Bacterial_spot` class, and every species has its own
`healthy` class with different care advice (tree pruning/dormant-spray timing vs. annual-vegetable
watering/mulching). Fixed by scoping the keyword table per species, parsed from the label's
`Species___Disease` structure that PlantVillage (and our own `metadata.json`) already uses -
see `remedies.js` and the cross-species collision tests in `remedies.test.js`.

## Status

- [x] Confirmed dataset coverage (Apple/Cherry/Peach classes + counts) via web search against the
      actual Kaggle dataset.
- [x] Restructured `assets/remedies.json` with species-prefixed keys (`apple_scab`,
      `peach_bacterial_spot`, etc.) and real, researched home + market remedies for all 8 new
      classes (tree-specific: dormant-season copper timing for peach, myclobutanil for apple
      scab/rust, sulfur/potassium bicarbonate for cherry powdery mildew - sourced from extension
      services, not written from memory alone).
- [x] Rewrote `remedies.js`'s matching to be species-aware; added collision-regression tests.
- [x] Created `notebooks/train_multi_species_model_kaggle.ipynb` (18 classes: 10 tomato + 4 apple
      + 2 cherry + 2 peach).
- [ ] **Run the notebook on Kaggle** (GPU + PlantVillage dataset added, Run All) - requires the
      owner's Kaggle session, same as the tomato model.
- [ ] Convert the downloaded `model.h5` locally with the existing `model_export/` scripts.
- [ ] Install into `public/model/`, spot-check a few images per new class, replacing the
      10-class tomato-only model.
- [ ] Update `CLAUDE.md` status once the 18-class model is actually deployed (currently still
      describes the 10-class tomato model as current).

## Notes for whoever runs this next

- Training will take somewhat longer than the tomato-only run (more classes, more images) but
  still fits comfortably in one Kaggle GPU session.
- Expect apple/cherry/peach classes to have noticeably fewer images per class than tomato's
  (PlantVillage's counts are uneven across species) - validation accuracy on the smaller classes
  is worth checking individually, not just as one blended average.
- If accuracy on any one species is weak, the fallback is still per-species remedies data (already
  structured that way) - it doesn't force an all-or-nothing model swap.
