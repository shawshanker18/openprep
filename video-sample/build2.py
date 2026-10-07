# Animated sample video: neural voice (edge-tts) + animated scenes (PIL) + real Desmos recordings.
# Run order: python record_desmos.py   (once)   then   python build2.py
import os, json, math, asyncio
import numpy as np
import edge_tts
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import VideoClip, AudioFileClip, CompositeAudioClip

HERE = os.path.dirname(os.path.abspath(__file__)); AUD = os.path.join(HERE, "audio2"); os.makedirs(AUD, exist_ok=True)
VOICE, RATE = "en-US-AriaNeural", "-4%"
W, H, FPS = 1280, 720, 24
fnt = lambda n, s: ImageFont.truetype(f"C:/Windows/Fonts/{n}", s)
T_TITLE, T_BODY, T_EQ, T_BIG, T_SMALL, T_CHIP = fnt("segoeuib.ttf", 44), fnt("segoeui.ttf", 32), fnt("segoeuib.ttf", 64), fnt("segoeuib.ttf", 120), fnt("segoeui.ttf", 24), fnt("segoeuib.ttf", 28)
T_EQ2 = fnt("segoeuib.ttf", 84); T_EQ3 = fnt("segoeuib.ttf", 96)
BG, INK, MUTE = (250, 248, 244), (28, 28, 36), (140, 140, 150)
ACC, OK, BAD, ORG, PAN = (37, 99, 235), (22, 163, 74), (220, 38, 38), (234, 120, 20), (226, 232, 245)
WHITE = (255, 255, 255)

def mix(c, a): a = max(0.0, min(1.0, a)); return tuple(int(BG[i] + (c[i] - BG[i]) * a) for i in range(3))
def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def back(x):  # overshoot pop
    x = max(0.0, min(1.0, x)); c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def tw(d, s, f): return d.textlength(s, font=f)

class C:  # per-frame drawing context
    def __init__(s, d, t, bt, sd): s.d, s.t, s.bt, s.sd = d, t, bt, sd
    def a(s, k, delay=0.0, dur=0.55): return ease((s.t - s.bt[k] - delay) / dur)       # 0..1 progress of an animation starting in beat k
    def pop(s, k, delay=0.0, dur=0.5): return back((s.t - s.bt[k] - delay) / dur)
    def beat(s): return max([i for i, b in enumerate(s.bt) if b <= s.t] or [0])
    def since(s, k): return s.t - s.bt[k]
    def text(s, x, y, txt, f=T_BODY, col=INK, al=1.0, anchor="l", dy=0):
        w = tw(s.d, txt, f); x0 = x - w / 2 if anchor == "c" else (x - w if anchor == "r" else x)
        s.d.text((x0, y + dy), txt, font=f, fill=mix(col, al)); return w
    def chip(s, cx, cy, txt, col=ORG, al=1.0):
        if al <= 0.02: return
        w = tw(s.d, txt, T_CHIP) + 40; h = 52
        s.d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], 16, fill=mix(col, al))
        s.text(cx, cy - 20, txt, T_CHIP, WHITE if al > .6 else mix(col, al), 1, "c")
    def check(s, x, y, size, p, col=OK, wd=9):
        pts = [(0, .55), (.35, .9), (1, .1)]; L = [math.dist(pts[i], pts[i + 1]) for i in range(2)]; tot = p * sum(L); out = [pts[0]]
        for i in range(2):
            if tot <= 0: break
            u = min(1, tot / L[i]); out.append((pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u)); tot -= L[i]
        if len(out) > 1: s.d.line([(x + px * size, y + py * size) for px, py in out], fill=col, width=wd, joint="curve")
    def cross(s, x, y, size, p, col=BAD, wd=9):
        p1, p2 = min(1, p * 2), max(0, p * 2 - 1)
        if p1 > 0: s.d.line([(x, y), (x + size * p1, y + size * p1)], fill=col, width=wd)
        if p2 > 0: s.d.line([(x + size, y), (x + size - size * p2, y + size * p2)], fill=col, width=wd)

def T(s, col=INK, strike=0): return {"s": s, "col": col, "strike": strike}

def layout(d, tokens, cx, f):
    ws = [tw(d, t["s"], f) for t in tokens]; x = cx - sum(ws) / 2; out = []
    for w in ws: out.append((x, w)); x += w
    return out

def eq(c, y, tokens, cx=640, f=T_EQ, al=1.0, dy=0):
    pos = layout(c.d, tokens, cx, f)
    for tk, (x, w) in zip(tokens, pos):
        c.d.text((x, y + dy), tk["s"], font=f, fill=mix(tk.get("col", INK), al))
        if tk.get("strike", 0) > 0:
            sy = y + dy + f.size * 0.62; c.d.line([(x + 4, sy), (x + 4 + (w - 8) * tk["strike"], sy)], fill=BAD, width=6)
    return pos

def scale(c, cx, cy, left, right, theta, al=1.0):
    d = c.d; arm = 330; th = math.radians(theta)
    lx, ly = cx - arm * math.cos(th), cy - arm * math.sin(th); rx, ry = cx + arm * math.cos(th), cy + arm * math.sin(th)
    d.polygon([(cx, cy), (cx - 55, cy + 250), (cx + 55, cy + 250)], fill=mix((120, 130, 150), al)); d.rectangle([cx - 120, cy + 245, cx + 120, cy + 262], fill=mix((90, 100, 120), al))
    d.line([(lx, ly), (rx, ry)], fill=mix((60, 70, 95), al), width=12); d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=mix((60, 70, 95), al))
    for (ex, ey, items) in ((lx, ly, left), (rx, ry, right)):
        pan_y = ey + 120
        d.line([(ex - 110, pan_y), (ex, ey)], fill=mix((120, 130, 150), al), width=3); d.line([(ex + 110, pan_y), (ex, ey)], fill=mix((120, 130, 150), al), width=3)
        d.rounded_rectangle([ex - 125, pan_y, ex + 125, pan_y + 16], 8, fill=mix((60, 70, 95), al))
        x = ex - 112
        for (kind, a, dy) in items:
            w = 78 if kind == "x" else 30
            if a > 0.01:
                col = ACC if kind == "x" else ORG
                d.rounded_rectangle([x, pan_y - 42 + dy, x + w, pan_y - 2 + dy], 7, fill=mix(col, a * al))
                if kind == "x": c.text(x + w / 2, pan_y - 44 + dy, "x", T_CHIP, WHITE, a, "c")
            x += w + 4

# ------------------------------------------------------------------ scenes
def s_intro(c):
    b = c.beat(); d = c.d; ta = c.a(0, 0.1, 0.8)
    c.text(640, 60, "Linear equations in one variable", T_TITLE, ACC, ta, "c", dy=(1 - ta) * 20)
    flip = c.a(1, 0.0, 0.7) if len(c.bt) > 1 and c.t >= c.bt[1] else 0.0; sc = c.pop(0, 0.4, 0.6)
    w = 250 * sc * (abs(math.cos(flip * math.pi)) if 0 < flip < 1 else 1); cx, cy = 640, 330; hh = 250 * sc
    d.rounded_rectangle([cx - w / 2, cy - hh / 2, cx + w / 2, cy + hh / 2], 40, fill=mix(ACC if flip > .5 else (120, 130, 150), 1))
    if w > 60: c.text(cx, cy - 80, "x" if flip > .5 else "?", T_BIG, WHITE, 1, "c")
    if b >= 1: c.text(640, 490, "x  =  the mystery number", T_BODY, INK, c.a(1, 0.8), "c")
    if b >= 2:
        g = min(1, c.pop(2, 0.0, 0.6)); c.text(640, 560, "Goal:   x  =  a number", T_EQ, OK, g, "c"); c.check(1010, 575, 56, c.a(2, 0.6, 0.5), OK, 8)

def s_balance(c):
    b = c.beat(); c.text(70, 40, "The balance rule", T_TITLE, ACC)
    left = [("x", 1, 0)] + [("u", 1, 0) for _ in range(3)]; right = [("u", 1, 0) for _ in range(7)]; theta = 0.0
    al = c.a(0, 0.0, 0.7)
    if b == 1:  # take one block off only the left side: it tips
        u = c.a(1, 0.3, 0.7); r = c.a(1, 3.4, 0.7)
        left[3] = ("u", 1 - u + r, -80 * u * (1 - r)); theta = 7 * u * (1 - r)
    if b >= 3:
        r = c.a(3, 1.6, 0.9) if b == 3 else 1.0
        for i in (1, 2, 3): left[i] = ("u", 1 - r, -110 * r)
        for i in (4, 5, 6): right[i] = ("u", 1 - r, -110 * r)
    scale(c, 640, 230, left, right, theta, al)
    if b == 0: eq(c, 560, [T("x + 3 = 7")], al=c.a(0, 0.8))
    if b == 1: c.text(640, 575, "Only one side?  It tips!", T_BODY, BAD, c.a(1, 1.0), "c")
    if b == 2: c.text(640, 575, "Do the same thing to both sides", T_EQ, OK, c.a(2, 0.4), "c") if False else c.text(640, 570, "Do the same thing to both sides", T_BODY, OK, c.a(2, 0.4), "c")
    if b == 3:
        a2 = c.a(3, 1.0); eq(c, 540, [T("x + 3"), T("  =  "), T("7")], al=1)
        c.chip(430, 650, "− 3", ORG, a2); c.chip(850, 650, "− 3", ORG, a2)
    if b == 4:
        pl = min(1, c.pop(4, 0.0, 0.6)); eq(c, 540, [T("x  =  4", OK)], al=pl); c.check(900, 552, 56, c.a(4, 0.5, 0.5))

def s_ex1(c):
    b = c.beat(); c.text(70, 40, "Example 1: x on both sides", T_TITLE, ACC)
    cx = 400; ys = [130, 260, 390, 520]
    a0 = c.a(0, 0, 0.7)
    eq(c, ys[0], [T("7x", ACC), T(" + 4"), T(" = "), T("3x", ACC, c.a(1, 0.8, 0.5) if b >= 1 else 0), T(" + 24")], cx, al=a0, dy=(1 - a0) * 25)
    if b >= 1:
        a = c.a(1, 1.0); c.chip(cx, ys[0] + 100, "− 3x  on both sides", ORG, a); a1 = c.a(1, 2.0, 0.6)
        eq(c, ys[1], [T("4x", ACC if c.since(1) < 4 else INK), T(" + 4", INK, c.a(2, 0.8, 0.5) if b >= 2 else 0), T(" = 24")], cx, al=a1, dy=(1 - a1) * 25)
    if b >= 2:
        c.chip(cx, ys[1] + 100, "− 4  on both sides", ORG, c.a(2, 1.0)); a2 = c.a(2, 2.0, 0.6)
        eq(c, ys[2], [T("4x"), T(" = "), T("20")], cx, al=a2, dy=(1 - a2) * 25)
    if b >= 3:
        c.chip(cx, ys[2] + 100, "÷ 4  on both sides", ORG, c.a(3, 1.0)); pp = min(1, c.pop(3, 2.0, 0.6))
        eq(c, ys[3], [T("x = 5", OK)], cx, al=pp)
        w = 215 * pp; c.d.rounded_rectangle([cx - w / 2 - 14, ys[3] - 6, cx + w / 2 + 14, ys[3] + 86], 18, outline=mix(OK, pp), width=5)
    if b >= 4:
        a = c.a(4, 0.2, 0.6); x0 = 760
        c.d.rounded_rectangle([x0, 170, 1230, 480], 22, fill=mix(PAN, a))
        c.text(x0 + 30, 190, "Check it!  Put x = 5 back in:", T_BODY, INK, a)
        c.text(x0 + 30, 260, "7(5) + 4  =  39", T_BODY, INK, c.a(4, 1.4)); c.check(x0 + 360, 262, 36, c.a(4, 2.2, 0.4), OK, 6)
        c.text(x0 + 30, 325, "3(5) + 24  =  39", T_BODY, INK, c.a(4, 2.0)); c.check(x0 + 360, 327, 36, c.a(4, 2.8, 0.4), OK, 6)
        c.text(x0 + 30, 405, "They match.  We're right!", T_BODY, OK, c.a(4, 3.4))

def s_word(c):
    b = c.beat(); d = c.d; c.text(70, 40, "Example 2: a word problem", T_TITLE, ACC)
    x0, x1, y0, bh = 140, 1140, 250, 90; per = (x1 - x0) / 60
    if b <= 2:
        c.text(640, 120, "A gym charges a $20 fee, plus $8 for every hour.", T_BODY, INK, c.a(0, 0.0, 0.6), "c")
        c.text(640, 165, "You paid $60 in total.  How many hours?", T_BODY, INK, c.a(0, 1.6, 0.6), "c")
        a0 = c.a(0, 3.0, 0.7); fee = a0 * 20 * per; d.rectangle([x0, y0, x0 + fee, y0 + bh], fill=ORG)
        if a0 > .9: c.text(x0 + 10 * per, y0 + 22, "$20 fee", T_CHIP, WHITE, 1, "c")
    if b >= 1 and b <= 2:
        for i in range(5):
            p = c.a(1, 0.3 + i * 0.5, 0.45) if b == 1 else 1.0; xs = x0 + 20 * per + i * 8 * per
            if p > 0.01:
                col = ACC if i % 2 == 0 else (80, 140, 245); oy = (1 - p) * 60
                d.rectangle([xs, y0 - oy, xs + 8 * per - 3, y0 + bh - oy], fill=mix(col, p))
                if p > .9: c.text(xs + 4 * per, y0 + 22, "$8", T_CHIP, WHITE, 1, "c")
        tot = c.a(1, 0.3 + 5 * 0.5, 0.5) if b == 1 else 1.0
        d.line([(x0, y0 + bh + 30), (x0 + 60 * per * tot, y0 + bh + 30)], fill=INK, width=4)
        c.text(x0 + 30 * per, y0 + bh + 44, "$60 total   =   5 hours", T_BODY, INK, tot, "c")
    if b == 2:
        a = c.a(2, 0.4, 0.6); d.rectangle([0, 395, W, 700], fill=BG)
        eq(c, 440, [T("20", ORG), T("  +  "), T("8h", ACC), T("  =  60")], 640, al=a, dy=(1 - a) * 20)
        c.text(640, 560, "fee = just a number            hourly price × hours", T_SMALL, MUTE, c.a(2, 3.0), "c")
    if b == 3:
        eq(c, 150, [T("20", ORG), T("  +  "), T("8h", ACC), T("  =  60")], 640)
        c.chip(500, 290, "− 20  both sides", ORG, c.a(3, 0.2)); a1 = c.a(3, 0.9, 0.5)
        eq(c, 330, [T("8h  =  40")], 640, al=a1, dy=(1 - a1) * 20)
        c.chip(500, 470, "÷ 8  both sides", ORG, c.a(3, 2.2)); a2 = min(1, c.pop(3, 2.8, 0.5))
        eq(c, 510, [T("h = 5 hours", OK)], 640, al=a2)

def s_trap(c):
    b = c.beat(); d = c.d; c.text(70, 40, "Watch out for this trap", T_TITLE, ACC)
    f = T_EQ3; toks = [T("4"), T("(x + 6)")]; pos = layout(d, toks, 640, f); y = 190
    eq(c, y, toks, 640, f, al=c.a(0, 0.1, 0.7))
    if b == 0: c.text(640, 380, "Distribute to EVERY term inside", T_BODY, MUTE, c.a(0, 1.2), "c")
    xs_4 = pos[0][0] + pos[0][1] / 2; xs_x = pos[1][0] + tw(d, "(", f) + tw(d, "x", f) / 2; xs_6 = pos[1][0] + tw(d, "(x + ", f) + tw(d, "6", f) / 2
    def arrow(xa, xb, hgt, p, col):
        pts = []
        for i in range(31):
            u = i / 30
            if u > p: break
            pts.append((xa + (xb - xa) * u, y + 8 - 4 * hgt * u * (1 - u)))
        if len(pts) > 1: d.line(pts, fill=col, width=7, joint="curve")
        if p >= 1: d.polygon([(xb, y + 14), (xb - 13, y - 10), (xb + 13, y - 10)], fill=col)
    if b == 1:
        arrow(xs_4, xs_x, 90, c.a(1, 0.6, 0.6), ACC); a = c.a(1, 1.8, 0.6)
        eq(c, 330, [T("=  4x + 6", BAD)], 640, f=T_EQ2, al=a); c.cross(900, 350, 60, c.a(1, 2.6, 0.5), BAD)
        c.text(640, 470, "The 6 got left out!", T_BODY, BAD, c.a(1, 2.8), "c")
    if b >= 2:
        arrow(xs_4, xs_x, 90, 1, mix(ACC, .35)); arrow(xs_4, xs_6, 170, c.a(2, 0.4, 0.8), OK)
        a = c.a(2, 1.6, 0.6); eq(c, 330, [T("=  4x + 24", OK)], 640, f=T_EQ2, al=a); c.check(930, 345, 64, c.a(2, 2.3, 0.5))
        c.text(640, 470, "4 × 6 = 24", T_BODY, OK, c.a(2, 2.1), "c")

def s_recap(c):
    c.text(70, 40, "Quick recap", T_TITLE, ACC)
    rows = ["Do the same thing to both sides", "Distribute first, then gather the x's", "Get x alone, then check your answer"]
    for i, r in enumerate(rows):
        if c.t < c.bt[i]: continue
        p = min(1, c.pop(i, 0.0, 0.55)); y = 150 + i * 130
        c.d.rounded_rectangle([120, y, 1160, y + 100], 24, fill=mix(PAN, p))
        c.text(190, y + 26, f"{i + 1}.  {r}", T_BODY, INK, p, dy=(1 - p) * 20); c.check(1060, y + 28, 52, c.a(i, 0.6, 0.5), OK, 8)
    if len(c.bt) > 3 and c.t >= c.bt[3]:
        p = c.a(3, 0.3, 0.5); c.chip(640, 600, "Next:  how many solutions?", ACC, p)

def s_desmos(name, title):
    meta = json.load(open(os.path.join(HERE, "desmos_frames", name, "marks.json"), encoding="utf-8")); marks = meta["marks"]; cache = {}
    def f(c):
        c.text(70, 36, title, T_TITLE, ACC); b = c.beat(); tl = c.since(b)
        k = min(len(marks) - 2, b); fr = min(marks[k] + int(tl * meta["fps"]), marks[k + 1] - 1)
        if fr not in cache:
            if len(cache) > 6: cache.pop(next(iter(cache)))
            cache[fr] = Image.open(os.path.join(HERE, "desmos_frames", name, f"{fr:04d}.jpg")).convert("RGB").resize((1030, 581), Image.LANCZOS)
        c.d.rounded_rectangle([105, 103, 1175, 695], 14, fill=(215, 215, 222)); c.d._image.paste(cache[fr], (125, 112))
    return f

SCENES = [
 (s_intro, ["Hi! Today we're learning linear equations in one variable. That sounds scary, but it's really not.",
            "It's just a puzzle with one mystery number. We usually call that number x.",
            "Your only job is to get x all alone on one side. That's the whole game."]),
 (s_balance, ["Picture a balance scale. Both sides weigh exactly the same.",
              "If you take something off only one side, the scale tips. That's not allowed!",
              "So here's the golden rule. Whatever you do to one side, do to the other side too.",
              "Let's try a tiny one. x plus 3 equals 7. To get rid of the 3, we take away 3 from both sides.",
              "Now x is all alone. x equals 4."]),
 (s_ex1, ["Now a bigger one. 7 x plus 4 equals 3 x plus 24. There are x's on both sides.",
          "Step one. Move the x's to one side. Take away 3 x from both sides.",
          "Step two. Take away 4 from both sides.",
          "Step three. Divide both sides by 4. And x equals 5!",
          "Always check your answer! Put 5 back in. Both sides give 39. They match, so we're right."]),
 (s_desmos("ex1", "Same problem, using Desmos"),
  ["Here's a faster way for tough equations. Let's use Desmos, the calculator that's built into the SAT.",
   "Type the left side as a line. y equals 7 x plus 4.",
   "Now type the right side as another line. y equals 3 x plus 24.",
   "Where the two lines cross is the answer. Let's tap the crossing point.",
   "The point says 5 comma 39. The x value is 5. It matches our answer!"]),
 (s_word, ["The SAT loves stories. A gym charges a 20 dollar fee, plus 8 dollars for every hour. You paid 60 dollars. How many hours?",
           "Think about it. Every hour adds 8 dollars. After 5 hours, we hit 60.",
           "Let's write that as an equation. The fee is just a number. The hourly price gets multiplied by h, the hours. 20 plus 8 h equals 60.",
           "Take away 20 from both sides. Then divide by 8. h equals 5 hours."]),
 (s_desmos("ex2", "Check the story with Desmos"),
  ["Desmos can check this one too.",
   "Type y equals 20 plus 8 x.",
   "Then type y equals 60. That's our total.",
   "Tap where they cross.",
   "5 comma 60. So x is 5. Five hours, again!"]),
 (s_trap, ["The most common mistake is forgetting to multiply everything inside the parentheses.",
           "4 times x plus 6 is NOT 4 x plus 6. The 6 got left out!",
           "The 4 has to multiply the 6 too. So it's 4 x plus 24."]),
 (s_recap, ["Let's recap. One: whatever you do to one side, do to the other.",
            "Two: distribute first, then gather the x's on one side.",
            "Three: divide to get x alone, then check your answer.",
            "Next video, we'll solve a harder SAT question, where a missing number decides how many solutions there are. See you there!"]),
]

async def tts(jobs):
    for text, path in jobs:
        if not os.path.exists(path): await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)

def make_plan():
    jobs = []; bi = 0
    for _, bs in SCENES:
        for b in bs: jobs.append((b, os.path.join(AUD, f"b{bi:03d}.mp3"))); bi += 1
    asyncio.run(tts(jobs))
    durs = [AudioFileClip(p).duration for _, p in jobs]; plan = []; t0 = 0.6; k = 0
    for fn, bs in SCENES:
        bt = []; acc = 0.0
        for _ in bs: bt.append(acc); acc += durs[k] + 0.5; k += 1
        sd = acc + 0.5; plan.append((fn, bt, t0, sd)); t0 += sd
    return jobs, plan, t0

def frame(t, plan, total):
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im); d.rectangle([0, 0, W, 8], fill=ACC)
    fn, bt, s0, sd = next((p for p in plan if p[2] <= t < p[2] + p[3]), plan[-1])
    d._image = im  # the Desmos scene pastes its recording into the canvas
    fn(C(d, t - s0, bt, sd)); d.rectangle([0, H - 10, int(W * min(1, t / total)), H], fill=ACC)
    d.text((70, H - 44), "OpenPrep  ·  Start from scratch  ·  Math: Algebra", font=T_SMALL, fill=mix(MUTE, .7))
    return np.array(im)

def main():
    jobs, plan, total = make_plan(); auds = []; k = 0
    for fn, bt, s0, sd in plan:
        for x in bt: auds.append(AudioFileClip(jobs[k][1]).set_start(s0 + x + 0.1)); k += 1
    clip = VideoClip(lambda t: frame(t, plan, total), duration=total).set_fps(FPS).set_audio(CompositeAudioClip(auds))
    out = os.path.join(HERE, "sample-linear-equations-1-v2.mp4")
    clip.write_videofile(out, fps=FPS, codec="libx264", audio_codec="aac", preset="veryfast", logger=None)
    print("done", out, round(total, 1), "s")

if __name__ == "__main__":
    main()
