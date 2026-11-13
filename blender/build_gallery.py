"""Builds the UNFRAME virtual gallery room in Blender from scene.json and renders the camera views.

Run headless (does not touch any open Blender window):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python blender/build_gallery.py -- \
      blender/scene.json blender/out [samples] [floor=concrete|parquet] [lighting=general|museum] \
      [light=frame|wide] [views=entrance,front-wall,close-up] [prefix=name-]

The web gallery uses three.js coordinates (y up, the window wall at +x). Blender is z up, so a
three.js point (x, y, z) becomes (x, -z, y). Walls, beams, window frame and artwork positions follow
site/js/virtual-room.js so the same artworks hang in the same places. Textures, HDRI and plants
are CC0 assets from Poly Haven in blender/assets/polyhaven.
"""
import bpy, bmesh, json, math, os, random, sys
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SCENE_JSON = os.path.abspath(argv[0] if argv else 'blender/scene.json')
OUT = os.path.abspath(argv[1] if len(argv) > 1 else 'blender/out')
SAMPLES = int(argv[2]) if len(argv) > 2 else 96
OPTS = dict(arg.split('=', 1) for arg in argv[3:] if '=' in arg)
FLOOR_KIND = OPTS.get('floor', 'concrete')
MUSEUM = OPTS.get('lighting', 'general') == 'museum'
VIEWS = OPTS['views'].split(',') if 'views' in OPTS else None
# Artwork lighting: 'frame' a rectangular framing projector
# matched to the canvas, 'wide' a generous round pool that also washes the wall around the work.
LIGHT_STYLE = OPTS.get('light', 'frame')
PREFIX = OPTS.get('prefix', '')
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, 'assets', 'polyhaven')
data = json.load(open(SCENE_JSON))
W, D, H = data['room']['w'], data['room']['d'], data['room']['h']
os.makedirs(OUT, exist_ok=True)

def B(v):
    """three.js (x, y, z) -> Blender (x, -z, y)."""
    return Vector((v[0], -v[2], v[1]))

def hex_rgb(value):
    value = value.lstrip('#')
    srgb = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
collection = scene.collection

# ---------------------------------------------------------------- materials
def image(name, colour=False):
    img = bpy.data.images.load(os.path.join(ASSETS, name), check_existing=True)
    if not colour:
        img.colorspace_settings.name = 'Non-Color'
    return img

def textured(name, prefix, tile, tint=None, rough=(0.0, 1.0), normal=0.4, res='2k', grade=None):
    """Principled material with Poly Haven maps projected in world space (box projection).
    `tile` is the size in metres of one texture repeat; `grade` is (saturation, value) applied to the colour map."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    coord = nt.nodes.new('ShaderNodeTexCoord')
    mapping = nt.nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (1 / tile, 1 / tile, 1 / tile)
    nt.links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    def tex(file, colour=False):
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = image(file, colour)
        node.projection = 'BOX'
        node.projection_blend = 0.2
        nt.links.new(mapping.outputs['Vector'], node.inputs['Vector'])
        return node
    diffuse = tex(f'{prefix}_diff_{res}.jpg', True)
    if tint:
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MIX'
        mix.inputs['Factor'].default_value = 0.88
        nt.links.new(diffuse.outputs['Color'], mix.inputs['A'])
        mix.inputs['B'].default_value = tint
        nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    elif grade:
        hsv = nt.nodes.new('ShaderNodeHueSaturation')
        hsv.inputs['Saturation'].default_value, hsv.inputs['Value'].default_value = grade
        nt.links.new(diffuse.outputs['Color'], hsv.inputs['Color'])
        nt.links.new(hsv.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        nt.links.new(diffuse.outputs['Color'], bsdf.inputs['Base Color'])
    roughness = tex(f'{prefix}_rough_{res}.jpg')
    remap = nt.nodes.new('ShaderNodeMapRange')
    remap.inputs['To Min'].default_value, remap.inputs['To Max'].default_value = rough
    nt.links.new(roughness.outputs['Color'], remap.inputs['Value'])
    nt.links.new(remap.outputs['Result'], bsdf.inputs['Roughness'])
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nmap.inputs['Strength'].default_value = normal
    nt.links.new(tex(f'{prefix}_nor_gl_{res}.jpg').outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

def plain(name, colour, roughness=0.5, metallic=0.0, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = colour
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emission:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = strength
    return mat

def glass():
    """Clear window glass that lets sunlight and the garden through, with a faint reflection."""
    mat = bpy.data.materials.new('Window glass')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    transparent = nt.nodes.new('ShaderNodeBsdfTransparent')
    glossy = nt.nodes.new('ShaderNodeBsdfGlossy')
    glossy.inputs['Roughness'].default_value = 0.02
    fresnel = nt.nodes.new('ShaderNodeFresnel')
    fresnel.inputs['IOR'].default_value = 1.5
    weaken = nt.nodes.new('ShaderNodeMath')
    weaken.operation = 'MULTIPLY'
    weaken.inputs[1].default_value = 0.2
    nt.links.new(fresnel.outputs['Fac'], weaken.inputs[0])
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(weaken.outputs['Value'], mix.inputs['Fac'])
    nt.links.new(transparent.outputs['BSDF'], mix.inputs[1])
    nt.links.new(glossy.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return mat

WALL = textured('Wall plaster', 'white_plaster_02', 2.5, tint=hex_rgb(data['wallColor']), rough=(0.75, 0.95), normal=0.25)
if FLOOR_KIND == 'parquet':
    FLOOR = textured('Oak herringbone', 'herringbone_parquet', 2.0, rough=(0.22, 0.55), normal=0.5)
else:
    # Lifted and cooled so the floor reads as pale grey polished concrete.
    FLOOR = textured('Polished concrete', 'smooth_concrete_floor', 3.0, rough=(0.12, 0.38), normal=0.3, grade=(0.45, 1.35))
# Dark museum mode: a dark ceiling, no strip lights, warm spots only (as lightingPreset('museum') on the web).
CEILING = plain('Ceiling', (0.025, 0.025, 0.025, 1) if MUSEUM else (0.92, 0.92, 0.9, 1), 0.9)
GRAVEL = textured('Gravel', 'bicolour_gravel', 1.6, rough=(0.7, 1.0), normal=0.6, res='1k')
FENCE = textured('Fence oak', 'oak_veneer_01', 1.2, rough=(0.5, 0.8), normal=0.5, res='1k', grade=(0.8, 0.55))
LABEL = plain('Wall label', (0.85, 0.85, 0.83, 1), 0.6)
SOIL = plain('Garden soil', (0.045, 0.032, 0.022, 1), 0.95)
DARK = plain('Dark steel', (0.017, 0.018, 0.02, 1), 0.35, 0.6)
TRIM = plain('Baseboard', (0.014, 0.015, 0.016, 1), 0.5)
BEAM = plain('Ceiling beam', (0.016, 0.017, 0.018, 1), 0.45)
OAK = plain('Bench oak', (0.36, 0.24, 0.14, 1), 0.45)
OUTSIDE = plain('Patio stone', (0.42, 0.40, 0.37, 1), 0.85)
GLASS = glass()
STRIP = plain('Light strip', (1, 1, 1, 1) if not MUSEUM else (0.03, 0.03, 0.03, 1), 0.5, emission=None if MUSEUM else (1.0, 0.95, 0.88, 1), strength=6.0)

# ---------------------------------------------------------------- geometry helpers
def box(name, centre, size, mat):
    """Axis-aligned box in Blender coordinates, built at world position so box projection is in world space."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0] + centre[0], v.co.y * size[1] + centre[1], v.co.z * size[2] + centre[2]))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    collection.objects.link(obj)
    # A few millimetres of bevel so edges catch the light like real joinery.
    bevel = obj.modifiers.new('Bevel', 'BEVEL')
    bevel.width = min(0.006, min(size) / 4)
    bevel.segments = 2
    return obj

def tbox(name, centre_three, size_three, mat):
    """Box given in three.js centre and (x, y, z) size."""
    c = B(centre_three)
    return box(name, c, (size_three[0], size_three[2], size_three[1]), mat)

T = 0.25  # wall/slab thickness outside the room
# Floor, ceiling and the three solid walls (front at three x=-W/2, right at z=-D/2, left at z=+D/2).
tbox('Floor', (0, -T / 2, 0), (W + 2 * T, T, D + 2 * T), FLOOR)
tbox('Ceiling', (0, H + T / 2, 0), (W + 2 * T, T, D + 2 * T), CEILING)
tbox('Wall front', (-W / 2 - T / 2, H / 2, 0), (T, H, D + 2 * T), WALL)
tbox('Wall right', (0, H / 2, -D / 2 - T / 2), (W + 2 * T, H, T), WALL)
tbox('Wall left', (0, H / 2, D / 2 + T / 2), (W + 2 * T, H, T), WALL)
# Shadow-gap baseboards and the two exposed beams.
tbox('Baseboard front', (-W / 2 + 0.015, 0.06, 0), (0.03, 0.12, D), TRIM)
tbox('Baseboard right', (0, 0.06, -D / 2 + 0.015), (W, 0.12, 0.03), TRIM)
tbox('Baseboard left', (0, 0.06, D / 2 - 0.015), (W, 0.12, 0.03), TRIM)
for i, x in enumerate((W / 4, -W / 4)):
    tbox(f'Beam {i + 1}', (x, H - 0.225, 0), (0.35, 0.45, D), BEAM)
# Linear light strips recessed between the beams.
for i, x in enumerate((0, W * 0.375, -W * 0.375)):
    tbox(f'Light strip {i + 1}', (x, H - 0.01, 0), (0.08, 0.02, D * 0.8), STRIP)
    bpy.ops.object.light_add(type='AREA', location=B((x, H - 0.03, 0)))
    fill = bpy.context.active_object
    fill.name = f'Strip light {i + 1}'
    fill.data.shape = 'RECTANGLE'
    fill.data.size, fill.data.size_y = 0.3, D * 0.8
    # In museum mode the strips are off; a faint warm fill keeps the room readable around the spots.
    fill.data.energy = 45 if MUSEUM else 520
    fill.data.color = (1.0, 0.86, 0.7) if MUSEUM else (1.0, 0.96, 0.9)

# Window wall at three x=+W/2: posts, mullions, transom, sill, top frame, glass and the floor grate.
WX, WL = W / 2, D - 0.2
tbox('Window top frame', (WX, H - 0.1, 0), (0.2, 0.2, WL), DARK)
tbox('Window sill', (WX, 0.07, 0), (0.2, 0.14, WL), DARK)
tbox('Window post front', (WX, H / 2, -WL / 2), (0.2, H, 0.2), DARK)
tbox('Window post back', (WX, H / 2, WL / 2), (0.2, H, 0.2), DARK)
for i in range(1, 5):
    tbox(f'Mullion {i}', (WX, H / 2, -WL / 2 + i * WL / 5), (0.12, H, 0.08), DARK)
tbox('Transom', (WX, H * 0.76, 0), (0.1, 0.08, WL), DARK)
tbox('Glass', (WX - 0.02, H / 2, 0), (0.01, H - 0.2, WL), GLASS)
tbox('Floor grate', (WX - 0.35, 0.004, 0), (0.7, 0.008, WL), DARK)
# The garden outside: gravel, a horizontal oak-slat fence (as on the web), shrubs and a tree.
tbox('Gravel', (WX + 7, -0.06, 0), (14, 0.1, 34), GRAVEL)
tbox('Curb', (WX + 0.45, 0.06, 0), (0.25, 0.14, 34), OUTSIDE)
FENCE_X = WX + 5.2
for i in range(22):
    tbox(f'Fence slat {i + 1}', (FENCE_X, 0.08 + i * 0.112, 0), (0.03, 0.09, 30), FENCE)
for z in range(-14, 15, 2):
    tbox('Fence post', (FENCE_X + 0.05, 1.25, z), (0.06, 2.5, 0.06), DARK)

def instance(folder, placements, greener=False):
    """Imports a Poly Haven glTF once into a hidden collection and places linked copies of its meshes.
    Some assets hold several variants side by side, so each placement takes one variant, recentred.
    `greener` lifts the saturation of the leaf colours for a healthy, well-watered look."""
    path = os.path.join(ASSETS, folder, f'{folder}_1k.gltf')
    if not os.path.exists(path):
        return
    source = bpy.data.collections.new(folder)
    scene.collection.children.link(source)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    for obj in set(bpy.data.objects) - before:
        for user in list(obj.users_collection):
            user.objects.unlink(obj)
        source.objects.link(obj)
        if greener and obj.type == 'MESH':
            for mat in obj.data.materials:
                if mat and mat.use_nodes and not mat.get('greener'):
                    mat['greener'] = True
                    nt = mat.node_tree
                    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
                    link = next((l for l in nt.links if bsdf and l.to_socket == bsdf.inputs['Base Color']), None)
                    if link:
                        hsv = nt.nodes.new('ShaderNodeHueSaturation')
                        hsv.inputs['Hue'].default_value = 0.52
                        hsv.inputs['Saturation'].default_value = 1.35
                        hsv.inputs['Value'].default_value = 1.08
                        nt.links.new(link.from_socket, hsv.inputs['Color'])
                        nt.links.new(hsv.outputs['Color'], bsdf.inputs['Base Color'])
    scene.view_layers[0].layer_collection.children[folder].exclude = True
    variants = sorted((obj for obj in source.objects if obj.type == 'MESH' and obj.parent is None), key=lambda obj: obj.name)
    # Recentre each variant on its own footprint so a placement puts the plant itself on the spot.
    for obj in variants:
        corners = [Vector(c) for c in obj.bound_box]
        cx = sum(c.x for c in corners) / 8
        cy = sum(c.y for c in corners) / 8
        obj.data.transform(Matrix.Translation((-cx, -cy, -min(c.z for c in corners))))
    for i, (pos, scale, turn) in enumerate(placements):
        copy = variants[i % len(variants)].copy()
        copy.name = f'{folder} {i + 1}'
        copy.location = B(pos)
        copy.scale = (scale, scale, scale)
        copy.rotation_euler = (0, 0, math.radians(turn))
        collection.objects.link(copy)

# Planting bed between the gravel path by the window and the fence: dark soil, trees along the fence,
# flowering shrubs in front, flowers and grass underneath. Positions are seeded so every build matches.
BED_FROM, BED_TO = WX + 1.4, FENCE_X - 0.1
tbox('Soil bed', ((BED_FROM + BED_TO) / 2, -0.005, 0), (BED_TO - BED_FROM, 0.02, 30), SOIL)
rng = random.Random(7)
def scatter(count, x_from, x_to, scale, z_from=-14, z_to=14):
    return [((rng.uniform(x_from, x_to), 0, rng.uniform(z_from, z_to)), rng.uniform(*scale), rng.uniform(0, 360)) for _ in range(count)]
trees = [((FENCE_X - 1.2 + rng.uniform(-0.4, 0.4), 0, z + rng.uniform(-0.5, 0.5)), rng.uniform(0.8, 1.05), rng.uniform(0, 360)) for z in range(-13, 14, 3)]
instance('island_tree_02', trees, greener=True)
instance('shrub_03', scatter(34, BED_FROM + 1.0, FENCE_X - 0.4, (1.6, 2.2)), greener=True)
instance('shrub_01', scatter(30, BED_FROM + 0.5, FENCE_X - 0.8, (1.5, 2.0)), greener=True)
instance('shrub_sorrel_01', scatter(50, BED_FROM, BED_FROM + 1.8, (1.6, 2.2)), greener=True)
instance('periwinkle_plant', scatter(150, BED_FROM, FENCE_X - 0.3, (1.8, 2.6)), greener=True)
instance('grass_medium_01', scatter(180, BED_FROM, FENCE_X - 0.2, (1.1, 1.6)), greener=True)

# Gallery bench: oak top on two dark steel legs, in the middle of the room.
tbox('Bench top', (0.6, 0.44, 0), (0.45, 0.05, 1.8), OAK)
for z in (-0.7, 0.7):
    tbox('Bench leg', (0.6, 0.21, z), (0.4, 0.42, 0.04), DARK)

# ---------------------------------------------------------------- artworks
# Directions out of each wall into the room (right wall at three.js z=-D/2 -> Blender y=+D/2).
NORMALS = {'front': Vector((1, 0, 0)), 'right': Vector((0, -1, 0)), 'left': Vector((0, 1, 0))}
for art in data['artworks']:
    normal = NORMALS.get(art['wall'], Vector((1, 0, 0)))
    w, h = art['size']
    centre = B(art['position'])
    # Pull the work onto the wall surface (the web stores it 5cm off the wall).
    if art['wall'] == 'front':
        centre.x = -W / 2
    elif art['wall'] == 'right':
        centre.y = D / 2
    else:
        centre.y = -D / 2
    depth = 0.035
    side = Vector((-normal.y, normal.x, 0))
    frame_size = (abs(side.x) * w + abs(normal.x) * depth, abs(side.y) * w + abs(normal.y) * depth, h)
    box(f"Frame {art['id']}", centre + normal * (depth / 2), frame_size, DARK)
    # The image itself, a plane just in front of the frame.
    mat = bpy.data.materials.new(f"Artwork {art['id']}")
    mat.use_nodes = True
    nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(art['image'])
    nt.links.new(tex.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    nt.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.45
    bpy.ops.mesh.primitive_plane_add(size=1)
    plane = bpy.context.active_object
    plane.name = f"Artwork {art['id']}"
    plane.scale = (w * 0.98, h * 0.98, 1)
    plane.rotation_mode = 'QUATERNION'
    plane.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(normal)
    # Keep the image upright: after aligning +Z to the wall normal, the plane's +Y must point up.
    up_now = plane.rotation_quaternion @ Vector((0, 1, 0))
    twist = up_now.rotation_difference(Vector((0, 0, 1)))
    plane.rotation_quaternion = twist @ plane.rotation_quaternion
    plane.location = centre + normal * (depth + 0.002)
    plane.data.materials.append(mat)
    # A track light on the ceiling aimed at the work, about 1.4m out from the wall.
    spot_pos = centre + normal * 1.4
    spot_pos.z = H - 0.35
    beam = centre - spot_pos
    distance = beam.length
    warm = (1.0, 0.84, 0.66) if MUSEUM else (1.0, 0.9, 0.78)
    if LIGHT_STYLE == 'frame':
        # Framing projector: a near-parallel rectangular beam cut to the canvas. The beam hits the wall
        # at an angle, so its height is shortened by that angle to land exactly on the work.
        slant = abs(beam.normalized().dot(normal))
        bpy.ops.object.light_add(type='AREA', location=spot_pos)
        light = bpy.context.active_object
        light.data.shape = 'RECTANGLE'
        light.data.size, light.data.size_y = w * 1.03, h * 1.03 * slant
        light.data.spread = math.radians(2.5)
        light.data.energy = (70 if not MUSEUM else 40) * w * h
    else:
        # 'wide': a round spot that takes in the wall around the work.
        reach = max(w, h) / 2 * 2.1
        bpy.ops.object.light_add(type='SPOT', location=spot_pos)
        light = bpy.context.active_object
        light.data.spot_size = 2 * math.atan(reach / distance)
        light.data.spot_blend = 0.85
        light.data.shadow_soft_size = 0.05
        light.data.energy = (300 if MUSEUM else 650) * 1.15
    light.name = f"Light {art['id']}"
    light.data.color = warm
    light.rotation_mode = 'QUATERNION'
    light.rotation_quaternion = beam.normalized().to_track_quat('-Z', 'Y')
    head = box(f"Spot head {art['id']}", spot_pos + Vector((0, 0, 0.12)), (0.09, 0.09, 0.18), DARK)
    # A small wall label to the right of the work, at reading height.
    label = centre + side * (w / 2 + 0.22) + normal * 0.002
    label.z = 1.45
    box(f"Label {art['id']}", label, (abs(side.x) * 0.14 + abs(normal.x) * 0.004, abs(side.y) * 0.14 + abs(normal.y) * 0.004, 0.09), LABEL)

# Continuous ceiling track rails 1.4m out from each hanging wall.
tbox('Track front', (-W / 2 + 1.4, H - 0.02, 0), (0.04, 0.03, D * 0.9), DARK)
tbox('Track right', (0, H - 0.02, -D / 2 + 1.4), (W * 0.85, 0.03, 0.04), DARK)
tbox('Track left', (0, H - 0.02, D / 2 - 1.4), (W * 0.85, 0.03, 0.04), DARK)

# ---------------------------------------------------------------- daylight and sky
world = bpy.data.worlds.new('Garden')
scene.world = world
world.use_nodes = True
wn = world.node_tree
env = wn.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(ASSETS, 'borghese_gardens_4k.hdr'))
wmap = wn.nodes.new('ShaderNodeMapping')
wmap.inputs['Rotation'].default_value = (0, 0, math.radians(200))
wn.links.new(wn.nodes.new('ShaderNodeTexCoord').outputs['Generated'], wmap.inputs['Vector'])
wn.links.new(wmap.outputs['Vector'], env.inputs['Vector'])
wn.links.new(env.outputs['Color'], wn.nodes['Background'].inputs['Color'])
# The sky lights the room at full strength but is seen through the window at about half, so the
# garden keeps its colour instead of blowing out to white (a photographer's window exposure).
light_path = wn.nodes.new('ShaderNodeLightPath')
strength = wn.nodes.new('ShaderNodeMix')
strength.data_type = 'FLOAT'
strength.inputs['A'].default_value = 0.06 if MUSEUM else 1.0
strength.inputs['B'].default_value = 0.03 if MUSEUM else 0.42
wn.links.new(light_path.outputs['Is Camera Ray'], strength.inputs['Factor'])
wn.links.new(strength.outputs['Result'], wn.nodes['Background'].inputs['Strength'])
# Sun from the garden side, as in the web scene (three.js position 24, 18, -6).
sun_dir = (Vector((0, 0, 0)) - B((24, 18, -6))).normalized()
bpy.ops.object.light_add(type='SUN')
sun = bpy.context.active_object
sun.data.energy = 0.15 if MUSEUM else 3.2
sun.data.angle = math.radians(1.5)
sun.data.color = (1.0, 0.95, 0.86)
sun.rotation_mode = 'QUATERNION'
sun.rotation_quaternion = Vector((0, 0, -1)).rotation_difference(sun_dir)

# ---------------------------------------------------------------- render settings
scene.render.engine = 'CYCLES'
cycles = scene.cycles
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = True
    cycles.device = 'GPU'
except Exception:
    cycles.device = 'CPU'
cycles.samples = SAMPLES
cycles.use_denoising = True
cycles.max_bounces = 8
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = 0.45 if MUSEUM else 0.35
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 90

# ---------------------------------------------------------------- cameras and renders
for view in data['cameras']:
    if VIEWS and view['name'] not in VIEWS:
        continue
    cam_data = bpy.data.cameras.new(view['name'])
    cam_data.sensor_fit = 'VERTICAL'
    cam_data.angle_y = math.radians(view.get('fov', data['fov']))
    cam_data.clip_start = 0.05
    cam = bpy.data.objects.new(f"Camera {view['name']}", cam_data)
    collection.objects.link(cam)
    cam.location = B(view['position'])
    direction = B(view['target']) - cam.location
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = direction.to_track_quat('-Z', 'Y')
    scene.camera = cam
    scene.render.filepath = os.path.join(OUT, f"{PREFIX}{view['name']}.jpg")
    bpy.ops.render.render(write_still=True)
    print('RENDERED', scene.render.filepath, flush=True)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, f'{PREFIX}unframe-gallery.blend'))
print('SAVED', flush=True)
