#!/usr/bin/env python3
"""שומר בריפו את התמונות שיוצאו מהאפליקציה (merchavei-images.json).
שימוש: python3 tools/import-images.py <path/to/merchavei-images.json>
כותב img/lv/<key>.jpg (נקודתיים הופכות לקו תחתון), ומעדכן data/levels/images.js."""
import sys, json, base64, os, re
src = json.load(open(sys.argv[1]))
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'img', 'lv'); os.makedirs(out, exist_ok=True)
man = os.path.join(root, 'data', 'levels', 'images.js')
keys = set(re.findall(r"'([^']+)'", open(man).read().split('export default', 1)[1])) if os.path.exists(man) else set()
n = 0
for k, url in src.items():
    if not re.fullmatch(r"[a-z0-9]+(:(model|real))?", k): continue
    m = re.match(r"data:image/[a-z]+;base64,(.*)", url, re.S)
    if not m: continue
    open(os.path.join(out, k.replace(':', '_') + '.jpg'), 'wb').write(base64.b64decode(m.group(1)))
    keys.add(k); n += 1
body = ',\n'.join(f"  '{k}'" for k in sorted(keys))
open(man, 'w').write("// תמונות הרמות ששמורות בריפו (img/lv). מפתח: id למרחב מחייה, id:level לאחרות. נוצר ע״י tools/import-images.py\nexport default [\n" + body + "\n];\n")
print(n, 'images saved;', len(keys), 'in repo')
