#!/usr/bin/env python3
# ---------------------------------------------------------------------------------------------
#  LionPhotos — Copyright (C) 2026 LionPhotos Team.
#  Created and conceived by Daniel Michelon De Carli.
#  Licensed under the MIT License. See LICENSE in the project root.
# ---------------------------------------------------------------------------------------------
# Builds the two content models LionPhotos can use to tell what a photo shows (album suggestions), once,
# on the developer's machine — the app itself never downloads anything:
#
#   models/tinyclip/   "Fast":     TinyCLIP ViT-61M/32 (Microsoft, MIT), its image half as ONNX (int8)
#   models/siglip2/    "Accurate": SigLIP 2 base patch16 224 (Google, Apache-2.0), its image half (int8)
#
# Next to each: categories.bin — the categories of src/workbench/contrib/albums/contentCategories.js
# turned into numbers by the model's text half (the average of each category's descriptions, normalized),
# and manifest.json (how pictures are prepared, the size of the numbers, how scores are made).
#
#   pip install -r tools/models/requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
#   python3 tools/models/build.py [--only tinyclip|siglip2] [--out models]
# (the CI builds the fast one this way, once per change of this script or of the categories, and every
# installer carries it: .github/workflows/ci.yml, job "models")
#
# The folder `models/` is not in git (big files): the installers are built after this script, and
# tools/models/package.py makes the separate .lionmodel package of the accurate model.
import argparse, json, os, struct, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MODELS = {
    'tinyclip': {
        'hf': 'wkcn/TinyCLIP-ViT-61M-32-Text-29M-LAION400M', 'rev': '94cbbea5c7949cfe7bdafde64bcea5e403f59852', 'kind': 'clip', 'size': 224, 'resize': 'shortest-crop',
        'mean': [0.48145466, 0.4578275, 0.40821073], 'std': [0.26862954, 0.26130258, 0.27577711],
        'name': 'TinyCLIP ViT-61M/32', 'license': 'MIT', 'by': 'Microsoft',
    },
    'siglip2': {
        'hf': 'google/siglip2-base-patch16-224', 'kind': 'siglip', 'size': 224, 'resize': 'squash',
        'mean': [0.5, 0.5, 0.5], 'std': [0.5, 0.5, 0.5],
        'name': 'SigLIP 2 base/16', 'license': 'Apache-2.0', 'by': 'Google',
    },
}
PROMPT = 'a photo of {}.'


def categories():
    js = os.path.join(ROOT, 'src', 'workbench', 'contrib', 'albums', 'contentCategories.js')
    out = subprocess.check_output(['node', '--input-type=module', '-e',
        f"import {{ CATEGORIES, CATEGORIES_VERSION }} from {json.dumps('file://' + js)}; console.log(JSON.stringify({{ version: CATEGORIES_VERSION, list: CATEGORIES }}))"])
    return json.loads(out)


def write_categories(path, vectors):
    """[count][dims] float32, little endian, after an 8-byte header (count, dims as uint32)."""
    n, d = vectors.shape
    with open(path, 'wb') as f:
        f.write(struct.pack('<II', n, d))
        f.write(vectors.astype('<f4').tobytes())


def quantize(src, dst):
    from onnxruntime.quantization import quantize_dynamic, QuantType
    quantize_dynamic(src, dst, weight_type=QuantType.QUInt8, op_types_to_quantize=['MatMul', 'Gemm'])


def build_tinyclip(cfg, cats, out):
    import torch
    from transformers import CLIPModel, CLIPTokenizerFast
    model = CLIPModel.from_pretrained(cfg['hf'], revision=cfg.get('rev')).eval()
    tok = CLIPTokenizerFast.from_pretrained(cfg['hf'], revision=cfg.get('rev'))

    class Vision(torch.nn.Module):
        def __init__(self, m): super().__init__(); self.m = m
        def forward(self, pixel_values):
            v = self.m.get_image_features(pixel_values=pixel_values)
            v = v.pooler_output if hasattr(v, 'pooler_output') else v
            return v / v.norm(dim=-1, keepdim=True)

    raw = os.path.join(out, 'vision.fp32.onnx')
    torch.onnx.export(Vision(model), torch.zeros(1, 3, cfg['size'], cfg['size']), raw, input_names=['pixel_values'], output_names=['embeds'],
                      dynamic_axes={'pixel_values': {0: 'n'}, 'embeds': {0: 'n'}}, opset_version=17, dynamo=False)
    quantize(raw, os.path.join(out, 'vision.onnx'))
    os.remove(raw)
    with torch.no_grad():
        vecs = []
        for c in cats['list']:
            t = tok([PROMPT.format(p) for p in c['prompts']], padding=True, return_tensors='pt')
            e = model.get_text_features(**t)
            e = e.pooler_output if hasattr(e, 'pooler_output') else e
            e = e / e.norm(dim=-1, keepdim=True)
            m = e.mean(0)
            vecs.append((m / m.norm()).numpy())
        scale = float(model.logit_scale.exp())
    import numpy as np
    write_categories(os.path.join(out, 'categories.bin'), np.stack(vecs))
    return {'dims': int(vecs[0].shape[0]), 'scale': scale, 'bias': 0.0, 'score': 'softmax'}


def build_siglip2(cfg, cats, out):
    import torch
    from transformers import AutoModel, AutoTokenizer
    model = AutoModel.from_pretrained(cfg['hf']).eval()
    tok = AutoTokenizer.from_pretrained(cfg['hf'])

    class Vision(torch.nn.Module):
        def __init__(self, m): super().__init__(); self.m = m
        def forward(self, pixel_values):
            v = self.m.get_image_features(pixel_values=pixel_values)
            v = v.pooler_output if hasattr(v, 'pooler_output') else v
            return v / v.norm(dim=-1, keepdim=True)

    raw = os.path.join(out, 'vision.fp32.onnx')
    torch.onnx.export(Vision(model), torch.zeros(1, 3, cfg['size'], cfg['size']), raw, input_names=['pixel_values'], output_names=['embeds'],
                      dynamic_axes={'pixel_values': {0: 'n'}, 'embeds': {0: 'n'}}, opset_version=17, dynamo=False)
    quantize(raw, os.path.join(out, 'vision.onnx'))
    os.remove(raw)
    with torch.no_grad():
        vecs = []
        for c in cats['list']:
            # SigLIP was trained on lower-case text padded to 64 tokens
            t = tok([PROMPT.format(p).lower() for p in c['prompts']], padding='max_length', max_length=64, truncation=True, return_tensors='pt')
            e = model.get_text_features(input_ids=t['input_ids'])
            e = e.pooler_output if hasattr(e, 'pooler_output') else e
            e = e / e.norm(dim=-1, keepdim=True)
            m = e.mean(0)
            vecs.append((m / m.norm()).numpy())
        scale = float(model.logit_scale.exp())
        bias = float(model.logit_bias)
    import numpy as np
    write_categories(os.path.join(out, 'categories.bin'), np.stack(vecs))
    return {'dims': int(vecs[0].shape[0]), 'scale': scale, 'bias': bias, 'score': 'sigmoid'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', choices=list(MODELS))
    ap.add_argument('--out', default=os.path.join(ROOT, 'models'))
    a = ap.parse_args()
    cats = categories()
    for key, cfg in MODELS.items():
        if a.only and a.only != key:
            continue
        out = os.path.join(a.out, key)
        os.makedirs(out, exist_ok=True)
        t0 = time.time()
        info = (build_tinyclip if key == 'tinyclip' else build_siglip2)(cfg, cats, out)
        manifest = {
            'id': key, 'name': cfg['name'], 'by': cfg['by'], 'license': cfg['license'], 'source': f"https://huggingface.co/{cfg['hf']}",
            'input': {'size': cfg['size'], 'resize': cfg['resize'], 'mean': cfg['mean'], 'std': cfg['std']},
            'categories': {'version': cats['version'], 'count': len(cats['list']), 'ids': [c['id'] for c in cats['list']]},
            **info,
        }
        with open(os.path.join(out, 'manifest.json'), 'w') as f:
            json.dump(manifest, f, indent=1)
        size = sum(os.path.getsize(os.path.join(out, x)) for x in os.listdir(out))
        print(f'{key}: {size / 1e6:.1f} MB in {time.time() - t0:.0f} s', flush=True)


if __name__ == '__main__':
    sys.exit(main())
