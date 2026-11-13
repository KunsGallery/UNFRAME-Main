"""Bakes the gallery room built by build_gallery.py into web assets for the virtual gallery.

Run after build_gallery.py in the same Blender session (it reuses that scene):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python blender/build_gallery.py --python blender/bake_room.py -- \
      blender/scene.json blender/out/bake 512 views=none [bake_size=4096]

Writes to <out>/:
  room.glb        the room shell (floor, walls, ceiling, beams, window frame, rails, bench) with one UV set
  room.jpg        its lighting, baked (daylight, sky, ceiling strips; no artwork lights), display-ready
  garden.glb      the gravel, curb, flower bed and fence outside the window, with garden-ground.jpg (baked)
  card-*.webp     front and side pictures of the trees, strip-*.webp the low planting in two rows,
                  and garden.json (where each tree grows, where the strips stand)
  garden.jpg      an equirectangular view from the middle of the room of what lies beyond the fence
  pool-*.png      the light each artwork style throws on the wall around a work, 1 x 1 m scale (4 x 4 m)
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

# ---------------------------------------------------------------- the garden near the window
# The ground, curb and fence are real geometry on the web, baked like the room; plants become crossed
# picture cards (front and side renders with transparent backgrounds), placed where they grow here.
import json, re
GARDEN_PARTS = ('Gravel', 'Curb', 'Soil bed', 'Fence slat', 'Fence post')
PLANTS = ('island_tree_02', 'shrub_03', 'shrub_01', 'shrub_sorrel_01', 'periwinkle_plant', 'grass_medium_01')
GSIZE = int(OPTS.get('garden_size', 2048))
ground = [obj for obj in scene.objects if obj.type == 'MESH' and obj.name.startswith(GARDEN_PARTS)]
for obj in ground:
    bpy.context.view_layer.objects.active = obj
    for modifier in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    # Undersides and the back of the fence are never seen from the gallery.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    unseen = [f for f in bm.faces if f.normal.z < -0.5 or (obj.name.startswith('Fence') and f.normal.x > 0.5)]
    bmesh.ops.delete(bm, geom=unseen, context='FACES')
    bm.to_mesh(obj.data)
    bm.free()
select_only(ground, ground[0])
bpy.ops.object.join()
garden = bpy.context.active_object
garden.name = 'Garden'
for uv in list(garden.data.uv_layers):
    garden.data.uv_layers.remove(uv)
garden.data.uv_layers.new(name='bake')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.002, area_weight=0.0, scale_to_bounds=False)
bpy.ops.object.mode_set(mode='OBJECT')
garden_image = bpy.data.images.new('garden_bake', GSIZE, GSIZE, float_buffer=True)
for slot in garden.material_slots:
    nt = slot.material.node_tree
    target = nt.nodes.new('ShaderNodeTexImage')
    target.image = garden_image
    nt.nodes.active = target
scene.cycles.samples = SAMPLES
bpy.ops.object.bake(type='COMBINED', pass_filter={'EMIT', 'DIRECT', 'INDIRECT', 'DIFFUSE'})
denoise(garden_image)
save_display(garden_image, os.path.join(OUT, 'garden-ground.jpg'))
for slot in list(garden.material_slots):
    garden.active_material_index = 0
    bpy.ops.object.material_slot_remove()
select_only([garden], garden)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'garden.glb'), export_format='GLB', use_selection=True,
                          export_materials='NONE', export_normals=False, export_apply=True)
print('BAKED garden', flush=True)

# Plants: trees become crossed picture cards (front and side, transparent), placed where they grow.
# The low planting (shrubs, flowers, grass) is rendered as planted into two long strips, a front and a
# back row, so the flower bed keeps its density and some depth without hundreds of cards.
WX = json.load(open(os.path.abspath(argv[0])))['room']['w'] / 2
TREES = ('island_tree_02',)
LOW = tuple(kind for kind in PLANTS if kind not in TREES)
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.quality = 82
scene.cycles.samples = 64
card_cam = bpy.data.objects.new('Card camera', bpy.data.cameras.new('Card camera'))
card_cam.data.type = 'ORTHO'
scene.collection.objects.link(card_cam)
scene.camera = card_cam
def planted(kinds):
    patterns = [re.compile(rf'^{re.escape(kind)} \d+$') for kind in kinds]
    return [o for o in scene.objects if o.type == 'MESH' and any(p.match(o.name) for p in patterns)]
cards, trees, strips = {}, [], []
for kind in TREES:
    source = bpy.data.collections.get(kind)
    if not source:
        continue
    variant = sorted((o for o in source.objects if o.type == 'MESH' and o.parent is None), key=lambda o: o.name)[0]
    corners = [Vector(c) for c in variant.bound_box]
    height = max(c.z for c in corners)
    size = max(max(c.x for c in corners) - min(c.x for c in corners), max(c.y for c in corners) - min(c.y for c in corners), height) * 1.04
    probe = variant.copy()
    probe.location = (400, 400, 0)
    scene.collection.objects.link(probe)
    card_cam.data.ortho_scale = size
    scene.render.resolution_x = scene.render.resolution_y = 1024
    for face, location, rotation in (('front', (350, 400, height / 2), (math.radians(90), 0, math.radians(-90))),
                                     ('side', (400, 350, height / 2), (math.radians(90), 0, 0))):
        card_cam.location = location
        card_cam.rotation_euler = rotation
        scene.render.filepath = os.path.join(OUT, f'card-{kind}-{face}.webp')
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(probe)
    cards[kind] = {'size': round(size, 4), 'height': round(height, 4)}
    for obj in planted([kind]):
        x, y, z = obj.location
        trees.append({'kind': kind, 'position': [round(x, 3), round(z, 3), round(-y, 3)],
                      'scale': round(obj.scale.x, 3), 'turn': round(obj.rotation_euler.z, 4)})
    print('CARDS', kind, flush=True)
# Low planting strips: everything else hidden, the camera looks out of the window (+x), 30 m wide.
low = planted(LOW)
hidden = [o for o in scene.objects if o.type in ('MESH', 'EMPTY', 'CURVE') and o not in low and not o.hide_render]
for obj in hidden:
    obj.hide_render = True
STRIP_W, STRIP_H, STRIP_PX = 30.0, 1.4, 8192
bands = [('front', WX + 1.3, WX + 3.2), ('back', WX + 3.2, WX + 5.3)]
for name, x_from, x_to in bands:
    for obj in low:
        obj.hide_render = not (x_from <= obj.location.x < x_to)
    card_cam.data.ortho_scale = STRIP_W
    card_cam.location = (WX - 20, 0, STRIP_H / 2)
    card_cam.rotation_euler = (math.radians(90), 0, math.radians(-90))
    scene.render.resolution_x, scene.render.resolution_y = STRIP_PX, round(STRIP_PX * STRIP_H / STRIP_W)
    scene.render.filepath = os.path.join(OUT, f'strip-{name}.webp')
    bpy.ops.render.render(write_still=True)
    strips.append({'name': name, 'x': round((x_from + x_to) / 2, 3), 'width': STRIP_W, 'height': STRIP_H})
    print('STRIP', name, flush=True)
for obj in hidden:
    obj.hide_render = False
for obj in low + planted(TREES):
    obj.hide_render = True  # the panorama below shows only what lies beyond the fence
json.dump({'cards': cards, 'trees': trees, 'strips': strips}, open(os.path.join(OUT, 'garden.json'), 'w'), separators=(',', ':'))
scene.render.film_transparent = False
garden.hide_render = True

# ---------------------------------------------------------------- garden panorama
# What lies beyond the fence: sky, distant trees and buildings. The near garden is real geometry and cards.
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
scene.render.image_settings.color_mode = 'RGB'
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
# No work hangs here: a frame's shadow would be baked into the pool at 1 x 1 m and show as a grey box
# around works of other shapes. The work itself covers the middle of the pool on the web.
frame_mesh = bpy.data.meshes.new('Pool frame')
frame_mesh.from_pydata([(x, y, z) for x in (0, 0.035) for y in (-0.5, 0.5) for z in (1.5, 2.5)], [],
                       [(0, 1, 3, 2), (4, 6, 7, 5), (0, 2, 6, 4), (1, 5, 7, 3), (0, 4, 5, 1), (2, 3, 7, 6)])
frame = bpy.data.objects.new('Pool frame', frame_mesh)
frame.visible_camera = False
frame.hide_render = True
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
        reach = 0.5 * 1.6
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
