# libheif (WebAssembly)

`libheif-bundle.mjs` is the ES-module build of [libheif](https://github.com/strukturag/libheif) with
[libde265](https://github.com/strukturag/libde265), from the npm package
[libheif-js](https://github.com/catdad-experiments/libheif-js) **1.23.5**, unchanged.

License: **GNU LGPL v3** (see `LICENSE`). LionPhotos loads it as a separate, unmodified file, so it can
be replaced by any other build of the same version.

Used only by the thumbnail page to decode HEIC/HEIF photos (`decoders/heicDecoder.js`).
