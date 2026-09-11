# PlantDoctor

Take a photo of a plant, get a real on-device diagnosis (healthy or a
specific disease) plus an easy, household-item home remedy for the fix.
Tomato-only for now; other plants and tree-disease detection are a later
phase (see Roadmap).

## Status

- **Phase 0-2 done:** camera capture, real on-device TF.js inference, and a
  home-remedy lookup are wired up end-to-end and working.
- **Model is still small-scope:** the bundled model only knows 2 classes
  (`healthy` vs `Early_bright`/Early Blight) because that's all the local
  training data ever covered. See "Retraining the model" below to upgrade it
  to the full 10-class tomato model.
- **Phase 3 done, Phase 4 pending:** `notebooks/train_tomato_model.ipynb`
  is ready to run on Colab. Nobody has run it yet, so `public/model/` is
  still the small 2-class model - run the notebook and follow "Retraining
  the model" below to finish Phase 4.

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

`assets/remedies.json` - one entry per canonical disease key (`early_blight`,
`late_blight`, `bacterial_spot`, `septoria_leaf_spot`, `leaf_mold`,
`spider_mites`, `target_spot`, `mosaic_virus`, `yellow_leaf_curl_virus`,
`healthy`, plus an `unknown` fallback), each with a plain-language `cause`
and a `fix` written around common household/organic remedies (baking soda +
water + soap sprays, pruning/airflow, etc.) rather than commercial
pesticides. `remedies.js`'s `getRemedy(rawLabel)` normalizes whatever label
string the model returns to one of these keys.

Run `node remedies.test.js` to sanity-check the label-matching logic after
editing it.

## Retraining the model (full 10-class tomato model)

The current model only knows 2 classes because `dataset/train/` on disk only
ever had Early Blight images. To get the full 10-class model (matching
`C:\Users\dell\Desktop\testing`'s healthy + 9-disease tomato set):

1. Open `notebooks/train_tomato_model.ipynb` in Google Colab (**Runtime > Change runtime type > GPU** - training on a laptop CPU is impractical for this).
2. Run all cells. It sparse-clones the `Tomato___*` classes from the public [PlantVillage dataset](https://github.com/spMohanty/PlantVillage-Dataset), fine-tunes a MobileNetV2 head, and converts the result to TF.js format.
3. Download the notebook's output `model.json`, `weights.bin` (or sharded `group1-shard*.bin`), and `metadata.json`.
4. Replace the files in `public/model/` with them.
5. Run the app (`npm run web`) and spot-check a few images per class from `C:\Users\dell\Desktop\testing\` to sanity-check accuracy.

## Roadmap

- Full 10-class tomato model (Phase 3/4 above).
- Other plant species.
- Tree-disease detection (separate model/flow, later).
