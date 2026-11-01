# Blender 4.2+ | Chef Bu collectible card asset generator
# Run: blender -b -t 4 --python blender/chef_bu.py
# Output: assets/chef_bu.glb + assets/chef_bu_preview.png
import bpy, math, random, os
from mathutils import Vector
from math import radians
random.seed(12)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=os.path.join(root,"assets");os.makedirs(out,exist_ok=True)
def mat(name,color,metal=0,rough=.5,subsurface=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 sub=p.inputs.get('Subsurface Weight') or p.inputs.get('Subsurface')
 if sub: sub.default_value=subsurface
 return m
gold=mat('Champagne gold',(.8,.43,.09),.82,.18)
rim=mat('Gold edge highlight',(1,.77,.34),.72,.14)
ivory=mat('Warm ivory',(.96,.85,.65),.16,.34)
purple=mat('Opalescent lavender',(.59,.46,.77),.56,.17)
fur=mat('Peach caramel soft fur',(.67,.35,.20),0,.8,.13)
furInner=mat('Ear inner',(.37,.19,.14),0,.83)
cheek=mat('Warm yellow blush',(1,.69,.28),0,.73)
black=mat('Cocoa facial ink',(.16,.075,.045),0,.65)
tongue=mat('Pink tongue',(.92,.29,.28),0,.6)
white=mat('Chef white',(.96,.93,.88),0,.5)
red=mat('Scarf red',(.75,.11,.08),0,.46)
pan=mat('Wok iron',(.1,.11,.14),.63,.32)
wood=mat('Kitchen walnut',(.31,.16,.09),0,.73)
wall=mat('Kitchen warm plaster',(.54,.35,.24),0,.87)
green=mat('Broccoli green',(.22,.5,.13),0,.76)
tomato=mat('Tomato',(0.78,.09,.045),0,.4)
def smooth(obj):
 for f in obj.data.polygons:f.use_smooth=True
def uv(name,loc,scale,material,seg=48,rings=32):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);smooth(o);return o
def cube(name,loc,scale,material,bevel=.1):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('Rounded manufactured edges','BEVEL');mod.width=bevel;mod.segments=5
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def cylinder(name,loc,r,depth,material,vertices=64):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
 o=bpy.context.object;o.name=name;o.data.materials.append(material)
 bevel=o.modifiers.new('Edge rounding','BEVEL');bevel.width=min(.05,depth*.18);bevel.segments=3
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def link(name,a,b,r,material):
 a,b=Vector(a),Vector(b);o=cylinder(name,(a+b)/2,r,(b-a).length,material,24);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
# Layered solid card, every level is genuine geometry
cube('Deep card body',(0,0,-.46),(5.5,7.5,.35),gold,.38)
cube('Opal inlay',(0,0,-.25),(5.36,7.34,.19),purple,.35)
cube('Polished raised gold border',(0,0,-.08),(5.18,7.17,.14),rim,.32)
cube('Recessed dark gold channel',(0,0,.05),(4.92,6.9,.12),gold,.28)
cube('Kitchen background',(0,.1,.17),(4.58,6.55,.14),wall,.2)
# Cabinet, counter and hanging cookware
cube('Shelf upper',(0,2.13,.56),(4.25,.12,.35),wood,.04)
cube('Shelf lower',(0,1.35,.59),(4.25,.12,.35),wood,.04)
cube('Countertop',(0,-2.14,.69),(4.4,.23,.8),wood,.06)
for i in range(5):
 uv('Ceramic jar %d'%i,(-1.55+i*.76,1.62,.68),(.19,.27,.18),ivory)
for x in (1.25,1.86):
 link('Hanging hook',(x,3.0,.48),(x,2.45,.48),.035,gold)
 cylinder('Hanging pan',(x,2.38,.52),.32,.09,pan).rotation_euler[0]=radians(90)
# Character: carefully smoothed overlapping volumes, avoid hard primitive silhouette
uv('Body under jacket',(0,-.92,1.02),(.95,1.05,.65),white)
uv('Face, round cheek silhouette',(0,.65,1.12),(1.43,1.3,.91),fur)
for x in (-1.08,1.08):
 uv('Round ear',(x,1.62,.97),(.4,.43,.3),fur)
 uv('Ear inset',(x,1.63,1.22),(.23,.25,.08),furInner)
for x in (-.52,.52):
 uv('Eye',(x,.68,1.97),(.115,.13,.055),black)
 uv('Cheek',(x*1.58,.25,1.88),(.29,.25,.08),cheek)
uv('Tiny nose',(0,.46,2.01),(.07,.06,.05),black)
uv('Open smile',(0,.29,2.02),(.19,.22,.065),black)
uv('Tongue',(0,.23,2.085),(.12,.13,.02),tongue)
for x in (-.51,.51):uv('Little feet',(x,-1.9,1.02),(.34,.28,.4),fur)
# Soft sculpted chef hat
uv('Hat base',(0,1.91,1.13),(.77,.19,.54),white)
for x,y,s in [(-.56,2.26,.42),(-.25,2.46,.46),(.22,2.49,.48),(.56,2.29,.41)]:
 uv('Puffy chef hat',(x,y,1.13),(s,s*.88,.46),white)
# Coat details and scarf
for y in (-.85,-1.2):uv('Jacket button',(-.22,y,1.67),(.075,.075,.035),black)
uv('Scarf knot',(0,-.56,1.72),(.23,.19,.14),red)
uv('Scarf left',(-.2,-.78,1.72),(.15,.3,.1),red)
uv('Scarf right',(.18,-.76,1.72),(.16,.27,.1),red)
for x in (-.65,.65):uv('Apron seam',(x,-1.35,1.5),(.1,.4,.08),white)
uv('Apron pocket',(0,-1.51,1.67),(.45,.3,.055),ivory)
# Arms and accessories
link('Left sleeve',(-.75,-.75,1.2),(-1.49,-.16,1.6),.25,white)
uv('Left paw',(-1.49,-.16,1.6),(.24,.24,.24),fur)
link('Spatula red handle',(-1.52,-.07,1.6),(-1.79,.65,1.63),.095,red)
link('Spatula shaft',(-1.79,.65,1.63),(-1.97,1.12,1.63),.045,pan)
cube('Spatula head',(-2.01,1.31,1.63),(.42,.55,.07),ivory,.09)
link('Right sleeve',(.78,-.79,1.2),(1.4,-.65,1.61),.25,white)
uv('Right paw',(1.4,-.65,1.61),(.24,.24,.24),fur)
wok=cylinder('Deep wok',(1.73,-.42,1.77),.66,.24,pan)
wok.scale=(1.22,.83,1);wok.rotation_euler=(radians(72),0,radians(-9))
link('Wok handle',(2.14,-.41,1.73),(2.52,-.32,1.8),.085,pan)
for i in range(12):
 a=i*2.4;uv('Flying ingredient %d'%i,(1.3+.45*math.sin(a),-.05+.95*(i%5)/5,1.85+.27*math.cos(a)),(.1,.1,.1),[green,cheek,tomato][i%3],24,16)
for i in range(3):
 uv('Foreground tomato',(i*.47-1.72,-2.0,1.12),(.24,.23,.23),tomato)
# Elevated nameplate and crest
cube('Raised nameplate',(0,-2.72,1.03),(5.35,.84,.28),gold,.24)
cube('Nameplate enamel',(0,-2.72,1.22),(4.96,.65,.12),ivory,.2)
def label(text,name,loc,size,material,extrude=.012):
 curve=bpy.data.curves.new(name,'FONT');curve.body=text;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=size;curve.extrude=extrude;curve.bevel_depth=.002
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(material);return o
label('厨师布','Card name',(0,-2.72,1.31),.49,gold)
label('★  ★  ★','Three stars',(0,-3.36,.75),.4,rim)
cylinder('Chef medallion',(0,3.77,.37),.53,.25,gold).rotation_euler[0]=radians(90)
label('★','Crest symbol',(0,3.77,.57),.48,ivory)
# Lighting and preview camera
world=bpy.context.scene.world;world.color=(.15,.12,.15)
def area(name,loc,power,color,size):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(-3,5,6),750,(1,.76,.46),5)
area('Soft fill',(3,1,6),600,(.76,.81,1),5)
area('Golden rim',(1,5,-2),950,(1,.59,.25),3)
bpy.ops.object.camera_add(location=(0,-.4,15));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=10.1
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32
sc.render.resolution_x=900;sc.render.resolution_y=1200;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG';sc.render.filepath=os.path.join(out,'chef_bu_preview.png')
sc.camera.data.lens=50
sc.render.film_transparent=True
# Export only meshes / text converted to mesh; no camera or lights
for obj in list(bpy.data.objects):
 if obj.type=='FONT':
  bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'chef_bu.glb'),export_format='GLB',use_selection=False,export_cameras=False)
bpy.ops.render.render(write_still=True)
print('Created assets/chef_bu.glb and assets/chef_bu_preview.png')
