"""Chef Bu, revised art direction. Blender 4.3; run from repository root."""
import bpy, math, random, os
from mathutils import Vector
random.seed(28)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets')
def mat(name,color,metal=0,rough=.4):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
gold=mat('Honey gold',(.72,.33,.055),.82,.23)
edge=mat('Champagne edge',(1,.71,.27),.72,.17)
opal=mat('Pearlescent lavender',(.51,.43,.66),.68,.23)
ivory=mat('Banner warm enamel',(.96,.78,.43),.15,.32)
fur=mat('Caramel vinyl',(.59,.245,.09),0,.57)
inner=mat('Ear cocoa',(.27,.095,.038),0,.55)
yellow=mat('Golden cheeks',(1,.57,.04),0,.46)
ink=mat('Espresso face',(.055,.016,.008),0,.38)
pink=mat('Tongue',(.97,.19,.19),0,.42)
white=mat('Warm chef cotton',(.88,.86,.80),0,.64)
white.node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value=.18
red=mat('Tomato red scarf',(.68,.027,.014),0,.38)
pan=mat('Black seasoned iron',(.036,.043,.061),.58,.3)
wood=mat('Walnut',(.18,.064,.025),0,.6)
wall=mat('Kitchen teal shadow',(.065,.10,.105),0,.7)
green=mat('Basil green',(.18,.43,.025),0,.38)
lime=mat('Leaf light',(.39,.61,.045),0,.42)
tomato=mat('Ripe tomato',(.72,.035,.012),0,.28)
cheese=mat('Cheddar',(1,.49,.016),0,.5)
shrimp=mat('Prawn orange',(.95,.22,.025),0,.4)
glass=mat('Jar amber',(.31,.16,.06),.12,.27)
def smooth(o):
 if o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o
def uv(name,loc,scale,m,seg=40,rings=24):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m);return smooth(o)
def box(name,loc,size,m,b=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if b:
  mod=o.modifiers.new('Soft bevel','BEVEL');mod.width=b;mod.segments=4
  o.modifiers.new('Face normals','WEIGHTED_NORMAL')
 return o
def tube(name,points,r,m,closed=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=r;c.bevel_resolution=4
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for b,p in zip(s.bezier_points,points):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 s.use_cyclic_u=closed;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def link(name,a,b,r,m):return tube(name,[a,b],r,m)
def star(name,x,y,z,r,m):
 verts=[]
 for zz in (z-.09,z+.09):
  for i in range(10):
   a=math.pi/2+i*math.pi/5;rr=r if i%2==0 else r*.46;verts.append((x+math.cos(a)*rr,y+math.sin(a)*rr,zz))
 faces=[tuple(range(9,-1,-1)),tuple(range(10,20))]+[(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 mod=o.modifiers.new('Jewelled star edges','BEVEL');mod.width=.045;mod.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
# A shaped frame with a crowned arch and a lower point. The inset is recessed.
outline=[(0,3.64),(-1.05,3.35),(-2.18,3.38),(-2.68,2.92),(-2.76,2.3),(-2.7,-2.78),(-2.29,-3.3),(-1.1,-3.39),(0,-3.91),(1.1,-3.39),(2.29,-3.3),(2.7,-2.78),(2.76,2.3),(2.68,2.92),(2.18,3.38),(1.05,3.35)]
# Build a filled silhouette behind rounded frame tubing.
verts=[(x,y,-.48) for x,y in outline]+[(x,y,-.2) for x,y in outline]
n=len(outline);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh=bpy.data.meshes.new('Shaped backing');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Shaped card backing',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(gold)
box('Recessed kitchen',(0,0,-.08),(4.97,6.46,.25),wall,.35)
# Broad sculpted metal cross-section, rather than stacked round pipes.
def contour_samples(points,steps=12):
 out=[];n=len(points)
 for i in range(n):
  p0,p1,p2,p3=[Vector(points[j%n]) for j in (i-1,i,i+1,i+2)]
  for k in range(steps):
   t=k/steps;t2=t*t;t3=t2*t
   out.append((p1*2+(p2-p0)*t+(p0*2-p1*5+p2*4-p3)*t2+(-p0+p1*3-p2*3+p3)*t3)*.5)
 return out
contour=contour_samples(outline)
profiles=[(1.025,-.12),(1.025,.03),(1.01,.13),(.993,.18),(.975,.12),(.952,.10),(.935,.17),(.916,.25),(.895,.22),(.89,.06)]
vs=[(p.x*scale,p.y*scale,z) for scale,z in profiles for p in contour]
N=len(contour);fs=[]
for j in range(len(profiles)-1):
 for i in range(N):fs.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
me=bpy.data.meshes.new('Faceted jewellery cross section');me.from_pydata(vs,[],fs);me.update()
o=bpy.data.objects.new('Sculpted broad gold and opal frame',me);bpy.context.collection.objects.link(o)
for m in (gold,edge,opal):o.data.materials.append(m)
for polygon in me.polygons:
 band=polygon.index//N;polygon.material_index=2 if band in (3,4,5) else (1 if band in (1,2,6) else 0)
 polygon.use_smooth=True
# The slim beads emphasize the broad bevel rather than replacing it.
for scale,z in [(1.01,.145),(.913,.26)]:tube('Fine frame fillet',[(p.x*scale,p.y*scale,z) for p in contour[::6]],.018,edge,True)
# Kitchen: warm side window, tiles, shelves and cookware.
window=mat('Window warm light',(1,.64,.21),0,.5)
p=window.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.58,.17,1);p.inputs['Emission Strength'].default_value=2
box('Window glow',(-1.75,.75,.15),(1.03,3.05,.12),window,.04)
for x in (-2.28,-1.76,-1.24):box('Window mullion',(x,.75,.28),(.07,3.08,.13),wood,.015)
for y in (-.72,.28,1.28,2.28):box('Window horizontal',(-1.75,y,.28),(1.1,.065,.13),wood,.015)
for y in (-1.6,-1.15,-.7,-.25):
 for j in range(5):box('Backsplash tile',(-.65+j*.65,y,.11),(.62,.42,.05),wall,.02)
for y in (1.4,2.38):
 box('Walnut shelf',(.55,y,.28),(3.2,.13,.56),wood,.035)
for x,h in [(-.15,.36),(.35,.48),(.88,.32)]:
 box('Spice jar',(x,2.45+h/2,.28),(.27,h,.3),glass,.05);box('Jar brass lid',(x,2.45+h,.28),(.3,.07,.32),gold,.02)
for x in (1.18,1.96):
 tube('Pan hanging hook',[(x,2.84,.3),(x,2.65,.35),(x,2.55,.5)],.035,edge)
 uv('Hanging skillet',(x,2.1,.34),(.32,.36,.065),pan)
 box('Hanging skillet handle',(x,2.58,.34),(.10,.43,.10),pan,.04)
box('Counter',(0,-2.05,.42),(4.7,.18,1.2),wood,.05)
# Trailing foliage, each leaf has a crease and visible tapered silhouette.
def leaf(name,loc,size,m,angle=0):
 x,y,z=loc
 vs=[];nu=12;nv=6
 for i in range(nu+1):
  v=i/nu;length=v-.5;width=.31*math.sin(math.pi*v)**.8
  for j in range(nv+1):
   u=j/nv*2-1;a=u*width;b=length;c=.10*(1-u*u)*math.sin(math.pi*v)
   vs.append((x+size*(a*math.cos(angle)-b*math.sin(angle)),y+size*(a*math.sin(angle)+b*math.cos(angle)),z+size*c))
 fs=[(i*(nv+1)+j,i*(nv+1)+j+1,(i+1)*(nv+1)+j+1,(i+1)*(nv+1)+j) for i in range(nu) for j in range(nv)]
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 so=o.modifiers.new('Leaf thickness','SOLIDIFY');so.thickness=.012
 smooth(o);return o
tube('Trailing vine',[(-2.3,3.0,.43),(-1.65,2.8,.55),(-1.9,2.1,.52),(-2.15,1.55,.5),(-2.0,.9,.49)],.022,green)
for x,y,s,a in [(-2.05,2.75,.8,-.7),(-1.47,2.6,.64,.6),(-1.85,2.05,.6,-.5),(-2.2,1.57,.53,.8),(-1.97,1.0,.42,-.5)]:leaf('Basil leaf',(x,y,.63),s,lime,a)
# Character: a broad face, tiny torso, deliberate asymmetry in the cooking pose.
uv('Compact jacket body',(0,-.92,.98),(.78,.85,.52),white)
uv('Face soft caramel',(0,.60,1.19),(1.39,1.15,.73),fur,64,40)
for x in (-1.13,1.13):
 uv('Round bear ear',(x,1.38,1.02),(.36,.37,.22),fur)
 uv('Ear inner',(x,1.40,1.225),(.22,.23,.045),inner)
for x in (-.48,.48):uv('Espresso eye',(x,.65,1.892),(.105,.125,.043),ink)
# Blush follows the ellipsoid surface, with no button-like protrusion.
for cx in (-.91,.91):
 vs=[];nr=6;ns=40
 for j in range(nr+1):
  r=j/nr
  for i in range(ns):
   a=i*math.tau/ns;x=cx+.25*r*math.cos(a);y=.25+.235*r*math.sin(a)
   z=1.19+.73*math.sqrt(max(.001,1-(x/1.39)**2-((y-.60)/1.15)**2))+.006
   vs.append((x,y,z))
 fs=[(j*ns+i,j*ns+(i+1)%ns,(j+1)*ns+(i+1)%ns,(j+1)*ns+i) for j in range(nr) for i in range(ns)]
 me=bpy.data.meshes.new('Surface blush');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('Golden cheek surface',me);bpy.context.collection.objects.link(o);o.data.materials.append(yellow);smooth(o)
# The original mascot has a W smile and pink tongue, not an O mouth.
uv('Smile open',(0,.29,1.928),(.135,.18,.025),ink)
uv('Pink tongue',(0,.255,1.956),(.086,.12,.012),pink)
tube('W shaped smile',[(-.19,.46,1.933),(-.15,.385,1.955),(-.07,.395,1.96),(0,.445,1.96),(.075,.385,1.96),(.16,.405,1.95),(.18,.46,1.93)],.025,ink)
# Chef hat: a band plus three bold inflated lobes; less blobby than before.
box('Chef hat band',(0,1.67,1.25),(1.42,.32,.72),white,.13)
for x,y,s in [(-.52,2.08,.39),(0,2.25,.48),(.53,2.08,.39)]:uv('Hat crown',(x,y,1.16),(s,s*.98,.4),white)
for x in (-.42,0,.42):tube('Hat seam',[(x,1.78,1.625),(x*.95,2.0,1.60)],.012,ivory)
# Flared jacket skirt, pressed pocket, scarf tails.
# Rounded trapezoid jacket hem built as ring mesh.
vs=[]
for y,w,z,d in [(-.7,.64,1.03,.45),(-1.58,.92,1.03,.49)]:
 for i in range(32):
  a=2*math.pi*i/32;vs.append((math.cos(a)*w,y,z+math.sin(a)*d))
fs=[tuple(range(31,-1,-1)),tuple(range(32,64))]+[(i,(i+1)%32,(i+1)%32+32,i+32) for i in range(32)]
me=bpy.data.meshes.new('Coat hem');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('Flared chef coat',me);bpy.context.collection.objects.link(o);o.data.materials.append(white);smooth(o)
for x in (-.48,.48):uv('Little caramel foot',(x,-1.73,1.01),(.3,.24,.35),fur)
for y in (-.68,-.99):uv('Chocolate jacket button',(-.31,y,1.505),(.057,.065,.028),ink)
box('Apron pocket',(0,-1.28,1.53),(.67,.43,.055),white,.12)
tube('Apron pocket stitch',[(-.31,-1.12,1.568),(-.29,-1.41,1.568),(0,-1.47,1.57),(.29,-1.41,1.568),(.31,-1.12,1.568)],.012,ivory)
uv('Pocket bear logo',(0,-1.28,1.574),(.12,.10,.012),yellow)
for x in (-.08,.08):uv('Pocket logo ears',(x,-1.2,1.574),(.047,.045,.012),yellow)
tube('Scarf collar',[(-.61,-.32,1.3),(0,-.45,1.57),(.6,-.31,1.3)],.075,red)
uv('Scarf knot',(0,-.47,1.59),(.15,.13,.09),red)
for x,a in [(-.13,-.5),(.13,.5)]:
 o=uv('Scarf pointed tail',(x,-.67,1.57),(.12,.26,.055),red);o.rotation_euler[2]=a
link('Raised left sleeve',(-.64,-.69,1.0),(-1.29,-.21,1.33),.205,white)
uv('Left paw',(-1.44,-.04,1.38),(.22,.23,.19),fur)
link('Spatula red grip',(-1.51,.0,1.51),(-1.69,.62,1.51),.095,red)
link('Spatula steel neck',(-1.69,.62,1.51),(-1.79,.98,1.51),.04,pan)
# Three slots are real gaps, not a blank block.
for x in (-1.98,-1.80,-1.62):box('Spatula slotted bar',(x,1.24,1.51),(.065,.53,.06),opal,.028)
for y in (.99,1.51):box('Spatula cross bar',(-1.8,y,1.51),(.47,.07,.06),opal,.025)
link('Right sleeve',(.64,-.68,1.0),(1.16,-.63,1.33),.205,white)
uv('Right paw',(1.28,-.61,1.4),(.20,.22,.18),fur)
link('Wok handle',(1.22,-.55,1.47),(1.76,-.33,1.51),.075,pan)
# Concave open pan, lathed surface in XY with +Z toward viewer.
vs=[]; rings=[(0,-.17),(.25,-.15),(.53,-.08),(.76,.1),(.78,.17),(.72,.17),(.52,-.015),(.24,-.09),(0,-.1)]
for r,z in rings:
 for i in range(48):
  a=i*math.tau/48;vs.append((1.89+r*math.cos(a),-.28+r*.50*math.sin(a),1.58+z+math.sin(a)*.2))
fs=[]
for j in range(len(rings)-1):
 for i in range(48):fs.append((j*48+i,j*48+(i+1)%48,(j+1)*48+(i+1)%48,(j+1)*48+i))
me=bpy.data.meshes.new('Open concave wok');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('Wok bowl',me);bpy.context.collection.objects.link(o);o.data.materials.append(pan);smooth(o)
tube('Wok silver lip',[(1.89+.78*math.cos(i*math.tau/20),-.28+.39*math.sin(i*math.tau/20),1.75+math.sin(i*math.tau/20)*.2) for i in range(20)],.025,opal,True)
for i in range(12):
 x=1.6+random.random()*.66;y=-.16+random.random()*.9;z=1.78+random.random()*.16
 o=box('Flying ingredient %02d'%i,(x,y,z),(.16,.14,.13),[green,cheese,tomato][i%3],.035);o.rotation_euler=(.2,i*.7,.3)
for x,y in [(2.13,.95),(1.52,.45)]:
 tube('Curved prawn',[(x+.19*math.cos(a),y+.19*math.sin(a),1.88) for a in [0,.6,1.2,1.8,2.4,2.9]],.08,shrimp)
# Steam is subtle curved ivory geometry, visible in the cooler recess.
steam=mat('Steam ivory',(.62,.61,.5),0,.85)
for i in range(2):tube('Steam curl',[(2.23,.48+i*.35,.75),(2.03,.85+i*.35,.65),(2.34,1.2+i*.35,.55),(2.15,1.6+i*.35,.4)],.014,steam)
# Foreground produce.
for x,y,r in [(-1.94,-1.95,.37),(-1.37,-2.03,.32)]:
 uv('Glossy foreground tomato',(x,y,1.0),(r,r*.92,r),tomato)
 for i in range(5):
  a=i*math.tau/5;leaf('Tomato sepal',(x+math.sin(a)*.09,y+.29,1.07+math.cos(a)*.08),.22,green,a)
for i in range(5):leaf('Foreground lettuce',(-2.1+i*.14,-1.53,.83),.65,lime,(i-2)*.35)
box('Cheese wedge',(1.95,-1.87,.8),(.85,.65,.48),cheese,.045)
for x,y in [(1.7,-1.72),(2.09,-1.98),(2.2,-1.7)]:uv('Cheese dimples',(x,y,1.05),(.075,.067,.012),gold)
# folded gingham cloth is geometry with a small generated texture.
img=bpy.data.images.new('Gingham woven checks',width=128,height=128)
pixels=[]
for y in range(128):
 for x in range(128):
  a=(x//16)%2;b=(y//16)%2;col=(.72,.055,.035) if a and b else ((.96,.43,.32) if a or b else (.96,.89,.75));pixels.extend((*col,1))
img.pixels=pixels;img.pack()
cloth=mat('Red gingham cloth',(.9,.4,.3),0,.8);nodes=cloth.node_tree.nodes;t=nodes.new('ShaderNodeTexImage');t.image=img;cloth.node_tree.links.new(t.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
box('Folded gingham cloth',(1.10,-2.16,1.05),(1.4,.34,.68),cloth,.12)
# Ribbon plaque, bowed in depth; real Chinese font in export and render.
font=bpy.data.fonts.load('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
def text(name,body,loc,size,m):
 c=bpy.data.curves.new(name,'FONT');c.body=body;c.font=font;c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.extrude=.012;c.bevel_depth=.003
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(m);return o
# An arched enamel scroll with broad folded ends.
def ribbon(name,halfwidth,center_y,depth,width,m):
 vs=[];nu=48;nv=6
 for i in range(nu+1):
  u=i/nu*2-1;x=u*halfwidth;cy=center_y+.22*(1-u*u);z=depth+.15*(1-u*u)
  for j in range(nv+1):
   v=j/nv*2-1;vs.append((x,cy+width*.5*v,z-.035*v*v))
 fs=[(i*(nv+1)+j,(i+1)*(nv+1)+j,(i+1)*(nv+1)+j+1,i*(nv+1)+j+1) for i in range(nu) for j in range(nv)]
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 solid=o.modifiers.new('Enamel scroll thickness','SOLIDIFY');solid.thickness=.055
 bevel=o.modifiers.new('Polished scroll edges','BEVEL');bevel.width=.025;bevel.segments=3;smooth(o)
ribbon('Gold ribbon surround',2.4,-2.68,1.42,.9,gold)
ribbon('Curved cream ribbon',2.34,-2.68,1.48,.75,ivory)
for i,char in enumerate('厨师布'):
 x=(i-1)*.70;u=x/2.34
 o=text('Chef Bu ribbon letter '+str(i),char,(x,-2.68+.22*(1-u*u),1.53+.15*(1-u*u)),1.90,inner)
 o.rotation_euler[2]=math.atan(-.44*x/(2.34**2))
for side in (-1,1):
 pts=[(side*1.95,-2.65,1.25),(side*2.78,-2.48,.98),(side*2.52,-2.91,1.0),(side*2.72,-3.12,1.0),(side*2.14,-3.0,1.2)]
 me=bpy.data.meshes.new('Ribbon tail');me.from_pydata(pts,[],[tuple(range(5))]);me.update();o=bpy.data.objects.new('Broad folded ribbon tail',me);bpy.context.collection.objects.link(o);o.data.materials.append(ivory)
 so=o.modifiers.new('Ribbon thickness','SOLIDIFY');so.thickness=.08
 be=o.modifiers.new('Rounded ribbon edge','BEVEL');be.width=.055;be.segments=4
 tube('Ribbon gold stitched edge',pts,.028,gold,True)
for x,r in [(-.67,.26),(0,.34),(.67,.26)]:star('Five point award star',x,-3.34,.5,r,edge)
# Four-lobed chef crest on top, and a tiny sculpted chef hat.
crest=[(0,4.02),(-.4,3.91),(-.62,3.57),(-.45,3.23),(0,2.91),(.45,3.23),(.62,3.57),(.4,3.91)]
tube('Chef crest gold',[(x,y,.36) for x,y in crest],.09,edge,True)
uv('Crest backing',(0,3.5,.15),(.56,.56,.14),gold)
box('Crest hat band',(0,3.4,.49),(.46,.18,.11),white,.045)
for x,y,r in [(-.19,3.64,.15),(0,3.7,.19),(.19,3.64,.15)]:uv('Crest hat puff',(x,y,.48),(r,r,.10),white)
for side in (-1,1):
 tube('Laurel stem',[(side*.48,3.15,.3),(side*.85,3.35,.28),(side*1.13,3.73,.22)],.025,gold)
 for j in range(4):leaf('Golden laurel',(side*(.62+j*.13),3.23+j*.13,.34),.35,edge,side*-.65)
# lights, export, render
world=bpy.data.worlds.new('Midnight studio');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.065,.1,1);world.node_tree.nodes['Background'].inputs[1].default_value=.35
def area(name,loc,power,color,size,target=(0,0,.8)):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm softbox',(-4,4,6),650,(1,.70,.39),4)
area('Cool fill',(4,1,4),340,(.57,.71,1),3)
area('Golden rim',(-3,2,1),850,(1,.53,.12),2)
area('Top jewellery strip',(0,6,2.5),600,(1,.85,.57),2)
# Unite the garment and hat volumes to remove visible construction joints.
def sculpt_union(names,name,voxel=.035):
 bpy.ops.object.select_all(action='DESELECT')
 objects=[o for o in bpy.context.scene.objects if any(o.name.startswith(n) for n in names)]
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.object;o.name=name
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 rem=o.modifiers.new('Sculpted volume union','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;rem.use_smooth_shade=True
 bpy.ops.object.modifier_apply(modifier=rem.name)
 mod=o.modifiers.new('Soft sculpt finish','SMOOTH');mod.factor=.65;mod.iterations=5
 bpy.ops.object.modifier_apply(modifier=mod.name);smooth(o)
sculpt_union(['Chef hat band','Hat crown'],'Sculpted chef hat')
sculpt_union(['Compact jacket body','Flared chef coat','Raised left sleeve','Right sleeve'],'Sculpted chef cotton')
# Curves/text must become mesh for a portable glTF asset.
for obj in list(bpy.context.scene.objects):
 if obj.type in {'CURVE','FONT'}:
  bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
bpy.ops.object.camera_add(location=(.1,.1,17.8));cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=9.7
sc=bpy.context.scene;sc.camera=cam;sc.render.engine='CYCLES';sc.cycles.samples=80;sc.cycles.use_denoising=False;sc.render.threads_mode='FIXED';sc.render.threads=6
sc.view_settings.view_transform='AgX';sc.render.resolution_x=750;sc.render.resolution_y=1000;sc.render.resolution_percentage=100;sc.render.film_transparent=True;sc.render.image_settings.file_format='PNG';sc.render.filepath=os.path.join(OUT,'chef_bu_preview.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'chef_bu_premium.blend'))
import sys
sys.path.insert(0,os.path.dirname(__file__))
from export_utils import export_card
export_card(os.path.join(OUT,'chef_bu.glb'))
bpy.ops.render.render(write_still=True)
