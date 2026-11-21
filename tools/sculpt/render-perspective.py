"""CPU geometry review using exported app meshes; lighting is not WebGL parity."""
import bpy, json, math, sys, os
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; source=args[0]; out=args[1]
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48;scene.cycles.use_denoising=False
scene.render.resolution_x=440;scene.render.resolution_y=400;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes["Background"].inputs["Color"].default_value=(1,1,1,1);scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value=.65;scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if False else 'None'
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
for i,m in enumerate(json.load(open(source))):
 p=m['positions'];verts=[(p[j],-p[j+2],p[j+1]) for j in range(0,len(p),3)];ix=m['indices'];faces=[ix[j:j+3] for j in range(0,len(ix),3)]
 mesh=bpy.data.meshes.new(m['name']);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(m['name'],mesh);scene.collection.objects.link(o)
 for f in mesh.polygons:f.use_smooth=True
 mat=bpy.data.materials.new('clay');mat.diffuse_color=(*m['color'],1);mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*m['color'],1);bs.inputs['Roughness'].default_value=m['roughness'];o.data.materials.append(mat)
for name,loc,energy,size in [('key',(-3,-4,5),450,4),('fill',(4,-2,2),200,3),('rim',(-2,3,3),250,3)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
camera=bpy.data.cameras.new('camera');obj=bpy.data.objects.new('camera',camera);scene.collection.objects.link(obj);scene.camera=obj;camera.type='PERSP';camera.lens=72;camera.sensor_width=36
for label,yaw,pitch in [('level',0,0),('front-down',0,12),('quarter-down',35,12),('side-down',80,12),('rear-down',170,12)]:
 a=math.radians(yaw);p=math.radians(pitch);obj.location=(6*math.sin(a)*math.cos(p),-6*math.cos(a)*math.cos(p),6*math.sin(p)+.86);obj.rotation_euler=(Vector((0,0,.86))-obj.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(out,label+'.png');bpy.ops.render.render(write_still=True)
