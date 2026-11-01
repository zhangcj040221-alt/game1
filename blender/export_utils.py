"""Merge static meshes by material; retain individual floating ingredients."""
import bpy

def export_card(path):
 bpy.ops.object.select_all(action='DESELECT')
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.object.convert(target='MESH')
 groups={}
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH' or o.name.startswith('Flying ingredient'):continue
  key=tuple(m.name for m in o.data.materials)
  groups.setdefault(key,[]).append(o)
 for key,objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]
  if len(objects)>1:bpy.ops.object.join()
  bpy.context.object.name='Static_'+('_'.join(key))
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',export_cameras=False,export_lights=False)
