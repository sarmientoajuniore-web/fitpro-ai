# Feature graphic 1024x500 para Play Store — PorotoFit
# Usa los assets reales de marca: wordmark + poroto flex, sobre negro con halo rojo.
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

W, H = 1024, 500
NEGRO = (20, 20, 20)
ROJO = (225, 29, 42)

base = Image.new("RGB", (W, H), NEGRO)

# --- halo rojo radial detras del poroto (estetica de la referencia de marca) ---
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
cx, cy = 800, 250
for r in range(340, 0, -4):
    v = int(150 * (1 - r / 340.0) ** 1.6)
    gd.ellipse([cx - r, cy - r * 0.95, cx + r, cy + r * 0.95], fill=v)
glow = glow.filter(ImageFilter.GaussianBlur(45))
capa_roja = Image.new("RGB", (W, H), ROJO)
base = Image.composite(capa_roja, base, glow.point(lambda p: min(p, 165)))

# --- poroto flex (brazos cruzados) a la derecha ---
poroto = Image.open("public/caricaturas/poroto-flex.png").convert("RGBA")
poroto = poroto.crop(poroto.getbbox())
alto = 452
esc = alto / poroto.height
poroto = poroto.resize((int(poroto.width * esc), alto), Image.LANCZOS)
px = 800 - poroto.width // 2
py = H - alto - 24
base.paste(poroto, (px, py), poroto)

# --- wordmark POROTO FIT a la izquierda ---
wm = Image.open("public/caricaturas/poroto-wordmark.png").convert("RGBA")
wm = wm.crop(wm.getbbox())
ancho_wm = 430
esc = ancho_wm / wm.width
wm = wm.resize((ancho_wm, int(wm.height * esc)), Image.LANCZOS)
wx, wy = 68, 150
base.paste(wm, (wx, wy), wm)

# --- tagline debajo del wordmark ---
d = ImageDraw.Draw(base)
f_tag = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 30)
f_sub = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 24)

ty = wy + wm.height + 26
d.text((wx, ty), "Rutinas, nutrición y progreso", font=f_tag, fill=(255, 255, 255))
d.text((wx, ty + 42), "Tu gimnasio en el bolsillo, en español.", font=f_sub, fill=(190, 190, 190))

# --- pildora GRATIS ---
f_p = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 21)
txt = "GRATIS"
bb = d.textbbox((0, 0), txt, font=f_p)
tw, th = bb[2] - bb[0], bb[3] - bb[1]
pad_x, pad_y = 18, 10
bx, by = wx, ty + 92
d.rounded_rectangle([bx, by, bx + tw + pad_x * 2, by + th + pad_y * 2 + 4],
                    radius=18, fill=ROJO)
d.text((bx + pad_x, by + pad_y - 2), txt, font=f_p, fill=(255, 255, 255))

os.makedirs("store-assets", exist_ok=True)
salida = "store-assets/feature-graphic.png"
base.save(salida, "PNG")
im = Image.open(salida)
print("OK ->", salida, im.size, im.mode, f"{os.path.getsize(salida)/1024:.0f} KB")
