# PlantDoctor

Take a photo of a plant, get a real on-device diagnosis (healthy or a
specific disease) plus an easy, household-item home remedy for the fix.
Tomato-only for now; other plants and tree-disease detection are a later
phase (see Roadmap).

## Status

- **Phase 0-4 done:** camera capture, real on-device TF.js inference, and a
  home-remedy lookup are wired up end-to-end and working. `public/model/`
  now holds the full 10-class tomato model (healthy + 9 diseases), trained
  via `notebooks/train_tomato_model_kaggle.ipynb` on Kaggle's free GPU and
  converted to TF.js locally (see that notebook for why conversion happens
  locally, not on Kaggle).
- **Training notebooks:** `train_tomato_model_kaggle.ipynb` (Kaggle, the one
  actually used) and `train_tomato_model.ipynb` (Colab, kept as a fallback,
  same fixes applied but not run) both export an inference-only model with
  no in-graph preprocessing/augmentation - `App.js` normalizes pixels to
  `[-1, 1]` itself, so the exported model must take that already-normalized
  input directly. If retraining, do not add a preprocessing layer back into
  the exported model.

## Tech stack & key decisions

- **Expo (SDK 51) + React Native, shipped as a web app** (`react-native-web`),
  not a native build. Run with `npm run web`. No Expo dev-client, no
  prebuild/eject needed.
- **Inference: plain `@tensorflow/tfjs` running in the browser** (WebGL
  backend, auto-registered). Not `tfjs-react-native` - that's for native
  iOS/Android and wasn't needed since the target is web.
  - Because of this, disease classification (`classifyImage` in `App.js`)
    only works on the web target - it uses `window.Image` + canvas to read
    pixels into a tensor. `npm run android` / `npm run ios` will still open
    the app shell, but classification will throw there.
- **Model format:** TF.js *layers* model (`tf.loadLayersModel`, not
  `loadGraphModel` - check with `grep '"class_name"' public/model/model.json`
  if unsure; Keras `Sequential`/`Model` exports are layers models).

## Model contract

The app fetches the model at runtime from `public/model/` (served at
`/model/...` by Expo's web dev server / static export - this is Expo's
convention for a `public/` folder, no config needed):

- `public/model/model.json` + `public/model/weights.bin` - the TF.js layers model.
- `public/model/metadata.json` - must contain a `labels` array (`["healthy", "Early_bright", ...]`), input images are resized to `imageSize` (224) and normalized to `[-1, 1]` (`pixel/127.5 - 1`) before inference - see `classifyImage` in `App.js`.

**Swapping in a new/retrained model is a drop-in replacement:** just replace
the three files in `public/model/` with new ones in the same format. The app
reads labels from `metadata.json` generically (`remedies.js`'s `getRemedy`
matches on keywords in the label string, e.g. "early", "mosaic", "yellow" -
see `KEYWORD_TO_KEY` in `remedies.js`), so it doesn't need code changes for
new/reordered classes as long as the label text contains a recognizable
keyword.

## Remedy data

`assets/remedies.json` - one entry per species-prefixed disease key
(`tomato_early_blight`, `apple_scab`, `cherry_powdery_mildew`,
`peach_bacterial_spot`, etc. - see the file for the full list, plus an
`unknown` fallback), each with a plain-language `cause` and two remedy
fields: `homeRemedy` (a real household/DIY recipe - baking soda + oil + soap
sprays, insecticidal soap, pruning/airflow, sanitation) and `marketRemedy`
(real commercial products by active ingredient - copper fungicide,
chlorothalonil, myclobutanil, neem oil, Bacillus subtilis biofungicides,
systemic insecticides for virus vectors, etc.). Viral diseases
(`tomato_mosaic_virus`, `tomato_yellow_leaf_curl_virus`) have no cure in
either field by design - both are honest about that and focus on
containment/vector control instead of implying a spray can cure a virus.

Keys are species-prefixed (not just `bacterial_spot`) because disease names
collide across species with different remedies - Peach also has a
`Bacterial_spot` class, and every species has its own `healthy` class with
different care advice. `remedies.js`'s `getRemedy(rawLabel)` parses the
label's `Species___Disease` structure (PlantVillage's convention, which our
own `metadata.json` labels always follow) and matches against a
per-species keyword table, so the same disease name resolves to the correct
species' entry. Labels with no species prefix (legacy Teachable Machine
labels like `Early_bright`) fall back to the tomato table, since those older
models were tomato-only.

Run `node remedies.test.js` to sanity-check the label-matching logic after
editing it.

## Retraining the model (full 10-class tomato model)

Already done once (see Status above) via Kaggle + local conversion. To redo it (e.g. more epochs, a different base model, more data):

1. Import `notebooks/train_tomato_model_kaggle.ipynb` into Kaggle (kaggle.com/code > New Notebook > File > Import Notebook). Enable **Settings > Accelerator > GPU T4 x2** - training on a laptop CPU/without a GPU is impractical for this.
2. **Add Input** the `abdallahalidev/plantvillage-dataset` dataset (mirrors the public [PlantVillage dataset](https://github.com/spMohanty/PlantVillage-Dataset), pre-uploaded to Kaggle).
3. Run all cells. It fine-tunes a MobileNetV2 head on the `Tomato___*` classes and saves a plain inference-only Keras model (no augmentation/preprocessing baked in - see the notebook's cell 7 comment for why) plus `metadata.json` to `/kaggle/working/`, zipped as `model_export.zip`.
4. **Save Version > Save & Run All**, then download `model_export.zip` from the Output tab.
5. Convert **locally** (not on Kaggle - its pre-installed `tensorflow`/`tf_keras`/`tensorflow_decision_forests` versions fight the `tensorflowjs` pip package no matter how it's installed there). From the unzipped folder in PowerShell:
   ```powershell
   python -m venv tfjs_env
   tfjs_env\Scripts\activate
   pip install tensorflowjs tf_keras
   ```
   Then run a small Python script that: sets `os.environ["TF_USE_LEGACY_KERAS"] = "1"` before importing TensorFlow (tensorflowjs's H5 converter only understands Keras 2's format, not the Keras 3 that recent TensorFlow bundles by default), loads `model.h5`, and calls `tensorflowjs.converters.save_keras_model(model, "tfjs_model")`. If the H5 file itself was written by Keras 3 and won't load under forced Keras 2 (an `Unrecognized keyword arguments: ['batch_shape']` error), extract the raw weights with plain Keras 3 (`model.get_weights()` -> `np.savez`), rebuild the identical architecture under `TF_USE_LEGACY_KERAS=1`, and `set_weights()` before saving - weights are version-agnostic even when the two Keras major versions can't read each other's model files.
6. Copy `metadata.json` into the resulting `tfjs_model/` folder, then replace everything in `public/model/` with those files (`model.json`, `group1-shard*.bin`, `metadata.json`).
7. Run the app (`npm run web`) and spot-check a few images per class from `C:\Users\dell\Desktop\testing\` to sanity-check accuracy.

## Roadmap

- **In progress:** Lebanon orchard expansion - tomato, apple, cherry, peach,
  grape, olive, banana, citrus, and fig (35 classes, 9 species) - see
  `docs/multi-species-expansion/PLAN.md` for the full research trail
  (verified dataset sources, rejected/superseded options, known gaps like
  apricot having no usable dataset yet).
  `notebooks/train_lebanon_orchard_model_kaggle.ipynb` is ready to run
  (combines PlantVillage with 4 additional verified Kaggle datasets); the
  remedies data/matching (`assets/remedies.json`, `remedies.js`) is already
  updated for all 35 classes. `public/model/` still holds the 10-class
  tomato-only model until that notebook is actually run and converted.
  `notebooks/train_multi_species_model_kaggle.ipynb` (tomato+apple+cherry+peach
  only, PlantVillage-only) is a smaller intermediate fallback if the
  4-extra-dataset version runs into trouble.
- Apricot (no usable dataset found yet - see PLAN.md).
- Tree-disease detection for species not covered by any of the above
  (separate model/flow, later).
