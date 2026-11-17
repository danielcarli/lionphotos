# Third-party notices

LionPhotos is under the MIT License (see [LICENSE](LICENSE)). The third-party components bundled with it keep
their own licenses:

- libheif and libde265 (WebAssembly build from libheif-js) — GNU LGPL v3,
  unmodified, in src/platform/thumbs/electron-sandbox/vendor/libheif
  (its LICENSE file is next to it; it can be replaced by another build).
- face-api (Vladimir Mandic) with TensorFlow.js and its face models — MIT,
  in src/platform/faces/electron-sandbox/vendor/face-api.
- COCO-SSD and MobileNet models (TensorFlow.js models) — Apache License 2.0,
  in src/platform/faces/electron-sandbox/vendor/pets.
- ONNX Runtime Web 1.22 (Microsoft) — MIT, unmodified,
  in src/platform/faces/electron-sandbox/vendor/onnxruntime-web.
- TinyCLIP ViT-61M/32 (Microsoft, wkcn/TinyCLIP-ViT-61M-32-Text-29M-LAION400M) — MIT; its image half
  converted to ONNX (int8) and its text half turned into category numbers by tools/models/build.py,
  in models/tinyclip.
- Plus Jakarta Sans and JetBrains Mono fonts — SIL Open Font License 1.1.
