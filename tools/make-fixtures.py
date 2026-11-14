# LionPhotos — Copyright (C) 2026 LionPhotos Team. Created and conceived by Daniel Michelon De Carli.
# Licensed under the MIT License. See LICENSE in the project root.
#
# Test collection for tools/e2e.js: photos with EXIF from four cameras in dated folders, edited copies, RAW
# files, PNG/GIF/WebP pictures and short videos (ffmpeg).  python3 tools/make-fixtures.py <folder>
# Needs Pillow (pip install pillow) and ffmpeg.
import os, random, subprocess, sys, colorsys, math
from PIL import Image, ImageDraw, ImageFilter
root = sys.argv[1]
random.seed(7)
def scene(w, h, hue, seed):
    rnd = random.Random(seed)
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):  # sky gradient
        r, g, b = colorsys.hsv_to_rgb((hue + y / h * 0.08) % 1, 0.45 + 0.3 * y / h, 0.95 - 0.35 * y / h)
        d.line([(0, y), (w, y)], fill=(int(r*255), int(g*255), int(b*255)))
    sx, sy, sr = rnd.randint(w//5, 4*w//5), rnd.randint(h//8, h//3), rnd.randint(h//12, h//6)
    d.ellipse([sx-sr, sy-sr, sx+sr, sy+sr], fill=(255, 214, 120))
    for layer in range(3):
        pts = [(0, h)]
        base = h * (0.55 + 0.13 * layer)
        for x in range(0, w + 40, 40):
            pts.append((x, base - abs(math.sin(x / (90 + 40*layer) + seed + layer)) * h * 0.22 * (1 - layer*0.25) + rnd.randint(-8, 8)))
        pts.append((w, h))
        r, g, b = colorsys.hsv_to_rgb((hue + 0.5 + layer*0.03) % 1, 0.5, 0.45 - layer * 0.12)
        d.polygon(pts, fill=(int(r*255), int(g*255), int(b*255)))
    return img.filter(ImageFilter.GaussianBlur(0.6))

def exif(make, model, date, artist=None, software=None, lens=None):
    e = Image.Exif()
    e[0x010F] = make; e[0x0110] = model; e[0x0132] = date
    if artist: e[0x013B] = artist
    if software: e[0x0131] = software
    ifd = e.get_ifd(0x8769)
    ifd[0x9003] = date; ifd[0x829A] = (1, 250); ifd[0x829D] = (28, 10); ifd[0x8827] = 200; ifd[0x920A] = (35, 1)
    if lens: ifd[0xA434] = lens
    return e

cams = [('Canon', 'Canon EOS R6', 'RF24-105mm F4 L IS USM'), ('Apple', 'iPhone 15 Pro', None), ('NIKON CORPORATION', 'NIKON Z 6_2', 'NIKKOR Z 24-70mm f/4 S'), ('SONY', 'ILCE-7M4', 'FE 35mm F1.8')]
n = 0
for year, month, folder in [(2023, 6, 'Viagens/Gramado 2023'), (2023, 12, 'Família/Natal 2023'), (2024, 3, 'Ateliê/Maquetes'), (2024, 7, 'Viagens/Chile 2024'), (2025, 1, 'Ateliê/Visita técnica'), (2026, 10, '')]:
    d = os.path.join(root, folder); os.makedirs(d, exist_ok=True)
    for i in range(random.randint(14, 26)):
        n += 1
        make, model, lens = random.choice(cams)
        date = f'{year}:{month:02d}:{random.randint(1,28):02d} {random.randint(8,20):02d}:{random.randint(0,59):02d}:00'
        w, h = random.choice([(1600, 1067), (1067, 1600), (1500, 1500), (2000, 1125)])
        img = scene(w, h, random.random(), n)
        name = f'IMG_{1000+n}'
        img.save(os.path.join(d, name + '.JPG'), quality=88, exif=exif(make, model, date, 'Daniel Michelon De Carli' if n % 3 == 0 else None, lens=lens))
        if n % 7 == 0:  # a "raw" + Lightroom sidecar + an edited export
            open(os.path.join(d, name + '.CR2'), 'wb').write(os.urandom(300_000))
            open(os.path.join(d, name + '.xmp'), 'w').write('<x:xmpmeta xmlns:x="adobe:ns:meta/"/>')
            img.rotate(0).save(os.path.join(d, name + '-Edit.jpg'), quality=85, exif=exif(make, model, date, software='Adobe Photoshop Lightroom Classic 13.0 (Windows)'))
        if n % 11 == 0:
            img.resize((w//2, h//2)).save(os.path.join(d, f'scan_{n}.png'))
# exact duplicates
import shutil
src = os.path.join(root, 'Viagens/Chile 2024'); first = sorted(os.listdir(src))[0]
os.makedirs(os.path.join(root, 'Backup antigo'), exist_ok=True)
for f in sorted(os.listdir(src))[:4]:
    if f.endswith('.JPG'): shutil.copy2(os.path.join(src, f), os.path.join(root, 'Backup antigo', f))
shutil.copy2(os.path.join(src, first), os.path.join(root, 'Família', 'copia de ' + first))
# videos
vd = os.path.join(root, 'Vídeos'); os.makedirs(vd, exist_ok=True)
def ff(*args): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)
ff('-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=30:duration=12', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=12', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-c:a', 'aac', '-shortest',
   '-metadata', 'artist=Daniel Michelon De Carli', '-metadata', 'title=Maquete do teatro', '-metadata', 'creation_time=2024-07-12T15:30:00Z', '-movflags', '+faststart', os.path.join(vd, 'maquete_teatro.mp4'))
ff('-f', 'lavfi', '-i', 'mandelbrot=size=1280x720:rate=25', '-t', '8', '-c:v', 'libvpx-vp9', '-b:v', '1M', '-deadline', 'realtime', '-cpu-used', '8', os.path.join(vd, 'fractal.webm'))
ff('-f', 'lavfi', '-i', 'life=size=720x1280:rate=30:mold=10:ratio=0.5', '-t', '6', '-f', 'lavfi', '-i', 'anoisesrc=d=6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-c:a', 'aac', '-shortest', '-f', 'mov', os.path.join(vd, 'IMG_2001.MOV'))
ff('-f', 'lavfi', '-i', 'color=c=black:size=1280x720:rate=30:duration=1', '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=30:duration=7', '-filter_complex', '[0][1]concat=n=2:v=1:a=0', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', os.path.join(vd, 'starts_black.mp4'))
print('photos:', n)
