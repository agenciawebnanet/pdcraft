import * as THREE from 'three';
import {
  CadParameter,
  DesignDocument,
  EvaluatedBody,
  EvaluatedDocument,
  EvaluatedMeshPart,
  SketchData,
  SketchEntity,
} from './types';
import { getMaterialSpec } from '../theme/tokens';

/**
 * Evaluates a parametric expression (e.g., "thickness + 14 mm", "bolts", "pcd / 2", "60 deg")
 */
export function evaluateExpression(
  expr: string | number | undefined,
  vars: Record<string, number>,
  fallback = 0
): number {
  if (typeof expr === 'number') {
    return Number.isFinite(expr) ? expr : fallback;
  }
  if (!expr || typeof expr !== 'string') return fallback;

  let cleaned = expr.trim();
  if (!cleaned) return fallback;

  // Handle unit suffixes
  let unitFactor = 1;
  if (/\bmm$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bmm$/i, '').trim();
    unitFactor = 1;
  } else if (/\bcm$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bcm$/i, '').trim();
    unitFactor = 10;
  } else if (/\bm$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bm$/i, '').trim();
    unitFactor = 1000;
  } else if (/\bin$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bin$/i, '').trim();
    unitFactor = 25.4;
  } else if (/\bdeg$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\bdeg$/i, '').trim();
    unitFactor = 1;
  }

  // Replace inline unit strings like "14 mm" inside expressions
  cleaned = cleaned
    .replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, '$1')
    .replace(/(\d+(?:\.\d+)?)\s*cm\b/gi, '($1*10)')
    .replace(/(\d+(?:\.\d+)?)\s*in\b/gi, '($1*25.4)')
    .replace(/(\d+(?:\.\d+)?)\s*deg\b/gi, '$1');

  // Substitute variable names longest-first
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    cleaned = cleaned.replace(regex, String(vars[key]));
  }

  // Support basic math functions
  cleaned = cleaned
    .replace(/\bpi\b/gi, String(Math.PI))
    .replace(/\bsin\(/gi, 'Math.sin(')
    .replace(/\bcos\(/gi, 'Math.cos(')
    .replace(/\btan\(/gi, 'Math.tan(')
    .replace(/\bsqrt\(/gi, 'Math.sqrt(')
    .replace(/\babs\(/gi, 'Math.abs(')
    .replace(/\bmin\(/gi, 'Math.min(')
    .replace(/\bmax\(/gi, 'Math.max(');

  // Strict sanitization: only allow digits, operators, parens, dot, whitespace, and Math.*
  const safeTest = cleaned.replace(/Math\.(sin|cos|tan|sqrt|abs|min|max)/g, '');
  if (/[^0-9+\-*/().,\s]/.test(safeTest)) {
    const parsed = parseFloat(expr);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${cleaned});`);
    const result = Number(fn());
    return Number.isFinite(result) ? result * unitFactor : fallback;
  } catch {
    return fallback;
  }
}

export function resolveParameters(params: CadParameter[]): Record<string, number> {
  const vars: Record<string, number> = {};
  // Multiple passes for chained expressions
  for (let pass = 0; pass < 3; pass++) {
    for (const p of params) {
      vars[p.name] = evaluateExpression(p.expression, vars, 0);
    }
  }
  return vars;
}

function rectContour(x0: number, y0: number, x1: number, y1: number, filletR = 0): [number, number][] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const w = maxX - minX;
  const h = maxY - minY;
  const r = Math.min(filletR, w * 0.45, h * 0.45);
  if (r <= 0.05) {
    return [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ];
  }
  const pts: [number, number][] = [];
  const segs = 6;
  const corners: [number, number, number][] = [
    [maxX - r, minY + r, -Math.PI / 2],
    [maxX - r, maxY - r, 0],
    [minX + r, maxY - r, Math.PI / 2],
    [minX + r, minY + r, Math.PI],
  ];
  for (const [cx, cy, startA] of corners) {
    for (let i = 0; i <= segs; i++) {
      const a = startA + (i / segs) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

function circleContour(cx: number, cy: number, radius: number, segments = 40): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return pts;
}

function slotContour(cx: number, cy: number, length: number, width: number, segments = 12): [number, number][] {
  const r = width / 2;
  const halfStraight = Math.max(0, (length - width) / 2);
  const pts: [number, number][] = [];
  // Right semicircle
  for (let i = 0; i <= segments; i++) {
    const a = -Math.PI / 2 + (i / segments) * Math.PI;
    pts.push([cx + halfStraight + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  // Left semicircle
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI / 2 + (i / segments) * Math.PI;
    pts.push([cx - halfStraight + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function polygonContour(cx: number, cy: number, radius: number, sides = 6): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return pts;
}

export function entityToContour(
  entity: SketchEntity,
  vars: Record<string, number>,
  filletRadius = 0
): [number, number][] | null {
  if (entity.construction) return null;
  if (entity.kind === 'rectangle' && entity.p0 && entity.p1) {
    return rectContour(entity.p0[0], entity.p0[1], entity.p1[0], entity.p1[1], filletRadius);
  }
  if (entity.kind === 'circle' && entity.center) {
    const d = evaluateExpression(entity.diameterExpr ?? '20', vars, 20);
    return circleContour(entity.center[0], entity.center[1], Math.max(0.5, d / 2));
  }
  if (entity.kind === 'slot' && entity.center) {
    const len = evaluateExpression(entity.lengthExpr ?? '20', vars, 20);
    const w = evaluateExpression(entity.widthExpr ?? '6', vars, 6);
    return slotContour(entity.center[0], entity.center[1], len, w);
  }
  if (entity.kind === 'polygon' && entity.center) {
    const r = evaluateExpression(entity.radiusExpr ?? '15', vars, 15);
    return polygonContour(entity.center[0], entity.center[1], r, entity.sides ?? 6);
  }
  if (entity.kind === 'line' && entity.points && entity.points.length >= 3 && entity.closed) {
    return entity.points;
  }
  return null;
}

/**
 * Builds a Three.js BufferGeometry from a single EvaluatedMeshPart.
 * Coordinates in CAD doc are Z-up (XY is ground/top plane, Z is height),
 * mapped into Three.js Y-up: CAD (x, y, z) -> Three (x, z, -y) so XY plane sits flat on XZ!
 */
export function buildPartGeometry(part: EvaluatedMeshPart): THREE.BufferGeometry {
  let geom: THREE.BufferGeometry;

  if (part.kind === 'extrude' && part.outer && part.outer.length >= 3) {
    const shape = new THREE.Shape();
    shape.moveTo(part.outer[0][0], part.outer[0][1]);
    for (let i = 1; i < part.outer.length; i++) {
      shape.lineTo(part.outer[i][0], part.outer[i][1]);
    }
    shape.closePath();

    if (part.holes) {
      for (const holePts of part.holes) {
        if (holePts.length >= 3) {
          const path = new THREE.Path();
          path.moveTo(holePts[0][0], holePts[0][1]);
          for (let i = 1; i < holePts.length; i++) {
            path.lineTo(holePts[i][0], holePts[i][1]);
          }
          path.closePath();
          shape.holes.push(path);
        }
      }
    }

    const depth = Math.max(0.2, part.depth ?? 10);
    const bevel = Math.min(part.bevelSize ?? 0, depth * 0.35);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: bevel > 0 ? Math.max(0.1, depth - bevel * 2) : depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: part.bevelThickness ?? bevel,
      bevelSegments: 3,
      curveSegments: 32,
    };
    geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    if (bevel > 0) {
      geom.translate(0, 0, bevel);
    }
    // ExtrudeGeometry extrudes along +Z from XY plane. Rotate -90° around X so CAD Z becomes Three +Y, CAD Y becomes -Three Z!
    geom.rotateX(-Math.PI / 2);
  } else if (part.kind === 'box' && part.boxSize) {
    const [lx, wy, hz] = part.boxSize;
    geom = new THREE.BoxGeometry(Math.max(0.2, lx), Math.max(0.2, hz), Math.max(0.2, wy));
  } else if (part.kind === 'cylinder') {
    const rt = part.radiusTop ?? 10;
    const rb = part.radiusBottom ?? 10;
    const h = Math.max(0.2, part.height ?? 10);
    geom = new THREE.CylinderGeometry(rt, rb, h, part.radialSegments ?? 40);
  } else if (part.kind === 'sphere') {
    const r = Math.max(0.5, part.radius ?? 15);
    geom = new THREE.SphereGeometry(r, 36, 24);
  } else if (part.kind === 'lathe' && part.lathePoints) {
    const pts = part.lathePoints.map(([r, y]) => new THREE.Vector2(r, y));
    const angle = ((part.latheAngleDeg ?? 360) * Math.PI) / 180;
    geom = new THREE.LatheGeometry(pts, 48, 0, angle);
  } else if (part.kind === 'raw' && part.positions) {
    geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
    geom.computeVertexNormals();
  } else {
    geom = new THREE.BoxGeometry(10, 10, 10);
  }

  // Apply part local transform (converted from CAD Z-up to Three Y-up)
  const [cx, cy, cz] = part.transform.position;
  const [rx, ry, rz] = part.transform.rotationDeg;
  const mat = new THREE.Matrix4();
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(rx),
    THREE.MathUtils.degToRad(rz),
    THREE.MathUtils.degToRad(-ry),
    'YXZ'
  );
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const scale = part.transform.scale
    ? new THREE.Vector3(part.transform.scale[0], part.transform.scale[2], part.transform.scale[1])
    : new THREE.Vector3(1, 1, 1);
  // CAD (cx, cy, cz) -> Three (cx, cz, -cy)
  mat.compose(new THREE.Vector3(cx, cz, -cy), quat, scale);
  geom.applyMatrix4(mat);
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}

function computeMeshMassProps(geoms: THREE.BufferGeometry[]): {
  volumeMm3: number;
  surfaceAreaMm2: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  centerOfMass: [number, number, number];
  triangleCount: number;
} {
  let volume = 0;
  let area = 0;
  let triCount = 0;
  const bbox = new THREE.Box3();
  const weightedCenter = new THREE.Vector3();

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  for (const g of geoms) {
    if (g.boundingBox) bbox.union(g.boundingBox);
    const pos = g.getAttribute('position');
    if (!pos) continue;
    const index = g.getIndex();
    const count = index ? index.count : pos.count;

    for (let i = 0; i < count; i += 3) {
      const i0 = index ? index.getX(i) : i;
      const i1 = index ? index.getX(i + 1) : i + 1;
      const i2 = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0);
      b.fromBufferAttribute(pos, i1);
      c.fromBufferAttribute(pos, i2);

      ab.subVectors(b, a);
      ac.subVectors(c, a);
      cross.crossVectors(ab, ac);
      area += 0.5 * cross.length();

      const signedTetVol = a.dot(b.clone().cross(c)) / 6.0;
      volume += signedTetVol;

      const tetCentroid = a.clone().add(b).add(c).multiplyScalar(0.25);
      weightedCenter.addScaledVector(tetCentroid, signedTetVol);
      triCount++;
    }
  }

  const absVol = Math.abs(volume);
  const com: [number, number, number] =
    absVol > 1e-6
      ? [weightedCenter.x / volume, -weightedCenter.z / volume, weightedCenter.y / volume]
      : [0, 0, 0];

  const min = bbox.isEmpty() ? new THREE.Vector3() : bbox.min;
  const max = bbox.isEmpty() ? new THREE.Vector3() : bbox.max;

  return {
    volumeMm3: absVol,
    surfaceAreaMm2: area,
    bboxMin: [min.x, -max.z, min.y],
    bboxMax: [max.x, -min.z, max.y],
    centerOfMass: com,
    triangleCount: triCount,
  };
}

/**
 * Evaluates all active features up to `doc.rollbackIndex` into parametric 3D bodies.
 */
export function evaluateDocument(doc: DesignDocument): EvaluatedDocument {
  const resolvedParams = resolveParameters(doc.parameters);
  const warnings: string[] = [];
  const activeFeatures = doc.features
    .slice(0, Math.max(0, Math.min(doc.rollbackIndex, doc.features.length)))
    .filter((f) => !f.suppressed);

  const sketchMap = new Map<string, SketchData>();
  for (const s of doc.sketches) {
    sketchMap.set(s.id, s);
    sketchMap.set(s.name, s);
  }

  const compMap = new Map(doc.components.map((c) => [c.id, c]));

  // Body accumulation keyed by body name
  const bodyAcc = new Map<
    string,
    {
      id: string;
      name: string;
      componentId: string;
      parts: EvaluatedMeshPart[];
      holesToSubtract: { contour: [number, number][]; plane: string; depth: number }[];
      filletRadius: number;
      chamferSize: number;
      shelled?: { thickness: number; lip?: { width: number; height: number } };
    }
  >();

  let lastBodyKey: string | null = null;
  let lastExtrudeHolesTarget: string | null = null;

  const ensureBody = (name: string, componentId: string) => {
    const key = `${componentId}::${name}`;
    if (!bodyAcc.has(key)) {
      bodyAcc.set(key, {
        id: key,
        name,
        componentId,
        parts: [],
        holesToSubtract: [],
        filletRadius: 0,
        chamferSize: 0,
      });
    }
    lastBodyKey = key;
    return bodyAcc.get(key)!;
  };

  for (const feat of activeFeatures) {
    const p = feat.params ?? {};
    const compId = feat.componentId || doc.components[0]?.id || 'root';

    switch (feat.kind) {
      case 'sketch': {
        // Sketch itself produces 2D profile data; geometry is created by extrude/revolve/flange
        break;
      }

      case 'solid.box': {
        const lx = evaluateExpression(p.length ?? 40, resolvedParams, 40);
        const wy = evaluateExpression(p.width ?? 30, resolvedParams, 30);
        const hz = evaluateExpression(p.height ?? 20, resolvedParams, 20);
        const corner = (p.corner as [number, number, number]) ?? [-lx / 2, -wy / 2, 0];
        const bodyName = p.body_name || feat.name || 'Corpo';
        const acc = ensureBody(bodyName, compId);
        acc.parts.push({
          kind: 'box',
          boxSize: [lx, wy, hz],
          transform: {
            position: [corner[0] + lx / 2, corner[1] + wy / 2, corner[2] + hz / 2],
            rotationDeg: [0, 0, 0],
          },
        });
        break;
      }

      case 'solid.cylinder': {
        const r = evaluateExpression(p.radius ?? 12, resolvedParams, 12);
        const h = evaluateExpression(p.height ?? 30, resolvedParams, 30);
        const base = (p.base as [number, number, number]) ?? [0, 0, 0];
        const axis = (p.axis as [number, number, number]) ?? [0, 0, 1];
        const bodyName = p.body_name || (p.operation === 'new' ? feat.name : null) || (lastBodyKey ? bodyAcc.get(lastBodyKey)!.name : 'Corpo');
        const acc = ensureBody(bodyName, compId);

        let rot: [number, number, number] = [0, 0, 0];
        let pos: [number, number, number] = [base[0], base[1], base[2] + h / 2];
        if (Math.abs(axis[0]) > 0.5) {
          rot = [0, 0, -90];
          pos = [base[0] + h / 2, base[1], base[2]];
        } else if (Math.abs(axis[1]) > 0.5) {
          rot = [90, 0, 0];
          pos = [base[0], base[1] + h / 2, base[2]];
        }
        acc.parts.push({
          kind: 'cylinder',
          radiusTop: r,
          radiusBottom: r,
          height: h,
          radialSegments: 40,
          transform: { position: pos, rotationDeg: rot },
        });
        break;
      }

      case 'solid.sphere': {
        const r = evaluateExpression(p.radius ?? 15, resolvedParams, 15);
        const center = (p.center as [number, number, number]) ?? [0, 0, r];
        const bodyName = p.body_name || feat.name || 'Esfera';
        const acc = ensureBody(bodyName, compId);
        acc.parts.push({
          kind: 'sphere',
          radius: r,
          transform: { position: center, rotationDeg: [0, 0, 0] },
        });
        break;
      }

      case 'solid.extrude': {
        const sketch = sketchMap.get(p.sketchId || p.sketch || '') ?? doc.sketches[doc.sketches.length - 1];
        if (!sketch) break;

        const dist = evaluateExpression(p.distance ?? 15, resolvedParams, 15);
        const dir = p.direction === 'negative' ? -1 : 1;
        const op = p.operation || 'new';
        const zOffset = evaluateExpression(p.offset ?? sketch.planeOffsetExpr ?? 0, resolvedParams, 0);

        const contours: [number, number][][] = [];
        for (const ent of sketch.entities) {
          const c = entityToContour(ent, resolvedParams);
          if (c) contours.push(c);
        }
        if (contours.length === 0) break;

        if (op === 'cut') {
          const targetKey = p.targetBody || lastBodyKey;
          if (targetKey && bodyAcc.has(targetKey)) {
            const target = bodyAcc.get(targetKey)!;
            // Apply cut holes directly onto matching XY extrude parts!
            for (const c of contours) {
              target.holesToSubtract.push({ contour: c, plane: sketch.plane, depth: dist });
            }
            lastExtrudeHolesTarget = targetKey;
          }
          break;
        }

        const bodyName =
          p.body_name ||
          (op === 'join' && lastBodyKey ? bodyAcc.get(lastBodyKey)!.name : feat.name || 'Corpo');
        const acc = ensureBody(bodyName, compId);

        // Sort contours by bounding area descending: largest is outer, enclosed ones are holes if concentric/smaller
        const withArea = contours.map((pts) => {
          let xs = pts.map((pt) => pt[0]);
          let ys = pts.map((pt) => pt[1]);
          const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
          return { pts, area };
        });
        withArea.sort((a, b) => b.area - a.area);

        const outer = withArea[0].pts;
        const holes = withArea.slice(1).map((h) => h.pts);

        let rot: [number, number, number] = [0, 0, 0];
        let pos: [number, number, number] = [0, 0, dir > 0 ? zOffset : zOffset - dist];

        if (sketch.plane === 'XZ') {
          rot = [90, 0, 0];
          pos = [0, dir > 0 ? zOffset : zOffset + dist, 0];
        } else if (sketch.plane === 'YZ') {
          rot = [0, 90, 0];
          pos = [dir > 0 ? zOffset : zOffset - dist, 0, 0];
        }

        acc.parts.push({
          kind: 'extrude',
          outer,
          holes,
          depth: dist,
          transform: { position: pos, rotationDeg: rot },
        });
        break;
      }

      case 'solid.revolve': {
        const sketch = sketchMap.get(p.sketchId || p.sketch || '') ?? doc.sketches[0];
        const angle = evaluateExpression(p.angle ?? 360, resolvedParams, 360);
        const bodyName = p.body_name || feat.name || 'Revolução';
        const acc = ensureBody(bodyName, compId);
        let pts: [number, number][] = [
          [8, 0],
          [22, 0],
          [22, 8],
          [14, 14],
          [14, 24],
          [8, 24],
          [8, 0],
        ];
        if (sketch && sketch.entities.length > 0) {
          const c = entityToContour(sketch.entities[0], resolvedParams);
          if (c) {
            pts = c.map(([x, y]) => [Math.max(0.5, Math.abs(x)), y]);
          }
        }
        acc.parts.push({
          kind: 'lathe',
          lathePoints: pts,
          latheAngleDeg: angle,
          transform: { position: [0, 0, 0], rotationDeg: [0, 0, 0] },
        });
        break;
      }

      case 'solid.fillet': {
        const r = evaluateExpression(p.radius ?? 2, resolvedParams, 2);
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target) {
          target.filletRadius = Math.max(target.filletRadius, r);
          for (const part of target.parts) {
            if (part.kind === 'extrude') {
              part.bevelSize = Math.min(r * 0.65, (part.depth ?? 10) * 0.25);
              part.bevelThickness = part.bevelSize;
            }
          }
        }
        break;
      }

      case 'solid.chamfer': {
        const d = evaluateExpression(p.distance ?? 1.5, resolvedParams, 1.5);
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target) {
          target.chamferSize = Math.max(target.chamferSize, d);
          for (const part of target.parts) {
            if (part.kind === 'extrude') {
              part.bevelSize = Math.min(d * 0.7, (part.depth ?? 10) * 0.25);
              part.bevelThickness = part.bevelSize;
            }
          }
        }
        break;
      }

      case 'solid.shell': {
        const t = evaluateExpression(p.thickness ?? 2, resolvedParams, 2);
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target && target.parts.length > 0) {
          const first = target.parts[0];
          if (first.kind === 'box' && first.boxSize) {
            const [lx, wy, hz] = first.boxSize;
            const [cx, cy, cz] = first.transform.position;
            const outer = rectContour(cx - lx / 2, cy - wy / 2, cx + lx / 2, cy + wy / 2, 1.5);
            const inner = rectContour(
              cx - lx / 2 + t,
              cy - wy / 2 + t,
              cx + lx / 2 - t,
              cy + wy / 2 - t,
              0.8
            );
            const baseZ = cz - hz / 2;
            // Replace solid box with bottom plate + hollow walls
            target.parts = [
              {
                kind: 'extrude',
                outer,
                depth: t,
                bevelSize: 0.4,
                bevelThickness: 0.4,
                transform: { position: [0, 0, baseZ], rotationDeg: [0, 0, 0] },
              },
              {
                kind: 'extrude',
                outer,
                holes: [inner],
                depth: Math.max(1, hz - t),
                transform: { position: [0, 0, baseZ + t], rotationDeg: [0, 0, 0] },
              },
            ];
            target.shelled = { thickness: t };
          }
        }
        break;
      }

      case 'solid.hole': {
        const d = evaluateExpression(p.diameter ?? 8, resolvedParams, 8);
        const x = evaluateExpression(p.x ?? 0, resolvedParams, 0);
        const y = evaluateExpression(p.y ?? 0, resolvedParams, 0);
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target) {
          target.holesToSubtract.push({
            contour: circleContour(x, y, Math.max(0.5, d / 2)),
            plane: 'XY',
            depth: evaluateExpression(p.depth ?? 20, resolvedParams, 20),
          });
        }
        break;
      }

      case 'solid.pattern.circular': {
        const count = Math.max(2, Math.round(evaluateExpression(p.count ?? 6, resolvedParams, 6)));
        const target = (lastExtrudeHolesTarget && bodyAcc.get(lastExtrudeHolesTarget)) || (lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined);
        if (target && target.holesToSubtract.length > 0) {
          const seedHole = target.holesToSubtract[target.holesToSubtract.length - 1];
          const pcd = evaluateExpression(p.pcd ?? 0, resolvedParams, 0);
          for (let i = 1; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            const rotated: [number, number][] = seedHole.contour.map(([hx, hy]) => {
              if (pcd > 0) {
                const baseR = Math.hypot(hx, hy);
                const cx = seedHole.contour.reduce((s, v) => s + v[0], 0) / seedHole.contour.length;
                const cy = seedHole.contour.reduce((s, v) => s + v[1], 0) / seedHole.contour.length;
                const holeR = Math.hypot(hx - cx, hy - cy);
                const newCx = (pcd / 2) * cos;
                const newCy = (pcd / 2) * sin;
                const ang = Math.atan2(hy - cy, hx - cx);
                return [newCx + Math.cos(ang) * holeR, newCy + Math.sin(ang) * holeR];
              }
              return [hx * cos - hy * sin, hx * sin + hy * cos];
            });
            target.holesToSubtract.push({ ...seedHole, contour: rotated });
          }
        } else if (target && target.parts.length > 0) {
          const seed = target.parts[target.parts.length - 1];
          for (let i = 1; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const [px, py, pz] = seed.transform.position;
            const r = Math.hypot(px, py);
            const baseA = Math.atan2(py, px);
            target.parts.push({
              ...seed,
              transform: {
                ...seed.transform,
                position: [r * Math.cos(baseA + a), r * Math.sin(baseA + a), pz],
                rotationDeg: [
                  seed.transform.rotationDeg[0],
                  seed.transform.rotationDeg[1],
                  seed.transform.rotationDeg[2] + (a * 180) / Math.PI,
                ],
              },
            });
          }
        }
        break;
      }

      case 'solid.pattern.rectangular': {
        const rows = Math.max(1, Math.round(evaluateExpression(p.rows ?? 3, resolvedParams, 3)));
        const cols = Math.max(1, Math.round(evaluateExpression(p.columns ?? 4, resolvedParams, 4)));
        const rowPitch = evaluateExpression(p.rowPitch ?? 16, resolvedParams, 16);
        const colPitch = evaluateExpression(p.colPitch ?? 24, resolvedParams, 24);
        const target = (lastExtrudeHolesTarget && bodyAcc.get(lastExtrudeHolesTarget)) || (lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined);
        if (target && target.holesToSubtract.length > 0) {
          const seedHole = target.holesToSubtract[target.holesToSubtract.length - 1];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (r === 0 && c === 0) continue;
              const dx = c * colPitch;
              const dy = r * rowPitch;
              target.holesToSubtract.push({
                ...seedHole,
                contour: seedHole.contour.map(([hx, hy]) => [hx + dx, hy + dy]),
              });
            }
          }
        }
        break;
      }

      case 'sheet.flange': {
        const thickness = evaluateExpression(p.thickness ?? doc.sheetThicknessMm ?? 2, resolvedParams, 2);
        const bodyName = p.body_name || 'Corpo em Chapa';
        const acc = ensureBody(bodyName, compId);
        if (p.sketch) {
          const sketch = sketchMap.get(p.sketch);
          if (sketch && sketch.entities.length > 0) {
            const c = entityToContour(sketch.entities[0], resolvedParams, 1);
            if (c) {
              acc.parts.push({
                kind: 'extrude',
                outer: c,
                depth: thickness,
                transform: { position: [0, 0, 0], rotationDeg: [0, 0, 0] },
              });
            }
          }
        } else {
          // Edge flange
          const h = evaluateExpression(p.height ?? 30, resolvedParams, 30);
          const angle = evaluateExpression(p.angle ?? 90, resolvedParams, 90);
          const side = p.side || 'front_back';
          const baseW = evaluateExpression(p.baseWidth ?? 120, resolvedParams, 120);
          const baseD = evaluateExpression(p.baseDepth ?? 60, resolvedParams, 60);

          if (side === 'front_back') {
            // Two side walls along Y=0 and Y=baseD
            acc.parts.push({
              kind: 'box',
              boxSize: [baseW, thickness, h],
              transform: { position: [baseW / 2, thickness / 2, h / 2 + thickness * 0.5], rotationDeg: [90 - angle, 0, 0] },
            });
            acc.parts.push({
              kind: 'box',
              boxSize: [baseW, thickness, h],
              transform: { position: [baseW / 2, baseD - thickness / 2, h / 2 + thickness * 0.5], rotationDeg: [-(90 - angle), 0, 0] },
            });
          } else {
            // Angled right flange at X=baseW
            const rad = ((90 - angle) * Math.PI) / 180;
            acc.parts.push({
              kind: 'box',
              boxSize: [thickness, baseD, h],
              transform: {
                position: [baseW + Math.sin(rad) * (h / 2), baseD / 2, (Math.cos(rad) * h) / 2 + thickness],
                rotationDeg: [0, 90 - angle, 0],
              },
            });
          }
        }
        break;
      }

      case 'sheet.hem': {
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target) {
          const t = evaluateExpression(p.thickness ?? doc.sheetThicknessMm ?? 2, resolvedParams, 2);
          const len = evaluateExpression(p.length ?? 8, resolvedParams, 8);
          const baseD = evaluateExpression(p.baseDepth ?? 60, resolvedParams, 60);
          // Rolled tear-drop hem along left edge X=0
          target.parts.push({
            kind: 'cylinder',
            radiusTop: t * 1.1,
            radiusBottom: t * 1.1,
            height: baseD,
            radialSegments: 16,
            transform: { position: [0, baseD / 2, t * 1.3], rotationDeg: [90, 0, 0] },
          });
          target.parts.push({
            kind: 'box',
            boxSize: [len, baseD, t],
            transform: { position: [len / 2, baseD / 2, t * 2.1], rotationDeg: [0, 0, 0] },
          });
        }
        break;
      }

      case 'plastic.lip': {
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target && target.parts.length > 0) {
          const w = evaluateExpression(p.width ?? 1, resolvedParams, 1);
          const h = evaluateExpression(p.height ?? 2, resolvedParams, 2);
          const outer = rectContour(-40 + w * 0.6, -25 + w * 0.6, 40 - w * 0.6, 25 - w * 0.6, 1.2);
          const inner = rectContour(-40 + w * 1.6, -25 + w * 1.6, 40 - w * 1.6, 25 - w * 1.6, 0.8);
          target.parts.push({
            kind: 'extrude',
            outer,
            holes: [inner],
            depth: h,
            transform: { position: [0, 0, 30], rotationDeg: [0, 0, 0] },
          });
        }
        break;
      }

      case 'plastic.boss': {
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target) {
          const pos = (p.position as [number, number, number]) ?? [0, 0, 2];
          const od = evaluateExpression(p.diameter ?? 7, resolvedParams, 7);
          const id = evaluateExpression(p.hole_diameter ?? 2.5, resolvedParams, 2.5);
          const h = evaluateExpression(p.height ?? 12, resolvedParams, 12);
          target.parts.push({
            kind: 'extrude',
            outer: circleContour(pos[0], pos[1], od / 2, 24),
            holes: [circleContour(pos[0], pos[1], id / 2, 16)],
            depth: h,
            transform: { position: [0, 0, pos[2]], rotationDeg: [0, 0, 0] },
          });
        }
        break;
      }

      case 'plastic.snap_fit': {
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target) {
          const pos = (p.position as [number, number, number]) ?? [0, 0, 2];
          const len = evaluateExpression(p.length ?? 14, resolvedParams, 14);
          const thick = evaluateExpression(p.thickness ?? 1.5, resolvedParams, 1.5);
          const width = evaluateExpression(p.width ?? 6, resolvedParams, 6);
          const catchDepth = evaluateExpression(p.catch_depth ?? 1.2, resolvedParams, 1.2);
          target.parts.push({
            kind: 'box',
            boxSize: [width, thick, len],
            transform: { position: [pos[0], pos[1], pos[2] + len / 2], rotationDeg: [0, 0, 0] },
          });
          // Snap hook tip
          target.parts.push({
            kind: 'box',
            boxSize: [width, thick + catchDepth, 2.4],
            transform: { position: [pos[0], pos[1] - catchDepth / 2, pos[2] + len - 1.2], rotationDeg: [0, 0, 0] },
          });
        }
        break;
      }

      case 'plastic.rest': {
        const target = lastBodyKey ? bodyAcc.get(lastBodyKey) : undefined;
        if (target) {
          const pos = (p.position as [number, number, number]) ?? [0, 0, 2];
          const w = evaluateExpression(p.width ?? 16, resolvedParams, 16);
          const l = evaluateExpression(p.length ?? 24, resolvedParams, 24);
          const h = evaluateExpression(p.height ?? 3, resolvedParams, 3);
          target.parts.push({
            kind: 'box',
            boxSize: [l, w, h],
            transform: { position: [pos[0], pos[1], pos[2] + h / 2], rotationDeg: [0, 0, 0] },
          });
        }
        break;
      }

      case 'joint.revolute': {
        // Handled at component transform stage using doc.jointAngleDeg
        break;
      }

      case 'imported.mesh': {
        if (Array.isArray(p.positions)) {
          const bodyName = p.body_name || feat.name || 'Malha Importada';
          const acc = ensureBody(bodyName, compId);
          acc.parts.push({
            kind: 'raw',
            positions: p.positions,
            transform: { position: [0, 0, 0], rotationDeg: [0, 0, 0] },
          });
        }
        break;
      }
    }
  }

  // Apply accumulated subtract holes to extrude parts and build EvaluatedBody objects
  const bodies: EvaluatedBody[] = [];
  let totalVolumeMm3 = 0;
  let totalMassGrams = 0;
  let totalAreaMm2 = 0;

  for (const acc of bodyAcc.values()) {
    const comp = compMap.get(acc.componentId);
    const matName = comp?.material ?? 'Default';
    const matSpec = getMaterialSpec(matName);

    // Inject cut holes onto XY extrude base parts
    if (acc.holesToSubtract.length > 0) {
      for (const part of acc.parts) {
        if (part.kind === 'extrude' && part.transform.rotationDeg[0] === 0 && part.transform.rotationDeg[1] === 0) {
          part.holes = [...(part.holes ?? []), ...acc.holesToSubtract.map((h) => h.contour)];
        }
      }
    }

    // Apply component-level transform (including revolute joint drive angle for Hinge Assembly)
    const compPos = comp?.transform?.position ?? [0, 0, 0];
    const compRot = comp?.transform?.rotationDeg ?? [0, 0, 0];
    const hasJointDrive = doc.features.some((f) => f.kind === 'joint.revolute' && !f.suppressed && f.params?.drivenComponentId === acc.componentId);
    const pivot = doc.features.find((f) => f.kind === 'joint.revolute' && f.params?.drivenComponentId === acc.componentId)?.params?.pivot as [number, number, number] | undefined;

    const transformedParts: EvaluatedMeshPart[] = acc.parts.map((part) => {
      let pos: [number, number, number] = [
        part.transform.position[0] + compPos[0],
        part.transform.position[1] + compPos[1],
        part.transform.position[2] + compPos[2],
      ];
      let rot: [number, number, number] = [
        part.transform.rotationDeg[0] + compRot[0],
        part.transform.rotationDeg[1] + compRot[1],
        part.transform.rotationDeg[2] + compRot[2],
      ];

      if (hasJointDrive && pivot) {
        // Rotate around X axis at pivot [px, py, pz] by doc.jointAngleDeg
        const theta = (doc.jointAngleDeg * Math.PI) / 180;
        const dy = pos[1] - pivot[1];
        const dz = pos[2] - pivot[2];
        const ny = dy * Math.cos(theta) - dz * Math.sin(theta);
        const nz = dy * Math.sin(theta) + dz * Math.cos(theta);
        pos = [pos[0], pivot[1] + ny, pivot[2] + nz];
        rot = [rot[0] + doc.jointAngleDeg, rot[1], rot[2]];
      }

      return {
        ...part,
        transform: { ...part.transform, position: pos, rotationDeg: rot },
      };
    });

    const geoms = transformedParts.map(buildPartGeometry);
    const props = computeMeshMassProps(geoms);
    geoms.forEach((g) => g.dispose());

    const massGrams = (props.volumeMm3 / 1000) * matSpec.density;
    const visible = comp ? comp.visible : true;

    if (visible) {
      totalVolumeMm3 += props.volumeMm3;
      totalMassGrams += massGrams;
      totalAreaMm2 += props.surfaceAreaMm2;
    }

    bodies.push({
      id: acc.id,
      name: acc.name,
      componentId: acc.componentId,
      material: matName,
      colorOverride: comp?.colorOverride,
      volumeMm3: props.volumeMm3,
      surfaceAreaMm2: props.surfaceAreaMm2,
      massGrams,
      bboxMin: props.bboxMin,
      bboxMax: props.bboxMax,
      centerOfMass: props.centerOfMass,
      triangleCount: props.triangleCount,
      visible,
      meshes: transformedParts,
    });
  }

  return {
    bodies,
    resolvedParams,
    totalVolumeMm3,
    totalMassGrams,
    totalAreaMm2,
    warnings,
  };
}
