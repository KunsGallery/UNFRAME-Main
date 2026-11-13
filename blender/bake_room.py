"""Bakes the gallery room built by build_gallery.py into web assets for the virtual gallery.

Run after build_gallery.py in the same Blender session (it reuses that scene):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python blender/build_gallery.py --python blender/bake_room.py -- \
      blender/scene.json blender/out/bake 512 views=none [bake_size=4096]

Writes to <out>/:
  room.glb        the room shell (floor, walls, ceiling, beams, window frame, rails, bench) with one UV set
  room.jpg        its lighting, baked (daylight, sky, ceiling strips; no artwork lights), display-ready
  garden.jpg      an equirectangular view of the garden from the middle of the room, for the window
  pool-*.png      the light each artwork style throws on the wall for a 1 x 1 m work (grayscale, 4 x 4 m)
The artwork lights are left out of the room bake: the web draws a pool image behind each work instead,
scaled to the work, so works of any size get matching light without a re-bake.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = os.path.abspath(argv[1])
SAMPLES = int(argv[2]) if len(argv) > 2 else 512
OPTS = dict(arg.split('=', 1) for arg in argv[3:] if '=' in arg)
SIZE = int(OPTS.get('bake_size', 4096))
os.makedirs(OUT, exist_ok=True)
scene = bpy.context.scene
ROOM_PARTS = ('Floor', 'Ceiling', 'Wall front', 'Wall right', 'Wall left', 'Baseboard', 'Beam', 'Light strip ',
              'Window', 'Mullion', 'Transom', 'Floor grate', 'Track front', 'Track right', 'Track left', 'Bench')

def select_only(objects, active):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active

def save_display(image, path):
    """Saves an image through the scene's view transform and exposure, as the web shows it."""
    settings = scene.render.image_settings
    settings.file_format = 'JPEG' if path.endswith('.jpg') else 'PNG'
    settings.quality = 88
    image.save_render(path, scene=scene)

def denoise(image):
    """Denoises a baked image with the compositor (OpenImageDenoise). Returns False if unavailable."""
    try:
        tree = bpy.data.node_groups.new('Denoise bake', 'CompositorNodeTree')
        source = tree.nodes.new('CompositorNodeImage')
        source.image = image
        node = tree.nodes.new('CompositorNodeDenoise')
        out = tree.nodes.new('NodeGroupOutput')
        tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        tree.links.new(source.outputs['Image'], node.inputs['Image'])
        tree.links.new(node.outputs['Image'], out.inputs[0])
        holder = bpy.data.scenes.new('Denoise')
        holder.compositing_node_group = tree
        holder.render.resolution_x, holder.render.resolution_y = image.size
        holder.render.resolution_percentage = 100
        holder.view_settings.view_transform = 'Standard'
        holder.render.image_settings.file_format = 'OPEN_EXR'
        path = os.path.join(OUT, '_denoised.exr')
        holder.render.filepath = path
        bpy.ops.render.render(write_still=True, scene=holder.name)
        clean = bpy.data.images.load(path)
        image.pixels = clean.pixels[:]
        os.remove(path)
        return True
    except Exception as error:
        print('DENOISE SKIPPED', error, flush=True)
        return False

# ---------------------------------------------------------------- room shell
for obj in bpy.data.objects:
    if obj.type == 'LIGHT' and obj.name.startswith('Light '):
        obj.hide_render = True  # artwork lights: the web draws them as pools
    if obj.name.startswith(('Artwork', 'Frame', 'Label', 'Spot head')):
        obj.hide_render = True  # works change on the web, so no work may leave a shadow in the bake
parts = [obj for obj in scene.objects if obj.type == 'MESH' and obj.name.startswith(ROOM_PARTS)]
select_only(parts, parts[0])
for obj in parts:
    bpy.context.view_layer.objects.active = obj
    for modifier in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
# The slabs are boxes; only their room-facing side is ever seen, so drop the rest before baking.
for obj in parts:
    if obj.name in ('Floor', 'Ceiling', 'Wall front', 'Wall right', 'Wall left'):
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        middle = Vector((0, 0, 2.1))
        away = [f for f in bm.faces if f.normal.dot(middle - f.calc_center_median()) <= 0]
        bmesh.ops.delete(bm, geom=away, context='FACES')
        bm.to_mesh(obj.data)
        bm.free()
select_only(parts, parts[0])
bpy.ops.object.join()
room = bpy.context.active_object
room.name = 'Room'
mesh = room.data
for uv in list(mesh.uv_layers):
    mesh.uv_layers.remove(uv)
mesh.uv_layers.new(name='bake')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0015, area_weight=0.0, scale_to_bounds=False)
bpy.ops.object.mode_set(mode='OBJECT')

# Without its reflections (which stay view-dependent and are not baked) the polished floor reads darker
# than in a render, so its colour is lifted for the bake.
floor = bpy.data.materials.get('Polished concrete')
if floor:
    for node in floor.node_tree.nodes:
        if node.type == 'HUE_SAT':
            node.inputs['Saturation'].default_value = 0.2  # pale grey, not brown, under warm light
            node.inputs['Value'].default_value = 2.1
bake_image = bpy.data.images.new('room_bake', SIZE, SIZE, float_buffer=True)
for slot in room.material_slots:
    nt = slot.material.node_tree
    target = nt.nodes.new('ShaderNodeTexImage')
    target.image = bake_image
    nt.nodes.active = target
scene.cycles.samples = SAMPLES
scene.render.bake.margin = 6
bpy.ops.object.bake(type='COMBINED', pass_filter={'EMIT', 'DIRECT', 'INDIRECT', 'DIFFUSE'})
print('BAKED room', flush=True)
denoise(bake_image)
save_display(bake_image, os.path.join(OUT, 'room.jpg'))

# Export the shell geometry with the bake UVs only; the web loads room.jpg itself.
for slot in list(room.material_slots):
    room.active_material_index = 0
    bpy.ops.object.material_slot_remove()
select_only([room], room)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'room.glb'), export_format='GLB', use_selection=True,
                          export_materials='NONE', export_normals=False, export_apply=True)
print('EXPORTED room.glb', flush=True)

# ---------------------------------------------------------------- garden panorama
room.hide_render = True
for obj in scene.objects:
    if obj.name.startswith(('Glass', 'Artwork', 'Frame', 'Label', 'Spot head', 'Light strip')):
        obj.hide_render = True
    if obj.type == 'LIGHT' and obj.name.startswith('Strip light'):
        obj.hide_render = True
cam_data = bpy.data.cameras.new('Garden panorama')
cam_data.type = 'PANO'
cam_data.panorama_type = 'EQUIRECTANGULAR'
camera = bpy.data.objects.new('Garden panorama', cam_data)
scene.collection.objects.link(camera)
camera.location = (0, 0, 1.6)
camera.rotation_euler = (math.radians(90), 0, math.radians(-90))  # looking along +x, the window
scene.camera = camera
scene.render.resolution_x, scene.render.resolution_y = 4096, 2048
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 85
scene.render.filepath = os.path.join(OUT, 'garden.jpg')
bpy.ops.render.render(write_still=True)
print('RENDERED garden.jpg', flush=True)

# ---------------------------------------------------------------- artwork light pools
# A clean white wall lit only by one artwork light, seen square-on: the light's shape on the wall.
pools = bpy.data.scenes.new('Pools')
pools.render.engine = 'CYCLES'
pools.cycles.device = scene.cycles.device
pools.cycles.samples = 256
pools.cycles.use_denoising = True
pools.render.resolution_x = pools.render.resolution_y = 512
pools.view_settings.view_transform = 'Standard'
pools.view_settings.exposure = -4.0  # keep the brightest point below white so the shape survives
pools.world = bpy.data.worlds.new('Black')
pools.world.use_nodes = True
pools.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0, 0, 0, 1)
white = bpy.data.materials.new('Pool wall')
white.use_nodes = True
white.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1)
white.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
wall_mesh = bpy.data.meshes.new('Pool wall')
wall_mesh.from_pydata([(0, -4, -2), (0, 4, -2), (0, 4, 6), (0, -4, 6)], [], [(0, 1, 2, 3)])
wall = bpy.data.objects.new('Pool wall', wall_mesh)
wall.data.materials.append(white)
pools.collection.objects.link(wall)
# The 1 x 1 m work (35 mm deep) casts its shadow but is not seen, so only the light on the wall shows.
frame_mesh = bpy.data.meshes.new('Pool frame')
frame_mesh.from_pydata([(x, y, z) for x in (0, 0.035) for y in (-0.5, 0.5) for z in (1.5, 2.5)], [],
                       [(0, 1, 3, 2), (4, 6, 7, 5), (0, 2, 6, 4), (1, 5, 7, 3), (0, 4, 5, 1), (2, 3, 7, 6)])
frame = bpy.data.objects.new('Pool frame', frame_mesh)
frame.visible_camera = False
pools.collection.objects.link(frame)
cam = bpy.data.objects.new('Pool camera', bpy.data.cameras.new('Pool camera'))
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 4.0
cam.location = (3, 0, 2.0)
cam.rotation_euler = (math.radians(90), 0, math.radians(90))
pools.collection.objects.link(cam)
pools.camera = cam
H = 4.2
spot_pos = Vector((1.4, 0, H - 0.35))
centre = Vector((0, 0, 2.0))
beam = centre - spot_pos
for style in ('frame', 'wide'):
    for obj in [o for o in pools.collection.objects if o.type == 'LIGHT']:
        bpy.data.objects.remove(obj)
    if style == 'frame':
        data = bpy.data.lights.new('frame', 'AREA')
        data.shape = 'RECTANGLE'
        slant = abs(beam.normalized().dot(Vector((1, 0, 0))))
        data.size, data.size_y = 1.03, 1.03 * slant
        data.spread = math.radians(2.5)
        data.energy = 70
    else:
        data = bpy.data.lights.new(style, 'SPOT')
        reach = 0.5 * 2.1
        data.spot_size = 2 * math.atan(reach / beam.length)
        data.spot_blend = 0.85
        data.shadow_soft_size = 0.05
        data.energy = 650
    light = bpy.data.objects.new(style, data)
    light.location = spot_pos
    light.rotation_mode = 'QUATERNION'
    light.rotation_quaternion = beam.normalized().to_track_quat('-Z', 'Y')
    pools.collection.objects.link(light)
    path = os.path.join(OUT, f'pool-{style}.png')
    pools.render.image_settings.file_format = 'PNG'
    pools.render.image_settings.color_mode = 'BW'
    pools.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=pools.name)
    # Normalise so the brightest point is white; the web sets the strength.
    img = bpy.data.images.load(path)
    px = list(img.pixels)
    peak = max(px[0::4]) or 1
    img.pixels = [v / peak if i % 4 != 3 else v for i, v in enumerate(px)]
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    print('POOL', style, round(peak, 3), flush=True)
print('BAKE DONE', flush=True)
