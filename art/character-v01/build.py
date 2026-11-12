from pathlib import Path
import xml.etree.ElementTree as E
import copy,json,subprocess,hashlib,random
from PIL import Image
P=Path(__file__).parent; BASE=P/'baseline';NS='http://www.w3.org/2000/svg';E.register_namespace('',NS)
def tag(s):return '{'+NS+'}'+s
def add(parent,name,**attrs):return E.SubElement(parent,tag(name),{k.replace('_','-'):str(v) for k,v in attrs.items()})
def render(src,out,width=1440):subprocess.run(['inkscape',str(src),f'--export-width={width}',f'--export-filename={out}'],check=True,capture_output=True)
def gradient(defs,id,colors,style):
 g=add(defs,'radialGradient',id=id,cx='.64',cy='.29',r='.78',fx='.64',fy='.29',gradientTransform='matrix(1 0 0 1.02 0 0)')
 for off,c in colors:add(g,'stop',offset=off,stop_color=c)
 return 'url(#'+id+')'
def geometry(root):return [(e.tag,e.get('d'),e.get('cx'),e.get('cy'),e.get('rx'),e.get('ry'),e.get('transform')) for e in root.iter() if e.tag in (tag('path'),tag('ellipse'),tag('g'))]
manifest={'version':'art-v01','baseline':'R05','status':'首版美术资产，待视觉验收','styles':[]}
for style,label in [('A','柔光绘本_主版本'),('B','哑光软陶_辅助版本')]:
 folder=P/(style+'_'+label);folder.mkdir(exist_ok=True);records=[]
 for name in ['一二','布布']:
  original=E.parse(BASE/(name+'-R05.svg')).getroot();root=copy.deepcopy(original);root.set('width','1440');root.set('height','1440')
  defs=E.Element(tag('defs'));root.insert(0,defs)
  colorsA={'white': [('0','#fffdf5'),('.58','#fbf5e9'),('1','#d8d9e2')], 'tan':[('0','#f4c9a5'),('.52','#e5b28f'),('1','#b98373')], 'dark':[('0','#765043'),('.55','#59352e'),('1','#38252b')]}
  colorsB={'white':[('0','#fff9e9'),('.36','#f7eee0'),('.65','#e7dfd8'),('.85','#c5bec5'),('1','#a6a8b9')], 'tan':[('0','#f6caa4'),('.36','#e8b18c'),('.65','#d39b7e'),('.85','#b57c68'),('1','#93645f')], 'dark':[('0','#906653'),('.35','#704936'),('.72','#503127'),('1','#34252c')]}
  palette=colorsA if style=='A' else colorsB
  for material,stops in palette.items():gradient(defs,style+'_'+material,stops,style)
  # Fine grain is clipped inside each painted shape and does not distort its edge.
  f=add(defs,'filter',id=style+'_grain',x='0',y='0',width='100%',height='100%',color_interpolation_filters='sRGB')
  add(f,'feTurbulence',type='fractalNoise',baseFrequency='.72' if style=='A' else '1.05',numOctaves='2',seed='7',result='noise')
  add(f,'feColorMatrix',type='saturate',values='0',in_='noise',result='gray')
  # Set the texture's opacity low enough to remain subtle at card display sizes.
  ct=add(f,'feComponentTransfer',in_='gray',result='grain');add(ct,'feFuncA',type='linear',slope='.075' if style=='A' else '.11')
  add(f,'feComposite',in_='grain',in2='SourceGraphic',operator='in',result='clipped')
  add(f,'feBlend',in_='SourceGraphic',in2='clipped',mode='soft-light',result='textured')
  if style=='B':
   add(f,'feMorphology',in_='SourceAlpha',operator='erode',radius='2',result='inset')
   add(f,'feGaussianBlur',in_='inset',stdDeviation='2.5',result='softInset')
   add(f,'feComposite',in_='SourceAlpha',in2='softInset',operator='out',result='rim')
   add(f,'feFlood',flood_color='#5d4541',flood_opacity='.27',result='rimColor')
   add(f,'feComposite',in_='rimColor',in2='rim',operator='in',result='rimShade')
   add(f,'feBlend',in_='textured',in2='rimShade',mode='multiply')
  # Fix XML attribute spelling for SVG's reserved 'in'.
  for e in defs.iter():
   if 'in-' in e.attrib:e.set('in',e.attrib.pop('in-'))
  for g in root:
   if g.tag!=tag('g'):continue
   gid=g.get('id','');is_face=gid.startswith(('10_','11_','12_','13_','14_'))
   for e in g:
    fill=e.get('fill','');eid=e.get('id','')
    if is_face:
     if '腮红' in eid:e.set('opacity','.84' if style=='A' else '.82')
     continue
    outline=('轮廓' in eid or '外线' in eid)
    if outline:
     e.set('opacity','1' if style=='A' else '.08')
     continue
    if fill.lower() in ['#ffffff','#dca68b','#4a251f']:
     key={'#ffffff':'white','#dca68b':'tan','#4a251f':'dark'}[fill.lower()]
     e.set('fill',f'url(#{style}_{key})');e.set('filter',f'url(#{style}_grain)')
  root.find(tag('title')).text=name+' / '+label+' / 基于R05原路径'
  assert geometry(original)==geometry(root),'Geometry drift'
  svg=folder/(name+'-'+style+'.svg');E.ElementTree(root).write(svg,encoding='unicode');png=folder/(name+'-'+style+'.png');render(svg,png)
  layers=folder/(name+'_layers');layers.mkdir(exist_ok=True);layerlist=[]
  for idx,g in enumerate([g for g in root if g.tag==tag('g')]):
   part=copy.deepcopy(root)
   for el in list(part):
    if el.tag==tag('g') and el.get('id')!=g.get('id'):part.remove(el)
   stem=f'{idx:02d}_'+g.get('id');source=layers/(stem+'.svg');E.ElementTree(part).write(source,encoding='unicode');render(source,layers/(stem+'.png'),960)
   layerlist.append({'order':idx,'name':g.get('id'),'svg':source.name,'png':stem+'.png'})
  (layers/'layers.json').write_text(json.dumps({'canvas':[240,240],'png_canvas':[960,960],'anchor':[0,0],'layers':layerlist},ensure_ascii=False,indent=2))
  records.append({'character':name,'svg':svg.name,'png':png.name,'layer_count':len(layerlist),'geometry_equal_to_R05':True,'source_sha256':hashlib.sha256((BASE/(name+'-R05.svg')).read_bytes()).hexdigest()})
 manifest['styles'].append({'style':style,'name':label,'characters':records})
(P/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
def txt(x,y,s,size=24,color='#e6d7b2'):return f'<text x="{x}" y="{y}" font-family="Noto Sans CJK SC" font-size="{size}" fill="{color}">{s}</text>'
def contents(n,style):
 r=E.parse(P/(style+('_柔光绘本_主版本' if style=='A' else '_哑光软陶_辅助版本'))/(n+'-'+style+'.svg')).getroot();return ''.join(E.tostring(g,encoding='unicode') for g in r if g.tag not in [tag('title')])
def stars(seed):
 rng=random.Random(seed);return ''.join(f'<circle cx="{rng.randrange(40,610)}" cy="{rng.randrange(80,400)}" r="{rng.choice([.8,1,1.4])}" fill="#ead8a1" opacity="{rng.uniform(.3,.85):.2f}"/>' for _ in range(65))
board=['<rect width="1440" height="1160" fill="#0b1428"/>',txt(50,58,'一二布布 · 美术资产 V01',30),txt(50,96,'两套材质沿用 R05 原路径与五官坐标 · 以角色基准约束造型',18,'#8796b0')]
for i,style in enumerate(['A','B']):
 x=40+i*700;board.append(f'<g transform="translate({x} 130)"><defs><linearGradient id="sky{style}" x2="0" y2="1"><stop stop-color="#16284b"/><stop offset="1" stop-color="#425768"/></linearGradient></defs><rect width="660" height="850" rx="24" fill="url(#sky{style})" stroke="#c4ab7f" stroke-width="2"/>')
 board += [txt(30,52,'A · 柔光绘本 / 主版本' if style=='A' else 'B · 哑光软陶 / 辅助版本',25),stars(7),'<circle cx="510" cy="205" r="40" fill="#f4dda4"/><circle cx="525" cy="194" r="36" fill="#203455"/>','<path d="M0 715 Q190 660 370 695 T660 705 L660 825 Q660 850 635 850 H25 Q0 850 0 825Z" fill="#29434e"/>']
 for name,cx,px in [('一二',100,182),('布布',81.5,478)]:
  board.append(f'<g transform="translate({px-cx*1.9} 305) scale(1.9)">'+contents(name,style)+'</g>')
 board += [txt(30,813,'清晰轮廓 · 柔和明暗 · 细微纸感' if style=='A' else '减弱描边 · 饱满明暗 · 哑光表面',20),'</g>']
board += [txt(50,1038,'资产规格',23),txt(50,1080,'完整角色：1440×1440 透明 PNG + 分层 SVG；部件：960×960 透明 PNG + SVG。',18,'#a9b4c6'),txt(50,1115,'两版均为 2.5D 烘焙外观；未制作三维模型、法线贴图和实时体积光照。当前为待验收资产。',18,'#a9b4c6')]
(P/'asset-review.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1160">'+''.join(board)+'</svg>');render(P/'asset-review.svg',P/'asset-review.png',1440)
(P/'README.md').write_text('''# 一二布布美术资产 V01\n\nA 柔光绘本为主版本，B 哑光软陶为辅助版本。本包为首版可复用角色资产，尚待视觉验收。\n\n## 造型\n以用户确认的 R05 为唯一几何基准。所有路径、椭圆坐标、部件变换与绘制顺序保持一致；构建脚本逐项断言。原图对比中的生成式角色未作为新母版。一二保留独立鞋子、颈带与领结；布布没有添加鞋子。\n\n## 文件\n每版包括两位角色的分层 SVG、1440方形透明 PNG、原坐标部件 SVG 和960方形透明 PNG。layers.json 给出部件绘制顺序；全部画布为统一240×240源坐标，导出部件不裁切，方便按相同原点重新装配。基础造型文件在 baseline/。\n\n## 美术\nA：保留深棕轮廓，柔和色阶，细微纸感。B：弱化轮廓，更饱满明暗与微粒表面。均由可编辑渐变与SVG滤镜完成，几何不依赖生成图抽样，材质效果是2.5D烘焙外观。不是三维黏土模型，也不是PSD。光照方向已画入外观，不会因卡牌旋转自动得到新的侧面或真实体积光照。部件独立移动时需检查明暗接缝。\n\n## 接入\n沿用现有Three.js分层方式，优先用SVG原始240画布或部件PNG；眼睛与嘴部独立。完整PNG用于静态预览。角色透明材质沿用已修复的alphaTest与depthWrite策略。\n\nasset-review为同场景预览；背景仅用于检查组合效果，未作为正式场景美术交付。未替换当前在线样片。\n\n运行 python build.py 需要 Inkscape。\n''')
print('Built 4 characters, layered sources, transparent exports and preview')
