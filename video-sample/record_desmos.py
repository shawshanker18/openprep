# Records real desmos.com/calculator sessions as frame sequences (typing, zoom, clicking) + beat marks.
import os, json, shutil
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "desmos_frames")
VW, VH = 1100, 620
CUR = """(()=>{const c=document.createElement('div');c.id='fakecur';c.style.cssText='position:fixed;left:0;top:0;z-index:99999;pointer-events:none;width:28px;height:28px;transition:none;';
c.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24"><path d="M3 2l16 9-7 2 4 8-3 1-4-8-6 5z" fill="#111" stroke="#fff" stroke-width="1.5"/></svg>';document.body.appendChild(c);window.__mv=(x,y)=>{c.style.transform='translate('+x+'px,'+y+'px)'};window.__mv(520,420)})()"""

def record(p, name, steps):
    d = os.path.join(OUT, name); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    b = p.chromium.launch(channel="chrome", headless=True); pg = b.new_page(viewport={"width": VW, "height": VH})
    pg.goto("https://www.desmos.com/calculator", wait_until="networkidle"); pg.wait_for_timeout(2500)
    pg.mouse.click(303, 523); pg.wait_for_timeout(300)  # close the "log in" tip
    pg.evaluate(CUR); n = [0]; marks = []; cur = [520, 420]
    def snap(k=1):
        for _ in range(k):
            pg.screenshot(path=os.path.join(d, f"{n[0]:04d}.jpg"), type="jpeg", quality=88); n[0] += 1
    def typ(text):
        for ch in text: pg.keyboard.type(ch); snap()
    def move(x, y, frames=14):
        x0, y0 = cur
        for i in range(1, frames + 1):
            t = i / frames; t = t*t*(3-2*t); pg.evaluate(f"__mv({x0+(x-x0)*t},{y0+(y-y0)*t})"); pg.mouse.move(x0+(x-x0)*t, y0+(y-y0)*t); snap()
        cur[:] = [x, y]
    def px(mx, my):
        g = pg.evaluate("Calc.graphpaperBounds"); pc, mc = g["pixelCoordinates"], g["mathCoordinates"]
        return (pc["left"] + (mx-mc["left"])/(mc["right"]-mc["left"])*(pc["right"]-pc["left"]),
                46 + pc["top"] + (mc["top"]-my)/(mc["top"]-mc["bottom"])*(pc["bottom"]-pc["top"]))
    ctx = dict(snap=snap, typ=typ, move=move, px=px, pg=pg, mark=lambda: marks.append(n[0]))
    for s in steps: s(ctx)
    marks.append(n[0]); json.dump({"marks": marks, "frames": n[0], "fps": 12}, open(os.path.join(d, "marks.json"), "w"))
    b.close(); print(name, n[0], "frames", marks)

def s_intro(c): c["mark"](); c["snap"](30)
def typer(text, hold=14):
    def f(c): c["mark"](); c["snap"](4); c["typ"](text); c["pg"].keyboard.press("Enter"); c["snap"](hold)
    return f
def zoom_click(ix, iy, bounds):
    def f(c):
        c["mark"](); c["pg"].evaluate(f"Calc.setMathBounds({bounds})"); c["pg"].wait_for_timeout(400); c["snap"](10)
        x, y = c["px"](ix, iy); c["move"](x, y); c["snap"](4)
        c["pg"].mouse.click(x, y); c["snap"](8); c["pg"].mouse.click(x, y); c["snap"](6)
    return f
def hold(n=36):
    def f(c): c["mark"](); c["snap"](n)
    return f

with sync_playwright() as p:
    record(p, "ex1", [s_intro, typer("y=7x+4"), typer("y=3x+24"),
                      zoom_click(5, 39, "{left:-4,right:12,bottom:-6,top:60}"), hold(44)])
    record(p, "ex2", [s_intro, typer("y=20+8x"), typer("y=60"),
                      zoom_click(5, 60, "{left:-3,right:12,bottom:-10,top:90}"), hold(44)])
