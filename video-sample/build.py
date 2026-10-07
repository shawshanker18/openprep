# Sample video builder: narration (Windows SAPI) + PIL frames + moviepy. Run: python build.py
import os, subprocess, wave, json, sys
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from moviepy.editor import VideoClip, AudioFileClip, concatenate_videoclips, CompositeAudioClip

HERE = os.path.dirname(os.path.abspath(__file__)); AUD = os.path.join(HERE, "audio"); os.makedirs(AUD, exist_ok=True)
W, H, FPS = 1280, 720, 15
F = lambda n, s: ImageFont.truetype(f"C:/Windows/Fonts/{n}", s)
TITLE, BODY, EQ, SMALL = F("segoeuib.ttf", 46), F("segoeui.ttf", 34), F("segoeuib.ttf", 58), F("segoeui.ttf", 24)
BG, INK, MUTE, ACC, OK, BAD = (250,248,244), (28,28,36), (140,140,150), (37,99,235), (22,163,74), (220,38,38)
COL = {"body": INK, "eq": INK, "note": MUTE, "ok": OK, "bad": BAD, "acc": ACC}

# (scene title, [(narration, kind, text)])  kind: body/eq/note/ok/bad/acc ; text None = just talk ; kind "clear" wipes the board
SCENES = [
("Linear equations in one variable", [
 ("Hi! Today we are learning linear equations in one variable. That sounds scary, but it is not.", "body", "Linear equations in one variable"),
 ("It just means a puzzle with one mystery number, and we usually call that number x.", "acc", "x = the mystery number"),
 ("Your only job is to get x all alone on one side. That is the whole game.", "ok", "Goal:  x = a number"),
]),
("The balance rule", [
 ("Picture a balance scale. Both sides weigh the same.", "body", "Both sides are equal"),
 ("If you add something to one side, you must add the same thing to the other side, or the scale tips.", "body", "Do it to one side, do it to the other"),
 ("Let's try a tiny one. x plus 3 equals 7.", "eq", "x + 3 = 7"),
 ("To get rid of the plus 3, we take away 3 from both sides.", "eq", "x + 3 − 3 = 7 − 3"),
 ("And now x is alone. x equals 4.", "ok", "x = 4"),
]),
("Example 1: x on both sides", [
 ("Now a bigger one. 7 x plus 4 equals 3 x plus 24. There are x's on both sides.", "eq", "7x + 4 = 3x + 24"),
 ("Step one. Move the x's to one side. Take away 3 x from both sides.", "eq", "4x + 4 = 24"),
 ("Step two. Take away 4 from both sides.", "eq", "4x = 20"),
 ("Step three. Divide both sides by 4.", "ok", "x = 5"),
 ("Always check! Put 5 back in. Seven times five plus four is 39. Three times five plus 24 is also 39. They match, so we are right.", "note", "Check:  7(5) + 4 = 39   and   3(5) + 24 = 39   ✓"),
]),
("Example 2: a word problem", [
 ("The SAT loves stories. A gym charges a 20 dollar fee, plus 8 dollars for each hour. You paid 60 dollars. How many hours?", "body", "$20 fee  +  $8 per hour  =  $60"),
 ("The one time fee is just a number. The per hour price gets multiplied by h, the hours.", "eq", "20 + 8h = 60"),
 ("Take away 20 from both sides.", "eq", "8h = 40"),
 ("Divide by 8.", "ok", "h = 5 hours"),
]),
("Watch out for this trap", [
 ("The most common mistake is forgetting to multiply everything inside the parentheses.", "body", "Distribute to EVERY term"),
 ("Four times x plus 6 is NOT 4 x plus 6.", "bad", "4(x + 6) = 4x + 6     ✗"),
 ("The 4 has to hit the 6 too. So it is 4 x plus 24.", "ok", "4(x + 6) = 4x + 24     ✓"),
]),
("Quick recap", [
 ("Let's recap. One: whatever you do to one side, do to the other.", "body", "1. Do the same thing to both sides"),
 ("Two: distribute first, then collect the x's on one side.", "body", "2. Distribute, then gather the x's"),
 ("Three: divide to get x alone, then check your answer.", "body", "3. Get x alone, then check"),
 ("Next video, we solve a harder SAT question where a missing number decides how many solutions there are. See you there!", "acc", "Next: how many solutions?"),
]),
]

def speak(beats):
    """Render each beat with SAPI (David), return wav paths."""
    jobs = [{"text": n, "path": os.path.join(AUD, f"b{i:03d}.wav")} for i, n in enumerate(beats)]
    jp = os.path.join(AUD, "jobs.json"); json.dump(jobs, open(jp, "w"))
    ps = ("Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
          "$s.SelectVoice('Microsoft David Desktop'); $s.Rate=-1;"
          f"foreach($j in (Get-Content '{jp}' -Raw | ConvertFrom-Json)){{ if(-not (Test-Path $j.path)){{ $s.SetOutputToWaveFile($j.path); $s.Speak($j.text); $s.SetOutputToNull() }} }}")
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
    return [j["path"] for j in jobs]

def dur(p):
    with wave.open(p) as w: return w.getnframes() / w.getframerate()

def wrap(d, text, font, maxw):
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= maxw: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur]

def draw(scene_i, title, items, n_shown, cur, prog):
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 8], fill=ACC)
    d.text((70, 40), title, font=TITLE, fill=ACC)
    y = 170
    for k, (kind, text) in enumerate(items[:n_shown]):
        font = EQ if kind in ("eq", "ok", "bad") else (SMALL if kind == "note" else BODY)
        col = COL[kind] if k == n_shown - 1 or kind in ("ok", "bad") else tuple(int(c*0.8 + 255*0.2*0) for c in COL[kind])
        for ln in wrap(d, text, font, W - 160):
            d.text((90, y), ln, font=font, fill=col); y += font.size + 22
        y += 18
    d.rectangle([0, H-10, int(W*prog), H], fill=ACC)
    d.text((70, H-48), "OpenPrep  ·  Start from scratch  ·  Math: Algebra", font=SMALL, fill=MUTE)
    return np.array(im)

def main():
    beats = [b for _, bs in SCENES for b in bs]
    wavs = speak([b[0] for b in beats]); durs = [dur(p) + 0.55 for p in wavs]
    total = sum(durs); clips, bi, t0 = [], 0, 0.0
    audio_parts = []
    for si, (title, bs) in enumerate(SCENES):
        starts, acc_t = [], 0.0
        for j in range(len(bs)): starts.append(acc_t); acc_t += durs[bi + j]
        items = [(b[1], b[2]) for b in bs if b[2]]
        item_for_beat = []; c = 0
        for b in bs:
            if b[2]: c += 1
            item_for_beat.append(c)
        sd = acc_t + (0.9 if si == 0 else 0.4); base = t0; sbi = bi
        def mk(t, title=title, items=items, starts=starts, ifb=item_for_beat, base=base, sd=sd):
            k = max([i for i, s in enumerate(starts) if s <= t] or [0])
            return draw(0, title, items, ifb[k], k, (base + t) / total)
        clip = VideoClip(mk, duration=sd).set_fps(FPS)
        for j in range(len(bs)): audio_parts.append(AudioFileClip(wavs[bi + j]).set_start(t0 + starts[j] + 0.1))
        clips.append(clip); bi += len(bs); t0 += sd
    video = concatenate_videoclips(clips).set_audio(CompositeAudioClip(audio_parts))
    out = os.path.join(HERE, "sample-linear-equations-1.mp4")
    video.write_videofile(out, fps=FPS, codec="libx264", audio_codec="aac", preset="veryfast", logger=None)
    print("done", out, round(video.duration, 1), "s")

main()
