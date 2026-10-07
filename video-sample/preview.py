import build2 as b
from PIL import Image
jobs, plan, total = b.make_plan(); print("total", round(total, 1), [round(p[3], 1) for p in plan])
picks = []
for fn, bt, s0, sd in plan:
    for i, x in enumerate(bt):
        end = bt[i + 1] if i + 1 < len(bt) else sd
        picks.append(s0 + x + (end - x) * 0.92)
imgs = [Image.fromarray(b.frame(min(t, total - .01), plan, total)).resize((640, 360)) for t in picks]
for part in range(0, len(imgs), 12):
    sub = imgs[part:part + 12]; r = (len(sub) + 3) // 4; sheet = Image.new("RGB", (2560, 360 * r))
    for i, im in enumerate(sub): sheet.paste(im, ((i % 4) * 640, (i // 4) * 360))
    sheet.save(f"sheet{part // 12}.png")
print(len(imgs))
