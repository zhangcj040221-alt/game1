"""Refresh the bundled CJK font after editing app text. Requires fontTools.
Usage: python tools/sculpt/subset-font.py [path/to/NotoSansCJK-Regular.ttc]
Uses the Simplified Chinese face (index 2) of the installed Noto collection.
"""
import sys
from pathlib import Path
from fontTools import subset

root = Path(__file__).resolve().parents[2]
source = sys.argv[1] if len(sys.argv) > 1 else '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
text = ''.join(p.read_text() for p in (root / 'app').rglob('*')
               if p.suffix in {'.html', '.js', '.json', '.css'})
options = subset.Options()
options.flavor = 'woff'
options.font_number = 2
font = subset.load_font(source, options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
subset.save_font(font, str(root / 'app/public/fonts/card-cjk.woff'), options)
