"""静态检查，不替代微信开发者工具编译和手机真机测试。"""
import json
import re
import subprocess
from pathlib import Path
root=Path(__file__).parents[1]/'shici'
app=json.loads((root/'app.json').read_text())
assert len(set(app['pages']))==len(app['pages'])
for page in app['pages']:
    for ext in ['js','json','wxml','wxss']:
        assert (root/(page+'.'+ext)).is_file(), (page,ext)
for p in root.rglob('*.json'):
    json.loads(p.read_text(encoding='utf-8-sig'))
for p in root.rglob('*.js'):
    subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
for p in root.rglob('*.wxml'):
    text=re.sub(r'<!--.*?-->','',p.read_text(),flags=re.S)
    text=re.sub(r'\{\{.*?\}\}','BINDING',text,flags=re.S)
    stack=[]
    for m in re.finditer(r'<(/?)([\w-]+)\b[^>]*?(/?)>',text):
        close,tag,self_close=m.groups()
        if close:
            assert stack and stack.pop()==tag, f'{p}: mismatched {m.group()}'
        elif not self_close:
            stack.append(tag)
    assert not stack, f'{p}: unclosed {stack}'
    for asset in re.findall(r'(?:src|poster)=[\"\'](/assets/[^\"\']+)',text):
        assert (root/asset.lstrip('/')).exists(), asset
for page in ['pages/luoyang/luoyang','pages/ai-ask/ai-ask','pages/home/home','pages/routes/routes']:
    text=(root/(page+'.wxml')).read_text(); js=(root/(page+'.js')).read_text()
    for method in re.findall(r'(?:bind|catch)(?:tap|change|input|confirm)="(\w+)"',text):
        assert re.search(r'\b'+method+r'\s*\(',js), (page,method)
assert not list(root.rglob('.env'))
print(f"Static project checks passed: {len(app['pages'])} pages, JSON/JS syntax, WXML tag nesting, changed-page event handlers and static asset references")
