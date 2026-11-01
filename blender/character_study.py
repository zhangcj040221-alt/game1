import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=os.path.join(root,'assets','character_test')
os.makedirs(out,exist_ok=True)
def material(name,rgba,rough=.76):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgba,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgba,1);p.inputs['Roughness'].default_value=rough
 return m
fur=material('caramel matte',(.65,.34,.19)); inner=material('inner ear',(.39,.19,.16))
cream=material('cream muzzle',(.92,.69,.48)); ink=material('deep brown',(.095,.045,.032))
white=material('warm cotton',(.92,.9,.84)); red=material('tomato scarf',(.72,.14,.12))
def ell(name,xyz,scale,mat,seg=64,rings=40):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=xyz)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
 for poly in o.data.polygons:poly.use_smooth=True
 return o
# This is an isolated silhouette/proportion study, not a final sculpt.
ell('pear body',(0,0,1.02),(.66,.48,.85),fur)
ell('oversized head',(0,-.09,2.04),(1.04,.72,.91),fur)
for side in (-1,1):
 ell('ear',(.78*side,-.02,2.7),(.33,.25,.37),fur)
 ell('inner ear',(.79*side,-.248,2.71),(.20,.065,.24),inner)
 ell('eye',(.38*side,-.737,2.13),(.078,.062,.105),ink)
 ell('short arm',(.66*side,-.04,1.27),(.30,.35,.43),fur)
 ell('paw',(.79*side,-.31,1.06),(.24,.23,.23),fur)
 ell('foot',(.37*side,-.29,.33),(.32,.38,.22),fur)
ell('single broad muzzle',(0,-.695,1.78),(.49,.27,.32),cream)
ell('nose',(0,-.948,1.9),(.115,.075,.073),ink)
ell('smile shadow',(0,-.943,1.69),(.12,.048,.072),ink)
ell('chef hat band',(0,-.07,2.91),(.63,.54,.20),white)
for x,y,z,s in [(-.42,-.06,3.22,.39),(-.1,-.08,3.39,.44),(.28,-.03,3.34,.42),(.53,.04,3.15,.32)]:
 ell('hat cloud',(x,y,z),(s,s*.9,s*.85),white)
ell('scarf knot',(0,-.48,1.29),(.20,.14,.17),red)
ell('scarf tail',(.15,-.49,1.01),(.15,.11,.29),red)
world=bpy.context.scene.world;world.color=(.34,.34,.34)
def area(name,xyz,power,size):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=xyz
 obj.rotation_euler=(Vector((0,0,1.7))-obj.location).to_track_quat('-Z','Y').to_euler()
area('key',(-3,-4,7),650,5);area('fill',(4,-2,4),350,5)
bpy.ops.object.camera_add(location=(0,-8,3.0));cam=bpy.context.object;bpy.context.scene.camera=cam
cam.data.type='ORTHO';cam.data.ortho_scale=4.8
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
for name,position in [('front',(0,-8,2.1)),('three_quarter',(5,-7,2.6)),('side',(8,0,2.5))]:
 cam.location=position;cam.rotation_euler=(Vector((0,0,1.8))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(out,name+'.png')
 bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'character_study.glb'),export_format='GLB',export_cameras=False)
print('CHARACTER_TEST_COMPLETE')
