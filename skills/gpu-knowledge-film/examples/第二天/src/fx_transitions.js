// 由 gen_fx.py 生成，来源 gl-transitions（MIT，个别 BSD，原文件头有作者）。别手改。
export const TRANSITIONS = {
"Accordion": {
"p": {
"pleats": [
"int",
"4"
],
"direction": [
"vec2",
"vec2(-1.0, 0.0)"
],
"shading": [
"float",
"0.7"
],
"perspective": [
"float",
"1.5"
],
"backColor": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
]
},
"s": "/*@pleats*/\n/*@direction*/\n/*@shading*/\n/*@perspective*/\n/*@backColor*/\nconst float LIGHT_SIDE = 0.55;\nconst float LIGHT_FRONT = 0.835;\nconst float EDGE = 0.0015;\nfloat panelLight(float c, float s, float facing) {\n  float lambert = (c * LIGHT_FRONT + facing * s * LIGHT_SIDE) / LIGHT_FRONT;\n  return mix(1.0, clamp(lambert, 0.08, 1.25), shading);\n}\nvec4 pleated(float f, float c, float len, float b, float bLen, bool incoming, bool flipA, bool vertical) {\n  float m = 2.0 * float(pleats > 1 ? pleats : 1);\n  float s = sqrt(max(1.0 - c * c, 0.0));\n  float u = f * m;\n  float panel = min(floor(u), m - 1.0);\n  float fu = u - panel;\n  float tri = 1.0 - abs(mod(u, 2.0) - 1.0);\n  float panelLen = len / m;\n  float z = panelLen * s * (1.0 - tri);\n  float scale = 1.0 / (1.0 + perspective * z);\n  float bb = (b - 0.5 * bLen) / scale / bLen + 0.5;\n  float edge = EDGE * min(1.0, 20.0 * s * c) + 1e-6;\n  float cover = clamp(min(bb, 1.0 - bb) * bLen * scale / edge, 0.0, 1.0);\n  float a = flipA ? 1.0 - f : f;\n  vec2 st = clamp(vertical ? vec2(bb, a) : vec2(a, bb), 0.0, 1.0);\n  vec4 img = incoming ? getToColor(st) : getFromColor(st);\n  float facing = mod(panel, 2.0) < 0.5 ? 1.0 : -1.0;\n  float toEdge = min(fu, 1.0 - fu) * panelLen * c;\n  float k = 0.5 + 0.5 * clamp(toEdge / EDGE, 0.0, 1.0);\n  float light = mix(panelLight(c, s, -facing), panelLight(c, s, facing), k);\n  float valley = 1.0 - tri;\n  light *= 1.0 - 0.4 * shading * s * valley * valley;\n  return mix(backColor, vec4(img.rgb * light, img.a), cover);\n}\nvec4 transition(vec2 uv) {\n  bool vertical = abs(direction.y) > abs(direction.x);\n  bool positive = vertical ? direction.y > 0.0 : direction.x > 0.0;\n  float a = vertical ? uv.y : uv.x;\n  if (positive) a = 1.0 - a;\n  float b = vertical ? uv.x : uv.y;\n  float len = vertical ? 1.0 : ratio;\n  float bLen = vertical ? ratio : 1.0;\n  float p = progress;\n  float e = p * p * (3.0 - 2.0 * p);\n  e = mix(p, e, 0.8);\n  float cFrom = 1.0 - e;\n  float cTo = e;\n  if (a < cFrom || cTo <= 0.0) {\n    return pleated(a / cFrom, cFrom, len, b * bLen, bLen, false, positive, vertical);\n  }\n  return pleated(1.0 - (1.0 - a) / cTo, cTo, len, b * bLen, bLen, true, positive, vertical);\n}"
},
"ApertureWipe": {
"p": {
"blades": [
"int",
"6"
],
"rotation": [
"float",
"60.0"
],
"shadow": [
"float",
"0.5"
]
},
"s": "#define PI 3.141592653589793\n/*@blades*/\n/*@rotation*/\n/*@shadow*/\nconst float AA = 0.006;\nvec4 transition (vec2 uv) {\n  vec2 q = (uv - 0.5) * vec2(ratio, 1.0) / (0.5 * length(vec2(ratio, 1.0)));\n  float n = clamp(float(blades), 3.0, 12.0);\n  float sector = 2.0 * PI / n;\n  float turn = radians(rotation) * progress;\n  float r = mix(-AA, 1.0 + AA, progress);\n  float dist = -1e3;\n  float seam = 0.0;\n  for (int i = 0; i < 12; i++) {\n    if (float(i) < n) {\n      float angle = turn + float(i) * sector;\n      float d = dot(q, vec2(cos(angle), sin(angle))) - r;\n      float next = dot(q, vec2(cos(angle + sector), sin(angle + sector))) - r;\n      dist = max(dist, d);\n      float s = 1.0 - smoothstep(0.0, 0.12, -d);\n      seam = max(seam, (1.0 - smoothstep(0.0, AA, d)) * s * s * smoothstep(0.0, AA, next));\n    }\n  }\n  float rim = 1.0 - smoothstep(0.0, 0.08, dist);\n  float shade = shadow * max(rim * rim, seam) * smoothstep(0.0, 0.1, progress);\n  vec4 from = getFromColor(uv);\n  from.rgb *= 1.0 - shade;\n  return mix(from, getToColor(uv), 1.0 - smoothstep(0.0, AA, dist));\n}"
},
"Ascii": {
"p": {
"cellSize": [
"float",
"0.04"
],
"colored": [
"bool",
"true"
],
"ink": [
"vec4",
"vec4(0.3, 1.0, 0.45, 1.0)"
],
"background": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
]
},
"s": "/*@cellSize*/\n/*@colored*/\n/*@ink*/\n/*@background*/\nconst float ASPECT = 0.6;\nconst float STROKE = 0.05;\nfloat hash12(vec2 p) {\n  vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n  p3 += dot(p3, p3.yzx + 33.33);\n  return fract((p3.x + p3.y) * p3.z);\n}\nfloat segment(vec2 q, vec2 a, vec2 b) {\n  vec2 pa = q - a;\n  vec2 ba = b - a;\n  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));\n}\nfloat glyph(float g, vec2 q) {\n  if (g < 0.5) return 1.0; // \" \"\n  if (g < 1.5) return length(q - vec2(0.0, -0.27)) - 0.035; // \".\"\n  if (g < 2.5) return min(length(q - vec2(0.0, -0.25)), length(q - vec2(0.0, 0.1))) - 0.035; // \":\"\n  if (g < 3.5) return segment(q, vec2(-0.17, 0.0), vec2(0.17, 0.0)) - STROKE; // \"-\"\n  if (g < 4.5) { // \"=\"\n    return min(segment(q, vec2(-0.18, 0.1), vec2(0.18, 0.1)), segment(q, vec2(-0.18, -0.1), vec2(0.18, -0.1))) - STROKE;\n  }\n  if (g < 5.5) { // \"+\"\n    return min(segment(q, vec2(-0.19, 0.0), vec2(0.19, 0.0)), segment(q, vec2(0.0, -0.19), vec2(0.0, 0.19))) - STROKE;\n  }\n  if (g < 6.5) { // \"*\"\n    float d = segment(q, vec2(0.0, -0.2), vec2(0.0, 0.2));\n    d = min(d, segment(q, vec2(-0.18, -0.11), vec2(0.18, 0.11)));\n    d = min(d, segment(q, vec2(-0.18, 0.11), vec2(0.18, -0.11)));\n    return d - STROKE;\n  }\n  if (g < 7.5) { // \"#\"\n    float d = min(segment(q, vec2(-0.06, -0.3), vec2(-0.1, 0.3)), segment(q, vec2(0.12, -0.3), vec2(0.08, 0.3)));\n    d = min(d, min(segment(q, vec2(-0.24, 0.11), vec2(0.24, 0.11)), segment(q, vec2(-0.24, -0.11), vec2(0.24, -0.11))));\n    return d - STROKE;\n  }\n  if (g < 8.5) { // \"%\"\n    float d = segment(q, vec2(-0.2, -0.3), vec2(0.2, 0.3));\n    d = min(d, abs(length(q - vec2(-0.13, 0.19)) - 0.08));\n    d = min(d, abs(length(q - vec2(0.13, -0.19)) - 0.08));\n    return d - STROKE;\n  }\n  float d = abs(length(q) - 0.25);\n  d = min(d, abs(length(q - vec2(-0.02, 0.0)) - 0.1));\n  d = min(d, segment(q, vec2(0.08, 0.1), vec2(0.08, -0.12)));\n  return d - 0.8 * STROKE;\n}\nfloat density(vec4 c) {\n  return floor(pow(clamp(dot(c.rgb, vec3(0.299, 0.587, 0.114)) * c.a, 0.0, 1.0), 0.75) * 9.99);\n}\nvec4 cellColor(vec2 center, vec2 dims, bool incoming) {\n  vec4 c = vec4(0.0);\n  for (int i = 0; i < 4; i++) {\n    vec2 o = (vec2(mod(float(i), 2.0), floor(float(i) / 2.0)) - 0.5) * 0.5 * dims;\n    vec2 st = clamp((center + o) / vec2(ratio, 1.0) + 0.5, 0.0, 1.0);\n    c += incoming ? getToColor(st) : getFromColor(st);\n  }\n  return c * 0.25;\n}\nvec4 transition(vec2 uv) {\n  float p = progress;\n  float h = cellSize;\n  vec2 fp = (uv - 0.5) * vec2(ratio, 1.0);\n  vec2 dims = vec2(ASPECT * h, h);\n  vec2 cell = floor(fp / dims);\n  vec2 center = (cell + 0.5) * dims;\n  vec2 q = (fp - center) / h;\n  float r = hash12(cell + 100.0);\n  float at = 0.4 + 0.2 * r;\n  bool incoming = p > at;\n  vec4 c = cellColor(center, dims, incoming);\n  float g = density(c);\n  float scramble = 1.0 - smoothstep(0.02, 0.045, abs(p - at));\n  if (hash12(cell + floor(p * 40.0) * vec2(17.0, 31.0)) < scramble) {\n    g = 1.0 + floor(9.0 * hash12(cell * 1.7 + floor(p * 40.0) * vec2(5.0, 11.0)));\n  }\n  float cover = 1.0 - smoothstep(-0.02, 0.02, glyph(g, q));\n  vec3 tint = colored ? mix(c.rgb, c.rgb / max(max(c.r, max(c.g, c.b)), 0.05), 0.7) : ink.rgb;\n  float alpha = colored ? c.a : ink.a * c.a;\n  vec3 behind = colored ? mix(background.rgb, c.rgb, 0.3) : background.rgb;\n  vec4 back = vec4(behind, background.a * c.a);\n  vec4 text = mix(back, vec4(clamp(tint, 0.0, 1.0), alpha), cover);\n  float into = 0.05 + 0.22 * hash12(cell + 200.0);\n  float outof = 0.95 - 0.22 * hash12(cell + 300.0);\n  float show = smoothstep(into, into + 0.08, p) * (1.0 - smoothstep(outof - 0.08, outof, p));\n  vec4 image = p < 0.5 ? getFromColor(uv) : getToColor(uv);\n  return mix(image, text, show);\n}"
},
"BlockDissolve": {
"p": {
"blocksize": [
"float",
"0.02"
]
},
"s": "/*@blocksize*/\nfloat rand(vec2 co) {\n  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);\n}\nvec4 transition(vec2 uv) {\n  return mix(getFromColor(uv), getToColor(uv), step(rand(floor(uv / blocksize)), progress));\n}"
},
"BookFlip": {
"p": {},
"s": "float nonZero(float x) {\n  return abs(x) < 1e-4 ? (x < 0.0 ? -1e-4 : 1e-4) : x;\n}\nvec2 skewRight(vec2 p) {\n  float skewX = (p.x - progress)/nonZero(0.5 - progress) * 0.5;\n  float skewY =  (p.y - 0.5)/(0.5 + progress * (p.x - 0.5) / 0.5)* 0.5  + 0.5;\n  return vec2(skewX, skewY);\n}\nvec2 skewLeft(vec2 p) {\n  float skewX = (p.x - 0.5)/nonZero(progress - 0.5) * 0.5 + 0.5;\n  float skewY = (p.y - 0.5) / (0.5 + (1.0 - progress ) * (0.5 - p.x) / 0.5) * 0.5  + 0.5;\n  return vec2(skewX, skewY);\n}\nvec4 addShade() {\n  float shadeVal  =  max(0.7, abs(progress - 0.5) * 2.0);\n  return vec4(vec3(shadeVal ), 1.0);\n}\nvec4 transition (vec2 p) {\n  float pr = step(1.0 - progress, p.x);\n  if (p.x < 0.5) {\n    return mix(getFromColor(p), getToColor(skewLeft(p)) * addShade(), pr);\n  } else {\n    return mix(getFromColor(skewRight(p)) * addShade(), getToColor(p),   pr);\n  }\n}"
},
"Bounce": {
"p": {
"shadow_colour": [
"vec4",
"vec4(0.,0.,0.,.6)"
],
"shadow_height": [
"float",
"0.075"
],
"bounces": [
"float",
"3.0"
]
},
"s": "/*@shadow_colour*/\n/*@shadow_height*/\n/*@bounces*/\nconst float PI = 3.14159265358;\nvec4 transition (vec2 uv) {\n  float time = progress;\n  float stime = sin(time * PI / 2.);\n  float phase = time * PI * bounces;\n  float y = (abs(cos(phase))) * (1.0 - stime);\n  float d = uv.y - y;\n  vec4 to = getToColor(uv);\n  return mix(\n    mix(\n      to,\n      vec4(shadow_colour.rgb, 1.0), // shadow_colour.a is in the amount: the shadow darkens, it does not make the image transparent\n      step(d, shadow_height) * (1. - mix(\n        ((d / shadow_height) * shadow_colour.a) + (1.0 - shadow_colour.a),\n        1.0,\n        smoothstep(0.95, 1., progress) // fade-out the shadow at the end\n      )) * to.a // cast on the incoming image, not on its transparent areas\n    ),\n    getFromColor(vec2(uv.x, uv.y + (1.0 - y))),\n    step(d, 0.0)\n  );\n}"
},
"BowTie": {
"p": {
"adjust": [
"float",
"0.5"
],
"reverse": [
"bool",
"false"
]
},
"s": "/*@adjust*/\n/*@reverse*/\nfloat check(vec2 p1, vec2 p2, vec2 p3)\n{\n  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);\n}\nbool pointInTriangle(vec2 pt, vec2 p1, vec2 p2, vec2 p3)\n{\n    bool b1 = check(pt, p1, p2) < 0.0;\n    bool b2 = check(pt, p2, p3) < 0.0;\n    bool b3 = check(pt, p3, p1) < 0.0;\n    return b1 == b2 && b2 == b3;\n}\nconst float height = 0.5;\nvec4 transition_firstHalf( vec2 uv, float prog )\n{\n  if ( uv.y < 0.5 )\n  {\n    vec2 botLeft = vec2( -0., prog-height );\n    vec2 botRight = vec2( 1., prog-height );\n    vec2 tip = vec2( adjust, prog );\n    if ( pointInTriangle( uv, botLeft, botRight, tip ) )\n        return getToColor(uv);\n    }\n  else\n  {\n    vec2 topLeft = vec2( -0., 1.-prog+height );\n    vec2 topRight = vec2( 1., 1.-prog+height );\n    vec2 tip = vec2( adjust, 1.-prog );\n    if ( pointInTriangle( uv, topLeft, topRight, tip ) )\n      return getToColor( uv );\n  }\n  return getFromColor( uv );\n}\nvec4 transition_secondHalf( vec2 uv, float prog )\n{\n  if ( uv.x > adjust )\n  {\n    vec2 top = vec2( prog + height,  1. );\n    vec2 bot = vec2( prog + height, -0. );\n    vec2 tip = vec2( mix( adjust, 1.0, 2.0 * (prog - 0.5) ), 0.5 );\n    if ( pointInTriangle( uv, top, bot, tip) )\n      return getFromColor( uv );\n  }\n  else\n  {\n    vec2 top = vec2( 1.0-prog - height,  1. );\n    vec2 bot = vec2( 1.0-prog - height, -0. );\n    vec2 tip = vec2( mix( adjust, 0.0, 2.0 * (prog - 0.5)  ), 0.5 );\n    if ( pointInTriangle( uv, top, bot, tip) )\n      return getFromColor( uv );\n  }\n  return getToColor( uv );\n}\nvec4 transition (vec2 uv) {\n  if ( reverse )\n    return ( progress < 0.5 ) ? transition_secondHalf( uv, 1.-progress ) : transition_firstHalf( uv, 1.-progress );\n  else\n    return ( progress < 0.5 ) ? transition_firstHalf( uv, progress ) : transition_secondHalf( uv, progress );\n}"
},
"BowTieHorizontal": {
"p": {},
"s": "const vec2 bottom_left = vec2(0.0, 1.0);\nconst vec2 bottom_right = vec2(1.0, 1.0);\nconst vec2 top_left = vec2(0.0, 0.0);\nconst vec2 top_right = vec2(1.0, 0.0);\nconst vec2 center = vec2(0.5, 0.5);\nfloat check(vec2 p1, vec2 p2, vec2 p3)\n{\n  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);\n}\nbool PointInTriangle (vec2 pt, vec2 p1, vec2 p2, vec2 p3)\n{\n    bool b1, b2, b3;\n    b1 = check(pt, p1, p2) < 0.0;\n    b2 = check(pt, p2, p3) < 0.0;\n    b3 = check(pt, p3, p1) < 0.0;\n    return ((b1 == b2) && (b2 == b3));\n}\nbool in_left_triangle(vec2 p){\n  vec2 vertex1, vertex2, vertex3;\n  vertex1 = vec2(progress, 0.5);\n  vertex2 = vec2(0.0, 0.5-progress);\n  vertex3 = vec2(0.0, 0.5+progress);\n  if (PointInTriangle(p, vertex1, vertex2, vertex3))\n  {\n    return true;\n  }\n  return false;\n}\nbool in_right_triangle(vec2 p){\n  vec2 vertex1, vertex2, vertex3;\n  vertex1 = vec2(1.0-progress, 0.5);\n  vertex2 = vec2(1.0, 0.5-progress);\n  vertex3 = vec2(1.0, 0.5+progress);\n  if (PointInTriangle(p, vertex1, vertex2, vertex3))\n  {\n    return true;\n  }\n  return false;\n}\nfloat blur_edge(vec2 bot1, vec2 bot2, vec2 top, vec2 testPt)\n{\n  vec2 lineDir = bot1 - top;\n  vec2 perpDir = vec2(lineDir.y, -lineDir.x);\n  vec2 dirToPt1 = bot1 - testPt;\n  float dist1 = abs(dot(normalize(perpDir), dirToPt1));\n  \n  lineDir = bot2 - top;\n  perpDir = vec2(lineDir.y, -lineDir.x);\n  dirToPt1 = bot2 - testPt;\n  float min_dist = min(abs(dot(normalize(perpDir), dirToPt1)), dist1);\n  \n  if (min_dist < 0.005) {\n    return min_dist / 0.005;\n  }\n  else  {\n    return 1.0;\n  };\n}\nvec4 transition (vec2 uv) {\n  if (in_left_triangle(uv))\n  {\n    if (progress < 0.1)\n    {\n      return getFromColor(uv);\n    }\n    if (uv.x < 0.5)\n    {\n      vec2 vertex1 = vec2(progress, 0.5);\n      vec2 vertex2 = vec2(0.0, 0.5-progress);\n      vec2 vertex3 = vec2(0.0, 0.5+progress);\n      return mix(\n        getFromColor(uv),\n        getToColor(uv),\n        blur_edge(vertex2, vertex3, vertex1, uv)\n      );\n    }\n    else\n    {\n      if (progress > 0.0)\n      {\n        return getToColor(uv);\n      }\n      else\n      {\n        return getFromColor(uv);\n      }\n    }    \n  }\n  else if (in_right_triangle(uv))\n  {\n    if (uv.x >= 0.5)\n    {\n      vec2 vertex1 = vec2(1.0-progress, 0.5);\n      vec2 vertex2 = vec2(1.0, 0.5-progress);\n      vec2 vertex3 = vec2(1.0, 0.5+progress);\n      return mix(\n        getFromColor(uv),\n        getToColor(uv),\n        blur_edge(vertex2, vertex3, vertex1, uv)\n      );  \n    }\n    else\n    {\n      return getFromColor(uv);\n    }\n  }\n  else {\n    return getFromColor(uv);\n  }\n}"
},
"BowTieVertical": {
"p": {},
"s": "float check(vec2 p1, vec2 p2, vec2 p3)\n{\n  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);\n}\nbool PointInTriangle (vec2 pt, vec2 p1, vec2 p2, vec2 p3)\n{\n    bool b1, b2, b3;\n    b1 = check(pt, p1, p2) < 0.0;\n    b2 = check(pt, p2, p3) < 0.0;\n    b3 = check(pt, p3, p1) < 0.0;\n    return ((b1 == b2) && (b2 == b3));\n}\nbool in_top_triangle(vec2 p){\n  vec2 vertex1, vertex2, vertex3;\n  vertex1 = vec2(0.5, progress);\n  vertex2 = vec2(0.5-progress, 0.0);\n  vertex3 = vec2(0.5+progress, 0.0);\n  if (PointInTriangle(p, vertex1, vertex2, vertex3))\n  {\n    return true;\n  }\n  return false;\n}\nbool in_bottom_triangle(vec2 p){\n  vec2 vertex1, vertex2, vertex3;\n  vertex1 = vec2(0.5, 1.0 - progress);\n  vertex2 = vec2(0.5-progress, 1.0);\n  vertex3 = vec2(0.5+progress, 1.0);\n  if (PointInTriangle(p, vertex1, vertex2, vertex3))\n  {\n    return true;\n  }\n  return false;\n}\nfloat blur_edge(vec2 bot1, vec2 bot2, vec2 top, vec2 testPt)\n{\n  vec2 lineDir = bot1 - top;\n  vec2 perpDir = vec2(lineDir.y, -lineDir.x);\n  vec2 dirToPt1 = bot1 - testPt;\n  float dist1 = abs(dot(normalize(perpDir), dirToPt1));\n  \n  lineDir = bot2 - top;\n  perpDir = vec2(lineDir.y, -lineDir.x);\n  dirToPt1 = bot2 - testPt;\n  float min_dist = min(abs(dot(normalize(perpDir), dirToPt1)), dist1);\n  \n  if (min_dist < 0.005) {\n    return min_dist / 0.005;\n  }\n  else  {\n    return 1.0;\n  };\n}\nvec4 transition (vec2 uv) {\n  if (in_top_triangle(uv))\n  {\n    if (progress < 0.1)\n    {\n      return getFromColor(uv);\n    }\n    if (uv.y < 0.5)\n    {\n      vec2 vertex1 = vec2(0.5, progress);\n      vec2 vertex2 = vec2(0.5-progress, 0.0);\n      vec2 vertex3 = vec2(0.5+progress, 0.0);\n      return mix(\n        getFromColor(uv),\n        getToColor(uv),\n        blur_edge(vertex2, vertex3, vertex1, uv)\n      );\n    }\n    else\n    {\n      if (progress > 0.0)\n      {\n        return getToColor(uv);\n      }\n      else\n      {\n        return getFromColor(uv);\n      }\n    }    \n  }\n  else if (in_bottom_triangle(uv))\n  {\n    if (uv.y >= 0.5)\n    {\n      vec2 vertex1 = vec2(0.5, 1.0-progress);\n      vec2 vertex2 = vec2(0.5-progress, 1.0);\n      vec2 vertex3 = vec2(0.5+progress, 1.0);\n      return mix(\n        getFromColor(uv),\n        getToColor(uv),\n        blur_edge(vertex2, vertex3, vertex1, uv)\n      );  \n    }\n    else\n    {\n      return getFromColor(uv);\n    }\n  }\n  else {\n    return getFromColor(uv);\n  }\n}"
},
"Box": {
"p": {
"rectIn": [
"int",
"1"
],
"location": [
"int",
"0"
]
},
"s": "/*@rectIn*/\n/*@location*/\nvec4 transition(vec2 uv) {\n    float p = rectIn == 1 ? 1.0 - progress : progress;\n    float x1, y1, x2, y2;\n    if (location == 0) {\n        x1 = y1 = 0.5 * (1.0 - p);\n        x2 = y2 = 1.0 - x1;\n    } else {\n        x1 = (location == 1 || location == 2) ? 0.0 : 1.0 - p;\n        y1 = (location == 1 || location == 3) ? 1.0 - p : 0.0;\n        x2 = (location == 1 || location == 2) ? p : 1.0;\n        y2 = (location == 1 || location == 3) ? 1.0 : p;\n    }\n    float in_rect = step(x1, uv.x) * step(uv.x, x2) * step(y1, uv.y) * step(uv.y, y2);\n    in_rect = rectIn == 1 ? 1.0 - in_rect : in_rect;\n    return mix(getFromColor(uv), getToColor(uv), in_rect);\n}"
},
"BrushWipe": {
"p": {
"strokes": [
"float",
"4.0"
],
"angle": [
"float",
"-7.0"
],
"roughness": [
"float",
"0.6"
],
"waviness": [
"float",
"0.5"
]
},
"s": "/*@strokes*/\n/*@angle*/\n/*@roughness*/\n/*@waviness*/\nconst float PI = 3.141592653589793;\nfloat hash (vec2 p) {\n  vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n  p3 += dot(p3, p3.yzx + 33.33);\n  return fract((p3.x + p3.y) * p3.z);\n}\nfloat vnoise (vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  f = f * f * (3.0 - 2.0 * f);\n  return mix(\n    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),\n    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),\n    f.y\n  );\n}\nfloat bristles (float t, float u, float seed) {\n  return 0.6 * vnoise(vec2(t * 26.0 + seed, u * 1.3 + seed)) + 0.4 * vnoise(vec2(t * 8.0 - seed, u * 0.7));\n}\nvec2 stroke (float k, float t, float u, float U, float n, float h) {\n  float dir = mod(k, 2.0) < 0.5 ? 1.0 : -1.0;\n  float x = u * dir;\n  float dur = min(1.0, 1.8 / (n + 0.8));\n  float start = n > 1.0 ? k * (1.0 - dur) / (n - 1.0) : 0.0;\n  float s = clamp((progress - start) / dur, 0.0, 1.0);\n  s = mix(s, s * s * (3.0 - 2.0 * s), 0.7);\n  float r = roughness;\n  float lag = (0.15 + 0.6 * r) * h; // how far the longest bristles run ahead of the shortest\n  float dry = (0.1 + 0.9 * r) * h; // length of the streaky, dry trail behind the head of the stroke\n  float head = mix(-U, U + lag + 0.3 * h + 1.15 * dry + 0.01, s);\n  float b = bristles(t, k * 3.7, k * 17.0);\n  float front = head - lag * (1.0 - b) - 0.3 * h * t * t; // a rounded, ragged head\n  float streak = bristles(t * 1.7, x * 2.0 / h, k * 5.0 + 9.0);\n  float along = clamp(((front - x) / (dry + 0.001) - 0.1 - 0.8 * streak) * 6.0, 0.0, 1.0);\n  float fringe = 0.1 + 0.7 * r;\n  float e = (abs(t) - 1.0) / fringe; // < 0 in the core of the stroke\n  float reach = 0.5 + 0.5 * vnoise(vec2(x * 2.5 / h, k * 7.0 + (t > 0.0 ? 3.0 : 0.0))); // the edge wanders\n  float hair = clamp(bristles(t * 1.4, x * 3.0 / h, k * 11.0 + 3.0) * 2.0 - 0.5, 0.0, 1.0);\n  float side = clamp((reach * hair - e) * 12.0 + 1.0, 0.0, 1.0);\n  float cover = along * side;\n  float wet = (1.0 - clamp((progress - start - dur) / 0.25, 0.0, 1.0)) * min(1.0, (1.0 - progress) * 6.0);\n  return vec2(cover, cover * wet * (bristles(t * 2.0, x * 2.0 / h, k) - 0.5));\n}\nvec4 transition (vec2 uv) {\n  float a = angle * PI / 180.0;\n  float c = cos(a);\n  float sn = sin(a);\n  vec2 q = (uv - 0.5) * vec2(ratio, 1.0);\n  float u = c * q.x + sn * q.y; // along the strokes\n  float v = -sn * q.x + c * q.y; // across them\n  float U = 0.5 * (abs(c) * ratio + abs(sn));\n  float V = 0.5 * (abs(sn) * ratio + abs(c));\n  float n = max(1.0, floor(strokes + 0.5));\n  float h = 2.0 * V / n; // height of a stroke\n  float A = 0.12 * waviness * h;\n  float w = v + A * sin(u * 5.0 / U + v * 2.0 / h + 1.3) + 0.5 * A * sin(u * 11.0 / U - v * 3.0 / h);\n  float y = (V + 1.5 * A - w) / (2.0 * V + 3.0 * A) * n; // strokes go from top to bottom\n  float hh = (2.0 * V + 3.0 * A) / n;\n  float k = clamp(floor(y), 0.0, n - 1.0);\n  float cover = 0.0;\n  float shade = 0.0;\n  for (int i = -1; i <= 1; i++) {\n    float j = k + float(i);\n    if (j >= 0.0 && j <= n - 1.0) {\n      vec2 s = stroke(j, (y - j - 0.5) * 2.0, u, U, n, hh);\n      cover = max(cover, s.x);\n      shade = mix(shade, s.y, s.x); // the latest stroke is on top\n    }\n  }\n  vec4 from = getFromColor(uv);\n  vec4 to = getToColor(uv);\n  to.rgb = min(to.rgb * (1.0 + 0.2 * shade), 1.0);\n  return mix(from, to, cover);\n}"
},
"BurnThrough": {
"p": {
"burnColor": [
"vec3",
"vec3(1.0, 0.5, 0.0)"
]
},
"s": "/*@burnColor*/\nfloat random (in vec2 st) {\n    return fract(sin(dot(st.xy,\n                         vec2(12.9898,78.233)))*\n        43758.5453123);\n}\nfloat noise (in vec2 st) {\n    vec2 i = floor(st);\n    vec2 f = fract(st);\n    float a = random(i);\n    float b = random(i + vec2(1.0, 0.0));\n    float c = random(i + vec2(0.0, 1.0));\n    float d = random(i + vec2(1.0, 1.0));\n    vec2 u = f * f * (3.0 - 2.0 * f);\n    return mix(a, b, u.x) +\n            (c - a)* u.y * (1.0 - u.x) +\n            (d - b) * u.x * u.y;\n}\n#define OCTAVES 4\nfloat fbm (in vec2 st) {\n    float value = 0.0;\n    float amplitude = .5;\n    for (int i = 0; i < OCTAVES; i++) {\n        value += amplitude * noise(st);\n        st *= 2.;\n        amplitude *= .5;\n    }\n    return value;\n}\nvec4 transition (vec2 uv) {\n    if (progress <= 0.0) return getFromColor(uv);\n    if (progress >= 1.0) return getToColor(uv);\n    vec4 from = getFromColor(uv);\n    vec4 to = getToColor(uv);\n    float n = fbm(uv * 4.);\n    float l = smoothstep(progress, progress + 0.05, n);\n    float edge = (1.0 - l) * l * 5.0;\n    return mix(to, from, l) + vec4(burnColor, 0.0) * edge;\n}"
},
"ButterflyWaveScrawler": {
"p": {
"amplitude": [
"float",
"1.0"
],
"waves": [
"float",
"30.0"
],
"colorSeparation": [
"float",
"0.3"
]
},
"s": "/*@amplitude*/\n/*@waves*/\n/*@colorSeparation*/\nconst float PI = 3.14159265358979323846264;\nfloat compute(vec2 p, float progress, vec2 center) {\nvec2 o = p*sin(progress * amplitude)-center;\nvec2 h = vec2(1., 0.);\nfloat theta = acos(dot(o, h)) * waves;\nfloat s = sin((2.*theta - PI) / 24.);\nfloat s2 = s * s;\nreturn (exp(cos(theta)) - 2.*cos(4.*theta) + s2 * s2 * s) / 10.;\n}\nvec4 transition(vec2 uv) {\n  if (progress <= 0.0) return getFromColor(uv);\n  if (progress >= 1.0) return getToColor(uv);\n  vec2 p = uv;\n  float inv = 1. - progress;\n  float disp = compute(p, progress, vec2(0.5, 0.5));\n  vec4 texTo = getToColor(p + inv*disp);\n  vec4 fromCenter = getFromColor(p + progress*disp);\n  vec4 texFrom = vec4(\n    getFromColor(p + progress*disp*(1.0 - colorSeparation)).r,\n    fromCenter.g,\n    getFromColor(p + progress*disp*(1.0 + colorSeparation)).b,\n    fromCenter.a);\n  return texTo*progress + texFrom*inv;\n}"
},
"Chessboard": {
"p": {
"grid_num": [
"float",
"10.0"
]
},
"s": "/*@grid_num*/\nvec4 transition(vec2 uv) {\n    vec2 st = uv * grid_num;\n    vec2 idx = floor(st);\n    vec2 grid = fract(st);\n    vec4 a = getFromColor(uv);\n    vec4 b = getToColor(uv);\n    float checker = mod(idx.x + idx.y, 2.0);\n    float mixFactor;\n    if (progress <= 0.5) {\n        mixFactor = (checker > 0.5) ? step(grid.x, progress * 2.0) : 0.0;\n    } else {\n        mixFactor = (checker < 0.5) ? step(grid.x, (progress - 0.5) * 2.0) : 1.0;\n    }\n    return mix(a, b, mixFactor);\n}"
},
"CircleIris": {
"p": {
"center": [
"vec2",
"vec2(0.5, 0.5)"
],
"backColor": [
"vec4",
"vec4(0.1, 0.1, 0.1, 1.0)"
]
},
"s": "/*@center*/\n/*@backColor*/\nvec4 transition (vec2 uv) {\n  \n  float distance = length(uv - center);\n  float radius = sqrt(8.0) * abs(progress - 0.5);\n  \n  if (distance > radius) {\n    return backColor;\n  }\n  else {\n    if (progress < 0.5) return getFromColor(uv);\n    else return getToColor(uv);\n  }\n}"
},
"CircleOpen": {
"p": {
"smoothness": [
"float",
"0.3"
],
"opening": [
"bool",
"true"
]
},
"s": "/*@smoothness*/\n/*@opening*/\nconst vec2 center = vec2(0.5, 0.5);\nconst float SQRT_2 = 1.414213562373;\nvec4 transition (vec2 uv) {\n  float x = opening ? progress : 1.-progress;\n  float m = smoothstep(-smoothness, 0.0, SQRT_2*distance(center, uv) - x*(1.+smoothness));\n  return mix(getFromColor(uv), getToColor(uv), opening ? 1.-m : m);\n}"
},
"ClockWipe": {
"p": {
"startingAngle": [
"float",
"90.0"
]
},
"s": "#define PI 3.141592653589\n/*@startingAngle*/\nvec4 transition (vec2 uv) {\n  \n  float offset = startingAngle * PI / 180.0;\n  float angle = atan(uv.y - 0.5, uv.x - 0.5) + offset;\n  float normalizedAngle = (angle + PI) / (2.0 * PI);\n  \n  normalizedAngle = normalizedAngle - floor(normalizedAngle);\n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    step(normalizedAngle, progress)\n    );\n}"
},
"ColorCoords": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  vec4 coordTo = getToColor(uv);\n  vec4 coordFrom = getFromColor(uv);\n  return mix(\n    getFromColor(mix(uv, coordTo.rg, progress)),\n    getToColor(mix(coordFrom.rg, uv, progress)),\n    progress\n  );\n}"
},
"ColorDistance": {
"p": {
"power": [
"float",
"5.0"
]
},
"s": "/*@power*/\nvec4 transition(vec2 p) {\n  vec4 fTex = getFromColor(p);\n  vec4 tTex = getToColor(p);\n  float m = step(distance(fTex, tTex), progress);\n  return mix(\n    mix(fTex, tTex, m),\n    tTex,\n    pow(progress, power)\n  );\n}"
},
"ColorPhase": {
"p": {
"fromStep": [
"vec4",
"vec4(0.0, 0.2, 0.4, 0.0)"
],
"toStep": [
"vec4",
"vec4(0.6, 0.8, 1.0, 1.0)"
]
},
"s": "/*@fromStep*/\n/*@toStep*/\nvec4 transition (vec2 uv) {\n  vec4 a = getFromColor(uv);\n  vec4 b = getToColor(uv);\n  return mix(a, b, smoothstep(fromStep, toStep, vec4(progress)));\n}"
},
"ColorWrap": {
"p": {
"r_strength": [
"float",
"1.0"
],
"g_strength": [
"float",
"1.0"
],
"b_strength": [
"float",
"1.0"
]
},
"s": "/*@r_strength*/\n/*@g_strength*/\n/*@b_strength*/\nvec4 transition (vec2 uv) {\n  vec4 from = getFromColor(uv);\n  vec4 to = getToColor(uv);\n  vec3 c = from.rgb + vec3(r_strength, g_strength, b_strength)*progress;\n  from.rgb = mix(from.rgb, mod(c, 1.0), smoothstep(0.0, 0.1, progress));\n  return mix(from, to, progress);\n}"
},
"Comb": {
"p": {
"strips": [
"int",
"10"
],
"vertical": [
"bool",
"false"
]
},
"s": "/*@strips*/\n/*@vertical*/\nvec4 transition (vec2 uv) {\n  float a = vertical ? uv.y : uv.x;\n  float b = vertical ? uv.x : uv.y;\n  float dir = mod(floor(b * float(strips)), 2.0) < 0.5 ? 1.0 : -1.0;\n  float t = mix(progress, progress * progress * (3.0 - 2.0 * progress), 0.6);\n  float fa = a - dir * t;\n  if (fa >= 0.0 && fa <= 1.0) {\n    return getFromColor(vertical ? vec2(b, fa) : vec2(fa, b));\n  }\n  float ta = fa + dir;\n  return getToColor(vertical ? vec2(b, ta) : vec2(ta, b));\n}"
},
"CrazyParametricFun": {
"p": {
"a": [
"float",
"4.0"
],
"b": [
"float",
"1.0"
],
"amplitude": [
"float",
"120.0"
],
"smoothness": [
"float",
"0.1"
]
},
"s": "/*@a*/\n/*@b*/\n/*@amplitude*/\n/*@smoothness*/\nvec4 transition(vec2 uv) {\n  vec2 p = uv.xy / vec2(1.0).xy;\n  vec2 dir = p - vec2(.5);\n  float dist = length(dir);\n  float x = (a - b) * cos(progress) + b * cos(progress * ((a / b) - 1.) );\n  float y = (a - b) * sin(progress) - b * sin(progress * ((a / b) - 1.));\n  vec2 offset = dir * vec2(sin(progress  * dist * amplitude * x), sin(progress * dist * amplitude * y)) / smoothness;\n  return mix(getFromColor(p + offset), getToColor(p), smoothstep(0.2, 1.0, progress));\n}"
},
"CrossWarp": {
"p": {},
"s": "vec4 transition(vec2 p) {\n  float x = progress;\n  x=smoothstep(.0,1.0,(x*2.0+p.x-1.0));\n  return mix(getFromColor((p-.5)*(1.-x)+.5), getToColor((p-.5)*x+.5), x);\n}"
},
"CrossZoom": {
"p": {
"strength": [
"float",
"0.4"
]
},
"s": "/*@strength*/\nconst float PI = 3.141592653589793;\nfloat Linear_ease(in float begin, in float change, in float duration, in float time) {\n    return change * time / duration + begin;\n}\nfloat Exponential_easeInOut(in float begin, in float change, in float duration, in float time) {\n    if (time == 0.0)\n        return begin;\n    else if (time == duration)\n        return begin + change;\n    time = time / (duration / 2.0);\n    if (time < 1.0)\n        return change / 2.0 * pow(2.0, 10.0 * (time - 1.0)) + begin;\n    return change / 2.0 * (-pow(2.0, -10.0 * (time - 1.0)) + 2.0) + begin;\n}\nfloat Sinusoidal_easeInOut(in float begin, in float change, in float duration, in float time) {\n    return -change / 2.0 * (cos(PI * time / duration) - 1.0) + begin;\n}\nfloat rand (vec2 co) {\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvec4 crossFade(in vec2 uv, in float dissolve) {\n    return mix(getFromColor(uv), getToColor(uv), dissolve);\n}\nvec4 transition(vec2 uv) {\n    vec2 texCoord = uv.xy / vec2(1.0).xy;\n    vec2 center = vec2(Linear_ease(0.25, 0.5, 1.0, progress), 0.5);\n    float dissolve = Exponential_easeInOut(0.0, 1.0, 1.0, progress);\n    float strength = Sinusoidal_easeInOut(0.0, strength, 0.5, progress);\n    vec4 color = vec4(0.0);\n    float total = 0.0;\n    vec2 toCenter = center - texCoord;\n    /* randomize the lookup values to hide the fixed number of samples */\n    float offset = rand(uv);\n    for (float t = 0.0; t <= 40.0; t++) {\n        float percent = (t + offset) / 40.0;\n        float weight = 4.0 * (percent - percent * percent);\n        color += crossFade(texCoord + toCenter * percent * strength, dissolve) * weight;\n        total += weight;\n    }\n    return color / total;\n}"
},
"Crosshatch": {
"p": {
"center": [
"vec2",
"vec2(0.5)"
],
"threshold": [
"float",
"3.0"
],
"fadeEdge": [
"float",
"0.1"
]
},
"s": "/*@center*/\n/*@threshold*/\n/*@fadeEdge*/\nfloat rand(vec2 co) {\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvec4 transition(vec2 p) {\n  float dist = distance(center, p) / threshold;\n  float r = progress - min(rand(vec2(p.y, 0.0)), rand(vec2(0.0, p.x)));\n  return mix(getFromColor(p), getToColor(p), mix(0.0, mix(step(dist, r), 1.0, smoothstep(1.0-fadeEdge, 1.0, progress)), smoothstep(0.0, fadeEdge, progress)));    \n}"
},
"Cube": {
"p": {
"persp": [
"float",
"0.7"
],
"unzoom": [
"float",
"0.3"
],
"reflection": [
"float",
"0.4"
],
"floating": [
"float",
"3.0"
]
},
"s": "/*@persp*/\n/*@unzoom*/\n/*@reflection*/\n/*@floating*/\nvec2 project (vec2 p) {\n  return p * vec2(1.0, -1.2) + vec2(0.0, -floating/100.);\n}\nbool inBounds (vec2 p) {\n  return all(lessThan(vec2(0.0), p)) && all(lessThan(p, vec2(1.0)));\n}\nvec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {\n  vec4 c = vec4(0.0); // where no image is drawn: transparent\n  pfr = project(pfr);\n  if (inBounds(pfr)) {\n    c += mix(vec4(0.0), getFromColor(pfr), reflection * mix(1.0, 0.0, pfr.y));\n  }\n  pto = project(pto);\n  if (inBounds(pto)) {\n    c += mix(vec4(0.0), getToColor(pto), reflection * mix(1.0, 0.0, pto.y));\n  }\n  return c;\n}\nvec2 xskew (vec2 p, float persp, float center) {\n  float x = mix(p.x, 1.0-p.x, center);\n  return (\n    (\n      vec2( x, (p.y - 0.5*(1.0-persp) * x) / (1.0+(persp-1.0)*x) )\n      - vec2(0.5-distance(center, 0.5), 0.0)\n    )\n    * vec2(0.5 / distance(center, 0.5) * (center<0.5 ? 1.0 : -1.0), 1.0)\n    + vec2(center<0.5 ? 0.0 : 1.0, 0.0)\n  );\n}\nvec4 transition(vec2 op) {\n  float uz = unzoom * 2.0*(0.5-distance(0.5, progress));\n  vec2 p = -uz*0.5+(1.0+uz) * op;\n  vec2 fromP = xskew(\n    (p - vec2(progress, 0.0)) / vec2(1.0-progress, 1.0),\n    1.0-mix(progress, 0.0, persp),\n    0.0\n  );\n  vec2 toP = xskew(\n    p / vec2(progress, 1.0),\n    mix(pow(progress, 2.0), 1.0, persp),\n    1.0\n  );\n  if (inBounds(fromP)) {\n    return getFromColor(fromP);\n  }\n  else if (inBounds(toP)) {\n    return getToColor(toP);\n  }\n  return bgColor(op, fromP, toP);\n}"
},
"Curtains": {
"p": {
"folds": [
"float",
"7.0"
],
"shading": [
"float",
"0.7"
],
"bunch": [
"float",
"0.12"
],
"sway": [
"float",
"0.4"
]
},
"s": "/*@folds*/\n/*@shading*/\n/*@bunch*/\n/*@sway*/\nconst float PI = 3.141592653589793;\nvec4 transition (vec2 uv) {\n  float lag = sway * (1.0 - uv.y);\n  float p = progress * (1.0 - lag * (1.0 - progress));\n  float open = mix(p, p * p * (3.0 - 2.0 * p), 0.75);\n  float edge = -bunch * open * open;\n  float w = mix(0.5, bunch, open);\n  float x = min(uv.x, 1.0 - uv.x) - edge; // distance to the outer edge of the curtain\n  if (x >= w) {\n    vec4 to = getToColor(uv);\n    float shadow = 0.4 * exp((w - x) * 25.0) * clamp((edge + w) * 20.0, 0.0, 1.0);\n    return vec4(to.rgb * (1.0 - shadow * open), to.a);\n  }\n  float t = x / w;\n  float n = max(1.0, floor(folds * min(ratio, 1.0) + 0.5)); // folds keep their size in portrait\n  float a = 2.0 * PI * n * t;\n  float f = 1.0 - (1.0 - open) * (1.0 - open) * (1.0 - open); // the folds form early\n  float gather = 0.92 * f;\n  float s = 0.5 * (t + gather * sin(a) / (2.0 * PI * n)); // position in the fabric\n  vec4 c = getFromColor(vec2(uv.x < 0.5 ? s : 1.0 - s, uv.y));\n  float slope = 3.0 * gather * cos(a) * (uv.x < 0.5 ? 1.0 : -1.0);\n  float diffuse = (1.0 + 0.5 * slope) / sqrt(1.25 * (1.0 + slope * slope));\n  float crease = 0.5 + 0.5 * sin(a); // the back of each pleat is in the dark\n  float light = mix(1.0, diffuse * (1.0 - 0.6 * crease * crease), shading * f);\n  return vec4(c.rgb * light, c.a);\n}"
},
"CylinderRoll": {
"p": {
"curvature": [
"float",
"0.8"
],
"blur": [
"float",
"0.5"
],
"shading": [
"float",
"0.6"
],
"chroma": [
"float",
"0.5"
],
"downward": [
"bool",
"false"
]
},
"s": "/*@curvature*/\n/*@blur*/\n/*@shading*/\n/*@chroma*/\n/*@downward*/\nconst int SAMPLES = 24;\nconst float MAX_ANGLE = 1.1;\nconst float DIST = 2.6;\nconst float ARC = 0.12;\nfloat hash(vec2 c) {\n  vec2 q = fract(c * vec2(0.1031, 0.1030));\n  q += dot(q, q.yx + 33.33);\n  return fract((q.x + q.y) * q.x);\n}\nfloat fold(float v) {\n  return 1.0 - abs(1.0 - mod(v, 2.0));\n}\nvec4 strip(float x, float v) {\n  if (downward ? v > 1.0 : v < 0.0) {\n    return getToColor(vec2(x, fold(downward ? v - 1.0 : v + 1.0)));\n  }\n  return getFromColor(vec2(x, fold(v)));\n}\nfloat angleAt(float c) {\n  c = clamp(c, -0.98 / sqrt(DIST * DIST - 1.0), 0.98 / sqrt(DIST * DIST - 1.0));\n  return asin(c * DIST / sqrt(1.0 + c * c)) - atan(c);\n}\nvec4 transition(vec2 uv) {\n  float p = progress;\n  float h = 1.0 - abs(2.0 * p - 1.0); // 0 at both ends, 1 in the middle\n  float e = 0.5 * h * (0.1 + 0.9 * h * h);\n  float roll = p < 0.5 ? e : 1.0 - e;\n  float h3 = h * h * h;\n  float peak = h3 * h3;\n  float bend = curvature * (p < 0.5 ? h * (2.0 - h) : h * h * (3.0 - 2.0 * h));\n  float phi = MAX_ANGLE * bend + 1e-4;\n  float arcK = ARC * bend;\n  float edgeY = sin(phi) / (DIST - cos(phi));\n  vec2 n = 2.0 * uv - 1.0;\n  float xr = n.x * ratio;\n  float yn = n.y * (1.0 + arcK * xr * xr);\n  float theta = angleAt(yn * edgeY);\n  float thetaCorner = angleAt((1.0 + arcK * ratio * ratio) * edgeY);\n  float width = (DIST - 1.0) / (DIST - cos(theta));\n  float zoom = (DIST - cos(thetaCorner)) / (DIST - 1.0);\n  float x = 0.5 + 0.5 * n.x / (zoom * width);\n  float facing = (DIST * cos(theta) - 1.0)\n    / sqrt(1.0 + DIST * DIST - 2.0 * DIST * cos(theta)) ;\n  float light = mix(1.0, clamp(facing, 0.0, 1.0), shading);\n  float v = 0.5 * (theta / phi + 1.0) + (downward ? roll : -roll);\n  float len = 0.5 * blur * peak;\n  float split = chroma * peak;\n  float jitter = hash(uv * 1000.0);\n  vec3 color = vec3(0.0);\n  vec3 weight = vec3(0.0);\n  float alpha = 0.0;\n  for (int i = 0; i < SAMPLES; i++) {\n    float t = (float(i) + jitter) / float(SAMPLES) - 0.5;\n    vec4 img = strip(x, v + t * len);\n    vec3 w = vec3(max(1.0 - 4.0 * split * t, 0.0), 1.0, max(1.0 + 4.0 * split * t, 0.0));\n    color += img.rgb * img.a * w;\n    weight += img.a * w;\n    alpha += img.a;\n  }\n  color = color / max(weight, vec3(1e-5));\n  return vec4(color * light, alpha / float(SAMPLES));\n}"
},
"DefocusBlur": {
"p": {
"blurSize": [
"float",
"0.02"
]
},
"s": "/*@blurSize*/\nvec4 transition(vec2 uv) {\n  float T = progress;\n  float half_ = 0.5;\n  float D = (T < half_) ? mix(0.0, blurSize, T / half_) : mix(blurSize, 0.0, (T - half_) / half_);\n  vec4 C0 = getFromColor(uv);\n  vec4 C1 = getToColor(uv);\n  C0 += getFromColor(vec2(-0.326, -0.406) * D + uv);\n  C1 += getToColor(vec2(-0.326, -0.406) * D + uv);\n  C0 += getFromColor(vec2(-0.840, -0.074) * D + uv);\n  C1 += getToColor(vec2(-0.840, -0.074) * D + uv);\n  C0 += getFromColor(vec2(-0.696,  0.457) * D + uv);\n  C1 += getToColor(vec2(-0.696,  0.457) * D + uv);\n  C0 += getFromColor(vec2(-0.203,  0.621) * D + uv);\n  C1 += getToColor(vec2(-0.203,  0.621) * D + uv);\n  C0 += getFromColor(vec2( 0.962, -0.195) * D + uv);\n  C1 += getToColor(vec2( 0.962, -0.195) * D + uv);\n  C0 += getFromColor(vec2( 0.473, -0.480) * D + uv);\n  C1 += getToColor(vec2( 0.473, -0.480) * D + uv);\n  C0 += getFromColor(vec2( 0.519,  0.767) * D + uv);\n  C1 += getToColor(vec2( 0.519,  0.767) * D + uv);\n  C0 += getFromColor(vec2( 0.185, -0.893) * D + uv);\n  C1 += getToColor(vec2( 0.185, -0.893) * D + uv);\n  C0 += getFromColor(vec2( 0.507,  0.064) * D + uv);\n  C1 += getToColor(vec2( 0.507,  0.064) * D + uv);\n  C0 += getFromColor(vec2( 0.896,  0.412) * D + uv);\n  C1 += getToColor(vec2( 0.896,  0.412) * D + uv);\n  C0 += getFromColor(vec2(-0.322, -0.933) * D + uv);\n  C1 += getToColor(vec2(-0.322, -0.933) * D + uv);\n  C0 += getFromColor(vec2(-0.792, -0.598) * D + uv);\n  C1 += getToColor(vec2(-0.792, -0.598) * D + uv);\n  C0 /= 13.0;\n  C1 /= 13.0;\n  return mix(C0, C1, T);\n}"
},
"DiamondWipe": {
"p": {
"center": [
"vec2",
"vec2(0.5)"
],
"smoothness": [
"float",
"0.03"
]
},
"s": "/*@center*/\n/*@smoothness*/\nvec4 transition (vec2 uv) {\n  vec2 d = abs(uv - center) * vec2(ratio, 1.0);\n  vec2 far = max(center, 1.0 - center) * vec2(ratio, 1.0);\n  float dist = (d.x + d.y) / (far.x + far.y);\n  float s = max(smoothness, 0.001);\n  float m = smoothstep(0.0, s, progress * (1.0 + s) - dist);\n  return mix(getFromColor(uv), getToColor(uv), m);\n}"
},
"Directional": {
"p": {
"direction": [
"vec2",
"vec2(0.0, 1.0)"
]
},
"s": "/*@direction*/\nvec4 transition (vec2 uv) {\n  vec2 p = uv + progress * sign(direction);\n  vec2 f = fract(p);\n  return mix(\n    getToColor(f),\n    getFromColor(f),\n    step(0.0, p.y) * step(p.y, 1.0) * step(0.0, p.x) * step(p.x, 1.0)\n  );\n}"
},
"DirectionalEased": {
"p": {
"direction": [
"vec2",
"vec2(0.0, 1.0)"
]
},
"s": "/*@direction*/\nvec4 transition (vec2 uv) {\n  float easing = sqrt((2.0 - progress) * progress);\n  vec2 p = uv + easing * sign(direction);\n  vec2 f = fract(p);\n  return mix(\n    getToColor(f),\n    getFromColor(f),\n    step(0.0, p.y) * step(p.y, 1.0) * step(0.0, p.x) * step(p.x, 1.0)\n  );\n}"
},
"DirectionalScaled": {
"p": {
"direction": [
"vec2",
"vec2(0.0, 1.0)"
],
"scale": [
"float",
".7"
]
},
"s": "#define PI acos(-1.0)\n/*@direction*/\n/*@scale*/\nfloat parabola(float x) {\n  float y = pow(sin(x * PI), 1.);\n  return y;\n}\nvec4 transition (vec2 uv) {\n  float easedProgress = pow(sin(progress  * PI / 2.), 3.);\n  vec2 p = uv + easedProgress * sign(direction);\n  vec2 f = fract(p);\n  \n  float s = 1. - (1. - (1. / scale)) * parabola(progress);\n  f = (f - 0.5) * s  + 0.5;\n  \n  float mixer = step(0.0, p.y) * step(p.y, 1.0) * step(0.0, p.x) * step(p.x, 1.0);\n  vec4 col = mix(getToColor(f), getFromColor(f), mixer);\n  \n  float border = step(0., f.x) * step(0., (1. - f.x)) * step(0., f.y) * step(0., 1. - f.y);\n  col *= border;\n  \n  return col;\n}"
},
"DirectionalWarp": {
"p": {
"smoothness": [
"float",
"0.1"
],
"direction": [
"vec2",
"vec2(-1.0, 1.0)"
]
},
"s": "/*@smoothness*/\n/*@direction*/\nconst vec2 center = vec2(0.5, 0.5);\nvec4 transition (vec2 uv) {\n  vec2 v = normalize(direction);\n  v /= abs(v.x) + abs(v.y);\n  float d = v.x * center.x + v.y * center.y;\n  float m = 1.0 - smoothstep(-smoothness, 0.0, v.x * uv.x + v.y * uv.y - (d - 0.5 + progress * (1.0 + smoothness)));\n  return mix(getFromColor((uv - 0.5) * (1.0 - m) + 0.5), getToColor((uv - 0.5) * m + 0.5), m);\n}"
},
"DirectionalWipe": {
"p": {
"direction": [
"vec2",
"vec2(1.0, -1.0)"
],
"smoothness": [
"float",
"0.5"
]
},
"s": "/*@direction*/\n/*@smoothness*/\n \nconst vec2 center = vec2(0.5, 0.5);\n \nvec4 transition (vec2 uv) {\n  vec2 v = normalize(direction);\n  v /= abs(v.x)+abs(v.y);\n  float d = v.x * center.x + v.y * center.y;\n  float m =\n    (1.0-step(progress, 0.0)) * // there is something wrong with our formula that makes m not equals 0.0 with progress is 0.0\n    (1.0 - smoothstep(-smoothness, 0.0, v.x * uv.x + v.y * uv.y - (d-0.5+progress*(1.+smoothness))));\n  return mix(getFromColor(uv), getToColor(uv), m);\n}"
},
"Disintegrate": {
"p": {
"particleSize": [
"float",
"0.008"
],
"direction": [
"vec2",
"vec2(1.0, -0.15)"
],
"spread": [
"float",
"0.75"
]
},
"s": "/*@particleSize*/\n/*@direction*/\n/*@spread*/\nconst int NEAR = 17;\nconst int CANDIDATES = 35;\nconst float LIFE = 0.45;\nfloat hash12(vec2 p) {\n  vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n  p3 += dot(p3, p3.yzx + 33.33);\n  return fract((p3.x + p3.y) * p3.z);\n}\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  f = f * f * (3.0 - 2.0 * f);\n  float a = hash12(i);\n  float b = hash12(i + vec2(1.0, 0.0));\n  float c = hash12(i + vec2(0.0, 1.0));\n  float d = hash12(i + vec2(1.0, 1.0));\n  return 2.0 * mix(mix(a, b, f.x), mix(c, d, f.x), f.y) - 1.0;\n}\nfloat gust(float x) {\n  float i = floor(x);\n  float f = fract(x);\n  f = f * f * (3.0 - 2.0 * f);\n  return 2.0 * mix(hash12(vec2(i, 7.0)), hash12(vec2(i + 1.0, 7.0)), f) - 1.0;\n}\nfloat release(vec2 center, float h, float halfLength, float s) {\n  float front = 1.0 - (center.x + halfLength) / (2.0 * halfLength) + 0.14 * noise(center * s * 6.0) + 0.08 * (h - 0.5);\n  return clamp((front + 0.12) / 1.24, 0.0, 1.0) * (1.0 - LIFE);\n}\nvec4 transition(vec2 uv) {\n  vec2 d = length(direction) > 0.0 ? normalize(direction) : vec2(1.0, 0.0);\n  vec2 n = vec2(-d.y, d.x);\n  vec2 fp = (uv - 0.5) * vec2(ratio, 1.0);\n  float s = particleSize;\n  vec2 g = vec2(dot(fp, d), dot(fp, n)) / s;\n  float halfLength = 0.5 * (ratio * abs(d.x) + abs(d.y)) / s;\n  float reach = min(spread * 0.45 / s, 60.0);\n  float px = floor(g.x);\n  vec2 own = floor(g);\n  vec4 under = progress > release(own + 0.5, hash12(own), halfLength, s) ? getToColor(uv) : getFromColor(uv);\n  vec2 grainUV = vec2(0.5);\n  float cover = 0.0;\n  for (int i = 0; i < CANDIDATES; i++) {\n    float fi = float(i);\n    float cx = px - fi;\n    if (i >= NEAR + 9) {\n      cx = floor(px / 4.0) * 4.0 - 4.0 * (fi - float(NEAR + 9) + 8.0);\n    } else if (i >= NEAR) {\n      cx = floor(px / 2.0) * 2.0 - 2.0 * (fi - float(NEAR) + 8.0);\n    }\n    float visible = mod(cx, 4.0) < 0.5 ? 63.0 : mod(cx, 2.0) < 0.5 ? 31.0 : 15.0;\n    float drift = 0.3 * gust(cx * s * 4.0);\n    vec2 cell = vec2(cx, floor(g.y - drift * (g.x - cx - 0.5)));\n    vec2 center = cell + 0.5;\n    vec2 cuv = (center.x * d + center.y * n) * s / vec2(ratio, 1.0) + 0.5;\n    if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) continue;\n    float h = hash12(cell);\n    float t = (progress - release(center, h, halfLength, s)) / LIFE;\n    if (t <= 0.0 || t >= 1.0) continue;\n    float r2 = fract(h * 13.7);\n    float travel = reach * (0.4 + 0.6 * r2) * t * (0.2 + 0.8 * t);\n    float crumble = smoothstep(0.0, 0.25, t);\n    vec2 pos = center + vec2(travel + (fract(h * 71.1) - 0.5) * 0.3 * crumble, drift * travel);\n    vec2 local = abs(g - pos);\n    float size = mix(0.5, 0.3 * (1.0 - 0.5 * t) * (0.6 + 0.4 * h), crumble);\n    float feather = 0.001 + 0.12 * crumble;\n    float a = (1.0 - smoothstep(size - feather, size, max(local.x, local.y))) * (1.0 - smoothstep(0.15, 1.0, t))\n      * (1.0 - smoothstep(0.6 * visible, visible, travel));\n    if (a > cover) {\n      cover = a;\n      grainUV = cuv;\n    }\n  }\n  return mix(under, getFromColor(grainUV), cover);\n}"
},
"DitherDissolve": {
"p": {
"dotSize": [
"float",
"0.02"
]
},
"s": "/*@dotSize*/\nfloat bayer(vec2 c) {\n  float v = 0.0;\n  float scale = 16.0;\n  for (int i = 0; i < 3; i++) {\n    vec2 bit = mod(floor(c), 2.0);\n    v += scale * (2.0 * abs(bit.x - bit.y) + bit.y);\n    c *= 0.5;\n    scale *= 0.25;\n  }\n  return (v + 0.5) / 64.0;\n}\nvec4 transition(vec2 uv) {\n  vec2 cell = floor(uv * vec2(ratio, 1.0) / dotSize);\n  return progress < bayer(cell) ? getFromColor(uv) : getToColor(uv);\n}"
},
"DoomMelt": {
"p": {
"bars": [
"int",
"30"
],
"amplitude": [
"float",
"2.0"
],
"noise": [
"float",
"0.1"
],
"frequency": [
"float",
"0.5"
],
"dripScale": [
"float",
"0.5"
]
},
"s": "/*@bars*/\n/*@amplitude*/\n/*@noise*/\n/*@frequency*/\n/*@dripScale*/\nfloat rand(int num) {\n  return fract(mod(float(num) * 67123.313, 12.0) * sin(float(num) * 10.3) * cos(float(num)));\n}\nfloat wave(int num) {\n  float fn = float(num) * frequency * 0.1 * float(bars);\n  return cos(fn * 0.5) * cos(fn * 0.13) * sin((fn+10.0) * 0.3) / 2.0 + 0.5;\n}\nfloat drip(int num) {\n  return sin(float(num) / float(bars - 1) * 3.141592) * dripScale;\n}\nfloat pos(int num) {\n  return (noise == 0.0 ? wave(num) : mix(wave(num), rand(num), noise)) + (dripScale == 0.0 ? 0.0 : drip(num));\n}\nvec4 transition(vec2 uv) {\n  int bar = int(uv.x * (float(bars)));\n  float scale = 1.0 + pos(bar) * amplitude;\n  float phase = progress * scale;\n  float posY = uv.y / vec2(1.0).y;\n  vec2 p;\n  vec4 c;\n  if (phase + posY < 1.0) {\n    p = vec2(uv.x, uv.y + mix(0.0, vec2(1.0).y, phase)) / vec2(1.0).xy;\n    c = getFromColor(p);\n  } else {\n    p = uv.xy / vec2(1.0).xy;\n    c = getToColor(p);\n  }\n  return c;\n}"
},
"Doorway": {
"p": {
"reflection": [
"float",
"0.4"
],
"perspective": [
"float",
"0.4"
],
"depth": [
"float",
"3.0"
]
},
"s": "/*@reflection*/\n/*@perspective*/\n/*@depth*/\nconst vec4 black = vec4(0.0); // where no image is drawn: transparent\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec2 project (vec2 p) {\n  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);\n}\nvec4 bgColor (vec2 p, vec2 pto) {\n  vec4 c = black;\n  pto = project(pto);\n  if (inBounds(pto)) {\n    c += mix(black, getToColor(pto), reflection * mix(1.0, 0.0, pto.y));\n  }\n  return c;\n}\nvec4 transition (vec2 p) {\n  vec2 pfr = vec2(-1.), pto = vec2(-1.);\n  float middleSlit = 2.0 * abs(p.x-0.5) - progress;\n  if (middleSlit > 0.0) {\n    pfr = p + (p.x > 0.5 ? -1.0 : 1.0) * vec2(0.5*progress, 0.0);\n    float d = 1.0/(1.0+perspective*progress*(1.0-middleSlit));\n    pfr.y -= d/2.;\n    pfr.y *= d;\n    pfr.y += d/2.;\n  }\n  float size = mix(1.0, depth, 1.-progress);\n  pto = (p + vec2(-0.5, -0.5)) * vec2(size, size) + vec2(0.5, 0.5);\n  if (inBounds(pfr)) {\n    return getFromColor(pfr);\n  }\n  else if (inBounds(pto)) {\n    return getToColor(pto);\n  }\n  else {\n    return bgColor(p, pto);\n  }\n}"
},
"Dreamy": {
"p": {},
"s": "vec2 offset(float progress, float x, float theta) {\n  float phase = progress*progress + progress + theta;\n  float shifty = 0.03*progress*cos(10.0*(progress+x));\n  return vec2(0, shifty);\n}\nvec4 transition(vec2 p) {\n  return mix(getFromColor(p + offset(progress, p.x, 0.0)), getToColor(p + offset(1.0-progress, p.x, 3.14)), progress);\n}"
},
"DreamyZoom": {
"p": {
"rotation": [
"float",
"6.0"
],
"scale": [
"float",
"1.2"
]
},
"s": "#define DEG2RAD 0.03926990816987241548078304229099 // 1/180*PI\n/*@rotation*/\n/*@scale*/\nvec4 transition(vec2 uv) {\n  float phase = progress < 0.5 ? progress * 2.0 : (progress - 0.5) * 2.0;\n  float angleOffset = progress < 0.5 ? mix(0.0, rotation * DEG2RAD, phase) : mix(-rotation * DEG2RAD, 0.0, phase);\n  float newScale = progress < 0.5 ? mix(1.0, scale, phase) : mix(scale, 1.0, phase);\n  \n  vec2 center = vec2(0, 0);\n  vec2 assumedCenter = vec2(0.5, 0.5);\n  vec2 p = (uv.xy - vec2(0.5, 0.5)) / newScale * vec2(ratio, 1.0);\n  float angle = atan(p.y, p.x) + angleOffset;\n  float dist = distance(center, p);\n  p.x = cos(angle) * dist / ratio + 0.5;\n  p.y = sin(angle) * dist + 0.5;\n  vec4 c = progress < 0.5 ? getFromColor(p) : getToColor(p);\n  return vec4(c.rgb + (progress < 0.5 ? mix(0.0, 1.0, phase) : mix(1.0, 0.0, phase)), c.a);\n}"
},
"EdgeGlow": {
"p": {
"edge_thickness": [
"float",
"0.001"
],
"edge_brightness": [
"float",
"8.0"
]
},
"s": "/*@edge_thickness*/\n/*@edge_brightness*/\nvec3 detectEdgeColor(vec3[9] c) {\n  /* adjacent texel array for texel c[4]\n    036\n    147\n    258\n  */\n  vec3 dx = 2.0 * abs(c[7]-c[1]) + abs(c[2] - c[6]) + abs(c[8] - c[0]);\n\tvec3 dy = 2.0 * abs(c[3]-c[5]) + abs(c[6] - c[8]) + abs(c[0] - c[2]);\n  float delta = length(0.25 * (dx + dy) * 0.5);\n\treturn clamp(edge_brightness * delta, 0.0, 1.0) * c[4];\n}\nvec4 getFromEdgeColor(vec2 uv) {\n\tvec3 c[9];\n\tfloat alpha = 0.0;\n\tfor (int i=0; i < 3; ++i) for (int j=0; j < 3; ++j)\n\t{\n\t  vec4 color = getFromColor(uv + edge_thickness * vec2(i-1,j-1));\n    c[3*i + j] = color.rgb;\n    if (i == 1 && j == 1) alpha = color.a;\n\t}\n\treturn vec4(detectEdgeColor(c), alpha);\n}\nvec4 getToEdgeColor(vec2 uv) {\n\tvec3 c[9];\n\tfloat alpha = 0.0;\n\tfor (int i=0; i < 3; ++i) for (int j=0; j < 3; ++j)\n\t{\n\t  vec4 color = getToColor(uv + edge_thickness * vec2(i-1,j-1));\n    c[3*i + j] = color.rgb;\n    if (i == 1 && j == 1) alpha = color.a;\n\t}\n\treturn vec4(detectEdgeColor(c), alpha);\n}\nvec4 transition (vec2 uv) {\n  vec4 start = mix(getFromColor(uv), getFromEdgeColor(uv), clamp(2.0 * progress, 0.0, 1.0));\n  vec4 end = mix(getToEdgeColor(uv), getToColor(uv), clamp(2.0 * (progress - 0.5), 0.0, 1.0));\n  return mix(\n    start,\n    end,\n    progress\n  );\n}"
},
"Fade": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    progress\n  );\n}"
},
"FadeColor": {
"p": {
"color": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
],
"colorPhase": [
"float",
"0.4 ; // if 0.0, there is no black phase, if 0.9, the black phase is very important"
]
},
"s": "/*@color*/\n/*@colorPhase*/\nvec4 transition (vec2 uv) {\n  return mix(\n    mix(color, getFromColor(uv), smoothstep(1.0-colorPhase, 0.0, progress)),\n    mix(color, getToColor(uv), smoothstep(    colorPhase, 1.0, progress)),\n    progress);\n}"
},
"FadeGrayscale": {
"p": {
"intensity": [
"float",
"0.3; // if 0.0, the image directly turn grayscale, if 0.9, the grayscale transition phase is very important"
]
},
"s": "/*@intensity*/\n \nvec3 grayscale (vec3 color) {\n  return vec3(0.2126*color.r + 0.7152*color.g + 0.0722*color.b);\n}\n \nvec4 transition (vec2 uv) {\n  vec4 fc = getFromColor(uv);\n  vec4 tc = getToColor(uv);\n  return mix(\n    mix(vec4(grayscale(fc.rgb), fc.a), fc, smoothstep(1.0-intensity, 0.0, progress)),\n    mix(vec4(grayscale(tc.rgb), tc.a), tc, smoothstep(    intensity, 1.0, progress)),\n    progress);\n}"
},
"FallOver": {
"p": {
"perspective": [
"float",
"0.8"
],
"shading": [
"float",
"0.7"
]
},
"s": "/*@perspective*/\n/*@shading*/\nconst float PI = 3.141592653589793;\nvec4 transition (vec2 uv) {\n  float fall = progress * (0.25 + 0.75 * progress);\n  float angle = 0.5 * PI * fall;\n  float c = cos(angle), s = sin(angle);\n  float dist = 1.0 / max(perspective, 0.01);\n  vec3 eye = vec3(0.5 * ratio, 0.5 * c, -dist);\n  vec3 dir = vec3(uv.x * ratio, uv.y, 0.0) - eye;\n  float den = dir.z * c - dir.y * s;\n  if (den > 0.0) {\n    float t = (eye.y * s - eye.z * c) / den;\n    vec3 hit = eye + t * dir;\n    vec2 puv = vec2(hit.x / ratio, hit.y * c + hit.z * s);\n    if (t > 0.0 && puv.y > 0.0 && puv.y <= 1.0 && puv.x >= 0.0 && puv.x <= 1.0) {\n      vec4 col = getFromColor(puv);\n      return vec4(col.rgb * (1.0 - shading * s), col.a);\n    }\n  }\n  return getToColor(uv);\n}"
},
"FilmBurn": {
"p": {
"Seed": [
"float",
"2.31"
]
},
"s": "/*@Seed*/\nfloat sigmoid(float x, float a) {\n    float b = pow(x*2.,a)/2.;\n    if (x > .5) {\n        b = 1.-pow(2.-(x*2.),a)/2.;\n    }\n\treturn b;\n}\nfloat rand(float co){\n    return fract(sin((co*24.9898)+Seed)*43758.5453);\n}\nfloat rand(vec2 co){\n    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nfloat apow(float a,float b) { return pow(abs(a),b)*sign(b); }\nvec3 pow3(vec3 a,vec3 b) { return vec3(apow(a.r,b.r),apow(a.g,b.g),apow(a.b,b.b)); }\nfloat smooth_mix(float a,float b,float c) { return mix(a,b,sigmoid(c,2.)); }\nfloat random(vec2 co, float shft){\n    co += 10.;\n    return smooth_mix(fract(sin(dot(co.xy ,vec2(12.9898+(floor(shft)*.5),78.233+Seed))) * 43758.5453),fract(sin(dot(co.xy ,vec2(12.9898+(floor(shft+1.)*.5),78.233+Seed))) * 43758.5453),fract(shft));\n}\nfloat smooth_random(vec2 co, float shft) {\n\treturn smooth_mix(smooth_mix(random(floor(co),shft),random(floor(co+vec2(1.,0.)),shft),fract(co.x)),smooth_mix(random(floor(co+vec2(0.,1.)),shft),random(floor(co+vec2(1.,1.)),shft),fract(co.x)),fract(co.y));\n}\nvec4 blendedColor(vec2 p) {\n    return mix(getFromColor(p), getToColor(p), sigmoid(progress,10.));\n}\n#define pi 3.14159265358979323\n#define clamps(x) clamp(x,0.,1.)\nvec4 transition(vec2 p) {\n  vec3 f = vec3(0.);\n  for (float i = 0.; i < 13.; i++) {\n    f += sin(((p.x*rand(i)*6.)+(progress*8.))+rand(i+1.43))*sin(((p.y*rand(i+4.4)*6.)+(progress*6.))+rand(i+2.4));\n    f += 1.-clamps(length(p-vec2(smooth_random(vec2(progress*1.3),i+1.),smooth_random(vec2(progress*.5),i+6.25)))*mix(20.,70.,rand(i)));\n  }\n  f += 4.;\n  f /= 11.;\n  f = pow3(f*vec3(1.,0.7,0.6),vec3(1.,2.-sin(progress*pi),1.3));\n  f *= sin(progress*pi);\n  \n  p -= .5;\n  p *= 1.+(smooth_random(vec2(progress*5.),6.3)*sin(progress*pi)*.05);\n  p += .5;\n  \n  vec4 blurred_image = vec4(0.);\n  float bluramount = sin(progress*pi)*.03;\n  #define repeats  50.\n  for (float i = 0.; i < repeats; i++) { \n      vec2 q = vec2(cos(degrees((i/repeats)*360.)),sin(degrees((i/repeats)*360.))) *  (rand(vec2(i,p.x+p.y))+bluramount); \n      vec2 uv2 = p+(q*bluramount);\n      blurred_image += blendedColor(uv2);\n  }\n  blurred_image /= repeats;\n  \n  return blurred_image+vec4(f,0.);\n}"
},
"FilmDissolve": {
"p": {
"overlap": [
"float",
"0.25"
],
"smoothness": [
"float",
"0.5"
]
},
"s": "/*@overlap*/\n/*@smoothness*/\nvec3 toLinear(vec3 c) {\n  vec3 lo = c / 12.92;\n  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));\n  return mix(lo, hi, vec3(greaterThan(c, vec3(0.04045))));\n}\nvec3 toSrgb(vec3 c) {\n  vec3 lo = c * 12.92;\n  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;\n  return mix(lo, hi, vec3(greaterThan(c, vec3(0.0031308))));\n}\nvec4 transition(vec2 uv) {\n  vec4 a = getFromColor(uv);\n  vec4 b = getToColor(uv);\n  if (progress <= 0.0) return a;\n  if (progress >= 1.0) return b;\n  float t = mix(progress, smoothstep(0.0, 1.0, progress), smoothness);\n  vec3 la = toLinear(clamp(a.rgb, 0.0, 1.0)) * a.a;\n  vec3 lb = toLinear(clamp(b.rgb, 0.0, 1.0)) * b.a;\n  vec3 base = mix(la, lb, t);\n  float alpha = mix(a.a, b.a, t);\n  float extra = overlap * min(t, 1.0 - t);\n  vec3 excess = extra * (la + lb);\n  vec3 room = max(vec3(alpha) - base, vec3(1e-5));\n  vec3 color = base + room * (1.0 - exp(-excess / room));\n  if (alpha <= 0.0) return vec4(0.0);\n  return vec4(toSrgb(clamp(color / alpha, 0.0, 1.0)), alpha);\n}"
},
"FilmStrip": {
"p": {
"frames": [
"int",
"2"
],
"shrink": [
"float",
"0.2"
],
"blur": [
"float",
"0.5"
],
"weave": [
"float",
"0.5"
],
"filmColor": [
"vec4",
"vec4(0.06, 0.05, 0.05, 1.0)"
],
"holeColor": [
"vec4",
"vec4(0.96, 0.93, 0.85, 1.0)"
]
},
"s": "/*@frames*/\n/*@shrink*/\n/*@blur*/\n/*@weave*/\n/*@filmColor*/\n/*@holeColor*/\nconst float FRAME_LINE = 0.08;\nconst float HOLES = 4.0;\nconst int SAMPLES = 16;\nfloat dither(vec2 cell) {\n  return fract(52.9829189 * fract(dot(cell, vec2(0.06711056, 0.00583715))));\n}\nvec4 film(float x, float y, float base, float n, float aa, float holeX, vec2 holeSize, float holes) {\n  float pitch = 1.0 + FRAME_LINE;\n  float jy = floor(y / pitch);\n  float j = base + jy;\n  float fy = y - jy * pitch;\n  vec4 c = filmColor;\n  if (x >= 0.0 && x <= 1.0 && fy <= 1.0) {\n    vec2 q = vec2(x, fy);\n    c = j < n ? getFromColor(q) : getToColor(q);\n  }\n  float inside = min(min(x, 1.0 - x) * ratio, min(fy, 1.0 - fy));\n  c = mix(filmColor, c, clamp(inside / aa + 0.5, 0.0, 1.0));\n  float hy = mod(y, pitch / HOLES) - 0.5 * pitch / HOLES;\n  float hx = (abs(x - 0.5) - holeX) * ratio;\n  vec2 dd = abs(vec2(hx, hy)) - holeSize + 0.3 * holeSize.x;\n  float sd = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - 0.3 * holeSize.x;\n  return mix(c, holeColor, clamp(0.5 - sd / aa, 0.0, 1.0) * holes);\n}\nvec4 transition(vec2 uv) {\n  if (progress <= 0.0) return getFromColor(uv);\n  if (progress >= 1.0) return getToColor(uv);\n  float n = max(float(frames), 1.0);\n  float pitch = 1.0 + FRAME_LINE;\n  float p = progress;\n  float env = smoothstep(0.0, 0.3, p) * (1.0 - smoothstep(0.7, 1.0, p));\n  float k = 1.0 - shrink * env;\n  float x0 = clamp((p - 0.15) / 0.7, 0.0, 1.0);\n  float slip = x0 * x0 * x0 * (x0 * (x0 * 6.0 - 15.0) + 10.0);\n  float speed = 30.0 * x0 * x0 * (1.0 - x0) * (1.0 - x0) / 0.7; // d(slip)/d(progress), up to ~2.7\n  float wob = weave * env;\n  float dx = wob * smoothstep(0.0, 0.1, shrink) * (0.006 * sin(p * 47.0) + 0.004 * sin(p * 113.0 + 1.3));\n  float dy = wob * 0.012 * sin(p * 71.0 + 0.4) * (1.0 - speed / 2.7);\n  float frameSlip = slip * n;\n  float base = floor(frameSlip);\n  float x = (uv.x - 0.5) / k + 0.5 + dx;\n  float y = (uv.y - 0.5) / k + 0.5 + dy + (frameSlip - base) * pitch;\n  float aa = 0.002 * min(1.0, 10.0 * env) * min(1.0, 20.0 * shrink) + 1e-4;\n  float margin = 0.5 * shrink / max(1.0 - shrink, 0.01);\n  float holeX = 0.5 + 0.5 * margin;\n  vec2 holeSize = vec2(0.28 * margin * ratio, 0.11 * pitch / HOLES);\n  float holes = smoothstep(0.0, 0.02, margin);\n  float len = blur * 0.06 * speed * n;\n  vec4 color = vec4(0.0);\n  if (len < 1e-5) {\n    color = film(x, y, base, n, aa, holeX, holeSize, holes);\n  } else {\n    float jitter = dither(floor(uv * vec2(ratio, 1.0) * 540.0));\n    for (int i = 0; i < SAMPLES; i++) {\n      float t = (float(i) + jitter) / float(SAMPLES) - 0.5;\n      vec4 c = film(x, y + t * len, base, n, aa, holeX, holeSize, holes);\n      color += vec4(c.rgb * c.a, c.a);\n    }\n    color /= float(SAMPLES);\n    color.rgb = color.a > 0.0 ? color.rgb / color.a : vec3(0.0);\n  }\n  color.rgb *= 1.0 - 0.08 * wob * (0.5 + 0.5 * sin(p * 157.0));\n  return color;\n}"
},
"Fisheye": {
"p": {
"strength": [
"float",
"0.8"
]
},
"s": "/*@strength*/\nvec4 transition(vec2 uv) {\n  float h = smoothstep(0.0, 1.0, 1.0 - abs(2.0 * progress - 1.0));\n  float k = 1.0 - pow(max(1.0 - strength, 0.01), h);\n  vec2 aspect = vec2(ratio, 1.0);\n  vec2 c = (uv - 0.5) * aspect;\n  float r = length(c) / length(0.5 * aspect);\n  vec2 q = 0.5 + (uv - 0.5) * (1.0 - k + k * r * r);\n  return mix(getFromColor(q), getToColor(q), smoothstep(0.38, 0.62, progress));\n}"
},
"FlowerWipe": {
"p": {
"segments": [
"int",
"5"
]
},
"s": "#define PI 3.14159265359\n/*@segments*/\nvec4 transition (vec2 uv) {\n  \n  float angle = atan(uv.y - 0.5, uv.x - 0.5) - 0.5 * PI;\n  float normalized = (angle + 1.5 * PI) * (2.0 * PI);\n  \n  float radius = (cos(float(segments) * angle) + 4.0) / 4.0;\n  float difference = length(uv - vec2(0.5, 0.5));\n  \n  if (difference > radius * progress)\n    return getFromColor(uv);\n  else\n    return getToColor(uv);\n}"
},
"FlyEye": {
"p": {
"size": [
"float",
"0.04"
],
"zoom": [
"float",
"50.0"
],
"colorSeparation": [
"float",
"0.3"
]
},
"s": "/*@size*/\n/*@zoom*/\n/*@colorSeparation*/\nvec4 transition(vec2 p) {\n  float inv = 1. - progress;\n  vec2 disp = size*vec2(cos(zoom*p.x), sin(zoom*p.y));\n  vec4 texTo = getToColor(p + inv*disp);\n  vec4 fromCenter = getFromColor(p + progress*disp);\n  vec4 texFrom = vec4(\n    getFromColor(p + progress*disp*(1.0 - colorSeparation)).r,\n    fromCenter.g,\n    getFromColor(p + progress*disp*(1.0 + colorSeparation)).b,\n    fromCenter.a);\n  return texTo*progress + texFrom*inv;\n}"
},
"Fold": {
"p": {},
"s": "vec4 transition(vec2 uv) {\n  if (progress == 0.0 || uv.x > progress) return getFromColor((uv - vec2(progress, 0.0)) / vec2(1.0 - progress, 1.0));\n  return getToColor(uv / vec2(progress, 1.0));\n}"
},
"GlitchBands": {
"p": {
"ampx": [
"float",
"1.0"
],
"ampy": [
"float",
"1.0"
]
},
"s": "/*@ampx*/\n/*@ampy*/\nvec4 transition (vec2 uv) {\n  vec4 from = getFromColor(uv);\n  vec4 to = getToColor(uv);\n  float r = from.r;\n  float g = from.g;\n  float b = from.b;\n  float sphere = r*r + g*g + b*b - 1.0; //3 to 1\n  float spiralX = cos(sphere - uv.x/(progress + .01));\n  float spiralY = sin(sphere - uv.y/(progress+.01));\n  vec2 st = uv;\n  st.x = fract(ampx*st.x*spiralX); //1 to 2\n  st.y = fract(ampy*st.y*spiralY);\n  vec2 diff = uv - st;\n  from = getFromColor(uv + progress*diff);\n  return mix(from, to, progress);\n}"
},
"GlitchDisplace": {
"p": {},
"s": "float random(vec2 co)\n{\n    float a = 12.9898;\n    float b = 78.233;\n    float c = 43758.5453;\n    float dt= dot(co.xy ,vec2(a,b));\n    float sn= mod(dt,3.14);\n    return fract(sin(sn) * c);\n}\nfloat voronoi( in vec2 x ) {\n    vec2 p = floor( x );\n    vec2 f = fract( x );\n    float res = 8.0;\n    for( float j=-1.; j<=1.; j++ )\n    for( float i=-1.; i<=1.; i++ ) {\n        vec2  b = vec2( i, j );\n        vec2  r = b - f + random( p + b );\n        float d = dot( r, r );\n        res = min( res, d );\n    }\n    return sqrt( res );\n}\nvec2 displace(vec4 tex, vec2 texCoord, float dotDepth, float textureDepth, float strength) {\n    float b = voronoi(.003 * texCoord + 2.0);\n    float g = voronoi(0.2 * texCoord);\n    float r = voronoi(texCoord - 1.0);\n    vec4 dt = tex * 1.0;\n    vec4 dis = dt * dotDepth + 1.0 - tex * textureDepth;\n    dis.x = dis.x - 1.0 + textureDepth*dotDepth;\n    dis.y = dis.y - 1.0 + textureDepth*dotDepth;\n    dis.x *= strength;\n    dis.y *= strength;\n    vec2 res_uv = texCoord ;\n    res_uv.x = res_uv.x + dis.x - 0.0;\n    res_uv.y = res_uv.y + dis.y;\n    return res_uv;\n}\nfloat ease1(float t) {\n  return t == 0.0 || t == 1.0\n    ? t\n    : t < 0.5\n      ? +0.5 * pow(2.0, (20.0 * t) - 10.0)\n      : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;\n}\nfloat ease2(float t) {\n  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);\n}\nvec4 transition(vec2 uv) {\n  vec2 p = uv.xy / vec2(1.0).xy;\n  vec4 color1 = getFromColor(p);\n  vec4 color2 = getToColor(p);\n  vec2 disp = displace(color1, p, 0.33, 0.7, 1.0-ease1(progress));\n  vec2 disp2 = displace(color2, p, 0.33, 0.5, ease2(progress));\n  vec4 dColor1 = getToColor(disp);\n  vec4 dColor2 = getFromColor(disp2);\n  float val = ease1(progress);\n  vec3 gray = vec3(dot(min(dColor2, dColor1).rgb, vec3(0.299, 0.587, 0.114)));\n  dColor2 = vec4(gray * 2.0, dColor2.a);\n  color1 = mix(color1, dColor2, smoothstep(0.0, 0.5, progress));\n  color2 = mix(color2, dColor1, smoothstep(1.0, 0.5, progress));\n  return mix(color1, color2, val);\n}"
},
"GlitchFlicker": {
"p": {
"frameRate": [
"float",
"24.0"
],
"rgbOffset": [
"float",
"0.014"
],
"blockAmount": [
"float",
"0.72"
],
"ghostAmount": [
"float",
"0.62"
],
"redCyan": [
"float",
"0.58"
],
"scanline": [
"float",
"0.075"
]
},
"s": "/*@frameRate*/\n/*@rgbOffset*/\n/*@blockAmount*/\n/*@ghostAmount*/\n/*@redCyan*/\n/*@scanline*/\nfloat sat(float x) {\n  return clamp(x, 0.0, 1.0);\n}\nfloat hash12(vec2 p) {\n  p = fract(p * vec2(443.8975, 397.2973));\n  p += dot(p, p.yx + 19.19);\n  return fract(p.x * p.y);\n}\nvec2 safeUv(vec2 uv) {\n  return clamp(uv, vec2(0.001), vec2(0.999));\n}\nfloat frameReveal(float f) {\n  if (f < 0.5) return 0.00;\n  if (f < 1.5) return 0.28;\n  if (f < 2.5) return 0.43;\n  if (f < 3.5) return 0.46;\n  if (f < 4.5) return 0.38;\n  if (f < 5.5) return 0.48;\n  if (f < 6.5) return 0.26;\n  if (f < 7.5) return 0.10;\n  if (f < 8.5) return 0.00;\n  if (f < 9.5) return 0.00;\n  if (f < 10.5) return 0.30;\n  if (f < 11.5) return 0.58;\n  if (f < 12.5) return 1.00;\n  if (f < 13.5) return 0.70;\n  if (f < 14.5) return 0.42;\n  if (f < 15.5) return 0.55;\n  if (f < 16.5) return 0.72;\n  if (f < 17.5) return 0.88;\n  if (f < 18.5) return 0.34;\n  if (f < 19.5) return 0.48;\n  if (f < 20.5) return 0.56;\n  if (f < 21.5) return 0.76;\n  if (f < 22.5) return 0.93;\n  return 1.00;\n}\nfloat frameGlitch(float f) {\n  if (f < 0.5) return 0.00;\n  if (f < 6.5) return 0.92;\n  if (f < 10.5) return 0.38;\n  if (f < 11.5) return 0.78;\n  if (f < 12.5) return 0.12;\n  if (f < 17.5) return 0.74;\n  if (f < 22.5) return 0.88;\n  if (f < 23.5) return 0.28;\n  return 0.00;\n}\nvec4 chromaFrom(vec2 uv, float amt) {\n  vec2 o = vec2(amt, 0.0);\n  vec4 center = getFromColor(safeUv(uv));\n  return vec4(\n    getFromColor(safeUv(uv + o)).r,\n    center.g,\n    getFromColor(safeUv(uv - o)).b,\n    center.a\n  );\n}\nvec4 chromaTo(vec2 uv, float amt) {\n  vec2 o = vec2(amt, 0.0);\n  vec4 center = getToColor(safeUv(uv));\n  return vec4(\n    getToColor(safeUv(uv - o)).r,\n    center.g,\n    getToColor(safeUv(uv + o)).b,\n    center.a\n  );\n}\nfloat blockMask(vec2 uv, float f) {\n  vec2 big = floor(uv * vec2(4.0, 2.0));\n  vec2 small = floor(uv * vec2(8.0, 4.0));\n  float wide = step(0.48, hash12(vec2(big.x, f * 1.37)));\n  float chunks = step(0.56, hash12(small + vec2(f * 2.11, f * 0.73)));\n  float verticalCut = smoothstep(\n    -0.035,\n    0.035,\n    uv.x - mix(0.18, 0.78, hash12(vec2(f, 4.7)))\n  );\n  return sat(mix(wide, chunks, 0.38) * 0.72 + verticalCut * 0.28);\n}\nvec4 transition(vec2 uv) {\n  if (progress <= 0.0) return getFromColor(uv);\n  if (progress >= 1.0) return getToColor(uv);\n  float f = floor(progress * frameRate);\n  float reveal = frameReveal(f);\n  float glitch = frameGlitch(f);\n  float rnd = hash12(vec2(f, 9.13));\n  vec2 jitter = vec2(\n    (rnd - 0.5) * 0.042,\n    (hash12(vec2(f, 2.71)) - 0.5) * 0.010\n  ) * glitch;\n  vec2 fromUv = safeUv(uv + jitter);\n  vec2 toUv = safeUv(uv - jitter * 0.55);\n  float block = blockMask(uv, f);\n  float localReveal = sat(\n    reveal +\n    (block - 0.5) * blockAmount * glitch +\n    (hash12(vec2(f, floor(uv.y * 9.0))) - 0.5) * 0.18 * glitch\n  );\n  localReveal = smoothstep(0.22, 0.78, localReveal);\n  vec4 oldClip = chromaFrom(fromUv, rgbOffset * glitch);\n  vec4 newClip = chromaTo(toUv, rgbOffset * glitch);\n  vec4 color = mix(oldClip, newClip, localReveal);\n  float leftWash = (1.0 - smoothstep(0.10, 0.78, uv.x)) * glitch;\n  float cyanWash = smoothstep(0.08, 0.62, uv.x) * (1.0 - smoothstep(0.86, 1.0, uv.x)) * glitch;\n  vec3 redGhost = oldClip.rgb * vec3(1.34, 0.42, 0.38);\n  vec3 cyanGhost = newClip.rgb * vec3(0.48, 1.12, 1.24);\n  color.rgb = mix(color.rgb, redGhost, leftWash * redCyan * 0.42);\n  color.rgb = mix(color.rgb, cyanGhost, cyanWash * redCyan * 0.30);\n  float oldReturn = glitch * (1.0 - smoothstep(0.94, 1.0, reveal));\n  oldReturn *= 0.18 + 0.52 * (1.0 - abs(localReveal - 0.5) * 2.0);\n  color.rgb = mix(color.rgb, oldClip.rgb, oldReturn * ghostAmount);\n  float lines = sin((uv.y + f * 0.017) * 1080.0);\n  color.rgb += lines * scanline * glitch;\n  float exposurePulse = (hash12(vec2(f, 12.4)) - 0.35) * 0.10 * glitch;\n  color.rgb += exposurePulse;\n  return vec4(sat(color.r), sat(color.g), sat(color.b), color.a);\n}"
},
"GlitchMemories": {
"p": {},
"s": "vec4 transition(vec2 p) {\n  vec2 block = floor(p.xy / vec2(16));\n  vec2 uv_noise = block / vec2(64);\n  uv_noise += floor(vec2(progress) * vec2(1200.0, 3500.0)) / vec2(64);\n  vec2 dist = progress > 0.0 ? (fract(uv_noise) - 0.5) * 0.3 *(1.0 -progress) : vec2(0.0);\n  vec2 red = p + dist * 0.2;\n  vec2 green = p + dist * .3;\n  vec2 blue = p + dist * .5;\n  vec4 center = mix(getFromColor(green), getToColor(green), progress);\n  return vec4(mix(getFromColor(red), getToColor(red), progress).r, center.g, mix(getFromColor(blue), getToColor(blue), progress).b, center.a);\n}"
},
"GlowDissolve": {
"p": {
"uLineWidth": [
"float",
"0.1"
],
"uSpreadClr": [
"vec3",
"vec3(1.0, 0.0, 0.0)"
],
"uHotClr": [
"vec3",
"vec3(0.9, 0.9, 0.2)"
],
"uPow": [
"float",
"5.0"
],
"uIntensity": [
"float",
"1.0"
]
},
"s": "/*@uLineWidth*/\n/*@uSpreadClr*/\n/*@uHotClr*/\n/*@uPow*/\n/*@uIntensity*/\nvec2 hash(vec2 p)  // replace this by something better\n{\n  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));\n  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);\n}\nfloat noise(in vec2 p) {\n  const float K1 = 0.366025404;  // (sqrt(3)-1)/2;\n  const float K2 = 0.211324865;  // (3-sqrt(3))/6;\n  vec2 i = floor(p + (p.x + p.y) * K1);\n  vec2 a = p - i + (i.x + i.y) * K2;\n  float m = step(a.y, a.x);\n  vec2 o = vec2(m, 1.0 - m);\n  vec2 b = a - o + K2;\n  vec2 c = a - 1.0 + 2.0 * K2;\n  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);\n  vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));\n  return dot(n, vec3(70.0));\n}\nvec4 transition(vec2 uv) {\n  vec4 from = getFromColor(uv);\n  vec4 to = getToColor(uv);\n  vec4 outColor;\n  float burn;\n  burn = 0.5 + 0.5 * (0.299 * from.r + 0.587 * from.g + 0.114 * from.b);\n  float show = burn - progress;\n  if (show < 0.001) {\n    outColor = to;\n  } else {\n    float factor = 1.0 - smoothstep(0.0, uLineWidth, show);\n    vec3 burnColor = mix(uSpreadClr, uHotClr, factor);\n    burnColor = pow(burnColor, vec3(uPow)) * uIntensity;\n    vec3 finalRGB = mix(from.rgb, burnColor, factor * step(0.0001, progress));\n    outColor = vec4(finalRGB, from.a); // straight alpha, like the images\n  }\n  return outColor;\n}"
},
"GooeyWipe": {
"p": {
"blobs": [
"float",
"5.0"
],
"smoothness": [
"float",
"0.5"
],
"highlight": [
"vec4",
"vec4(1.0, 1.0, 1.0, 0.7)"
],
"shadow": [
"vec4",
"vec4(0.0, 0.0, 0.0, 0.3)"
]
},
"s": "/*@blobs*/\n/*@smoothness*/\n/*@highlight*/\n/*@shadow*/\nfloat hash (vec2 p) {\n  vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n  p3 += dot(p3, p3.yzx + 33.33);\n  return fract((p3.x + p3.y) * p3.z);\n}\nvec2 fold (vec2 p) {\n  return 1.0 - abs(1.0 - mod(p, 2.0));\n}\nvec3 blob (vec2 cell, float rStart, float rEnd) {\n  vec2 c = cell + 0.5 + 0.7 * (vec2(hash(cell + 0.5), hash(cell + 41.3)) - 0.5);\n  float t0 = 0.02 + 0.43 * hash(cell + 17.9); // when it pops up\n  float s = clamp((progress - t0) / (1.0 - t0), 0.0, 1.0);\n  float pop = clamp((progress - t0) / 0.12, 0.0, 1.0);\n  pop = 1.0 - (1.0 - pop) * (1.0 - pop) * (1.0 - pop);\n  float r = mix(rStart, 0.18, pop) + (rEnd - 0.18) * s * sqrt(s);\n  r += 0.05 * sin(pop * 9.0) * (1.0 - s) * pop;\n  return vec3(r, c);\n}\nvec4 transition (vec2 uv) {\n  float n = max(1.0, floor(blobs + 0.5));\n  float cellSize = max(ratio, 1.0) / n;\n  vec2 q = vec2(uv.x * ratio, uv.y) / cellSize; // in cells\n  vec2 base = floor(q);\n  float k = 0.02 + 0.25 * smoothness; // melting distance, in cells\n  float w = 0.16; // width of the rounded rim, in cells\n  float rStart = -(0.03 + 4.0 * k);\n  float rEnd = 0.85 * sqrt(2.0) + w + 0.05;\n  float m = 1e3; // distance to the nearest blob\n  float sum = 0.0;\n  vec2 grad = vec2(0.0);\n  float rNear = 0.0; // radius of the nearest blob\n  for (int j = -3; j <= 3; j++) {\n    for (int i = -3; i <= 3; i++) {\n      vec3 b = blob(base + vec2(float(i), float(j)), rStart, rEnd);\n      vec2 dq = q - b.yz;\n      float l = length(dq);\n      float dist = l - b.x;\n      vec2 g = dq / max(l, 1e-4);\n      if (dist < m) {\n        float scale = exp((dist - m) / k);\n        sum = sum * scale + 1.0;\n        grad = grad * scale + g;\n        m = dist;\n        rNear = b.x;\n      } else {\n        float wt = exp((m - dist) / k);\n        sum += wt;\n        grad += wt * g;\n      }\n    }\n  }\n  float d = m - k * log(sum); // < 0 inside the goo\n  grad /= sum;\n  float aa = 0.012 * n / 5.0;\n  float inside = 1.0 - smoothstep(-aa, aa, d);\n  float h = clamp(-d / w, 0.0, 1.0);\n  float settle = 1.0 - smoothstep(0.45, 0.85, progress);\n  float tilt = (1.0 - h) * (1.0 - h) * settle;\n  vec3 nrm = normalize(vec3(grad * tilt * 3.0, 1.0));\n  vec3 halfway = normalize(vec3(-0.35, 0.45, 1.0) + vec3(0.0, 0.0, 1.0));\n  float spec = pow(max(dot(nrm, halfway), 0.0), 200.0) * settle;\n  float shade = 1.0 - tilt * (0.25 + 0.3 * clamp(dot(grad, vec2(0.6, -0.8)) + 0.3, 0.0, 1.0));\n  vec4 to = getToColor(fold(uv - grad * tilt * 0.01 * cellSize / vec2(ratio, 1.0)));\n  float t2 = tilt * tilt;\n  float gloss = 0.3 * t2 * t2; // a thin bright line right on the rim\n  to.rgb = mix(to.rgb * shade, highlight.rgb, clamp(spec + gloss, 0.0, 1.0) * highlight.a);\n  vec4 from = getFromColor(uv);\n  float sh = shadow.a * (1.0 - smoothstep(0.0, 0.15, d + 0.03)) * smoothstep(0.0, 0.3, rNear);\n  from.rgb = mix(from.rgb, shadow.rgb, sh);\n  return mix(from, to, inside);\n}"
},
"GridFlip": {
"p": {
"size": [
"ivec2",
"ivec2(4)"
],
"pause": [
"float",
"0.1"
],
"dividerWidth": [
"float",
"0.05"
],
"bgcolor": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
],
"randomness": [
"float",
"0.1"
]
},
"s": "/*@size*/\n/*@pause*/\n/*@dividerWidth*/\n/*@bgcolor*/\n/*@randomness*/\n \nfloat rand (vec2 co) {\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nfloat getDelta(vec2 p) {\n  vec2 rectanglePos = floor(vec2(size) * p);\n  vec2 rectangleSize = vec2(1.0 / vec2(size).x, 1.0 / vec2(size).y);\n  float top = rectangleSize.y * (rectanglePos.y + 1.0);\n  float bottom = rectangleSize.y * rectanglePos.y;\n  float left = rectangleSize.x * rectanglePos.x;\n  float right = rectangleSize.x * (rectanglePos.x + 1.0);\n  float minX = min(abs(p.x - left), abs(p.x - right));\n  float minY = min(abs(p.y - top), abs(p.y - bottom));\n  return min(minX, minY);\n}\nfloat getDividerSize() {\n  vec2 rectangleSize = vec2(1.0 / vec2(size).x, 1.0 / vec2(size).y);\n  return min(rectangleSize.x, rectangleSize.y) * dividerWidth;\n}\nvec4 transition(vec2 p) {\n  if(progress < pause) {\n    float currentProg = progress / pause;\n    float a = 1.0;\n    if(getDelta(p) < getDividerSize()) {\n      a = 1.0 - currentProg;\n    }\n    return mix(bgcolor, getFromColor(p), a);\n  }\n  else if(progress < 1.0 - pause){\n    if(getDelta(p) < getDividerSize()) {\n      return bgcolor;\n    } else {\n      float currentProg = (progress - pause) / (1.0 - pause * 2.0);\n      vec2 q = p;\n      vec2 rectanglePos = floor(vec2(size) * q);\n      \n      float r = rand(rectanglePos) - randomness;\n      float cp = smoothstep(0.0, 1.0 - r, currentProg);\n    \n      float rectangleSize = 1.0 / vec2(size).x;\n      float delta = rectanglePos.x * rectangleSize;\n      float offset = rectangleSize / 2.0 + delta;\n      \n      p.x = (p.x - offset)/abs(cp - 0.5)*0.5 + offset;\n      vec4 a = getFromColor(p);\n      vec4 b = getToColor(p);\n      \n      float s = step(abs(vec2(size).x * (q.x - delta) - 0.5), abs(cp - 0.5));\n      return mix(bgcolor, mix(b, a, step(cp, 0.5)), s);\n    }\n  }\n  else {\n    float currentProg = (progress - 1.0 + pause) / pause;\n    float a = 1.0;\n    if(getDelta(p) < getDividerSize()) {\n      a = currentProg;\n    }\n    return mix(bgcolor, getToColor(p), a);\n  }\n}"
},
"Halftone": {
"p": {
"dots": [
"float",
"28.0"
],
"angle": [
"float",
"45.0"
],
"paper": [
"vec4",
"vec4(1.0, 1.0, 1.0, 1.0)"
]
},
"s": "/*@dots*/\n/*@angle*/\n/*@paper*/\nfloat dotRadius(vec4 c) {\n  float shade = 1.0 - dot(c.rgb, vec3(0.299, 0.587, 0.114));\n  return mix(0.1, 0.74, sqrt(clamp(shade, 0.0, 1.0))) * c.a;\n}\nvec4 transition(vec2 uv) {\n  float h = smoothstep(0.0, 0.3, progress) * (1.0 - smoothstep(0.7, 1.0, progress));\n  float t = (progress - 0.3) / 0.4;\n  float a = radians(angle);\n  mat2 rot = mat2(cos(a), sin(a), -sin(a), cos(a));\n  vec2 scale = vec2(ratio, 1.0) * dots / min(ratio, 1.0);\n  vec2 g = rot * ((uv - 0.5) * scale);\n  vec2 base = floor(g - 0.5) + 0.5;\n  vec4 pixel = progress < 0.5 ? getFromColor(uv) : getToColor(uv);\n  float best = 1e3;\n  vec4 ink = pixel;\n  for (int i = 0; i < 4; i++) {\n    vec2 center = base + vec2(mod(float(i), 2.0), floor(float(i) / 2.0));\n    vec2 cuv = (center * rot) / scale + 0.5; // inverse rotation\n    vec4 cf = getFromColor(cuv);\n    vec4 ct = getToColor(cuv);\n    float m = smoothstep(0.0, 1.0, clamp(2.5 * t - 1.5 * cuv.x, 0.0, 1.0));\n    float r = mix(0.78, mix(dotRadius(cf), dotRadius(ct), m), h);\n    float sd = length(g - center) - r;\n    if (sd < best) {\n      best = sd;\n      ink = mix(pixel, mix(cf, ct, m), h);\n    }\n  }\n  return mix(paper, ink, 1.0 - smoothstep(-0.06, 0.06, best));\n}"
},
"HeartWipe": {
"p": {},
"s": "float inHeart (vec2 p, vec2 center, float size) {\n  if (size==0.0) return 0.0;\n  vec2 o = (p-center)/(1.6*size);\n  float a = o.x*o.x+o.y*o.y-0.3;\n  return step(a*a*a, o.x*o.x*o.y*o.y*o.y);\n}\nvec4 transition (vec2 uv) {\n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    inHeart(uv, vec2(0.5, 0.4), progress)\n  );\n}"
},
"Hexagonalize": {
"p": {
"steps": [
"int",
"50"
],
"horizontalHexagons": [
"float",
"20.0"
]
},
"s": "/*@steps*/\n/*@horizontalHexagons*/\nstruct Hexagon {\n  float q;\n  float r;\n  float s;\n};\nHexagon createHexagon(float q, float r){\n  Hexagon hex;\n  hex.q = q;\n  hex.r = r;\n  hex.s = -q - r;\n  return hex;\n}\nHexagon roundHexagon(Hexagon hex){\n  \n  float q = floor(hex.q + 0.5);\n  float r = floor(hex.r + 0.5);\n  float s = floor(hex.s + 0.5);\n  float deltaQ = abs(q - hex.q);\n  float deltaR = abs(r - hex.r);\n  float deltaS = abs(s - hex.s);\n  if (deltaQ > deltaR && deltaQ > deltaS)\n    q = -r - s;\n  else if (deltaR > deltaS)\n    r = -q - s;\n  else\n    s = -q - r;\n  return createHexagon(q, r);\n}\nHexagon hexagonFromPoint(vec2 point, float size) {\n  \n  point.y /= ratio;\n  point = (point - 0.5) / size;\n  \n  float q = (sqrt(3.0) / 3.0) * point.x + (-1.0 / 3.0) * point.y;\n  float r = 0.0 * point.x + 2.0 / 3.0 * point.y;\n  Hexagon hex = createHexagon(q, r);\n  return roundHexagon(hex);\n  \n}\nvec2 pointFromHexagon(Hexagon hex, float size) {\n  \n  float x = (sqrt(3.0) * hex.q + (sqrt(3.0) / 2.0) * hex.r) * size + 0.5;\n  float y = (0.0 * hex.q + (3.0 / 2.0) * hex.r) * size + 0.5;\n  \n  return vec2(x, y * ratio);\n}\nvec4 transition (vec2 uv) {\n  \n  float dist = 2.0 * min(progress, 1.0 - progress);\n  dist = steps > 0 ? ceil(dist * float(steps)) / float(steps) : dist;\n  \n  float size = (sqrt(3.0) / 3.0) * dist / horizontalHexagons;\n  \n  vec2 point = dist > 0.0 ? pointFromHexagon(hexagonFromPoint(uv, size), size) : uv;\n  return mix(getFromColor(point), getToColor(point), progress);\n  \n}"
},
"Honeycomb": {
"p": {
"size": [
"float",
"6.0"
]
},
"s": "/*@size*/\nfloat hexDist(vec2 p) {\n  p = abs(p);\n  return max(p.x, dot(p, vec2(0.5, 0.8660254)));\n}\nmat2 rotation(float a) {\n  return mat2(cos(a), sin(a), -sin(a), cos(a));\n}\nfloat hexMask(vec2 local, float s, float a, float e) {\n  float r = (0.52 + e) * s;\n  return 1.0 - smoothstep(r - e, r, hexDist(rotation(-a) * local));\n}\nvec2 hexUv(vec2 uv, vec2 local, vec2 cellToUv, float s, float a) {\n  return uv + cellToUv * (rotation(-a) * local / max(s, 0.001) - local);\n}\nvec4 transition(vec2 uv) {\n  vec2 toCells = vec2(ratio, 1.0) * size / min(ratio, 1.0);\n  vec2 p = (uv - 0.5) * toCells;\n  const vec2 grid = vec2(1.0, 1.7320508);\n  vec2 a = (floor(p / grid) + 0.5) * grid;\n  vec2 b = (floor((p - 0.5 * grid) / grid) + 1.0) * grid;\n  vec2 center = dot(p - a, p - a) < dot(p - b, p - b) ? a : b;\n  vec2 local = p - center;\n  float d = min(length(center / toCells * vec2(ratio, 1.0)) / (0.5 * length(vec2(ratio, 1.0))), 1.0);\n  float t = clamp((progress - 0.6 * d) / 0.4, 0.0, 1.0);\n  float s = 1.0 - smoothstep(0.1, 1.0, t);\n  float turn = 1.8 * t * (2.0 - t);\n  vec4 fromTile = getFromColor(hexUv(uv, local, 1.0 / toCells, s, turn));\n  fromTile.rgb *= 1.0 - 0.3 * t;\n  vec4 below = getToColor(uv);\n  below.rgb *= 1.0 - 0.5 * hexMask(local - vec2(0.06, -0.08) * s, s, turn, 0.2);\n  return mix(below, fromTile, hexMask(local, s, turn, 0.03));\n}"
},
"HorizontalClose": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  float s = 2.0 - abs((uv.y - 0.5) / (progress - 1.0)) - 2.0 * progress;\n  \n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    smoothstep(0.5, 0.0, s)\n  ); \n}"
},
"HorizontalOpen": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  \n  float regress = 1.0 - progress;\n  float s = 2.0 - abs((uv.y - 0.5) / (regress - 1.0)) - 2.0 * regress;\n  \n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    smoothstep(0.0, 0.5, s)\n  );\n}"
},
"HsvFade": {
"p": {},
"s": "vec3 hsv2rgb(vec3 c) {\n  const vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\nvec3 rgb2hsv(vec3 c) {\n  const vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n  float d = q.x - min(q.w, q.y);\n  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 0.001)), d / (q.x + 0.001), q.x);\n}\nvec4 transition(vec2 uv) {\n  vec4 from = getFromColor(uv);\n  vec4 to = getToColor(uv);\n  vec3 m = mix(rgb2hsv(from.rgb), rgb2hsv(to.rgb), progress);\n  return vec4(hsv2rgb(m), mix(from.a, to.a, progress));\n}"
},
"InkBleed": {
"p": {
"drops": [
"float",
"4.0"
],
"tendrils": [
"float",
"0.7"
],
"rim": [
"float",
"0.5"
],
"seed": [
"float",
"3.0"
]
},
"s": "/*@drops*/\n/*@tendrils*/\n/*@rim*/\n/*@seed*/\nfloat hash (vec2 p) {\n  vec3 p3 = fract(vec3(p.xyx) * 0.1031);\n  p3 += dot(p3, p3.yzx + 33.33);\n  return fract((p3.x + p3.y) * p3.z);\n}\nfloat vnoise (vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  f = f * f * (3.0 - 2.0 * f);\n  return mix(\n    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),\n    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),\n    f.y\n  );\n}\nfloat fbm (vec2 p) {\n  float v = 0.0;\n  float a = 0.5;\n  for (int i = 0; i < 4; i++) {\n    v += a * vnoise(p);\n    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3;\n    a *= 0.5;\n  }\n  return v / 0.9375;\n}\nvec2 fold (vec2 p) {\n  return 1.0 - abs(1.0 - mod(p, 2.0));\n}\nvec4 transition (vec2 uv) {\n  float p = progress;\n  vec2 q = vec2(uv.x * ratio, uv.y);\n  vec2 o = vec2(seed * 3.1, seed * 1.7);\n  vec2 sq = q * 2.2 + o;\n  vec2 w1 = vec2(fbm(sq + vec2(0.0, 0.6 * p)), fbm(sq + vec2(5.2, 1.3) - vec2(0.5 * p, 0.0)));\n  vec2 w2 = vec2(fbm(sq + 3.0 * w1 + vec2(1.7, 9.2)), fbm(sq + 3.0 * w1 + vec2(8.3, 2.8)));\n  float swirl = fbm(sq * 0.8 + 2.5 * w2) - 0.5; // marbled, curling pattern\n  vec2 flow = w2 - 0.5;\n  float amp = 0.05 + 0.35 * tendrils;\n  float n = clamp(floor(drops + 0.5), 1.0, 8.0);\n  float rimW = 0.1;\n  float feather = 0.05; // soft, diluted ink around the front\n  float margin = 1.2 * amp + rimW + 0.08; // how far the swirls can pull the front back\n  float f = -1e3; // > 0 inside the ink\n  float fs = -1e3; // the same, only for the drops already fallen, which fades their haze in\n  for (int i = 0; i < 8; i++) {\n    float fi = float(i);\n    if (fi < n) {\n      vec2 hs = vec2(fi * 7.13 + seed, fi * 3.71 - seed);\n      vec2 c = vec2(mix(0.15, 0.85, hash(hs)) * ratio, mix(0.15, 0.85, hash(hs + 19.7)));\n      float start = 0.2 * fi / n;\n      float s = clamp((p - start) / (1.0 - start), 0.0, 1.0);\n      vec2 m = max(c, vec2(ratio, 1.0) - c);\n      float far = length(m) + margin;\n      float s3 = s * s * s;\n      float r = (far + 0.02) * s * (0.35 + 0.65 * s3 * s3) - 0.02;\n      float reach = amp * min(1.0, max(r, 0.0) * 5.0);\n      float g = r - length(q - c + 1.3 * reach * flow) + reach * 0.9 * swirl;\n      f = max(f, g);\n      fs = max(fs, g - 0.15 * (1.0 - min(1.0, s * 12.0)));\n    }\n  }\n  float aa = 0.003;\n  float inside = smoothstep(-aa, aa, f);\n  float wisp = 1.0 - smoothstep(0.0, 0.08, abs(fbm(sq * 2.0 + 5.0 * w2) - 0.5));\n  float soft = smoothstep(-feather, 0.0, fs) * (0.35 + 0.4 * wisp);\n  float haze = 0.35 * wisp * (1.0 - smoothstep(0.0, 0.1, -fs));\n  float cover = max(inside, max(soft, haze));\n  float edge = 1.0 - smoothstep(0.0, rimW, f);\n  vec4 to = getToColor(fold(uv - 0.015 * edge * flow / vec2(ratio, 1.0)));\n  to.rgb = mix(to.rgb, to.rgb * to.rgb * 0.7, rim * edge);\n  return mix(getFromColor(uv), to, cover);\n}"
},
"InvertedPageCurl": {
"p": {},
"s": "/*\nCopyright (c) 2010 Hewlett-Packard Development Company, L.P. All rights reserved.\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are\nmet:\n   * Redistributions of source code must retain the above copyright\n     notice, this list of conditions and the following disclaimer.\n   * Redistributions in binary form must reproduce the above\n     copyright notice, this list of conditions and the following disclaimer\n     in the documentation and/or other materials provided with the\n     distribution.\n   * Neither the name of Hewlett-Packard nor the names of its\n     contributors may be used to endorse or promote products derived from\n     this software without specific prior written permission.\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n\"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\nLIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\nA PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\nOWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\nSPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\nLIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\nDATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\nTHEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\nin vec2 texCoord;\n*/\nconst float MIN_AMOUNT = -0.16;\nconst float MAX_AMOUNT = 1.5;\nconst float PI = 3.141592653589793;\nconst float scale = 512.0;\nconst float sharpness = 3.0;\nconst float cylinderRadius = 1.0 / PI / 2.0;\nfloat amount;\nfloat cylinderCenter;\nfloat cylinderAngle;\nvec3 hitPoint(float hitAngle, float yc, vec3 point, mat3 rrotation)\n{\n        float hitPoint = hitAngle / (2.0 * PI);\n        point.y = hitPoint;\n        return rrotation * point;\n}\nvec4 antiAlias(vec4 color1, vec4 color2, float distanc)\n{\n        distanc *= scale;\n        if (distanc < 0.0) return color2;\n        if (distanc > 2.0) return color1;\n        float dd = pow(1.0 - distanc / 2.0, sharpness);\n        return ((color2 - color1) * dd) + color1;\n}\nfloat distanceToEdge(vec3 point)\n{\n        float dx = abs(point.x > 0.5 ? 1.0 - point.x : point.x);\n        float dy = abs(point.y > 0.5 ? 1.0 - point.y : point.y);\n        if (point.x < 0.0) dx = -point.x;\n        if (point.x > 1.0) dx = point.x - 1.0;\n        if (point.y < 0.0) dy = -point.y;\n        if (point.y > 1.0) dy = point.y - 1.0;\n        if ((point.x < 0.0 || point.x > 1.0) && (point.y < 0.0 || point.y > 1.0)) return sqrt(dx * dx + dy * dy);\n        return min(dx, dy);\n}\nvec4 seeThrough(float yc, vec2 p, mat3 rotation, mat3 rrotation)\n{\n        float hitAngle = PI - (acos(clamp(yc / cylinderRadius, -1.0, 1.0)) - cylinderAngle);\n        vec3 point = hitPoint(hitAngle, yc, rotation * vec3(p, 1.0), rrotation);\n        if (yc <= 0.0 && (point.x < 0.0 || point.y < 0.0 || point.x > 1.0 || point.y > 1.0))\n        {\n            return getToColor(p);\n        }\n        if (yc > 0.0) return getFromColor(p);\n        vec4 color = getFromColor(point.xy);\n        vec4 tcolor = vec4(0.0);\n        return antiAlias(color, tcolor, distanceToEdge(point));\n}\nvec4 seeThroughWithShadow(float yc, vec2 p, vec3 point, mat3 rotation, mat3 rrotation)\n{\n        float shadow = distanceToEdge(point) * 30.0;\n        shadow = (1.0 - shadow) / 3.0;\n        if (shadow < 0.0) shadow = 0.0; else shadow *= amount;\n        vec4 shadowColor = seeThrough(yc, p, rotation, rrotation);\n        shadowColor.r -= shadow;\n        shadowColor.g -= shadow;\n        shadowColor.b -= shadow;\n        return shadowColor;\n}\nvec4 backside(float yc, vec3 point)\n{\n        vec4 color = getFromColor(point.xy);\n        float gray = (color.r + color.b + color.g) / 15.0;\n        gray += (8.0 / 10.0) * (pow(max(0.0, 1.0 - abs(yc / cylinderRadius)), 2.0 / 10.0) / 2.0 + (5.0 / 10.0));\n        color.rgb = vec3(gray);\n        return color;\n}\nvec4 behindSurface(vec2 p, float yc, vec3 point, mat3 rrotation)\n{\n        float safeAmount = amount >= 0.0 ? max(amount, 1e-4) : min(amount, -1e-4);\n        float shado = (1.0 - ((-cylinderRadius - yc) / safeAmount * 7.0)) / 6.0;\n        shado *= 1.0 - abs(point.x - 0.5);\n        yc = (-cylinderRadius - cylinderRadius - yc);\n        float hitAngle = (acos(clamp(yc / cylinderRadius, -1.0, 1.0)) + cylinderAngle) - PI;\n        point = hitPoint(hitAngle, yc, point, rrotation);\n        if (yc < 0.0 && point.x >= 0.0 && point.y >= 0.0 && point.x <= 1.0 && point.y <= 1.0 && (hitAngle < PI || amount > 0.5))\n        {\n                float dx = point.x - 0.5;\n                float dy = point.y - 0.5;\n                shado = 1.0 - (sqrt(dx * dx + dy * dy) / (71.0 / 100.0));\n                float nyc = -yc / cylinderRadius;\n                shado *= nyc * nyc * nyc;\n                shado *= 0.5;\n        }\n        else\n        {\n                shado = 0.0;\n        }\n        vec4 to = getToColor(p);\n        return vec4(to.rgb - shado, to.a);\n}\nvec4 transition(vec2 p) {\n  amount = progress * (MAX_AMOUNT - MIN_AMOUNT) + MIN_AMOUNT;\n  cylinderCenter = amount;\n  cylinderAngle = 2.0 * PI * amount;\n  const float angle = 100.0 * PI / 180.0;\n        float c = cos(-angle);\n        float s = sin(-angle);\n        mat3 rotation = mat3( c, s, 0,\n                                                                -s, c, 0,\n                                                                -0.801, 0.8900, 1\n                                                                );\n        c = cos(angle);\n        s = sin(angle);\n        mat3 rrotation = mat3(\tc, s, 0,\n                                                                        -s, c, 0,\n                                                                        0.98500, 0.985, 1\n                                                                );\n        vec3 point = rotation * vec3(p, 1.0);\n        float yc = point.y - cylinderCenter;\n        if (yc < -cylinderRadius)\n        {\n                return behindSurface(p,yc, point, rrotation);\n        }\n        if (yc > cylinderRadius)\n        {\n                return getFromColor(p);\n        }\n        float hitAngle = (acos(clamp(yc / cylinderRadius, -1.0, 1.0)) + cylinderAngle) - PI;\n        float hitAngleMod = mod(hitAngle, 2.0 * PI);\n        if ((hitAngleMod > PI && amount < 0.5) || (hitAngleMod > PI/2.0 && amount < 0.0))\n        {\n                return seeThrough(yc, p, rotation, rrotation);\n        }\n        point = hitPoint(hitAngle, yc, point, rrotation);\n        if (point.x < 0.0 || point.y < 0.0 || point.x > 1.0 || point.y > 1.0)\n        {\n                return seeThroughWithShadow(yc, p, point, rotation, rrotation);\n        }\n        vec4 color = backside(yc, point);\n        vec4 otherColor;\n        if (yc < 0.0)\n        {\n                float dx2 = point.x - 0.5;\n                float dy2 = point.y - 0.5;\n                float shado = 1.0 - (sqrt(dx2 * dx2 + dy2 * dy2) / 0.71);\n                float nyc2 = -yc / cylinderRadius;\n                shado *= nyc2 * nyc2 * nyc2;\n                shado *= 0.5;\n                otherColor = vec4(0.0, 0.0, 0.0, shado * getToColor(p).a); // a shadow on the incoming image\n        }\n        else\n        {\n                otherColor = getFromColor(p);\n        }\n        color = antiAlias(color, otherColor, cylinderRadius - abs(yc));\n        vec4 cl = seeThroughWithShadow(yc, p, point, rotation, rrotation);\n        float dist = distanceToEdge(point);\n        return antiAlias(color, cl, dist);\n}"
},
"Kaleidoscope": {
"p": {
"speed": [
"float",
"1.0"
],
"angle": [
"float",
"1.0"
],
"power": [
"float",
"1.5"
]
},
"s": "/*@speed*/\n/*@angle*/\n/*@power*/\nvec4 transition(vec2 uv) {\n  vec2 p = uv.xy / vec2(1.0).xy;\n  vec2 q = p;\n  float t = pow(progress, power)*speed;\n  p = p -0.5;\n  for (int i = 0; i < 7; i++) {\n    p = vec2(sin(t)*p.x + cos(t)*p.y, sin(t)*p.y - cos(t)*p.x);\n    t += angle;\n    p = abs(mod(p, 2.0) - 1.0);\n  }\n  abs(mod(p, 1.0));\n  return mix(\n    mix(getFromColor(q), getToColor(q), progress),\n    mix(getFromColor(p), getToColor(p), progress), 1.0 - 2.0*abs(progress - 0.5));\n}"
},
"LeafWipe": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  if(progress == 0.0){\n    return getFromColor(uv);\n  }\n  vec2 leaf_uv = (uv - vec2(0.5))/10./pow(progress,3.5);\n\tleaf_uv.y += 0.35;\n\tfloat r = 0.18;\n\tfloat o = atan(leaf_uv.y, leaf_uv.x);\n  return mix(getFromColor(uv), getToColor(uv), 1.-step(1. - length(leaf_uv)+r*(1.+sin(o))*(1.+0.9 * cos(8.*o))*(1.+0.1*cos(24.*o))*(0.9+0.05*cos(200.*o)), 1.));\n}"
},
"LeftRight": {
"p": {},
"s": "const vec4 black = vec4(0.0); // where no image is drawn: transparent\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n    return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec4 transition (vec2 uv) {\n    vec2 spfr,spto = vec2(-1.);\n    float size = mix(1.0, 3.0, progress*0.2);\n    spto = (uv + vec2(-0.5,-0.5))*vec2(size,size)+vec2(0.5,0.5);\n    spfr = (uv - vec2(1.-progress, 0.0));\n    if(inBounds(spfr)){\n        return getToColor(spfr);\n    }else if(inBounds(spto)){\n        return getFromColor(spto) * (1.0 - progress);\n    } else{\n        return black;\n    }\n}"
},
"LensFlare": {
"p": {
"angle": [
"float",
"-12.0"
],
"height": [
"float",
"0.18"
],
"intensity": [
"float",
"1.0"
],
"color": [
"vec3",
"vec3(0.35, 0.6, 1.0)"
]
},
"s": "/*@angle*/\n/*@height*/\n/*@intensity*/\n/*@color*/\nconst int BLOOM_TAPS = 12;\nconst int GHOSTS = 6;\nvec2 mirror(vec2 v) {\n  return 1.0 - abs(1.0 - mod(v, 2.0));\n}\nvec4 premultiplied(vec4 c) {\n  return vec4(c.rgb * c.a, c.a);\n}\nvec4 frame(vec2 st, float m) {\n  if (m <= 0.0) return premultiplied(getFromColor(st));\n  if (m >= 1.0) return premultiplied(getToColor(st));\n  return mix(premultiplied(getFromColor(st)), premultiplied(getToColor(st)), m);\n}\nvec3 highlight(vec4 c) {\n  float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));\n  return c.rgb * smoothstep(0.55, 0.95, lum);\n}\nvec4 transition(vec2 uv) {\n  float p = progress;\n  if (p <= 0.0) return getFromColor(uv);\n  if (p >= 1.0) return getToColor(uv);\n  float env = 4.0 * p * (1.0 - p);\n  float peak = pow(env, 24.0);\n  vec2 aspect = vec2(ratio, 1.0);\n  vec2 q = (uv - 0.5) * aspect;\n  float r = radians(angle);\n  vec2 dir = vec2(cos(r), -sin(r));\n  vec2 normal = vec2(-dir.y, dir.x);\n  float t = p - 0.5;\n  float travel = 0.5 * (abs(dir.x) * ratio + abs(dir.y)) + 0.3;\n  float along = travel * (2.0 * t) * (0.55 + 1.8 * t * t);\n  vec2 src = dir * along + normal * height;\n  vec2 d = q - src;\n  float dist = length(d);\n  float k = intensity * env;\n  float cut = mix(0.2, 0.06, clamp(intensity, 0.0, 1.0));\n  float s = clamp((p - 0.5 + cut) / (2.0 * cut), 0.0, 1.0);\n  float soft = 0.3;\n  float reach = 0.5 * length(aspect) + length(src) + soft;\n  float front = s * (reach + soft);\n  float m = smoothstep(front, front - soft, dist);\n  vec4 base = frame(uv, m);\n  float ax = abs(d.x);\n  float ay = abs(d.y);\n  float thin = exp(-ay * 140.0) * exp(-ax * 0.7);\n  float wide = exp(-ay * 30.0) * exp(-ax * 1.6);\n  vec3 tint = color;\n  vec3 streak = (thin * mix(vec3(1.0), tint, smoothstep(0.0, 0.3, ax)) + 0.5 * wide * tint) * 3.0;\n  vec3 core = vec3(1.0, 0.97, 0.92) * exp(-dist * dist * 600.0) * 3.0 + mix(vec3(1.0), tint, 0.5) * exp(-dist * 7.0) * 0.6;\n  vec3 ghosts = vec3(0.0);\n  for (int i = 0; i < GHOSTS; i++) {\n    float fi = float(i);\n    float f = -0.45 + 0.42 * fi + 0.08 * sin(fi * 2.3);\n    vec2 g = -src * f;\n    float size = 0.025 + 0.06 * fract(fi * 0.618 + 0.2);\n    float gd = length(q - g) / size;\n    float disc = smoothstep(1.0, 0.8, gd) * (0.35 + 0.65 * smoothstep(0.4, 0.95, gd));\n    vec3 hue = mix(tint, vec3(1.0, 0.65, 0.35), fract(fi * 0.53));\n    hue = mix(hue, vec3(0.5, 1.0, 0.6), step(4.5, fi) * 0.6);\n    ghosts += disc * hue * 0.45;\n  }\n  vec3 bloom = vec3(0.0);\n  if (peak > 1e-3) {\n    float radius = 0.06 * env;\n    for (int i = 0; i < BLOOM_TAPS; i++) {\n      float fi = float(i);\n      float a = fi * 2.39996;\n      float rr = radius * sqrt((fi + 0.5) / float(BLOOM_TAPS));\n      vec2 o = vec2(cos(a), sin(a)) * rr / aspect;\n      bloom += highlight(frame(mirror(uv + o), m));\n    }\n    bloom /= float(BLOOM_TAPS);\n  }\n  vec3 glare = mix(vec3(1.0), tint, 0.5) * peak * (0.45 + 2.2 * exp(-dist * 3.0));\n  vec3 light = k * (streak + core + ghosts) + intensity * (bloom * 2.5 * peak + glare);\n  light = 1.0 - exp(-light);\n  vec3 c = base.rgb + light * base.a - base.rgb * light;\n  if (base.a <= 0.0) return vec4(0.0);\n  return vec4(clamp(c / base.a, 0.0, 1.0), base.a);\n}"
},
"LightStreaks": {
"p": {
"reach": [
"float",
"0.6"
],
"threshold": [
"float",
"0.7"
],
"intensity": [
"float",
"1.5"
],
"tint": [
"vec3",
"vec3(0.45, 0.7, 1.0)"
],
"blur": [
"float",
"0.1"
],
"vertical": [
"bool",
"false"
]
},
"s": "/*@reach*/\n/*@threshold*/\n/*@intensity*/\n/*@tint*/\n/*@blur*/\n/*@vertical*/\nconst int BLUR_TAPS = 6;\nconst int STREAK_TAPS = 11;\nfloat hash12(vec2 v) {\n  vec3 v3 = fract(vec3(v.xyx) * 0.1031);\n  v3 += dot(v3, v3.yzx + 33.33);\n  return fract((v3.x + v3.y) * v3.z);\n}\nvec2 mirror(vec2 v) {\n  return 1.0 - abs(1.0 - mod(v, 2.0));\n}\nvec4 frame(vec2 st, float m) {\n  if (m <= 0.0) return getFromColor(st);\n  if (m >= 1.0) return getToColor(st);\n  return mix(getFromColor(st), getToColor(st), m);\n}\nvec3 glow(vec4 c, float knee) {\n  float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));\n  return c.rgb * c.a * smoothstep(knee, knee + 0.2, lum);\n}\nvec4 light(vec2 st, float m, bool incoming) {\n  if (m <= 0.0) return getFromColor(st);\n  if (m >= 1.0) return getToColor(st);\n  return incoming ? getToColor(st) : getFromColor(st);\n}\nfloat lightWeight(float m, bool incoming) {\n  if (m <= 0.0 || m >= 1.0) return 1.0;\n  return incoming ? 2.0 * m : 2.0 * (1.0 - m);\n}\nvec4 transition(vec2 uv) {\n  float p = progress;\n  float amount = p < 0.5 ? smoothstep(0.0, 0.5, p) : pow(2.0 - 2.0 * p, 3.0);\n  float peak = amount * amount * amount;\n  float m = smoothstep(0.44, 0.56, p);\n  vec2 axis = vertical ? vec2(0.0, 1.0) : vec2(1.0, 0.0);\n  float jitter = hash12(floor(uv * vec2(ratio, 1.0) * 997.0)) - 0.5;\n  float smear = blur * amount;\n  vec3 base = vec3(0.0);\n  float alpha = 0.0;\n  float total = 0.0;\n  for (int i = 0; i < BLUR_TAPS; i++) {\n    float t = (float(i) + 0.5 + jitter) / float(BLUR_TAPS) - 0.5;\n    float w = 1.0 - abs(t);\n    total += w;\n    bool incoming = mod(float(i), 2.0) > 0.5;\n    w *= lightWeight(m, incoming);\n    vec4 c = light(mirror(uv + axis * t * smear), m, incoming);\n    base += w * c.rgb * c.a;\n    alpha += w * c.a;\n  }\n  base /= total;\n  alpha /= total;\n  float falloff = 0.25 * reach * amount;\n  float knee = mix(threshold, 0.8 * threshold, peak);\n  vec3 streak = glow(frame(uv, m), knee);\n  float weights = 1.0;\n  for (int k = 1; k <= STREAK_TAPS; k++) {\n    float d = exp(0.14 * (float(k) + 0.8 * jitter)) - 1.0;\n    float span = 0.14 * (d + 1.0);\n    vec3 hue = mix(vec3(1.0), tint, smoothstep(0.0, 0.8, d));\n    hue *= exp(-d * vec3(0.6, 0.2, -0.15));\n    float w = exp(-d) * span * 4.0;\n    bool incoming = mod(float(k), 2.0) > 0.5;\n    vec4 ahead = light(mirror(uv + axis * d * falloff), m, incoming);\n    vec4 behind = light(mirror(uv - axis * d * falloff), m, !incoming);\n    streak += w * hue * (glow(ahead, knee) * lightWeight(m, incoming) + glow(behind, knee) * lightWeight(m, !incoming));\n    weights += 2.0 * w;\n  }\n  streak *= intensity * amount * (0.6 + 2.4 * peak) * 2.0 / weights;\n  streak = 0.85 * (1.0 - exp(-streak));\n  base = min(base * (1.0 + 0.2 * peak), vec3(alpha));\n  vec3 color = base + streak - base * streak;\n  float a = alpha + max(streak.r, max(streak.g, streak.b)) * (1.0 - alpha);\n  return vec4(clamp(color / max(a, 1e-5), 0.0, 1.0), a);\n}"
},
"LinearBlur": {
"p": {
"intensity": [
"float",
"0.1"
]
},
"s": "/*@intensity*/\nconst int passes = 6;\nvec4 transition(vec2 uv) {\n    vec4 c1 = vec4(0.0);\n    vec4 c2 = vec4(0.0);\n    float disp = intensity*(0.5-distance(0.5, progress));\n    for (int xi=0; xi<passes; xi++)\n    {\n        float x = float(xi) / float(passes) - 0.5;\n        for (int yi=0; yi<passes; yi++)\n        {\n            float y = float(yi) / float(passes) - 0.5;\n            vec2 v = vec2(x,y);\n            float d = disp;\n            c1 += getFromColor( uv + d*v);\n            c2 += getToColor( uv + d*v);\n        }\n    }\n    c1 /= float(passes*passes);\n    c2 /= float(passes*passes);\n    return mix(c1, c2, progress);\n}"
},
"LissajousTiles": {
"p": {
"speed": [
"float",
"0.5;"
],
"freq": [
"vec2",
"vec2(2.,3.);"
],
"offset": [
"float",
"2.;"
],
"zoom": [
"float",
"0.8;"
],
"fade": [
"float",
"3.;"
]
},
"s": "/*@speed*/\n/*@freq*/\n/*@offset*/\n/*@zoom*/\n/*@fade*/\nconst vec2 grid = vec2(10.,10.); // grid size\nconst float TAU = 6.283185307;\nvec4 transition (vec2 uv) {\n  float p = 1.-pow(1.-smoothstep(0.,1.,1.-abs(1.-2.*progress)),3.); // transition curve\n  for (float jBig = grid.y-1.; jBig >= 0.; jBig--) {\n    for (float iBig = grid.x-1.; iBig >= 0.; iBig--) {\n      float i = iBig/grid.x;\n      float j = jBig/grid.y;\n      float k = i/grid.y+j; // order of the tile along the curve\n      vec2 uv0 = uv + vec2(i,j) - 0.5 + 0.5/grid + vec2(cos(k*TAU*freq.x+progress*6.*speed),sin(k*TAU*freq.y+progress*6.*(1.+offset)*speed))*zoom/2.;\n      uv0 = mix(uv, uv0, p);\n      if (uv0.x >= i && uv0.x < i+1./grid.x && uv0.y >= j && uv0.y < j+1./grid.y) { // mask for each (i,j) tile\n        float tileMix = clamp(progress*((1.+fade)*2.*progress)-fade+k*fade, 0., 1.);\n        return mix(getFromColor(uv0), getToColor(uv0), tileMix);\n      }\n    }\n  }\n  return vec4(0.); // between the tiles: transparent\n}"
},
"LuminanceMelt": {
"p": {
"direction": [
"bool",
"true"
],
"l_threshold": [
"float",
"0.8"
],
"above": [
"bool",
"false"
]
},
"s": "/*@direction*/\n/*@l_threshold*/\n/*@above*/\nfloat rand(vec2 co){\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvec3 mod289(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\nvec2 mod289(vec2 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\nvec3 permute(vec3 x) {\n  return mod289(((x*34.0)+1.0)*x);\n}\nfloat snoise(vec2 v)\n  {\n  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0\n                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)\n                     -0.577350269189626,  // -1.0 + 2.0 * C.x\n                      0.024390243902439); // 1.0 / 41.0\n  vec2 i  = floor(v + dot(v, C.yy) );\n  vec2 x0 = v -   i + dot(i, C.xx);\n  vec2 i1;\n  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n  vec4 x12 = x0.xyxy + C.xxzz;\n  x12.xy -= i1;\n  i = mod289(i); // Avoid truncation effects in permutation\n  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))\n\t\t+ i.x + vec3(0.0, i1.x, 1.0 ));\n  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);\n  m = m*m ;\n  m = m*m ;\n  vec3 x = 2.0 * fract(p * C.www) - 1.0;\n  vec3 h = abs(x) - 0.5;\n  vec3 ox = floor(x + 0.5);\n  vec3 a0 = x - ox;\n  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );\n  vec3 g;\n  g.x  = a0.x  * x0.x  + h.x  * x0.y;\n  g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n  return 130.0 * dot(m, g);\n}\nfloat luminance(vec4 color){\n  return color.r*0.299+color.g*0.587+color.b*0.114;\n}\nvec4 transition(vec2 uv) {\n  vec2 center = vec2(1.0, direction);\n  vec2 p = uv.xy / vec2(1.0).xy;\n  if (progress == 0.0) {\n    return getFromColor(p);\n  } else if (progress == 1.0) {\n    return getToColor(p);\n  } else {\n    float x = progress;\n    float dist = distance(center, p)- progress*exp(snoise(vec2(p.x, 0.0)));\n    float r = x - rand(vec2(p.x, 0.1));\n    float m;\n    if(above){\n     m = dist <= r && luminance(getFromColor(p))>l_threshold ? 1.0 : (progress*progress*progress);\n    }\n    else{\n     m = dist <= r && luminance(getFromColor(p))<l_threshold ? 1.0 : (progress*progress*progress);  \n    }\n    return mix(getFromColor(p), getToColor(p), m);    \n  }\n}"
},
"Morph": {
"p": {
"strength": [
"float",
"0.1"
]
},
"s": "/*@strength*/\nvec4 transition(vec2 p) {\n  vec4 ca = getFromColor(p);\n  vec4 cb = getToColor(p);\n  \n  vec2 oa = (((ca.rg+ca.b)*0.5)*2.0-1.0);\n  vec2 ob = (((cb.rg+cb.b)*0.5)*2.0-1.0);\n  vec2 oc = mix(oa,ob,0.5)*strength;\n  \n  float w0 = progress;\n  float w1 = 1.0-w0;\n  return mix(getFromColor(p+oc*w0), getToColor(p-oc*w1), progress);\n}"
},
"Mosaic": {
"p": {
"endx": [
"int",
"2"
],
"endy": [
"int",
"-1"
]
},
"s": "#define PI 3.14159265358979323\n#define POW2(X) X*X\n#define POW3(X) X*X*X\n/*@endx*/\n/*@endy*/\nfloat Rand(vec2 v) {\n  return fract(sin(dot(v.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvec2 Rotate(vec2 v, float a) {\n  mat2 rm = mat2(cos(a), -sin(a),\n                 sin(a), cos(a));\n  return rm*v;\n}\nfloat CosInterpolation(float x) {\n  return -cos(x*PI)/2.+.5;\n}\nvec4 transition(vec2 uv) {\n  vec2 p = uv.xy / vec2(1.0).xy - .5;\n  vec2 rp = p;\n  float rpr = (progress*2.-1.);\n  float z = -(rpr*rpr*2.) + 3.;\n  float az = abs(z);\n  rp *= az;\n  rp += mix(vec2(.5, .5), vec2(float(endx) + .5, float(endy) + .5), POW2(CosInterpolation(progress)));\n  vec2 mrp = mod(rp, 1.);\n  vec2 crp = rp;\n  bool onEnd = int(floor(crp.x))==endx&&int(floor(crp.y))==endy;\n  if(!onEnd) {\n    float ang = float(int(Rand(floor(crp))*4.))*.5*PI;\n    mrp = vec2(.5) + Rotate(mrp-vec2(.5), ang);\n  }\n  if(onEnd || Rand(floor(crp))>.5) {\n    return getToColor(mrp);\n  } else {\n    return getFromColor(mrp);\n  }\n}"
},
"MosaicBlend": {
"p": {
"pixelSize": [
"float",
"50.0"
]
},
"s": "/*@pixelSize*/\nvec4 transition(vec2 uv) {\n  float T = progress;\n  float half_ = 0.5;\n  float size = (T < half_) ? mix(1.0, pixelSize, T / half_) : mix(pixelSize, 1.0, (T - half_) / half_);\n  float D = size * 0.005;\n  vec2 UV = (uv - 0.5) / D;\n  vec2 coord = clamp(D * (ceil(UV - 0.5)) + 0.5, 0.0, 1.0);\n  vec4 C0 = getFromColor(coord);\n  vec4 C1 = getToColor(coord);\n  return mix(C0, C1, T);\n}"
},
"MosaicFade": {
"p": {
"mosaicNum": [
"float",
"10.0"
]
},
"s": "/*@mosaicNum*/\nvec2 getMosaicUV(vec2 uv) {\n  float mosaicWidth = 2.0 / mosaicNum * min(progress, 1.0 - progress);\n  float mX = floor(uv.x / mosaicWidth) + 0.5;\n  float mY = floor(uv.y / mosaicWidth) + 0.5;\n  return vec2(mX * mosaicWidth, mY * mosaicWidth);\n}\nvec4 transition (vec2 uv) {\n  vec2 mosaicUV = min(progress, 1.0 - progress) == 0.0 ? uv : getMosaicUV(uv);\n  return mix(getFromColor(mosaicUV), getToColor(mosaicUV), progress * progress);\n}"
},
"MultiplyBlend": {
"p": {},
"s": "vec4 blend(vec4 a, vec4 b) {\n  return a * b;\n}\nvec4 transition (vec2 uv) {\n  \n  vec4 blended = blend(getFromColor(uv), getToColor(uv));\n  \n  if (progress < 0.5)\n    return mix(getFromColor(uv), blended, 2.0 * progress);\n  else\n    return mix(blended, getToColor(uv), 2.0 * progress - 1.0);\n}"
},
"NoiseDissolve": {
"p": {},
"s": "float random (vec2 st) {\n    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);\n}\nvec4 transition (vec2 uv) {\n  vec4 leftSide = getFromColor(uv);\n  vec4 rightSide = getToColor(uv);\n  float uvz = floor(random(uv)+progress);\n  return mix(leftSide,rightSide,uvz);\n}"
},
"Overexposure": {
"p": {
"strength": [
"float",
"0.6"
]
},
"s": "/*@strength*/\nconst float PI = 3.141592653589793;\nvec4 transition (vec2 uv) {\n  vec4 from = getFromColor(uv);\n  vec4 to = getToColor(uv);\n  float from_m = 1.0 - progress + sin(PI * progress) * strength;\n  float to_m = progress + sin(PI * progress) * strength;\n  \n  return vec4(\n    from.r * from.a * from_m + to.r * to.a * to_m,\n    from.g * from.a * from_m + to.g * to.a * to_m,\n    from.b * from.a * from_m + to.b * to.a * to_m,\n    mix(from.a, to.a, progress)\n  );\n}"
},
"PaperTear": {
"p": {
"roughness": [
"float",
"0.12"
],
"tilt": [
"float",
"0.1"
],
"rim": [
"float",
"0.012"
],
"paper": [
"vec4",
"vec4(1.0, 0.98, 0.94, 1.0)"
],
"shadow": [
"vec4",
"vec4(0.0, 0.0, 0.0, 0.35)"
]
},
"s": "/*@roughness*/\n/*@tilt*/\n/*@rim*/\n/*@paper*/\n/*@shadow*/\nfloat tri (float x) {\n  return abs(fract(x) - 0.5) - 0.25;\n}\nfloat meander (float y) {\n  return 0.5 * ratio + roughness * (0.5 * sin(y * 4.7 + 1.3) + 0.25 * sin(y * 11.3 + 4.1));\n}\nfloat tear (float y) {\n  return meander(y) + roughness * (0.1 * sin(y * 29.0 + 0.7) + 0.35 * tri(y * 19.0 + sin(y * 7.0)) + 0.12 * tri(y * 47.0 + 0.6 * sin(y * 13.0)));\n}\nfloat fibers (float y, float seed) {\n  return rim * (0.7 + 0.3 * sin(y * 37.0 + seed) + 0.4 * tri(y * 83.0 + seed));\n}\nvec2 unfold (vec2 q, float away, float lean) {\n  return vec2(q.x + away + lean * q.y, q.y);\n}\nvec4 torn (vec4 bg, vec4 col, float e, float limit, float aa) {\n  vec4 c = vec4(mix(col.rgb, paper.rgb, clamp(0.5 + e / aa, 0.0, 1.0) * paper.a), col.a);\n  return mix(bg, c, clamp(0.5 - (e - limit) / aa, 0.0, 1.0));\n}\nvec4 transition (vec2 uv) {\n  float p = progress;\n  float away = p * p * (0.5 * ratio + 0.1 + roughness + 2.0 * rim); // far enough to leave the frame\n  float lean = tilt * p * (2.0 - p);\n  float fiber = smoothstep(0.0, 0.15, p); // no torn edge on the intact image\n  float aa = 0.002 * fiber + 1e-6;\n  vec2 q = vec2(uv.x * ratio, uv.y);\n  vec2 l = unfold(q, away, lean);\n  vec2 r = unfold(vec2(ratio - q.x, q.y), away, lean);\n  float el = l.x - tear(l.y); // > 0 right of the left half's torn edge\n  float er = r.x - (ratio - tear(r.y)); // > 0 left of the right half's torn edge\n  vec2 sq = q - vec2(0.01, 0.0);\n  float dl = unfold(sq, away, lean).x - meander(sq.y);\n  float dr = unfold(vec2(ratio - sq.x, sq.y), away, lean).x - (ratio - meander(sq.y));\n  vec4 to = getToColor(uv);\n  float sh = shadow.a * (1.0 - smoothstep(-0.02, 0.08, min(dl, dr)));\n  vec4 c = vec4(mix(to.rgb, shadow.rgb, sh), to.a);\n  if (r.x >= 0.0) {\n    c = torn(c, getFromColor(vec2(1.0 - r.x / ratio, r.y)), er, fibers(r.y, 2.0) * 1.5 * fiber, aa);\n  }\n  if (l.x >= 0.0) {\n    c = torn(c, getFromColor(vec2(l.x / ratio, l.y)), el, fibers(l.y, 0.0) * fiber, aa);\n  }\n  return c;\n}"
},
"PerlinDissolve": {
"p": {
"scale": [
"float",
"4.0"
],
"smoothness": [
"float",
"0.01"
],
"seed": [
"float",
"12.9898"
]
},
"s": "/*@scale*/\n/*@smoothness*/\n/*@seed*/\nfloat random(vec2 co)\n{\n    float a = seed;\n    float b = 78.233;\n    float c = 43758.5453;\n    float dt= dot(co.xy ,vec2(a,b));\n    float sn= mod(dt,3.14);\n    return fract(sin(sn) * c);\n}\nfloat noise (in vec2 st) {\n    vec2 i = floor(st);\n    vec2 f = fract(st);\n    float a = random(i);\n    float b = random(i + vec2(1.0, 0.0));\n    float c = random(i + vec2(0.0, 1.0));\n    float d = random(i + vec2(1.0, 1.0));\n    vec2 u = f*f*(3.0-2.0*f);\n    return mix(a, b, u.x) +\n            (c - a)* u.y * (1.0 - u.x) +\n            (d - b) * u.x * u.y;\n}\nvec4 transition (vec2 uv) {\n  vec4 from = getFromColor(uv);\n  vec4 to = getToColor(uv);\n  float n = noise(uv * scale);\n  float p = mix(-smoothness, 1.0 + smoothness, progress);\n  float lower = p - smoothness;\n  float higher = p + smoothness;\n  float q = smoothstep(lower, higher, n);\n  return mix(\n    from,\n    to,\n    1.0 - q\n  );\n}"
},
"PhotoDevelop": {
"p": {
"card": [
"vec4",
"vec4(0.93, 0.91, 0.85, 1.0)"
],
"wash": [
"float",
"0.35"
],
"tint": [
"float",
"0.8"
]
},
"s": "/*@card*/\n/*@wash*/\n/*@tint*/\nvec3 saturation(vec3 c, float s) {\n  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));\n  return mix(vec3(lum), c, s);\n}\nvec4 transition(vec2 uv) {\n  vec4 a = getFromColor(uv);\n  vec4 b = getToColor(uv);\n  float p = progress;\n  if (p <= 0.0) return a;\n  if (p >= 1.0) return b;\n  float split = mix(0.1, 0.7, clamp(wash, 0.0, 1.0));\n  float cardAlpha = card.a * mix(a.a, b.a, smoothstep(0.6 * split, split + 0.1, p));\n  vec3 cardColor = card.rgb * cardAlpha;\n  float w = smoothstep(0.0, split, p);\n  float fromLum = dot(a.rgb, vec3(0.2126, 0.7152, 0.0722));\n  float wl = clamp(w * (1.0 + 0.5 * fromLum), 0.0, 1.0);\n  vec3 washed = mix(a.rgb, mix(vec3(fromLum), a.rgb, 0.4), w) * a.a;\n  vec3 outgoing = mix(washed, cardColor, wl);\n  float outAlpha = mix(a.a, cardAlpha, wl);\n  float x = clamp((p - split) / max(1.0 - split, 1e-3), 0.0, 1.0);\n  float d = 1.0 - pow(1.0 - x, 1.5);\n  float lum = dot(b.rgb, vec3(0.2126, 0.7152, 0.0722));\n  float dev = clamp((d - 0.45 * lum) / 0.55, 0.0, 1.0);\n  dev = dev * dev * (3.0 - 2.0 * dev);\n  float early = 1.0 - smoothstep(0.2, 0.95, d);\n  vec3 tinted = saturation(b.rgb, smoothstep(0.3, 1.0, d));\n  tinted = mix(vec3(0.6), tinted, mix(0.55, 1.0, d));\n  vec3 tone = mix(vec3(-0.2, 0.06, 0.1), vec3(0.12, -0.1, 0.06), smoothstep(0.15, 0.6, lum));\n  tinted += tone * tint * early;\n  vec3 incoming = mix(cardColor, clamp(tinted, 0.0, 1.0) * b.a, dev);\n  float inAlpha = mix(cardAlpha, b.a, dev);\n  vec3 color = p < split ? outgoing : incoming;\n  float alpha = p < split ? outAlpha : inAlpha;\n  if (alpha <= 0.0) return vec4(0.0);\n  return vec4(clamp(color / alpha, 0.0, 1.0), alpha);\n}"
},
"Pinwheel": {
"p": {
"speed": [
"float",
"2.0"
]
},
"s": "/*@speed*/\nvec4 transition(vec2 uv) {\n  \n  vec2 p = uv.xy / vec2(1.0).xy;\n  \n  float circPos = atan(p.y - 0.5, p.x - 0.5) + progress * speed;\n  float modPos = mod(circPos, 3.1415 / 4.);\n  float signed = sign(progress - modPos);\n  \n  return mix(getToColor(p), getFromColor(p), step(signed, 0.5));\n  \n}"
},
"PixelStretch": {
"p": {
"direction": [
"vec2",
"vec2(1.0, 0.0)"
],
"stretch": [
"float",
"0.45"
],
"chroma": [
"float",
"0.5"
],
"softness": [
"float",
"0.03"
],
"jitter": [
"float",
"0.5"
]
},
"s": "/*@direction*/\n/*@stretch*/\n/*@chroma*/\n/*@softness*/\n/*@jitter*/\nfloat hash(float n) {\n  n = fract(n * 0.1031);\n  n *= n + 33.33;\n  n *= n + n;\n  return fract(n);\n}\nfloat smax(float x, float y, float k) {\n  float h = max(k - abs(x - y), 0.0) / k;\n  return max(x, y) + h * h * k * 0.25;\n}\nvec2 at(vec2 uv, float s0, float s, vec2 d, float ext) {\n  return clamp(uv + d * (s - s0) * ext, 0.0, 1.0);\n}\nvec4 transition(vec2 uv) {\n  vec2 d = normalize(direction + vec2(1e-6, 0.0));\n  float ext = abs(d.x) + abs(d.y);\n  float s = 0.5 + dot(uv - 0.5, d) / ext;\n  vec2 n = vec2(-d.y, d.x);\n  float t = dot((uv - 0.5) * vec2(ratio, 1.0), n);\n  float row = floor(t * 540.0);\n  float clump = floor(t * 60.0);\n  float rnd = 0.6 * hash(row + 17.0) + 0.4 * hash(clump + 311.0);\n  float p = progress;\n  float k = softness + 1e-4;\n  float margin = k + 0.002;\n  float a = mix(-margin, 1.0 + margin, mix(p, p * p * (3.0 - 2.0 * p), 0.5));\n  float h = clamp(4.0 * a * (1.0 - a), 0.0, 1.0);\n  float len = stretch * h * (1.0 - 0.6 * jitter * rnd);\n  float split = 0.02 * chroma * h;\n  vec4 fr = getFromColor(at(uv, s, smax(s, a + split, k), d, ext));\n  vec4 fg = getFromColor(at(uv, s, smax(s, a, k), d, ext));\n  vec4 fb = getFromColor(at(uv, s, smax(s, a - split, k), d, ext));\n  vec4 streak = vec4(fr.r, fg.g, fb.b, fg.a);\n  float behind = step(s, a);\n  streak.rgb *= 1.0 + 0.06 * jitter * h * (hash(row * 3.0 + 5.0) - 0.5) * behind;\n  float w = smoothstep(len - k, len + k, a - s);\n  return mix(streak, getToColor(uv), w);\n}"
},
"Pixelize": {
"p": {
"squaresMin": [
"ivec2",
"ivec2(20)"
],
"steps": [
"int",
"50"
]
},
"s": "/*@squaresMin*/\n/*@steps*/\nvec4 transition(vec2 uv) {\n  float d = min(progress, 1.0 - progress);\n  float dist = steps>0 ? ceil(d * float(steps)) / float(steps) : d;\n  vec2 squareSize = 2.0 * dist / vec2(squaresMin);\n  vec2 p = dist>0.0 ? (floor(uv / squareSize) + 0.5) * squareSize : uv;\n  return mix(getFromColor(p), getToColor(p), progress);\n}"
},
"PolkaDotsCurtain": {
"p": {
"dots": [
"float",
"20.0"
],
"center": [
"vec2",
"vec2(0, 0)"
]
},
"s": "const float SQRT_2 = 1.414213562373;\n/*@dots*/\n/*@center*/\nvec4 transition(vec2 uv) {\n  bool nextImage = distance(fract(uv * dots), vec2(0.5, 0.5)) < ( progress / distance(uv, center));\n  return nextImage ? getToColor(uv) : getFromColor(uv);\n}"
},
"PowerKaleido": {
"p": {
"scale": [
"float",
"2.0"
],
"z": [
"float",
"1.5"
],
"speed": [
"float",
"5."
]
},
"s": "#define PI 3.14159265358979\nconst float rad = 120.; // change this value to get different mirror effects\nconst float deg = rad / 180. * PI;\n/*@scale*/\n/*@z*/\n/*@speed*/\nvec2 refl(vec2 p,vec2 o,vec2 n)\n{\n\treturn 2.0*o+2.0*n*dot(p-o,n)-p;\n}\nvec2 rot(vec2 p, vec2 o, float a)\n{\n    float s = sin(a);\n    float c = cos(a);\n\treturn o + mat2(c, -s, s, c) * (p - o);\n}\nvec4 mainImage(vec2 uv)\n{\n  float dist = scale / 10.;\n  vec2 uv0 = uv;\n\tuv -= 0.5;\n  uv.x *= ratio;\n  uv *= z;\n  uv = rot(uv, vec2(0.0), progress*speed);\n\tfloat theta = progress*6.+PI/.5;\n\tfor(int iter = 0; iter < 10; iter++) {\n    for(float i = 0.; i < 2. * PI; i+=deg) {\n\t    float ts = sign(asin(cos(i))) == 1.0 ? 1.0 : 0.0;\n      if(((ts == 1.0) && (uv.y-dist*cos(i) > tan(i)*(uv.x+dist*+sin(i)))) || ((ts == 0.0) && (uv.y-dist*cos(i) < tan(i)*(uv.x+dist*+sin(i))))) {\n        uv = refl(vec2(uv.x+sin(i)*dist*2.,uv.y-cos(i)*dist*2.), vec2(0.,0.), vec2(cos(i),sin(i)));\n      }\n    }\n  }\n  uv += 0.5;\n  uv = rot(uv, vec2(0.5), progress*-speed);\n  uv -= 0.5;\n  uv.x /= ratio;\n  uv += 0.5;\n  uv = 2.*abs(uv/2.-floor(uv/2.+0.5));\n  vec2 uvMix = mix(uv,uv0,cos(progress*PI*2.)/2.+0.5);\n  vec4 color = mix(getFromColor(uvMix),getToColor(uvMix),cos((progress-1.)*PI)/2.+0.5);\n\treturn color;\n    \n}\nvec4 transition (vec2 uv) {\n  vec4 color = mainImage(uv);\n  return color;\n}"
},
"Prisms": {
"p": {
"slats": [
"int",
"8"
],
"stagger": [
"float",
"0.45"
],
"perspective": [
"float",
"1.0"
],
"shading": [
"float",
"0.6"
],
"horizontal": [
"bool",
"false"
],
"backColor": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
]
},
"s": "/*@slats*/\n/*@stagger*/\n/*@perspective*/\n/*@shading*/\n/*@horizontal*/\n/*@backColor*/\nconst float PI = 3.141592653589793;\nconst float EDGE = 0.002;\nvec4 transition (vec2 uv) {\n  float n = float(slats);\n  float a = horizontal ? uv.y : uv.x;\n  float b = horizontal ? uv.x : uv.y;\n  float hw = 0.5 / n * (horizontal ? 1.0 : ratio);\n  float k = min(perspective * hw, 0.5);\n  float bScale = horizontal ? ratio : 1.0;\n  vec4 near1 = vec4(0.0), near2 = vec4(0.0);\n  float cover1 = 0.0, cover2 = 0.0;\n  float z1 = -2.0, z2 = -2.0;\n  for (int d = -1; d <= 1; d++) {\n    float i = floor(a * n) + float(d);\n    if (i < 0.0 || i > n - 1.0) continue;\n    float order = (horizontal ? n - 1.0 - i : i) / (n - 1.0);\n    float t = clamp((progress - stagger * order) / (1.0 - stagger), 0.0, 1.0);\n    t = mix(t, t * t * (3.0 - 2.0 * t), 0.7);\n    float c = cos(0.5 * PI * t);\n    float s = sin(0.5 * PI * t);\n    float edge = EDGE * min(1.0, 20.0 * s * c) + 1e-6;\n    float x = 2.0 * (a * n - i) - 1.0;\n    for (int f = 0; f < 2; f++) {\n      float cf = f == 0 ? c : s;\n      if (cf < 1e-4) continue;\n      float u = f == 0 ? (x + s) / c : (x - c) / s;\n      float z = f == 0 ? u * s + c : s - u * c;\n      if (abs(u) > 1.0 || z <= z2) continue;\n      float scale = 1.0 - k * (z - 1.0);\n      float y = (b - 0.5) * scale + 0.5;\n      if (y < 0.0 || y > 1.0) continue;\n      float outer = f == 0 ? 1.0 + u : 1.0 - u;\n      float cover = clamp(outer * hw * cf / edge, 0.0, 1.0)\n        * clamp(min(y, 1.0 - y) * bScale / scale / edge, 0.0, 1.0);\n      float sa = (i + 0.5 + 0.5 * u) / n;\n      vec2 p = horizontal ? vec2(y, sa) : vec2(sa, y);\n      vec4 img = f == 0 ? getFromColor(p) : getToColor(p);\n      float lambert = clamp(f == 0 ? c - 0.6 * s : s + 0.6 * c, 0.0, 1.0);\n      vec4 color = vec4(img.rgb * mix(1.0 - shading, 1.0, lambert), img.a);\n      if (z > z1) {\n        near2 = near1; cover2 = cover1; z2 = z1;\n        near1 = color; cover1 = cover; z1 = z;\n      } else {\n        near2 = color; cover2 = cover; z2 = z;\n      }\n    }\n  }\n  return mix(mix(backColor, near2, cover2), near1, cover1);\n}"
},
"Puzzle": {
"p": {
"pieces": [
"float",
"5.0"
],
"shadow": [
"float",
"0.6"
]
},
"s": "/*@pieces*/\n/*@shadow*/\nfloat hash(vec2 c) {\n  vec2 p = fract(c * vec2(0.1031, 0.1030));\n  p += dot(p, p.yx + 33.33);\n  return fract((p.x + p.y) * p.x);\n}\nfloat boxDist(vec2 p, vec2 halfSize) {\n  vec2 q = abs(p) - halfSize;\n  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);\n}\nfloat pieceDist(vec2 p, vec2 c, vec2 grid, float aspect) {\n  vec2 halfSize = vec2(0.5 * aspect, 0.5);\n  float d = boxDist(p, halfSize);\n  float tabs = 1e3;\n  for (int e = 0; e < 4; e++) {\n    vec2 dir = e == 0 ? vec2(1.0, 0.0) : e == 1 ? vec2(-1.0, 0.0) : e == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);\n    vec2 key = c + min(dir, 0.0);\n    vec2 next = c + dir;\n    if (next.x >= 0.0 && next.y >= 0.0 && next.x < grid.x && next.y < grid.y) {\n      float h = hash(key + (e < 2 ? vec2(0.0) : vec2(71.0, 37.0)));\n      bool tab = (h < 0.5) == (dir.x + dir.y > 0.0);\n      vec2 out1 = dir * (tab ? 1.0 : -1.0);\n      vec2 along = vec2(abs(dir.y), abs(dir.x));\n      vec2 edge = dir * halfSize + along * (fract(h * 2.0) - 0.5) * 0.16;\n      float k = min(\n        length(p - edge - out1 * 0.15) - 0.125,\n        boxDist(p - edge - out1 * 0.06, abs(dir) * 0.08 + along * 0.085));\n      if (tab) tabs = min(tabs, k);\n      else d = max(d, -k);\n    }\n  }\n  return min(d, tabs);\n}\nvec4 transition(vec2 uv) {\n  float rows = ratio < 1.0 ? floor(pieces / ratio + 0.5) : pieces;\n  float cols = ratio < 1.0 ? pieces : floor(pieces * ratio + 0.5);\n  vec2 grid = vec2(cols, rows);\n  float aspect = ratio * rows / cols;\n  vec2 g = uv * grid;\n  vec2 cell = floor(g);\n  const float aa = 0.01; // soft edges, in cells\n  float boardSum = 0.0;\n  float allSum = 0.0;\n  float prio1 = -1.0, prio2 = -1.0, cov1 = 0.0, cov2 = 0.0, shade1 = 1.0, shade2 = 1.0;\n  vec2 uv1 = uv, uv2 = uv;\n  float shadowAll = 0.0;\n  float seam = 1.0;\n  for (int i = 0; i < 9; i++) {\n    vec2 c = cell + vec2(mod(float(i), 3.0), floor(float(i) / 3.0)) - 1.0;\n    if (c.x < 0.0 || c.y < 0.0 || c.x >= cols || c.y >= rows) continue;\n    vec2 center = c + 0.5;\n    vec2 local = (g - center) * vec2(aspect, 1.0);\n    float h = hash(c + vec2(13.0, 7.0));\n    float diag = (c.x / max(cols - 1.0, 1.0) + (rows - 1.0 - c.y) / max(rows - 1.0, 1.0)) * 0.5;\n    float delay = (diag + 1.2 * (h - 0.5) * diag * (1.0 - diag)) * 0.6;\n    float t = clamp((progress - delay) / 0.4, 0.0, 1.0);\n    float d0 = pieceDist(local, c, grid, aspect);\n    float w = 1.0 - smoothstep(-aa, aa, d0);\n    allSum += w;\n    if (t <= 0.0) {\n      boardSum += w;\n      seam = min(seam, abs(d0));\n      continue;\n    }\n    float lift = smoothstep(0.0, 0.25, t);\n    float fall = clamp((t - 0.2) / 0.8, 0.0, 1.0);\n    fall *= fall;\n    float s = max(1.0 - fall, 0.001);\n    float a = (h - 0.5) * 3.0 * fall;\n    vec2 off = vec2(0.0, -1.2 * fall);\n    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));\n    vec2 pl = rot * (local - off) / s;\n    float dp = pieceDist(pl, c, grid, aspect);\n    float cov = (1.0 - smoothstep(-aa, aa, dp * s)) * min(s * 20.0, 1.0); // fades when tiny\n    float shade = (1.0 - 0.5 * fall) * (1.0 - 0.3 * lift * (1.0 - smoothstep(0.0, 0.035, -dp)));\n    vec2 puv = (center + pl / vec2(aspect, 1.0)) / grid;\n    vec2 sl = rot * (local - off - vec2(0.08, -0.1) * lift) / s;\n    float sh = (1.0 - smoothstep(-0.05, 0.12, pieceDist(sl, c, grid, aspect) * s)) * lift * (1.0 - fall) * shadow;\n    shadowAll = max(shadowAll, max(sh, w * lift * (1.0 - smoothstep(0.2, 0.5, t)) * shadow));\n    float prio = delay;\n    if (cov > 0.0 && prio > prio1) {\n      prio2 = prio1; cov2 = cov1; uv2 = uv1; shade2 = shade1;\n      prio1 = prio; cov1 = cov; uv1 = puv; shade1 = shade;\n    } else if (cov > 0.0 && prio > prio2) {\n      prio2 = prio; cov2 = cov; uv2 = puv; shade2 = shade;\n    }\n  }\n  vec4 base = mix(getToColor(uv), getFromColor(uv), boardSum / max(allSum, 0.001));\n  base.rgb *= (1.0 - shadowAll) * (1.0 - 0.4 * smoothstep(0.0, 0.1, progress) * (1.0 - smoothstep(0.0, 0.015, seam)));\n  vec4 p2 = getFromColor(uv2);\n  p2.rgb *= shade2;\n  vec4 p1 = getFromColor(uv1);\n  p1.rgb *= shade1;\n  return mix(mix(base, p2, cov2), p1, cov1);\n}"
},
"RadialWipe": {
"p": {
"smoothness": [
"float",
"1.0"
]
},
"s": "/*@smoothness*/\nconst float PI = 3.141592653589;\nvec4 transition(vec2 p) {\n  vec2 rp = p*2.-1.;\n  return mix(\n    getToColor(p),\n    getFromColor(p),\n    smoothstep(0., smoothness, atan(rp.y,rp.x) - (progress-.5) * PI * 2.5)\n  );\n}"
},
"RandomSquares": {
"p": {
"size": [
"ivec2",
"ivec2(10, 10)"
],
"smoothness": [
"float",
"0.5"
]
},
"s": "/*@size*/\n/*@smoothness*/\n \nfloat rand (vec2 co) {\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvec4 transition(vec2 p) {\n  float r = rand(floor(vec2(size) * p));\n  float m = smoothstep(0.0, -smoothness, r - (progress * (1.0 + smoothness)));\n  return mix(getFromColor(p), getToColor(p), m);\n}"
},
"RectangleCover": {
"p": {
"bgcolor": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
]
},
"s": "/*@bgcolor*/\nvec4 transition(vec2 p) {\n  float s = pow(2.0 * abs(progress - 0.5), 3.0);\n  \n   vec2 sq = p.xy / vec2(1.0).xy;\n    vec2 bl = step(vec2(abs(1. - 2.*progress)), sq + .25);\n    float dist = bl.x * bl.y;\n    vec2 tr = step(vec2(abs(1. - 2.*progress)), 1.25-sq);\n    dist *= 1. * tr.x * tr.y;\n  \n  return mix(\n    progress < 0.5 ? getFromColor(p) : getToColor(p),\n    bgcolor,\n    step(s, dist)\n  );\n  \n}"
},
"RectangleIris": {
"p": {
"bgcolor": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
]
},
"s": "/*@bgcolor*/\nvec4 transition(vec2 uv) {\n  \n  float s = pow(2.0 * abs(progress - 0.5), 3.0);\n              \n  vec2 q = uv.xy / vec2(1.0).xy;\n  vec2 bl = step(vec2(1.0 - 2.0*abs(progress - 0.5)), q + 0.25);\n  vec2 tr = step(vec2(1.0 - 2.0*abs(progress - 0.5)), 1.25 - q);\n  \n  float dist = length(1.0 - bl.x * bl.y * tr.x * tr.y);\n  \n  return mix(\n    progress < 0.5 ? getFromColor(uv) : getToColor(uv),\n    bgcolor,\n    step(s, dist)\n  );\n  \n}"
},
"Refraction": {
"p": {
"strength": [
"float",
"0.15"
],
"scale": [
"float",
"2.5"
],
"dispersion": [
"float",
"0.5"
],
"brightness": [
"float",
"1.0"
]
},
"s": "/*@strength*/\n/*@scale*/\n/*@dispersion*/\n/*@brightness*/\nconst int TAPS = 7;\nfloat surface(vec2 q, float t) {\n  q += 0.45 * vec2(sin(1.3 * q.y + 0.9 * t), sin(1.1 * q.x - 1.2 * t));\n  float h = sin(q.x + 0.6 * t) * sin(1.2 * q.y - 0.8 * t);\n  h += 0.5 * sin(dot(q, vec2(1.6, -1.2)) + 1.4 * t);\n  h += 0.3 * sin(dot(q, vec2(-1.1, 2.9)) - 1.9 * t + 1.7 * sin(0.9 * q.x));\n  h += 0.15 * sin(dot(q, vec2(4.3, 3.1)) + 2.6 * t);\n  return h;\n}\nfloat hash12(vec2 v) {\n  vec3 v3 = fract(vec3(v.xyx) * 0.1031);\n  v3 += dot(v3, v3.yzx + 33.33);\n  return fract((v3.x + v3.y) * v3.z);\n}\nvec2 mirror(vec2 v) {\n  return 1.0 - abs(1.0 - mod(v, 2.0));\n}\nvec3 spectrum(float w) {\n  vec3 c = vec3(\n    1.0 - smoothstep(0.0, 0.55, w) + 0.35 * smoothstep(0.75, 1.0, w),\n    1.0 - abs(2.0 * w - 1.0) * 1.2,\n    smoothstep(0.45, 1.0, w)\n  );\n  return clamp(c, 0.0, 1.0);\n}\nvec4 transition(vec2 uv) {\n  float p = progress;\n  float h = 1.0 - abs(2.0 * p - 1.0);\n  float amount = h * h * (2.0 - h);\n  vec2 q = (uv - 0.5) * vec2(ratio, 1.0) * scale;\n  float t = 3.0 * p;\n  float e = 0.01;\n  vec2 slope = vec2(\n    surface(q + vec2(e, 0.0), t) - surface(q - vec2(e, 0.0), t),\n    surface(q + vec2(0.0, e), t) - surface(q - vec2(0.0, e), t)\n  ) / (2.0 * e);\n  vec2 offset = slope * strength * amount / scale;\n  float wave = clamp(0.5 * surface(q, t), -1.0, 1.0);\n  float m = smoothstep(-0.015, 0.015, p - 0.5 + 0.1 * wave);\n  vec3 color = vec3(0.0);\n  vec3 weights = vec3(0.0);\n  float alpha = 0.0;\n  float jitter = hash12(uv * vec2(ratio, 1.0) * 1000.0) - 0.5;\n  for (int i = 0; i < TAPS; i++) {\n    float w = float(i) / float(TAPS - 1);\n    float wj = (float(i) + jitter) / float(TAPS - 1);\n    vec2 st = mirror(uv + offset * (1.0 + dispersion * (wj - 0.5) * 1.6));\n    vec4 c = mix(getFromColor(st), getToColor(st), m);\n    vec3 s = spectrum(w);\n    color += s * c.rgb * c.a;\n    weights += s;\n    alpha += c.a;\n  }\n  alpha /= float(TAPS);\n  color = color / weights / max(alpha, 1e-5);\n  float flare = 2.0 * brightness * pow(h, 8.0);\n  color = color * (1.0 + flare) / (1.0 + flare * color);\n  color += 0.1 * flare * dot(color, vec3(0.3333));\n  return vec4(clamp(color, 0.0, 1.0), alpha);\n}"
},
"Revolve": {
"p": {
"center": [
"vec2",
"vec2(0.46, 0.52)"
],
"direction": [
"float",
"-1.0"
],
"maxRotation": [
"float",
"1.95"
],
"peakZoom": [
"float",
"2.22"
],
"swirl": [
"float",
"2.85"
],
"barrel": [
"float",
"0.38"
],
"motionBlur": [
"float",
"1.0"
],
"switchStart": [
"float",
"0.30"
],
"switchEnd": [
"float",
"0.50"
],
"shadow": [
"float",
"0.16"
]
},
"s": "/*@center*/\n/*@direction*/\n/*@maxRotation*/\n/*@peakZoom*/\n/*@swirl*/\n/*@barrel*/\n/*@motionBlur*/\n/*@switchStart*/\n/*@switchEnd*/\n/*@shadow*/\nfloat sat(float x) {\n  return clamp(x, 0.0, 1.0);\n}\nfloat ease(float x) {\n  x = sat(x);\n  return x * x * (3.0 - 2.0 * x);\n}\nfloat revolveEnvelope(float t) {\n  float rise = ease((t - 0.10) / 0.33);\n  float fall = 1.0 - ease((t - 0.43) / 0.29);\n  return rise * fall;\n}\nvec2 rotate2(vec2 p, float a) {\n  float s = sin(a);\n  float c = cos(a);\n  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);\n}\nvec2 warpUv(vec2 uv, float t) {\n  float e = revolveEnvelope(t);\n  vec2 p = uv - center;\n  p.x *= ratio;\n  float r = length(p);\n  float edgeSpin = maxRotation * e;\n  float coreSpin = swirl * e * pow(1.0 - sat(r / 0.96), 1.55);\n  float visibleAngle = direction * (edgeSpin + coreSpin);\n  p = rotate2(p, -visibleAngle);\n  float sc = 1.0 + (peakZoom - 1.0) * pow(e, 0.85);\n  p /= sc;\n  float rr = length(p);\n  p *= 1.0 + barrel * e * rr * rr * 2.8;\n  p.x /= ratio;\n  return clamp(p + center, vec2(0.001), vec2(0.999));\n}\nvec4 sampleRevolve(vec2 uv, float t) {\n  vec2 p = warpUv(uv, t);\n  float reveal = smoothstep(switchStart, switchEnd, t);\n  return mix(getFromColor(p), getToColor(p), reveal);\n}\nvec4 transition(vec2 uv) {\n  if (progress <= 0.0) return getFromColor(uv);\n  if (progress >= 1.0) return getToColor(uv);\n  float e = revolveEnvelope(progress);\n  float span = 0.060 * motionBlur * e;\n  vec4 color = vec4(0.0);\n  float total = 0.0;\n  for (int i = -8; i <= 8; i++) {\n    float x = float(i) / 8.0;\n    float w = 1.0 - abs(x);\n    w = w * w + 0.01;\n    float t = sat(progress + x * span);\n    color += sampleRevolve(uv, t) * w;\n    total += w;\n  }\n  color /= total;\n  vec2 q = uv - vec2(0.5);\n  q.x *= ratio;\n  float vignette = 1.0 - shadow * e * smoothstep(0.35, 0.95, length(q));\n  color.rgb *= vignette;\n  return color;\n}"
},
"Ripple": {
"p": {
"amplitude": [
"float",
"100.0"
],
"speed": [
"float",
"50.0"
]
},
"s": "/*@amplitude*/\n/*@speed*/\nvec4 transition (vec2 uv) {\n  vec2 dir = uv - vec2(.5);\n  float dist = length(dir);\n  vec2 offset = dir * (sin(progress * dist * amplitude - progress * speed) + .5) / 30. * progress;\n  return mix(\n    getFromColor(uv + offset),\n    getToColor(uv),\n    smoothstep(0.2, 1.0, progress)\n  );\n}"
},
"Rolls": {
"p": {
"type": [
"int",
"0"
],
"RotDown": [
"bool",
"false"
]
},
"s": "/*@type*/\n/*@RotDown*/\n#define M_PI 3.14159265358979323846\nvec4 transition(vec2 uv)\n{\nfloat theta, c1, s1;\nvec2 iResolution = vec2(ratio, 1.0);\nvec2 uvi;\nif (type == 0) { theta = (RotDown ? M_PI : -M_PI) / 2.0 * progress; uvi.x = 1.0 - uv.x; uvi.y = uv.y; }\nelse if (type == 1) { theta = (RotDown ? M_PI : -M_PI) / 2.0 * progress; uvi = uv; }\nelse if (type == 2) { theta = (RotDown ? -M_PI : M_PI) / 2.0 * progress; uvi.x = uv.x; uvi.y = 1.0 - uv.y; }\nelse if (type == 3) { theta = (RotDown ? -M_PI : M_PI) / 2.0 * progress; uvi = 1.0 - uv; }\nc1 = cos(theta); s1 = sin(theta);\nvec2 uv2;\nuv2.x = (uvi.x * iResolution.x * c1 - uvi.y * iResolution.y * s1);\nuv2.y = (uvi.x * iResolution.x * s1 + uvi.y * iResolution.y * c1);\nif ((uv2.x >= 0.0) && (uv2.x <= iResolution.x) && (uv2.y >= 0.0) && (uv2.y <= iResolution.y))\n\t{\n\tuv2 /= iResolution;\n\tif (type == 0) { uv2.x = 1.0 - uv2.x; }\n\telse if (type == 2) { uv2.y = 1.0 - uv2.y; }\n\telse if (type == 3) { uv2 = 1.0 - uv2; }\n\treturn(getFromColor(uv2));\n\t}\nreturn(getToColor(uv));\n}"
},
"RotateFade": {
"p": {},
"s": "#define PI 3.1415926\nvec2 rotate2D(in vec2 uv, in float angle){\n  \n  return uv * mat2(cos(angle), -sin(angle), sin(angle), cos(angle));\n}\nvec4 transition (vec2 uv) {\n  \n  vec2 p = fract(rotate2D(uv - 0.5, progress * PI * 2.0) + 0.5);\n  return mix(\n    getFromColor(p),\n    getToColor(p),\n    progress\n  );\n}"
},
"RotateScaleFade": {
"p": {
"center": [
"vec2",
"vec2(0.5, 0.5)"
],
"rotations": [
"float",
"1.0"
],
"scale": [
"float",
"8.0"
],
"backColor": [
"vec4",
"vec4(0.15, 0.15, 0.15, 1.0)"
]
},
"s": "#define PI 3.14159265359\n/*@center*/\n/*@rotations*/\n/*@scale*/\n/*@backColor*/\nvec4 transition (vec2 uv) {\n  \n  vec2 difference = uv - center;\n  vec2 dir = normalize(difference);\n  float dist = length(difference);\n  \n  float angle = 2.0 * PI * rotations * progress;\n  \n  float c = cos(angle);\n  float s = sin(angle);\n  \n  float currentScale = mix(scale, 1.0, 2.0 * abs(progress - 0.5));\n  \n  vec2 rotatedDir = vec2(dir.x  * c - dir.y * s, dir.x * s + dir.y * c);\n  vec2 rotatedUv = center + rotatedDir * dist / currentScale;\n  \n  if (rotatedUv.x < 0.0 || rotatedUv.x > 1.0 ||\n      rotatedUv.y < 0.0 || rotatedUv.y > 1.0)\n    return backColor;\n    \n  return mix(getFromColor(rotatedUv), getToColor(rotatedUv), progress);\n}"
},
"RotateScaleVanish": {
"p": {
"FadeInSecond": [
"bool",
"true"
],
"ReverseEffect": [
"bool",
"false"
],
"ReverseRotation": [
"bool",
"false"
]
},
"s": "/*@FadeInSecond*/\n/*@ReverseEffect*/\n/*@ReverseRotation*/\n#define M_PI 3.14159265358979323846\n#define _TWOPI 6.283185307179586476925286766559\nvec4 transition(vec2 uv)\n{\nvec2 iResolution = vec2(ratio, 1.0);\nfloat t = ReverseEffect ? 1.0 - progress : progress;\nfloat theta = ReverseRotation ? _TWOPI * t : -_TWOPI * t;\nfloat c1 = cos(theta);\nfloat s1 = sin(theta);\nfloat rad = max(0.00001, 1.0 - t);\nfloat xc1 = (uv.x - 0.5) * iResolution.x;\nfloat yc1 = (uv.y - 0.5) * iResolution.y;\nfloat xc2 = (xc1 * c1 - yc1 * s1) / rad;\nfloat yc2 = (xc1 * s1 + yc1 * c1) / rad;\nvec2 uv2 = vec2(xc2 + iResolution.x / 2.0, yc2 + iResolution.y / 2.0);\nvec4 col3;\nvec4 ColorTo = ReverseEffect ? getFromColor(uv) : getToColor(uv);\nif ((uv2.x >= 0.0) && (uv2.x <= iResolution.x) && (uv2.y >= 0.0) && (uv2.y <= iResolution.y))\n\t{\n\tuv2 /= iResolution;\n\tcol3 = ReverseEffect ? getToColor(uv2) : getFromColor(uv2);\n\t}\nelse { col3 = FadeInSecond ? vec4(0.0) : ColorTo; } // transparent around the shrinking image\nreturn((1.0 - t) * col3 + t * ColorTo); // could have used mix\n}"
},
"ScaleIn": {
"p": {},
"s": "vec4 scale(in vec2 uv){\n    uv = 0.5 + (uv - 0.5) * progress;\n    return getToColor(uv);\n}\nvec4 transition (vec2 uv) {\n  return mix(\n    getFromColor(uv),\n    scale(uv),\n    progress\n  );\n}"
},
"Shatter": {
"p": {},
"s": "#define POINTS 10\nfloat random(vec2 par) {\n    return fract(sin(dot(par.xy, vec2(12.9898, 78.233))) * 43758.5453);\n}\nvec2 random2(vec2 par) {\n    float rand = random(par);\n    return vec2(rand, random(par + rand));\n}\nvec4 transition (vec2 uv) {\n    if (progress <= 0.0) return getFromColor(uv);\n    if (progress >= 1.0) return getToColor(uv);\n    const float duration = 8.0;\n    float time = progress * duration;\n    vec2 point[POINTS];\n    for (int i = 0; i < POINTS; i++) {\n        point[i] = random2(vec2(float(i)));\n    }\n    vec4 col = getToColor(uv);\n    for (int i = 0; i < POINTS; i++) {\n        vec2 dir = normalize(random2(vec2(float(i), float(i) + 11.)));\n        float v = (1.0 + random(dir) * 0.5) * 0.2;\n        vec2 ofst = dir * clamp(time - 0.5, 0.0, duration) * v;\n        vec2 U = uv - ofst;\n        if (U.x < 0.0 || U.x > 1.0 || U.y < 0.0 || U.y > 1.0) continue;\n        float dist_i = distance(U, point[i]);\n        bool closest = true;\n        for (int j = 0; j < POINTS; j++) {\n            if (distance(U, point[j]) < dist_i) {\n                closest = false;\n                break;\n            }\n        }\n        if (closest) {\n            col = getFromColor(U);\n            break;\n        }\n    }\n    return col;\n}"
},
"Shred": {
"p": {
"strips": [
"int",
"20"
],
"stagger": [
"float",
"0.4"
],
"tilt": [
"float",
"0.1"
],
"shadow": [
"float",
"0.5"
]
},
"s": "/*@strips*/\n/*@stagger*/\n/*@tilt*/\n/*@shadow*/\nfloat hash (float n) {\n  n = fract(n * 0.1031);\n  n *= n + 33.33;\n  n *= n + n;\n  return fract(n);\n}\nvec4 transition (vec2 uv) {\n  float n = float(strips);\n  float w = ratio / n; // strip width, in frame heights\n  vec2 q = vec2(uv.x * ratio, uv.y);\n  vec4 color = getToColor(uv);\n  float cover = -1.0;\n  float shade = 0.0;\n  float maxTilt = min(tilt, 2.0 * w);\n  for (int d = -3; d <= 3; d++) {\n    float i = floor(uv.x * n) + float(d);\n    if (i < 0.0 || i > n - 1.0) continue;\n    float delay = stagger * max(0.0, 1.25 * hash(i + 1.0) - 0.25);\n    float speed = 1.0 + 0.5 * hash(i + 71.0);\n    float t = clamp((progress - delay) / (1.0 - delay), 0.0, 1.0);\n    float fall = (0.4 * t + 0.6 * t * t) * (1.0 + w * (0.5 + tilt)) * speed;\n    float angle = maxTilt * (2.0 * hash(i + 37.0) - 1.0) * t;\n    float lift = min(1.0, 8.0 * t);\n    float gap = 0.06 * w * lift;\n    vec2 v = q - vec2((i + 0.5) * w, 0.5 - fall);\n    float ca = cos(angle), sa = sin(angle);\n    vec2 l = vec2(ca * v.x + sa * v.y, ca * v.y - sa * v.x);\n    vec2 edge = vec2(0.5 * w - gap, 0.5) - abs(l);\n    vec2 so = abs(l - lift * vec2(0.15 * w, -0.25 * w)) - vec2(0.5 * w - gap, 0.5);\n    shade = max(shade, lift * (1.0 - smoothstep(0.0, 0.5 * w, max(so.x, so.y))));\n    if (min(edge.x, edge.y) >= 0.0 && fall > cover) {\n      vec2 p = vec2((i + 0.5) * w + l.x, 0.5 + l.y);\n      vec4 img = getFromColor(vec2(p.x / ratio, p.y));\n      float cut = lift * (1.0 - smoothstep(0.0, 0.25 * w, edge.x));\n      color = vec4(img.rgb * (1.0 - 0.5 * shadow * cut), img.a);\n      cover = fall;\n    }\n  }\n  if (cover < 0.0) {\n    color = vec4(color.rgb * (1.0 - 0.6 * shadow * shade), color.a);\n  }\n  return color;\n}"
},
"SimpleFlip": {
"p": {},
"s": "vec4 transition(vec2 uv) {\n  vec2 q = uv;\n  uv.x = (uv.x - 0.5) / abs(progress - 0.5) * 0.5 + 0.5;\n  vec4 a = getFromColor(uv);\n  vec4 b = getToColor(uv);\n  return mix(a, b, step(0.5, progress)) * step(abs(q.x - 0.5), abs(progress - 0.5));\n}"
},
"SimpleZoom": {
"p": {
"zoom_quickness": [
"float",
"0.8"
]
},
"s": "/*@zoom_quickness*/\nvec2 zoom(vec2 uv, float amount) {\n  return 0.5 + ((uv - 0.5) * (1.0-amount));\t\n}\nvec4 transition (vec2 uv) {\n  float nQuick = clamp(zoom_quickness,0.2,1.0);\n  return mix(\n    getFromColor(zoom(uv, smoothstep(0.0, nQuick, progress))),\n    getToColor(uv),\n   smoothstep(nQuick-0.2, 1.0, progress)\n  );\n}"
},
"SimpleZoomOut": {
"p": {
"zoom_quickness": [
"float",
"0.8"
],
"fade": [
"bool",
"true"
]
},
"s": "/*@zoom_quickness*/\n/*@fade*/\nvec2 zoom(vec2 uv, float amount) {\n  return 0.5 + ((uv - 0.5) * (1.0-amount));\t\n}\nvec4 transition (vec2 uv) {\n  float nQuick = clamp(zoom_quickness,0.2,1.0);\n  return mix(\n    getFromColor(uv),\n    getToColor(zoom(uv,1.-smoothstep(1.-nQuick, 1., progress))),\n   fade?smoothstep(1.0-nQuick, 1., progress):(progress<1.0-nQuick?0.0:1.0)\n  );\n}"
},
"SlideAwayRight": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  vec2 newUV = uv;\n  newUV.x -= progress;\n  if(uv.x >= progress)\n  {\n    return getFromColor(newUV);\n  }\n  \n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    progress\n  );\n}"
},
"Slides": {
"p": {
"type": [
"int",
"0"
],
"In": [
"bool",
"false"
]
},
"s": "/*@type*/\n/*@In*/\n#define rad2 rad / 2.0\nvec4 transition(vec2 uv)\n{\nvec2 uv0 = uv;\nfloat rad = In ? progress : 1.0 - progress;\nfloat xc1, yc1;\nif (type == 0) { xc1 = .5 - rad2; yc1 = 0.0; }\nelse if (type == 1) { xc1 = 1.0 - rad; yc1 = .5 - rad2; }\nelse if (type == 2) { xc1 = .5 - rad2; yc1 = 1.0 - rad; }\nelse if (type == 3) { xc1 = 0.0; yc1 = .5 - rad2; }\nelse if (type == 4) { xc1 = 1.0 - rad; yc1 = 0.0; }\nelse if (type == 5) { xc1 = 1.0 - rad; yc1 = 1.0 - rad; }\nelse if (type == 6) { xc1 = 0.0; yc1 = 1.0 - rad; }\nelse if (type == 7) { xc1 = 0.0; yc1 = 0.0; }\nelse if (type == 8) { xc1 = .5 - rad2; yc1 = .5 - rad2; }\nuv.y = 1.0 - uv.y;\nvec2 uv2;\nif ((uv.x >= xc1) && (uv.x <= xc1 + rad) && (uv.y >= yc1) && (uv.y <= yc1 + rad))\n\t{\n\tuv2 = vec2((uv.x - xc1) / rad, 1.0 - (uv.y - yc1) / rad);\n\treturn(In ? getToColor(uv2) : getFromColor(uv2));\n\t}\nreturn(In ? getFromColor(uv0) : getToColor(uv0));\n}"
},
"SpiralWipe": {
"p": {
"turns": [
"float",
"3.0"
],
"smoothness": [
"float",
"0.05"
],
"clockwise": [
"bool",
"true"
]
},
"s": "#define PI 3.141592653589793\n/*@turns*/\n/*@smoothness*/\n/*@clockwise*/\nfloat arm (float s, float d) {\n  float end = -0.5 + (turns + 0.5) / 0.6;\n  float tip = mix(-0.5, end, progress);\n  s = max(s, -0.5);\n  float width = sqrt(clamp((tip - s) / max(end - s, 0.001), 0.0, 1.0));\n  float e = smoothness + 0.005 * turns;\n  return smoothstep(0.0, e, width * (0.5 + e) - d);\n}\nvec4 transition (vec2 uv) {\n  vec2 q = (uv - 0.5) * vec2(ratio, 1.0) / (0.5 * length(vec2(ratio, 1.0)));\n  float a = dot(q, q) < 1e-12 ? 0.0 : atan(q.x, q.y) / (2.0 * PI);\n  a = fract(clockwise ? a : -a);\n  float w = length(q) * turns - a;\n  float n = floor(w);\n  float f = w - n;\n  float m = max(arm(n + a, abs(f - 0.5)), max(arm(n + 1.0 + a, 1.5 - f), arm(n - 1.0 + a, f + 0.5)));\n  return mix(getFromColor(uv), getToColor(uv), m);\n}"
},
"SplitSlideInHorizontal": {
"p": {
"reverse": [
"bool",
"false"
]
},
"s": "/*@reverse*/\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec4 transition (vec2 uv) {\n  float modifier = reverse ? -1.0 : 1.0;\n  vec2 toP = (uv.y > 0.5) ?\n    vec2((uv.x - (progress * modifier)) + modifier, uv.y) :\n    vec2((uv.x + (progress * modifier)) - modifier, uv.y);\n  vec2 fromP = uv;\n  return inBounds(toP) ? getToColor(toP) : getFromColor(fromP);\n}"
},
"SplitSlideInOutHorizontal": {
"p": {
"reverse": [
"bool",
"false"
]
},
"s": "/*@reverse*/\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec4 transition (vec2 uv) {\n  float modifier = (uv.y > 0.5 ? 1.0 : -1.0) * (reverse ? -1.0 : 1.0) ;\n  vec2 fromP = vec2(uv.x + (progress * modifier), uv.y);\n  vec2 toP = vec2((uv.x + (progress * modifier)) - modifier, uv.y);\n  return inBounds(fromP) ? getFromColor(fromP) : getToColor(toP);\n}"
},
"SplitSlideInOutVertical": {
"p": {
"reverse": [
"bool",
"false"
]
},
"s": "/*@reverse*/\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec4 transition (vec2 uv) {\n  float modifier = (uv.x > 0.5 ? 1.0 : -1.0) * (reverse ? -1.0 : 1.0) ;\n  vec2 fromP = vec2(uv.x, uv.y + (progress * modifier));\n  vec2 toP = vec2(uv.x, (uv.y + (progress * modifier)) - modifier);\n  return inBounds(fromP) ? getFromColor(fromP) : getToColor(toP);\n}"
},
"SplitSlideInVertical": {
"p": {
"reverse": [
"bool",
"false"
]
},
"s": "/*@reverse*/\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec4 transition (vec2 uv) {\n  float modifier = reverse ? -1.0 : 1.0;\n  vec2 p = (uv.x > 0.5) ?\n    vec2(uv.x, (uv.y - (progress * modifier)) + modifier) :\n    vec2(uv.x, (uv.y + (progress * modifier)) - modifier);\n  return inBounds(p) ? getToColor(p) : getFromColor(uv);\n}"
},
"SplitSlideOutHorizontal": {
"p": {
"reverse": [
"bool",
"false"
]
},
"s": "/*@reverse*/\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec4 transition (vec2 uv) {\n  float modifier = (uv.y > 0.5 ? 1.0 : -1.0) * (reverse ? -1.0 : 1.0) ;\n  vec2 p = vec2(uv.x + (progress * modifier), uv.y);\n  return inBounds(p) ? getFromColor(p) : getToColor(uv);\n}"
},
"SplitSlideOutVertical": {
"p": {
"reverse": [
"bool",
"false"
]
},
"s": "/*@reverse*/\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec4 transition (vec2 uv) {\n  float modifier = (uv.x > 0.5 ? 1.0 : -1.0) * (reverse ? -1.0 : 1.0) ;\n  vec2 p = vec2(uv.x, uv.y + (progress * modifier));\n  return inBounds(p) ? getFromColor(p) : getToColor(uv);\n}"
},
"SquaresWipe": {
"p": {
"squares": [
"ivec2",
"ivec2(10,10)"
],
"direction": [
"vec2",
"vec2(1.0, -0.5)"
],
"smoothness": [
"float",
"1.6"
]
},
"s": "/*@squares*/\n/*@direction*/\n/*@smoothness*/\nconst vec2 center = vec2(0.5, 0.5);\nvec4 transition (vec2 p) {\n  vec2 v = normalize(direction);\n  v /= abs(v.x)+abs(v.y);\n  float d = v.x * center.x + v.y * center.y;\n  float offset = smoothness;\n  float pr = smoothstep(-offset, 0.0, v.x * p.x + v.y * p.y - (d-0.5+progress*(1.+offset)));\n  vec2 squarep = fract(p*vec2(squares));\n  vec2 squaremin = vec2(pr/2.0);\n  vec2 squaremax = vec2(1.0 - pr/2.0);\n  float a = (1.0 - step(progress, 0.0)) * step(squaremin.x, squarep.x) * step(squaremin.y, squarep.y) * step(squarep.x, squaremax.x) * step(squarep.y, squaremax.y);\n  return mix(getFromColor(p), getToColor(p), a);\n}"
},
"Squeeze": {
"p": {
"colorSeparation": [
"float",
"0.04"
]
},
"s": "/*@colorSeparation*/\n \nvec4 transition (vec2 uv) {\n  float y = 0.5 + (uv.y-0.5) / (1.0-progress);\n  if (y < 0.0 || y > 1.0) {\n     return getToColor(uv);\n  }\n  else {\n    vec2 fp = vec2(uv.x, y);\n    vec2 off = progress * vec2(0.0, colorSeparation);\n    vec4 c = getFromColor(fp);\n    vec4 cn = getFromColor(fp - off);\n    vec4 cp = getFromColor(fp + off);\n    return vec4(cn.r, c.g, cp.b, c.a);\n  }\n}"
},
"StarWipe": {
"p": {
"border_thickness": [
"float",
"0.01"
],
"star_rotation": [
"float",
"0.75"
],
"border_color": [
"vec4",
"vec4(1.0)"
],
"star_center": [
"vec2",
"vec2(0.5)"
]
},
"s": "#define PI 3.141592653589793\n#define STAR_ANGLE 1.2566370614359172\n/*@border_thickness*/\n/*@star_rotation*/\n/*@border_color*/\n/*@star_center*/\nvec2 rotate(vec2 v, float theta) {\n    float cosTheta = cos(theta);\n    float sinTheta = sin(theta);\n    return vec2(\n        cosTheta * v.x - sinTheta * v.y,\n        sinTheta * v.x + cosTheta * v.y\n    );\n}\nbool inStar(vec2 uv, vec2 center, float radius){\n  vec2 uv_centered = uv - center;\n  uv_centered = rotate(uv_centered, star_rotation * STAR_ANGLE);\n  float theta = atan(uv_centered.y, uv_centered.x) + PI;\n  vec2 uv_rotated = rotate(uv_centered, -STAR_ANGLE * (floor(theta / STAR_ANGLE) + 0.5));\n  float slope = 0.3;\n  if(uv_rotated.y > 0.0){\n      return (radius + uv_rotated.x * slope > uv_rotated.y);\n  } else {\n     return (-radius - uv_rotated.x * slope < uv_rotated.y);\n  }\n}\nvec4 transition (vec2 uv) {\n  float progressScaled = (2.0 * border_thickness + 1.0) * progress - border_thickness;\n  if(inStar(uv, star_center, progressScaled)){\n    return getToColor(uv);\n  } else if(inStar(uv, star_center, progressScaled+border_thickness)){\n    return border_color;\n  } else {\n    return getFromColor(uv);\n  }\n}"
},
"StaticFade": {
"p": {
"n_noise_pixels": [
"float",
"200.0"
],
"static_luminosity": [
"float",
"0.8"
]
},
"s": "/*@n_noise_pixels*/\n/*@static_luminosity*/\nfloat rnd (vec2 st) {\n    return fract(sin(dot(st.xy,\n                         vec2(10.5302340293,70.23492931)))*\n        12345.5453123);\n}\nvec4 staticNoise (vec2 st, float offset, float luminosity, float alpha) {\n  float staticR = luminosity * rnd(st * vec2(offset * 2.0, offset * 3.0));\n  float staticG = luminosity * rnd(st * vec2(offset * 3.0, offset * 5.0));\n  float staticB = luminosity * rnd(st * vec2(offset * 5.0, offset * 7.0));\n  return vec4(staticR, staticG, staticB, alpha);\n}\nfloat staticIntensity(float t)\n{\n  float transitionProgress = abs(2.0*(t-0.5));\n  float transformedThreshold =1.2*(1.0 - transitionProgress)-0.1;\n  return min(1.0, transformedThreshold);\n}\n  \nvec4 transition (vec2 uv) {\n  float baseMix = step(0.5, progress);\n  vec4 transitionMix = mix(\n    getFromColor(uv),\n    getToColor(uv),\n    baseMix\n  );\n  \n  vec2 uvStatic = floor(uv * n_noise_pixels)/n_noise_pixels;\n  \n  vec4 staticColor = staticNoise(uvStatic, progress, static_luminosity, transitionMix.a); // static where the image is\n  float staticThresh = staticIntensity(progress);\n  float staticMix = step(rnd(uvStatic), staticThresh);\n  return mix(transitionMix, staticColor, staticMix);\n}"
},
"StaticWipe": {
"p": {
"u_transitionUpToDown": [
"bool",
"true"
],
"u_max_static_span": [
"float",
"0.5"
]
},
"s": "#define PI 3.14159265359\nfloat rnd (vec2 st) {\n    return fract(sin(dot(st.xy,\n                         vec2(10,70)))*\n        12345.5453123);\n}\n/*@u_transitionUpToDown*/\n/*@u_max_static_span*/\nvec4 transition (vec2 uv) {\n  \n  float span = u_max_static_span*pow(sin(PI*progress),0.5);\n  \n  float transitionEdge = u_transitionUpToDown ? 1.0-uv.y : uv.y;\n  float mixRatio = 1.0 - step(progress, transitionEdge);\n  vec4 transitionMix = mix(\n    getFromColor(uv),\n    getToColor(uv),\n    mixRatio\n  );\n  \n  float noiseEnvelope = smoothstep(progress-span, progress, transitionEdge) * (1.0 - smoothstep(progress, progress + span, transitionEdge));\n  vec4 noise = vec4(vec3(rnd(uv*(1.0+progress))), transitionMix.a); // static where the image is\n  \n  return mix(transitionMix, noise, noiseEnvelope);\n}"
},
"StereoViewer": {
"p": {
"zoom": [
"float",
"0.88"
],
"corner_radius": [
"float",
"0.22"
]
},
"s": "/*@zoom*/\n/*@corner_radius*/\nconst vec4 black = vec4(0.0); // where no image is drawn: transparent\nconst vec2 c00 = vec2(0.0, 0.0); // the four corner points\nconst vec2 c01 = vec2(0.0, 1.0);\nconst vec2 c11 = vec2(1.0, 1.0);\nconst vec2 c10 = vec2(1.0, 0.0);\nbool in_corner(vec2 p, vec2 corner, vec2 radius) {\n  vec2 axis = (c11 - corner) - corner;\n  p = p - (corner + axis * radius);\n  p *= axis / radius;\n  return (p.x > 0.0 && p.y > -1.0) || (p.y > 0.0 && p.x > -1.0) || dot(p, p) < 1.0;\n}\nbool test_rounded_mask(vec2 p, vec2 corner_size) {\n  return\n      in_corner(p, c00, corner_size) &&\n      in_corner(p, c01, corner_size) &&\n      in_corner(p, c10, corner_size) &&\n      in_corner(p, c11, corner_size);\n}\nvec4 screen(vec4 a, vec4 b) {\n  return 1.0 - (1.0 - a) * (1.0 -b);\n}\nvec4 unscreen(vec4 c) {\n  return 1.0 - sqrt(1.0 - c);\n}\nvec4 sample_with_corners_from(vec2 p, vec2 corner_size) {\n  p = (p - 0.5) / zoom + 0.5;\n  if (!test_rounded_mask(p, corner_size)) {\n    return black;\n  }\n  return unscreen(getFromColor(p));\n}\nvec4 sample_with_corners_to(vec2 p, vec2 corner_size) {\n  p = (p - 0.5) / zoom + 0.5;\n  if (!test_rounded_mask(p, corner_size)) {\n    return black;\n  }\n  return unscreen(getToColor(p));\n}\nvec4 simple_sample_with_corners_from(vec2 p, vec2 corner_size, float zoom_amt) {\n  p = (p - 0.5) / (1.0 - zoom_amt + zoom * zoom_amt) + 0.5;\n  if (!test_rounded_mask(p, corner_size)) {\n    return black;\n  }\n  return getFromColor(p);\n}\nvec4 simple_sample_with_corners_to(vec2 p, vec2 corner_size, float zoom_amt) {\n  p = (p - 0.5) / (1.0 - zoom_amt + zoom * zoom_amt) + 0.5;\n  if (!test_rounded_mask(p, corner_size)) {\n    return black;\n  }\n  return getToColor(p);\n}\nmat3 rotate2d(float angle, float ratio) {\n  float s = sin(angle);\n  float c = cos(angle);\n  return mat3(\n    c, s ,0.0,\n    -s, c, 0.0,\n    0.0, 0.0, 1.0);\n}\nmat3 translate2d(float x, float y) {\n  return mat3(\n    1.0, 0.0, 0,\n    0.0, 1.0, 0,\n    -x, -y, 1.0);\n}\nmat3 scale2d(float x, float y) {\n  return mat3(\n    x, 0.0, 0,\n    0.0, y, 0,\n    0, 0, 1.0);\n}\nvec4 get_cross_rotated(vec3 p3, float angle, vec2 corner_size, float ratio) {\n  angle = angle * angle; // easing\n  angle /= 2.4; // works out to be a good number of radians\n  mat3 center_and_scale = translate2d(-0.5, -0.5) * scale2d(1.0, ratio);\n  mat3 unscale_and_uncenter = scale2d(1.0, 1.0/ratio) * translate2d(0.5,0.5);\n  mat3 slide_left = translate2d(-2.0,0.0);\n  mat3 slide_right = translate2d(2.0,0.0);\n  mat3 rotate = rotate2d(angle, ratio);\n  mat3 op_a = center_and_scale * slide_right * rotate * slide_left * unscale_and_uncenter;\n  mat3 op_b = center_and_scale * slide_left * rotate * slide_right * unscale_and_uncenter;\n  vec4 a = sample_with_corners_from((op_a * p3).xy, corner_size);\n  vec4 b = sample_with_corners_from((op_b * p3).xy, corner_size);\n  return screen(a, b);\n}\nvec4 get_cross_masked(vec3 p3, float angle, vec2 corner_size, float ratio) {\n  angle = 1.0 - angle;\n  angle = angle * angle; // easing\n  angle /= 2.4;\n  vec4 img;\n  mat3 center_and_scale = translate2d(-0.5, -0.5) * scale2d(1.0, ratio);\n  mat3 unscale_and_uncenter = scale2d(1.0 / zoom, 1.0 / (zoom * ratio)) * translate2d(0.5,0.5);\n  mat3 slide_left = translate2d(-2.0,0.0);\n  mat3 slide_right = translate2d(2.0,0.0);\n  mat3 rotate = rotate2d(angle, ratio);\n  mat3 op_a = center_and_scale * slide_right * rotate * slide_left * unscale_and_uncenter;\n  mat3 op_b = center_and_scale * slide_left * rotate * slide_right * unscale_and_uncenter;\n  bool mask_a = test_rounded_mask((op_a * p3).xy, corner_size);\n  bool mask_b = test_rounded_mask((op_b * p3).xy, corner_size);\n  if (mask_a || mask_b) {\n    img = sample_with_corners_to(p3.xy, corner_size);\n    return screen(mask_a ? img : black, mask_b ? img : black);\n  } else {\n    return black;\n  }\n}\nvec4 transition(vec2 uv) {\n  float a;\n  vec2 p=uv.xy/vec2(1.0).xy;\n  vec3 p3 = vec3(p.xy, 1.0); // for 2D matrix transforms\n  vec2 corner_size = vec2(corner_radius / ratio, corner_radius);\n  if (progress <= 0.0) {\n    return getFromColor(p);\n  } else if (progress < 0.1) {\n    a = progress / 0.1;\n    return  simple_sample_with_corners_from(p, corner_size * a, a);\n  } else if (progress < 0.48) {\n    a = (progress - 0.1)/0.38;\n    return get_cross_rotated(p3, a, corner_size, ratio);\n  } else if (progress < 0.9) {\n    return get_cross_masked(p3, (progress - 0.52)/0.38, corner_size, ratio);\n  } else if (progress < 1.0) {\n    a = (1.0 - progress) / 0.1;\n    return simple_sample_with_corners_to(p, corner_size * a, a);\n  } else {\n    return getToColor(p);\n  }\n}"
},
"StripDatamoshGlitch": {
"p": {
"strength": [
"float",
"1.0"
],
"horizontalBars": [
"float",
"42.0"
],
"verticalSlits": [
"float",
"18.0"
],
"tear": [
"float",
"0.18"
],
"chroma": [
"float",
"0.032"
],
"residue": [
"float",
"0.62"
],
"noiseAmount": [
"float",
"0.16"
],
"scanAmount": [
"float",
"0.13"
],
"flashAmount": [
"float",
"0.20"
]
},
"s": "/*@strength*/\n/*@horizontalBars*/\n/*@verticalSlits*/\n/*@tear*/\n/*@chroma*/\n/*@residue*/\n/*@noiseAmount*/\n/*@scanAmount*/\n/*@flashAmount*/\nconst float PI = 3.141592653589793;\nfloat hash(float n) {\n  return fract(sin(n) * 43758.5453123);\n}\nfloat hash(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\nfloat sat(float v) {\n  return clamp(v, 0.0, 1.0);\n}\nfloat burst() {\n  return pow(max(0.0, sin(progress * PI)), 0.42) * strength;\n}\nvec2 safeUv(vec2 uv) {\n  return clamp(uv, vec2(0.0), vec2(1.0));\n}\nfloat stripeY(vec2 uv, float density, float seed, float minWidth, float maxWidth) {\n  float y = uv.y * density + seed * 0.137;\n  float id = floor(y);\n  float f = fract(y);\n  float c = hash(vec2(id, seed));\n  float w = mix(minWidth, maxWidth, hash(vec2(id + 9.17, seed + 2.31)));\n  return 1.0 - smoothstep(w, w + 0.018, abs(f - c));\n}\nfloat stripeX(vec2 uv, float density, float seed, float minWidth, float maxWidth) {\n  float x = uv.x * density + seed * 0.091;\n  float id = floor(x);\n  float f = fract(x);\n  float c = hash(vec2(id, seed + 41.0));\n  float w = mix(minWidth, maxWidth, hash(vec2(id + 4.7, seed + 8.9)));\n  return 1.0 - smoothstep(w, w + 0.012, abs(f - c));\n}\nfloat brokenGate(vec2 uv, float row, float rnd, float frame) {\n  float segs = mix(1.0, 9.0, hash(vec2(row, frame + 44.0)));\n  float seg = floor(uv.x * segs);\n  return step(0.16, hash(vec2(seg, row + frame * 3.0 + rnd)));\n}\nfloat horizontalMask(vec2 uv, float frame) {\n  float r1 = floor((uv.y + hash(frame) * 0.031) * horizontalBars * 0.38);\n  float r2 = floor((uv.y + hash(frame + 2.0) * 0.013) * horizontalBars);\n  float r3 = floor((uv.y + hash(frame + 7.0) * 0.006) * horizontalBars * 3.4);\n  float thick = stripeY(uv, horizontalBars * 0.38, frame + 1.0, 0.035, 0.22);\n  float mid   = stripeY(uv, horizontalBars,        frame + 4.0, 0.014, 0.11);\n  float hair  = stripeY(uv, horizontalBars * 3.4,  frame + 9.0, 0.004, 0.035);\n  thick *= step(0.42, hash(vec2(r1, frame + 10.0)));\n  mid   *= step(0.48, hash(vec2(r2, frame + 20.0)));\n  hair  *= step(0.62, hash(vec2(r3, frame + 30.0)));\n  thick *= brokenGate(uv, r1, hash(vec2(r1, frame)), frame);\n  mid   *= brokenGate(uv, r2, hash(vec2(r2, frame)), frame + 3.0);\n  return sat(max(thick, max(mid, hair)));\n}\nfloat verticalMask(vec2 uv, float frame) {\n  float col = floor((uv.x + hash(frame + 12.0) * 0.017) * verticalSlits);\n  float slit = stripeX(uv, verticalSlits, frame + 13.0, 0.01, 0.075);\n  slit *= step(0.66, hash(vec2(col, frame + 19.0)));\n  return sat(slit);\n}\nvec4 chromaFrom(vec2 uv, vec2 s) {\n  uv = safeUv(uv);\n  vec4 center = getFromColor(uv);\n  return vec4(\n    getFromColor(safeUv(uv + s)).r,\n    center.g,\n    getFromColor(safeUv(uv - s)).b,\n    center.a\n  );\n}\nvec4 chromaTo(vec2 uv, vec2 s) {\n  uv = safeUv(uv);\n  vec4 center = getToColor(uv);\n  return vec4(\n    getToColor(safeUv(uv - s)).r,\n    center.g,\n    getToColor(safeUv(uv + s)).b,\n    center.a\n  );\n}\nvec2 distortUv(vec2 uv, float dir, float b, float h, float v, float frame) {\n  float row = floor(uv.y * horizontalBars);\n  float col = floor(uv.x * verticalSlits);\n  float rowRnd = hash(vec2(row, frame));\n  float colRnd = hash(vec2(col, frame + 27.0));\n  float xTear = (rowRnd - 0.5) * 2.0 * tear * b * h;\n  xTear += sin(uv.y * 120.0 + progress * 95.0) * 0.006 * b;\n  float yDrag = (colRnd - 0.5) * 0.13 * b * v;\n  float micro = (hash(vec2(row, col + frame)) - 0.5) * 0.018 * b * max(h, v);\n  return uv + vec2(xTear * dir + micro, yDrag);\n}\nvec4 transition(vec2 uv) {\n  if (progress <= 0.0) return getFromColor(uv);\n  if (progress >= 1.0) return getToColor(uv);\n  float b = burst();\n  float frame = floor(progress * 30.0);\n  float h = horizontalMask(uv, frame);\n  float v = verticalMask(uv, frame);\n  float glitch = sat(max(h, v * 0.75));\n  float row = floor(uv.y * horizontalBars);\n  float rowRnd = hash(vec2(row, frame + 5.0));\n  float bandDelay = (rowRnd - 0.5) * 0.30 * h;\n  float reveal = smoothstep(0.18, 0.84, progress + bandDelay);\n  vec2 split = vec2(chroma * b * (1.0 + 1.7 * glitch), chroma * 0.22 * b * v);\n  vec2 fromUv = distortUv(uv,  1.0, b, h, v, frame);\n  vec2 toUv   = distortUv(uv, -1.0, b, h, v, frame);\n  vec4 color = mix(\n    chromaFrom(fromUv, split),\n    chromaTo(toUv, split),\n    reveal\n  );\n  vec2 smearUv = uv;\n  smearUv.x += (rowRnd - 0.5) * 0.46 * b * h;\n  smearUv.y += (hash(vec2(row, frame + 31.0)) - 0.5) * 0.045 * b * h;\n  float sliceReveal = smoothstep(0.28, 0.78, progress + (rowRnd - 0.5) * 0.22);\n  vec4 sliceColor = mix(\n    chromaFrom(smearUv, split * 1.65),\n    chromaTo(smearUv - vec2((rowRnd - 0.5) * 0.18 * b, 0.0), split * 1.65),\n    sliceReveal\n  );\n  color = mix(color, sliceColor, h * b * residue);\n  float hairLine = stripeY(uv, 190.0, frame + 55.0, 0.002, 0.012);\n  hairLine *= step(0.70, hash(vec2(floor(uv.y * 190.0), frame + 56.0)));\n  color.rgb += vec3(0.72, 0.90, 1.0) * hairLine * b * 0.28;\n  float scan = 0.5 + 0.5 * sin(uv.y * 980.0 + progress * 130.0);\n  color.rgb *= 1.0 - scanAmount * b * scan;\n  vec2 nCell = floor(uv * vec2(360.0 * ratio, 210.0));\n  float n = hash(nCell + vec2(frame * 7.0, frame * 13.0));\n  color.rgb += (n - 0.5) * noiseAmount * b * (0.55 + glitch);\n  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));\n  color.rgb = mix(color.rgb, vec3(luma), 0.18 * b * glitch);\n  float strobe = step(0.78, hash(vec2(frame, 3.14))) * pow(b, 1.65);\n  color.rgb += vec3(strobe * flashAmount);\n  return vec4(clamp(color.rgb, vec3(0.0), vec3(1.0)), color.a);\n}"
},
"Swap": {
"p": {
"reflection": [
"float",
"0.4"
],
"perspective": [
"float",
"0.2"
],
"depth": [
"float",
"3.0"
]
},
"s": "/*@reflection*/\n/*@perspective*/\n/*@depth*/\n \nconst vec4 black = vec4(0.0); // where no image is drawn: transparent\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\n \nbool inBounds (vec2 p) {\n  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\n \nvec2 project (vec2 p) {\n  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);\n}\n \nvec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {\n  vec4 c = black;\n  pfr = project(pfr);\n  if (inBounds(pfr)) {\n    c += mix(black, getFromColor(pfr), reflection * mix(1.0, 0.0, pfr.y));\n  }\n  pto = project(pto);\n  if (inBounds(pto)) {\n    c += mix(black, getToColor(pto), reflection * mix(1.0, 0.0, pto.y));\n  }\n  return c;\n}\n \nvec4 transition(vec2 p) {\n  vec2 pfr, pto = vec2(-1.);\n \n  float size = mix(1.0, depth, progress);\n  float persp = perspective * progress;\n  pfr = (p + vec2(-0.0, -0.5)) * vec2(size/(1.0-perspective*progress), size/(1.0-size*persp*p.x)) + vec2(0.0, 0.5);\n \n  size = mix(1.0, depth, 1.-progress);\n  persp = perspective * (1.-progress);\n  pto = (p + vec2(-1.0, -0.5)) * vec2(size/(1.0-perspective*(1.0-progress)), size/(1.0-size*persp*(0.5-p.x))) + vec2(1.0, 0.5);\n  if (progress < 0.5) {\n    if (inBounds(pfr)) {\n      return getFromColor(pfr);\n    }\n    if (inBounds(pto)) {\n      return getToColor(pto);\n    }  \n  }\n  if (inBounds(pto)) {\n    return getToColor(pto);\n  }\n  if (inBounds(pfr)) {\n    return getFromColor(pfr);\n  }\n  return bgColor(p, pfr, pto);\n}"
},
"Swirl": {
"p": {},
"s": "vec4 transition(vec2 UV)\n{\n\tfloat Radius = 1.0;\n\tfloat T = progress;\n\tUV -= vec2( 0.5, 0.5 );\n\tfloat Dist = length(UV);\n\tif ( Dist < Radius )\n\t{\n\t\tfloat Percent = (Radius - Dist) / Radius;\n\t\tfloat A = ( T <= 0.5 ) ? mix( 0.0, 1.0, T/0.5 ) : mix( 1.0, 0.0, (T-0.5)/0.5 );\n\t\tfloat Theta = Percent * Percent * A * 8.0 * 3.14159;\n\t\tfloat S = sin( Theta );\n\t\tfloat C = cos( Theta );\n\t\tUV = vec2( dot(UV, vec2(C, -S)), dot(UV, vec2(S, C)) );\n\t}\n\tUV += vec2( 0.5, 0.5 );\n\tvec4 C0 = getFromColor(UV);\n\tvec4 C1 = getToColor(UV);\n\treturn mix( C0, C1, T );\n}"
},
"TangentMotionBlur": {
"p": {},
"s": "float rand (vec2 co) {\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvec4 motionBlurFrom(vec2 _st, vec2 speed) {\n    vec2 texCoord = _st.xy / vec2(1.0).xy;\n    vec3 color = vec3(0.0);\n    float alpha = 0.0;\n    float total = 0.0;\n    float offset = rand(_st);\n    for (float t = 0.0; t <= 20.0; t++) {\n        float percent = (t + offset) / 20.0;\n        float weight = 4.0 * (percent - percent * percent);\n        vec2 newuv = texCoord + speed * percent;\n        newuv = fract(newuv);\n        vec4 c = getFromColor(newuv);\n        color += c.rgb * c.a * weight;\n        alpha += c.a * weight;\n        total += weight;\n    }\n    return vec4(color / max(alpha, 1e-5), alpha / total);\n}\nvec4 motionBlurTo(vec2 _st, vec2 speed) {\n    vec2 texCoord = _st.xy / vec2(1.0).xy;\n    vec3 color = vec3(0.0);\n    float alpha = 0.0;\n    float total = 0.0;\n    float offset = rand(_st);\n    for (float t = 0.0; t <= 20.0; t++) {\n        float percent = (t + offset) / 20.0;\n        float weight = 4.0 * (percent - percent * percent);\n        vec2 newuv = texCoord + speed * percent;\n        newuv = fract(newuv);\n        vec4 c = getToColor(newuv);\n        color += c.rgb * c.a * weight;\n        alpha += c.a * weight;\n        total += weight;\n    }\n    return vec4(color / max(alpha, 1e-5), alpha / total);\n}\nfloat A(float aA1, float aA2) {\n    return 1.0 - 3.0 * aA2 + 3.0 * aA1;\n}\nfloat B(float aA1, float aA2) {\n    return 3.0 * aA2 - 6.0 * aA1;\n}\nfloat C(float aA1) {\n    return 3.0 * aA1;\n}\nfloat GetSlope(float aT, float aA1, float aA2) {\n    return 3.0 * A(aA1, aA2)*aT*aT + 2.0 * B(aA1, aA2) * aT + C(aA1);\n}\nfloat CalcBezier(float aT, float aA1, float aA2) {\n    return ((A(aA1, aA2)*aT + B(aA1, aA2))*aT + C(aA1))*aT;\n}\nfloat GetTForX(float aX, float mX1, float mX2) {\n    float aGuessT = aX;\n    for (int i = 0; i < 4; ++i) {\n        float currentSlope = GetSlope(aGuessT, mX1, mX2);\n        if (currentSlope == 0.0) return aGuessT;\n        float currentX = CalcBezier(aGuessT, mX1, mX2) - aX;\n        aGuessT -= currentX / currentSlope;\n    }\n    return aGuessT;\n}\nfloat KeySpline(float aX, float mX1, float mY1, float mX2, float mY2) {\n    if (mX1 == mY1 && mX2 == mY2) return aX; // linear\n    return CalcBezier(GetTForX(aX, mX1, mX2), mY1, mY2); // x to t, t to y\n}\nfloat normpdf(float x) {\n    float d = x - .5;\n    return exp(-20.*d*d);\n}\nvec2 rotateUv(vec2 uv, float angle, vec2 anchor, float zDirection) {\n    uv = uv - anchor; // anchor to origin\n    float s = sin(angle);\n\tfloat c = cos(angle);\n\tmat2 m = mat2(c, -s, s, c);\n    uv = m * uv;\n    uv += anchor; // anchor back\n    return uv;\n}\nvec4 transition (vec2 uv) {\n    \n    vec2 myst = uv;\n    float animationTime = progress; //getAnimationTime();\n    float easingTime = KeySpline(animationTime, .68,.01,.17,.98);\n    float blur = normpdf(easingTime);\n    float r = 0.;\n    float rotation = 180./180.*3.14159;\n    if (easingTime <= .5) {\n        r = rotation * easingTime;\n    } else {\n        r = -rotation + rotation * easingTime;\n    }\n    vec2 mystCurrent = myst;\n    mystCurrent.y *= 1./ratio;\n    mystCurrent = rotateUv(mystCurrent, r, vec2(1., 0.), -1.);\n    mystCurrent.y *= ratio;\n    float timeInterval = 0.0167*2.0;\n    if (easingTime <= .5) {\n        r = rotation * (easingTime+timeInterval);\n    } else {\n        r = -rotation + rotation * (easingTime+timeInterval);\n    }\n    vec2 mystNext = myst;\n    mystNext.y *= 1./ratio;\n    mystNext = rotateUv(mystNext, r, vec2(1., 0.), -1.);\n    mystNext.y *= ratio;\n    vec2 speed  = (mystNext - mystCurrent) / timeInterval * blur * 0.5;\n    if (easingTime <= .5) {\n        return motionBlurFrom(mystCurrent, speed);\n    } else {\n        return motionBlurTo(mystCurrent, speed);\n    }\n}"
},
"TilesWave": {
"p": {
"tileCount": [
"ivec2",
"ivec2(8, 8)"
],
"flipX": [
"bool",
"true"
],
"flipY": [
"bool",
"false"
]
},
"s": "/*@tileCount*/\n/*@flipX*/\n/*@flipY*/\nvec4 transition(vec2 uv) {\n  vec2 tileSize = 1.0 / vec2(tileCount);\n  vec2 posInTile = fract(uv * vec2(tileCount));\n  vec2 tileNum = floor(uv * vec2(tileCount));\n  float countTiles = float(tileCount.x * tileCount.y);\n  float offset = (tileNum.y + tileNum.x * float(tileCount.y)) / countTiles;\n  float timeOffset = clamp((progress - offset) * countTiles, 0.0, 0.5);\n  float sinTime = 1.0 - abs(cos(fract(timeOffset) * 3.1415926));\n  vec2 texC = posInTile;\n  if (sinTime <= 0.5) {\n    if (flipX) {\n      if (texC.x < sinTime || texC.x > 1.0 - sinTime)\n        return getFromColor(uv);\n      texC.x = texC.x < 0.5\n        ? (texC.x - sinTime) * 0.5 / (0.5 - sinTime)\n        : (texC.x - 0.5) * 0.5 / (0.5 - sinTime) + 0.5;\n    }\n    if (flipY) {\n      if (texC.y < sinTime || texC.y > 1.0 - sinTime)\n        return getFromColor(uv);\n      texC.y = texC.y < 0.5\n        ? (texC.y - sinTime) * 0.5 / (0.5 - sinTime)\n        : (texC.y - 0.5) * 0.5 / (0.5 - sinTime) + 0.5;\n    }\n    vec2 globalUV = tileNum * tileSize + texC * tileSize;\n    return getFromColor(globalUV);\n  } else {\n    if (flipX) {\n      if (texC.x > sinTime || texC.x < 1.0 - sinTime)\n        return getToColor(uv);\n      texC.x = texC.x < 0.5\n        ? (texC.x - sinTime) * 0.5 / (0.5 - sinTime)\n        : (texC.x - 0.5) * 0.5 / (0.5 - sinTime) + 0.5;\n      texC.x = 1.0 - texC.x;\n    }\n    if (flipY) {\n      if (texC.y > sinTime || texC.y < 1.0 - sinTime)\n        return getToColor(uv);\n      texC.y = texC.y < 0.5\n        ? (texC.y - sinTime) * 0.5 / (0.5 - sinTime)\n        : (texC.y - 0.5) * 0.5 / (0.5 - sinTime) + 0.5;\n      texC.y = 1.0 - texC.y;\n    }\n    vec2 globalUV = tileNum * tileSize + texC * tileSize;\n    return getToColor(globalUV);\n  }\n}"
},
"TopBottom": {
"p": {},
"s": "const vec4 black = vec4(0.0); // where no image is drawn: transparent\nconst vec2 boundMin = vec2(0.0, 0.0);\nconst vec2 boundMax = vec2(1.0, 1.0);\nbool inBounds (vec2 p) {\n    return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));\n}\nvec4 transition (vec2 uv) {\n    vec2 spfr,spto = vec2(-1.);\n    float size = mix(1.0, 3.0, progress*0.2);\n    spto = (uv + vec2(-0.5,-0.5))*vec2(size,size)+vec2(0.5,0.5);\n    spfr = (uv + vec2(0.0, 1.0 - progress));\n    if(inBounds(spfr)){\n        return getToColor(spfr);\n    } else if(inBounds(spto)){\n        return getFromColor(spto) * (1.0 - progress);\n    } else{\n        return black;\n    }\n}"
},
"Tunnel": {
"p": {
"speed": [
"float",
"6.0"
],
"twist": [
"float",
"0.5"
]
},
"s": "/*@speed*/\n/*@twist*/\nvec2 rotate(vec2 v, float a) {\n  float c = cos(a);\n  float s = sin(a);\n  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);\n}\nvec4 transition(vec2 uv) {\n  vec2 aspect = vec2(ratio, 1.0);\n  vec2 c = (uv - 0.5) * aspect;\n  float r = length(c);\n  float R = length(0.5 * aspect);\n  float far = 1.0 + speed;\n  float e = mix(progress, progress * progress * (3.0 - 2.0 * progress), 0.7);\n  float d = pow(far, 1.0 - e);\n  float t = far - d; // distance flown\n  float k = r * d < R ? d / far : R / (R + t * r); // image scale at that point\n  float a = twist * min(t * r / R, t / d); // spiral, continuous at the end wall\n  vec4 walls = getFromColor(0.5 + rotate(c * k, a) / aspect);\n  walls.rgb *= 0.4 + 0.6 * sqrt(k); // darker where the walls are close\n  float open = smoothstep(0.0, 0.6, progress);\n  vec2 q = 0.5 + (uv - 0.5) * d / max(open, 1e-4);\n  vec2 inside = step(0.0, q) * step(q, vec2(1.0));\n  return mix(walls, getToColor(q), inside.x * inside.y * step(r * d, R));\n}"
},
"TvLostSignal": {
"p": {},
"s": "float hash(vec2 p) {\n    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n}\nvec4 transition(vec2 uv) {\n    float p = progress;\n    float strength = sin(p * 3.14159265);\n    vec2 tv = uv;\n    vec4 fromColor = getFromColor(tv);\n    vec4 toColor   = getToColor(tv);\n    vec4 color = mix(fromColor, toColor, p);\n    float lineY = floor(tv.y * 120.0);\n    float noise = hash(vec2(lineY, p * 20.0));\n    float line = step(0.92, noise);\n    float drift =\n        sin(tv.y * 30.0 + p * 10.0)\n        * 0.02\n        * strength;\n    vec4 shiftedFrom = getFromColor(tv + vec2(drift, 0.0));\n    vec4 shiftedTo   = getToColor(tv + vec2(drift, 0.0));\n    vec4 lineColor = mix(shiftedFrom, shiftedTo, p);\n    color = mix(color, lineColor, line * strength);\n    float scan =\n        sin(tv.y * 900.0) * 0.03;\n    color.rgb -= scan * strength;\n    return color;\n}"
},
"TvRoll": {
"p": {
"rolls": [
"int",
"3"
],
"barHeight": [
"float",
"0.12"
],
"barColor": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
]
},
"s": "/*@rolls*/\n/*@barHeight*/\n/*@barColor*/\nvec4 picture(vec2 uv, float y, float m) {\n  float period = 1.0 + barHeight;\n  y = mod(y, period);\n  if (y > 1.0) return barColor;\n  vec2 q = vec2(uv.x, y);\n  return mix(getFromColor(q), getToColor(q), m);\n}\nvec4 transition(vec2 uv) {\n  float period = 1.0 + barHeight;\n  float s = progress * progress * (3.0 - 2.0 * progress);\n  float offset = period * fract(float(rolls) * s);\n  float speed = 4.0 * progress * (1.0 - progress); // 0 at both ends, 1 in the middle\n  float m = smoothstep(0.42, 0.58, progress); // the channel changes at full speed\n  vec2 p = uv + vec2(0.004 * speed * sin(uv.y * 9.0 + progress * 30.0), 0.0);\n  vec4 c = vec4(0.0);\n  for (int i = 0; i < 5; i++) {\n    c += picture(p, p.y + offset - 0.0015 * float(rolls) * speed * float(i), m);\n  }\n  c /= 5.0;\n  float scan = 0.5 + 0.5 * sin(uv.y * 400.0);\n  float flicker = 0.08 * (0.5 + 0.5 * sin(progress * 97.0));\n  c.rgb *= 1.0 - speed * (0.08 * scan + flicker);\n  return c;\n}"
},
"TvStatic": {
"p": {
"offset": [
"float",
"0.05"
]
},
"s": "/*@offset*/\nhighp float noise(vec2 co)\n{\n    highp float a = 12.9898;\n    highp float b = 78.233;\n    highp float c = 43758.5453;\n    highp float dt= dot(co.xy * progress, vec2(a, b));\n    highp float sn= mod(dt,3.14);\n    return fract(sin(sn) * c);\n}\nvec4 transition(vec2 p) {\n  if (progress < offset) {\n    return getFromColor(p);\n  } else if (progress > (1.0 - offset)) {\n    return getToColor(p);\n  } else {\n    return vec4(vec3(noise(p)), max(getFromColor(p).a, getToColor(p).a)); // static where the images are\n  }\n}"
},
"TvTurnOff": {
"p": {
"color": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
],
"glow": [
"float",
"1.0"
]
},
"s": "/*@color*/\n/*@glow*/\nvec4 getColor(vec2 uv, bool isFrom) {\n  return isFrom ? getFromColor(uv) : getToColor(uv);\n}\nvec4 screen(vec2 uv, float t, bool isFrom) {\n  float collapse = smoothstep(0.0, 0.4, t); // the image squeezes into a line\n  float shrink = smoothstep(0.3, 0.65, t); // the line shrinks into a dot\n  float fade = 0.4 * smoothstep(0.75, 1.0, t); // the dot dims\n  float radius = 0.01 * (1.0 - fade);\n  vec2 size = vec2(mix(0.5 * ratio, radius, shrink), mix(0.5, radius, collapse));\n  vec2 p = (uv - 0.5) * vec2(ratio, 1.0);\n  vec2 q = clamp(0.5 + 0.5 * p / size, 0.0, 1.0);\n  vec4 c = getColor(q, isFrom);\n  float white = smoothstep(0.4, 1.0, collapse);\n  vec4 light = vec4(mix(min(c.rgb * (1.0 + 2.0 * collapse), 1.0), vec3(1.0), white), c.a);\n  vec2 d = abs(p) - size;\n  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\n  float inside = clamp(1.0 - dist / 0.004, 0.0, 1.0);\n  vec4 mid = getColor(vec2(0.5), isFrom);\n  vec4 halo = vec4(mix(mix(mid.rgb, vec3(1.0), 0.7), vec3(1.0, 0.92, 0.8), shrink), mid.a);\n  float h = 1.0 - exp(-2.0 * glow * white * exp(-max(dist, 0.0) / (0.02 + 0.04 * shrink)));\n  vec4 col = mix(color, halo, h * (1.0 - fade));\n  return mix(col, light, inside * (1.0 - fade));\n}\nvec4 transition(vec2 uv) {\n  if (progress < 0.5) {\n    return screen(uv, 2.0 * progress, true);\n  }\n  return screen(uv, 2.0 - 2.0 * progress, false);\n}"
},
"UndulatingBurnOut": {
"p": {
"smoothness": [
"float",
"0.03"
],
"center": [
"vec2",
"vec2(0.5)"
],
"color": [
"vec4",
"vec4(0.0, 0.0, 0.0, 1.0)"
]
},
"s": "/*@smoothness*/\n/*@center*/\n/*@color*/\nconst float M_PI = 3.14159265358979323846;\nfloat quadraticInOut(float t) {\n  float p = 2.0 * t * t;\n  return t < 0.5 ? p : -p + (4.0 * t) - 1.0;\n}\nfloat getGradient(float r, float dist) {\n  float d = r - dist;\n  return mix(\n    smoothstep(-smoothness, 0.0, r - dist * (1.0 + smoothness)),\n    -1.0 - step(0.005, d),\n    step(-0.005, d) * step(d, 0.01)\n  );\n}\nfloat getWave(vec2 p){\n  vec2 _p = p - center; // offset from center\n  float rads = atan(_p.y, _p.x);\n  float degs = degrees(rads) + 180.0;\n  vec2 range = vec2(0.0, M_PI * 30.0);\n  vec2 domain = vec2(0.0, 360.0);\n  float ratio = (M_PI * 30.0) / 360.0;\n  degs = degs * ratio;\n  float x = progress;\n  float magnitude = mix(0.02, 0.09, smoothstep(0.0, 1.0, x));\n  float offset = mix(40.0, 30.0, smoothstep(0.0, 1.0, x));\n  float ease_degs = quadraticInOut(sin(degs));\n  float deg_wave_pos = (ease_degs * magnitude) * sin(x * offset);\n  return x - max(smoothness, 0.01) * (1.0 - smoothstep(0.0, 0.1, x)) + deg_wave_pos;\n}\nvec4 transition(vec2 p) {\n  float dist = distance(center, p);\n  float m = getGradient(getWave(p), dist);\n  vec4 cfrom = getFromColor(p);\n  vec4 cto = getToColor(p);\n  return mix(mix(cfrom, cto, m), mix(cfrom, color, 0.75), step(m, -2.0));\n}"
},
"VerticalClose": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  float s = 2.0 - abs((uv.x - 0.5) / (progress - 1.0)) - 2.0 * progress;\n  \n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    smoothstep(0.5, 0.0, s)\n  );\n}"
},
"VerticalOpen": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  float regress = 1.0 - progress;\n  float s = 2.0 - abs((uv.x - 0.5) / (regress - 1.0)) - 2.0 * regress;\n  \n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    smoothstep(0.0, 0.5, s)\n  );\n}"
},
"WaterDrop": {
"p": {
"amplitude": [
"float",
"30.0"
],
"speed": [
"float",
"30.0"
]
},
"s": "/*@amplitude*/\n/*@speed*/\nvec4 transition(vec2 p) {\n  vec2 dir = p - vec2(.5);\n  float dist = length(dir);\n  if (dist > progress) {\n    return mix(getFromColor( p), getToColor( p), progress);\n  } else {\n    vec2 offset = dir * sin(dist * amplitude - progress * speed);\n    return mix(getFromColor( p + offset), getToColor( p), progress);\n  }\n}"
},
"WhipPan": {
"p": {
"direction": [
"vec2",
"vec2(-1.0, 0.0)"
],
"blur": [
"float",
"0.4"
]
},
"s": "/*@direction*/\n/*@blur*/\nconst int SAMPLES = 24;\nvec4 strip(vec2 q, vec2 d) {\n  vec2 qt = q + d;\n  if (dot(q - 0.5, -d) < 0.5 * dot(d, d)) {\n    return getFromColor(clamp(q, 0.0, 1.0));\n  }\n  return getToColor(clamp(qt, 0.0, 1.0));\n}\nfloat rand(vec2 co) {\n  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);\n}\nvec4 transition(vec2 uv) {\n  vec2 d = sign(direction);\n  float p = progress;\n  float h = 1.0 - abs(2.0 * p - 1.0); // 0 at both ends, 1 in the middle\n  float e = 0.5 * h * (0.1 + 0.9 * h * h);\n  float pos = p < 0.5 ? e : 1.0 - e;\n  float len = blur * h * (0.1 + 2.7 * h * h) / 2.8; // follows the speed\n  vec2 q = uv - d * pos;\n  float jitter = rand(uv);\n  vec3 color = vec3(0.0);\n  float alpha = 0.0;\n  for (int i = 0; i < SAMPLES; i++) {\n    float t = (float(i) + jitter) / float(SAMPLES) - 0.5;\n    vec4 c = strip(q + d * t * len, d);\n    color += c.rgb * c.a;\n    alpha += c.a;\n  }\n  return vec4(color / max(alpha, 1e-5), alpha / float(SAMPLES));\n}"
},
"WhipSpin": {
"p": {
"turns": [
"float",
"1.0"
],
"blur": [
"float",
"0.5"
],
"chroma": [
"float",
"0.6"
],
"zoom": [
"float",
"0.25"
]
},
"s": "/*@turns*/\n/*@blur*/\n/*@chroma*/\n/*@zoom*/\nconst float PI = 3.141592653589793;\nconst int SAMPLES = 24;\nfloat hash(vec2 p) {\n  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));\n  p3 += dot(p3, p3.yzx + 33.33);\n  return fract((p3.x + p3.y) * p3.z);\n}\nvec2 mirror(vec2 v) {\n  vec2 m = mod(v, 2.0);\n  return mix(m, 2.0 - m, step(1.0, m));\n}\nfloat rollAngle(float t) {\n  float halfTurn = PI * turns;\n  if (t < 0.5) {\n    float x = 2.0 * t;\n    return halfTurn * x * x * x;\n  }\n  float x = 2.0 - 2.0 * t;\n  return -halfTurn * x * x * x;\n}\nvec4 transition(vec2 uv) {\n  float p = progress;\n  float h = 1.0 - abs(2.0 * p - 1.0); // 0 at both ends, 1 at the cut\n  float shutter = blur * 0.1 * h;\n  float scale = 1.0 + zoom * h * h * h;\n  vec2 q = (uv - 0.5) * vec2(ratio, 1.0);\n  float jitter = hash(uv * vec2(ratio, 1.0) * 731.0);\n  vec3 color = vec3(0.0);\n  vec3 weight = vec3(0.0);\n  float alpha = 0.0;\n  for (int i = 0; i < SAMPLES; i++) {\n    float s = (float(i) + jitter) / float(SAMPLES) - 0.5;\n    float t = clamp(p + s * shutter, 0.0, 1.0);\n    float a = rollAngle(t);\n    float c = cos(a), sn = sin(a);\n    vec2 r = vec2(c * q.x + sn * q.y, -sn * q.x + c * q.y) / scale;\n    vec2 suv = mirror(r / vec2(ratio, 1.0) + 0.5);\n    vec4 col = t < 0.5 ? getFromColor(suv) : getToColor(suv);\n    vec3 w = max(vec3(1.0 - 4.0 * chroma * s, 1.0, 1.0 + 4.0 * chroma * s), 0.0);\n    color += col.rgb * col.a * w;\n    weight += col.a * w;\n    alpha += col.a;\n  }\n  return vec4(color / max(weight, vec3(1e-5)), alpha / float(SAMPLES));\n}"
},
"WhipTilt": {
"p": {
"down": [
"bool",
"false"
],
"blur": [
"float",
"0.5"
],
"chroma": [
"float",
"0.5"
],
"perspective": [
"float",
"0.7"
]
},
"s": "/*@down*/\n/*@blur*/\n/*@chroma*/\n/*@perspective*/\nconst float PI = 3.141592653589793;\nconst int SAMPLES = 24;\nfloat hash(vec2 p) {\n  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));\n  p3 += dot(p3, p3.yzx + 33.33);\n  return fract((p3.x + p3.y) * p3.z);\n}\nvec2 mirror(vec2 v) {\n  vec2 m = mod(v, 2.0);\n  return mix(m, 2.0 - m, step(1.0, m));\n}\nfloat tilt(float t) {\n  float h = 1.0 - abs(2.0 * t - 1.0);\n  float e = 0.5 * h * h * h * h;\n  return t < 0.5 ? e : 1.0 - e;\n}\nvec4 transition(vec2 uv) {\n  float p = progress;\n  float h = 1.0 - abs(2.0 * p - 1.0); // 0 at both ends, 1 in the middle\n  float shutter = blur * 0.25 * h * h;\n  float halfFov = mix(15.0, 45.0, perspective) * PI / 180.0;\n  float dist = 0.5 / tan(halfFov);\n  vec2 q = (uv - 0.5) * vec2(ratio, 1.0);\n  if (down) q.y = -q.y;\n  float jitter = hash(uv * vec2(ratio, 1.0) * 731.0);\n  vec3 color = vec3(0.0);\n  vec3 weight = vec3(0.0);\n  float alpha = 0.0;\n  for (int i = 0; i < SAMPLES; i++) {\n    float s = (float(i) + jitter) / float(SAMPLES) - 0.5;\n    float t = clamp(p + s * shutter, 0.0, 1.0);\n    float a = 2.0 * halfFov * tilt(t);\n    vec2 r = q * cos(halfFov) / cos(halfFov - a);\n    float c0 = cos(a), s0 = sin(a);\n    vec2 d0 = vec2(r.y * c0 + dist * s0, dist * c0 - r.y * s0);\n    float b = a - 2.0 * halfFov;\n    float c1 = cos(b), s1 = sin(b);\n    vec2 d1 = vec2(r.y * c1 + dist * s1, dist * c1 - r.y * s1);\n    bool incoming = d1.y > d0.y;\n    vec2 d = incoming ? d1 : d0;\n    vec2 hit = dist / d.y * vec2(r.x, d.x);\n    if (down) hit.y = -hit.y;\n    vec2 suv = mirror(hit / vec2(ratio, 1.0) + 0.5);\n    vec4 col = incoming ? getToColor(suv) : getFromColor(suv);\n    vec3 w = max(vec3(1.0 - 4.0 * chroma * s, 1.0, 1.0 + 4.0 * chroma * s), 0.0);\n    color += col.rgb * col.a * w;\n    weight += col.a * w;\n    alpha += col.a;\n  }\n  return vec4(color / max(weight, vec3(1e-5)), alpha / float(SAMPLES));\n}"
},
"Wind": {
"p": {
"size": [
"float",
"0.2"
],
"reversed": [
"bool",
"false"
]
},
"s": "/*@size*/\n/*@reversed*/\nfloat rand (vec2 co) {\n  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n}\nvec4 transition (vec2 uv) {\n  float x = reversed ? 1. - uv.x : uv.x;\n  float r = rand(vec2(0, uv.y));\n  float m = smoothstep(0.0, -size, x*(1.0-size) + size*r - (progress * (1.0 + size)));\n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    m\n  );\n}"
},
"WindowBlinds": {
"p": {},
"s": "vec4 transition (vec2 uv) {\n  float t = progress;\n  \n  if (mod(floor(uv.y*100.*progress),2.)==0.)\n    t*=2.-.5;\n  \n  return mix(\n    getFromColor(uv),\n    getToColor(uv),\n    mix(t, progress, smoothstep(0.8, 1.0, progress))\n  );\n}"
},
"WindowSlices": {
"p": {
"count": [
"float",
"10.0"
],
"smoothness": [
"float",
"0.5"
]
},
"s": "/*@count*/\n/*@smoothness*/\nvec4 transition (vec2 p) {\n  float pr = smoothstep(-smoothness, 0.0, p.x - progress * (1.0 + smoothness));\n  float s = step(pr, fract(count * p.x));\n  return mix(getFromColor(p), getToColor(p), s);\n}"
},
"WipeDown": {
"p": {},
"s": "vec4 transition(vec2 uv) {\n  vec2 p=uv.xy/vec2(1.0).xy;\n  vec4 a=getFromColor(p);\n  vec4 b=getToColor(p);\n  return mix(a, b, step(1.0-p.y,progress));\n}"
},
"WipeLeft": {
"p": {},
"s": "vec4 transition(vec2 uv) {\n  vec2 p=uv.xy/vec2(1.0).xy;\n  vec4 a=getFromColor(p);\n  vec4 b=getToColor(p);\n  return mix(a, b, step(1.0-p.x,progress));\n}"
},
"WipeRight": {
"p": {},
"s": "vec4 transition(vec2 uv) {\n  vec2 p=uv.xy/vec2(1.0).xy;\n  vec4 a=getFromColor(p);\n  vec4 b=getToColor(p);\n  return mix(a, b, step(0.0+p.x,progress));\n}"
},
"WipeUp": {
"p": {},
"s": "vec4 transition(vec2 uv) {\n  vec2 p=uv.xy/vec2(1.0).xy;\n  vec4 a=getFromColor(p);\n  vec4 b=getToColor(p);\n  return mix(a, b, step(0.0+p.y,progress));\n}"
},
"ZoomInCircles": {
"p": {},
"s": "vec2 zoom(vec2 uv, float amount) {\n  return 0.5 + ((uv - 0.5) * amount);\t\n}\nvec4 transition(vec2 uv) {\n  vec2 ratio2 = vec2(1.0, 1.0 / ratio);\n  vec2 r = 2.0 * ((vec2(uv.xy) - 0.5) * ratio2);\n  float pro = progress / 0.8;\n  float z = pro * 0.2;\n  float t = 0.0;\n  if (pro > 1.0) {\n    z = 0.2 + (pro - 1.0) * 5.;\n    t = clamp((progress - 0.8) / 0.07, 0.0, 1.0);\n  }\n  if (length(r) < 0.5+z) {\n  }\n  else if (length(r) < 0.8+z*1.5) {\n    uv = zoom(uv, 1.0 - 0.15 * pro);\n    t = t * 0.5;\n  }\n  else if (length(r) < 1.2+z*2.5) {\n    uv = zoom(uv, 1.0 - 0.2 * pro);\n    t = t * 0.2;\n  }\n  else {\n    uv = zoom(uv, 1.0 - 0.25 * pro);\n  }\n  return mix(getFromColor(uv), getToColor(uv), t);\n}"
},
"ZoomInOut": {
"p": {},
"s": "vec2 zoom(vec2 uv, float amount) {\n  return 0.5 + ((uv - 0.5) * (1.0 - amount));\n}\nvec4 transition (vec2 uv) {\n  float zoomFrom = smoothstep(0.0, 1.0, progress * 2.0);\n  float zoomTo = smoothstep(0.0, 1.0, (1.0 - progress) * 2.0);\n  float crossfade = smoothstep(0.4, 0.6, progress);\n  return mix(\n    getFromColor(zoom(uv, zoomFrom)),\n    getToColor(zoom(uv, zoomTo)),\n    crossfade\n  );\n}"
},
"ZoomWipeLeft": {
"p": {
"zoom_quickness": [
"float",
"0.8"
]
},
"s": "/*@zoom_quickness*/\nvec2 zoom(vec2 uv, float amount) {\n  if(amount<0.5)\n  return 0.5 + ((uv - 0.5) * (1.0-amount));\n  else\n  return 0.5 + ((uv - 0.5) * (amount));\n  \n}\nvec4 transition (vec2 uv) {\n  float nQuick = clamp(zoom_quickness,0.0,0.5);\n  if(progress<0.5){\n    vec4 c= mix(\n      getFromColor(zoom(uv, smoothstep(0.0, nQuick, progress))),\n      getToColor(uv),\n     step(0.5, progress)\n    );\n    \n    return c;\n  }\n  else{\n    vec2 p=uv.xy/vec2(1.0).xy;\n    vec4 d=getFromColor(p);\n    vec4 e=getToColor(p);\n    vec4 f= mix(d, e, step(1.0-p.x,(progress-0.5)*2.0));\n    \n    return f;\n  }\n}"
},
"ZoomWipeRight": {
"p": {
"zoom_quickness": [
"float",
"0.8"
]
},
"s": "/*@zoom_quickness*/\nvec2 zoom(vec2 uv, float amount) {\n  if(amount<0.5)\n  return 0.5 + ((uv - 0.5) * (1.0-amount));\n  else\n  return 0.5 + ((uv - 0.5) * (amount));\n  \n}\nvec4 transition (vec2 uv) {\n  float nQuick = clamp(zoom_quickness,0.0,0.5);\n  if(progress<0.5){\n    vec4 c= mix(\n      getFromColor(zoom(uv, smoothstep(0.0, nQuick, progress))),\n      getToColor(uv),\n     step(0.5, progress)\n    );\n    \n    return c;\n  }\n  else{\n    vec2 p=uv.xy/vec2(1.0).xy;\n    vec4 d=getFromColor(p);\n    vec4 e=getToColor(p);\n    vec4 f= mix(d, e, step(0.0+p.x,(progress-0.5)*2.0));\n    \n    return f;\n  }\n}"
}
};
