#!/usr/bin/env python3
"""Create standalone SVG artwork from the real TurboWatch screenshots."""
from pathlib import Path
from base64 import b64encode
from html import escape
import json

OUT = Path(__file__).resolve().parent
PINE, PAPER, CORAL, SAGE, BUTTER = '#24382b', '#f7f5ef', '#e64c36', '#edf1e6', '#e4b96e'
MUTED, LINE = '#64725e', '#dce2d3'
FONT = b64encode((OUT/'manrope.ttf').read_bytes()).decode()
STYLE = f'''<style>@font-face{{font-family:Manrope;src:url(data:font/ttf;base64,{FONT}) format('truetype');font-weight:200 800}}text{{font-family:Manrope,Arial,sans-serif}}.editorial{{font-family:Georgia,'Times New Roman',serif;font-style:italic}}</style>'''


def image_data(path):
    path = Path(path)
    mime = 'image/svg+xml' if path.suffix == '.svg' else 'image/png'
    return f'data:{mime};base64,' + b64encode(path.read_bytes()).decode()


def image(path, x, y, width, height, extra=''):
    return f'<image href="{image_data(path)}" x="{x}" y="{y}" width="{width}" height="{height}" {extra}/>'


def text(x, y, value, size=18, weight=400, fill=PINE, extra=''):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" {extra}>{escape(value)}</text>'


def rect(x, y, w, h, fill, radius=22, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" {extra}/>'


def svg(width, height, title, description, body, defs=''):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc><defs>{STYLE}<filter id="shadow" x="-30%" y="-20%" width="170%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="18" result="blur"/><feOffset in="blur" dx="0" dy="18" result="offset"/><feFlood flood-color="#24382b" flood-opacity=".14" result="color"/><feComposite in="color" in2="offset" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>{defs}</defs>{body}</svg>'''


def logo(x, y, width=280, dark=False):
    return image(OUT/('logo-inverse.svg' if dark else 'logo-primary.svg'), x, y, width, width*80/363)


def spark(x, y, size=64):
    return image(OUT/'icon.svg', x, y, size, size)


def orbit(cx, cy, rx, ry, color=LINE, rotation=-24):
    return f'<g transform="rotate({rotation} {cx} {cy})" fill="none" stroke="{color}"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/><ellipse cx="{cx}" cy="{cy}" rx="{rx-24}" ry="{ry-24}"/></g>'


def arrow(x, y, color=PINE, scale=1):
    return f'<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 14 14 2M3 2h11v11"/></g>'


def play(x, y, color=PINE, scale=1):
    return f'<g transform="translate({x} {y}) scale({scale})"><circle cx="16" cy="16" r="15" fill="none" stroke="{color}" stroke-width="1.8"/><path d="m13 9 10 7-10 7z" fill="{color}"/></g>'


def bookmark(x, y, color=PINE, scale=1):
    return f'<g transform="translate({x} {y}) scale({scale})"><path d="M8 4h16v25l-8-5-8 5z" fill="none" stroke="{color}" stroke-width="1.8" stroke-linejoin="round"/></g>'


def conversation(x, y, color=PINE, scale=1):
    return f'<g transform="translate({x} {y}) scale({scale})"><path d="M28 15a12 12 0 0 1-17 11l-7 2 2-7A12 12 0 1 1 28 15Z" fill="none" stroke="{color}" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 14h12M10 19h8" stroke="{color}" stroke-width="1.8" stroke-linecap="round"/></g>'


def brand_sheet():
    b = rect(0,0,1600,1200,PAPER,0)
    b += rect(0,0,1600,398,PINE,0)
    b += orbit(1240,188,332,190,'#52654f',-26)
    b += logo(68,45,295,True)
    b += text(72,156,'TURBOWATCH / A CURIOUS LITTLE WORLD',13,650,SAGE,'letter-spacing="2.2"')
    b += text(68,246,'Follow your',76,650,PAPER)
    b += text(72,336,'curiosity.',90,400,BUTTER,'class="editorial"')
    b += text(920,318,'A home for good finds.',25,500,PAPER)
    b += text(920,354,'Watch short stories. Save good finds. Share a point of view.',15,400,'#c9d4c0')
    b += f'<g transform="rotate(-8 1210 168)">{spark(1150,108,120)}</g>'
    b += text(72,450,'01 / PALETTE',13,700,MUTED,'letter-spacing="2"')
    names = [('Pine',PINE),('Paper',PAPER),('Coral',CORAL),('Sage',SAGE),('Butter',BUTTER)]
    for i,(name,color) in enumerate(names):
        x=72+i*296
        b += rect(x,479,272,126,color,18,f'stroke="{LINE}"')
        b += text(x+16,639,name,19,650)
        b += text(x+16,670,color.upper(),14,450,MUTED)
    b += rect(72,722,770,316,'#fffdf8',24,f'stroke="{LINE}"')
    b += text(100,765,'02 / TYPE WITH A POINT OF VIEW',13,700,MUTED,'letter-spacing="1.6"')
    b += text(100,826,'Good finds, all in one place.',38,650)
    b += text(100,875,'A different point of view.',38,400,PINE,'class="editorial"')
    b += text(100,926,'Manrope • controls, clarity, confident headings',16,550,MUTED)
    b += text(100,963,'Georgia italic • a single editorial accent',16,450,MUTED)
    b += text(100,1000,'Clear hierarchy. Comfortable spacing. Words you can read.',16,450,MUTED)
    b += rect(872,722,656,316,SAGE,24,f'stroke="{LINE}"')
    b += text(902,765,'03 / SMALL, CONSISTENT DETAILS',13,700,MUTED,'letter-spacing="1.6"')
    b += rect(902,796,214,54,PINE,27)+text(928,831,'Explore TurboWatch',16,600,PAPER)+arrow(1085,817,PAPER,.8)
    b += rect(1134,796,174,54,'#fffdf8',27,f'stroke="{LINE}"')+bookmark(1150,807, PINE,.82)+text(1185,830,'Save a find',16,600)
    b += play(902,892,CORAL,1.2)+bookmark(974,892,CORAL,1.2)+conversation(1046,892,CORAL,1.2)
    b += text(902,972,'Rounded surfaces. Orbital lines. One familiar spark.',16,450,MUTED)
    b += text(902,1005,'Quiet motion; full respect for reduced motion.',15,450,MUTED)
    b += text(72,1110,'Warm. Curious. Quietly energetic.',30,600)
    b += text(72,1151,'Original TurboWatch identity • no invented testimonials, audience totals, scores, or predictive claims.',14,400,MUTED)
    b += logo(1150,1084,375)
    return svg(1600,1200,'TurboWatch visual identity','Original visual brand sheet showing logo variants, palette, typography and interface direction.',b)


def landscape():
    shot=OUT/'product-desktop.png'
    if not shot.exists(): raise FileNotFoundError(f'Capture the actual product screen first: {shot}')
    defs='<clipPath id="screen"><rect x="577" y="163" width="566" height="413" rx="12"/></clipPath>'
    b=rect(0,0,1200,630,PAPER,0)+orbit(1060,240,330,238,LINE,-28)
    b+=logo(52,44,270)
    b+=text(56,159,'WATCH · COLLECT · CONNECT',12,700,MUTED,'letter-spacing="2.4"')
    b+=text(52,230,'A feed for your',53,650)
    b+=text(54,309,'curiosity.',82,400,PINE,'class="editorial"')
    b+=text(56,366,'Watch short stories. Save good finds.',17,450,MUTED)
    b+=text(56,395,'Share a point of view.',17,450,MUTED)
    b+=rect(56,449,261,58,PINE,29)+text(80,486,'Explore TurboWatch',18,600,PAPER)+arrow(287,469,PAPER,1)
    b+=text(56,577,'A little scrolling. A lot of possibility.',13,500,MUTED)
    b+='<g transform="rotate(-3 860 351)">'
    b+=rect(565,125,590,463,'#fffdf8',22,'filter="url(#shadow)" stroke="#dce2d3"')
    b+=f'<circle cx="586" cy="145" r="4" fill="{CORAL}"/><circle cx="600" cy="145" r="4" fill="{BUTTER}"/><circle cx="614" cy="145" r="4" fill="#b6c3a8"/>'
    b+=text(643,149,'TURBOWATCH / PRODUCT PREVIEW',9,650,MUTED,'letter-spacing="1.1"')
    b+=image(shot,577,163,566,413,'clip-path="url(#screen)" preserveAspectRatio="xMidYMin slice"')
    b+='</g>'
    b+=rect(862,82,298,30,SAGE,15)+text(883,102,'Actual app · sample preview',13,600,MUTED)
    b+=rect(885,494,265,92,PINE,20,'filter="url(#shadow)"')+bookmark(904,512,PAPER,.9)
    b+=text(944,529,'Save a little inspiration.',15,600,PAPER)+text(944,554,'Keep finds in private collections.',11,400,'#d3dec9')
    return svg(1200,630,'TurboWatch — a feed for your curiosity','Landscape launch artwork with a real local TurboWatch screen. Sample content is labeled.',b,defs)


def portrait():
    shot=OUT/'product-mobile.png'
    if not shot.exists(): raise FileNotFoundError(f'Capture the actual mobile product preview first: {shot}')
    defs='<clipPath id="phone"><rect x="563" y="332" width="414" height="896" rx="28"/></clipPath>'
    b=rect(0,0,1080,1350,PAPER,0)+orbit(872,846,420,353,LINE,-22)
    b+=logo(68,51,337)
    b+=text(74,185,'YOUR DAILY RABBIT HOLE',14,700,MUTED,'letter-spacing="2.5"')
    b+=text(68,291,'Watch.',104,650)
    b+=text(72,400,'Save.',112,400,PINE,'class="editorial"')
    b+=text(68,511,'Share.',104,650)
    b+=text(73,568,'Make a little room',23,450,MUTED)
    b+=text(73,604,'for discovery.',23,450,MUTED)
    b+=rect(72,660,347,70,PINE,35)+text(100,704,'Follow your curiosity',23,600,PAPER)+arrow(384,686,PAPER,1.15)
    b+=rect(72,834,350,324,SAGE,28,f'stroke="{LINE}"')
    b+=text(98,881,'GOOD FINDS, ALL IN ONE PLACE',11,700,MUTED,'letter-spacing="1.2"')
    b+=play(97,916,CORAL,1.15)+text(151,943,'Watch short stories',20,600)
    b+=bookmark(97,991,CORAL,1.15)+text(151,1018,'Collect your favorites',20,600)
    b+=conversation(97,1066,CORAL,1.15)+text(151,1093,'Share a perspective',20,600)
    b+='<g transform="rotate(4 770 778)">'
    b+=rect(548,314,444,930,PINE,43,'filter="url(#shadow)"')
    b+=image(shot,563,332,414,896,'clip-path="url(#phone)" preserveAspectRatio="xMidYMid slice"')
    b+='</g>'
    b+=rect(653,269,355,32,SAGE,16)+text(674,291,'Actual mobile app · sample preview',15,600,MUTED)
    b+=text(74,1296,'TURBOWATCH / FOLLOW YOUR CURIOSITY',13,700,MUTED,'letter-spacing="1.5"')
    return svg(1080,1350,'TurboWatch — Watch. Save. Share.','Portrait launch artwork with a real local guest product preview, labeled sample imagery, and delivered watching, collection, and sharing capabilities.',b,defs)


if __name__=='__main__':
    (OUT/'brand-sheet.svg').write_text(brand_sheet())
    for name,maker in [('social-preview',landscape),('portrait-promo',portrait)]:
        try:
            (OUT/f'{name}.svg').write_text(maker())
        except FileNotFoundError as error:
            print(error)
    print(json.dumps({'output':str(OUT),'brand':'TurboWatch','palette':[PINE,PAPER,CORAL,SAGE,BUTTER]}))
