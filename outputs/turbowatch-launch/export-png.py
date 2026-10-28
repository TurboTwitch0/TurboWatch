#!/usr/bin/env python3
"""Rasterize the standalone SVGs locally with Inkscape and bundled Manrope."""
from pathlib import Path
from tempfile import TemporaryDirectory
from html import escape
import os
import subprocess

folder = Path(__file__).resolve().parent
with TemporaryDirectory(prefix='turbowatch-brand-fonts-') as temporary:
    config = Path(temporary)/'fonts.conf'
    config.write_text(f'''<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><include>/etc/fonts/fonts.conf</include><dir>{escape(str(folder))}</dir><cachedir>{escape(temporary)}/cache</cachedir></fontconfig>''')
    env = dict(os.environ, FONTCONFIG_FILE=str(config))
    for name,width,height in [('brand-sheet',1600,1200),('social-preview',1200,630),('portrait-promo',1080,1350)]:
        source=folder/f'{name}.svg'
        if not source.exists():
            continue
        subprocess.run(['inkscape', str(source), '--export-type=png', f'--export-filename={folder/name}.png', f'--export-width={width}', f'--export-height={height}'], check=True, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f'Exported {name}.png {width}x{height}')
