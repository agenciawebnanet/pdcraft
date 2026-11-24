import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { DesignDocument, EvaluatedDocument } from './types';
import { buildPartGeometry } from './evaluator';
import { getMaterialSpec } from '../theme/tokens';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildExportGroup(evaluated: EvaluatedDocument): THREE.Group {
  const group = new THREE.Group();
  for (const body of evaluated.bodies) {
    if (!body.visible) continue;
    const matSpec = getMaterialSpec(body.material);
    const mat = new THREE.MeshStandardMaterial({
      color: body.colorOverride || matSpec.color,
      metalness: matSpec.metalness,
      roughness: matSpec.roughness,
    });
    for (const part of body.meshes) {
      const geom = buildPartGeometry(part);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = body.name;
      group.add(mesh);
    }
  }
  return group;
}

function disposeGroup(group: THREE.Group) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

export function exportDocumentJSON(doc: DesignDocument) {
  const safeName = doc.name.replace(/[^a-z0-9_\- ]/gi, '_').trim() || 'design';
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${safeName}.pdcraft.json`);
}

export function exportSTL(doc: DesignDocument, evaluated: EvaluatedDocument, binary = true) {
  const group = buildExportGroup(evaluated);
  const exporter = new STLExporter();
  const result = exporter.parse(group, { binary });
  const safeName = doc.name.replace(/[^a-z0-9_\- ]/gi, '_').trim() || 'model';
  const blob =
    result instanceof DataView
      ? new Blob([result.buffer as ArrayBuffer], { type: 'application/octet-stream' })
      : new Blob([result], { type: 'text/plain' });
  triggerDownload(blob, `${safeName}.stl`);
  disposeGroup(group);
}

export function exportOBJ(doc: DesignDocument, evaluated: EvaluatedDocument) {
  const group = buildExportGroup(evaluated);
  const exporter = new OBJExporter();
  const text = exporter.parse(group);
  const safeName = doc.name.replace(/[^a-z0-9_\- ]/gi, '_').trim() || 'model';
  triggerDownload(new Blob([text], { type: 'text/plain' }), `${safeName}.obj`);
  disposeGroup(group);
}

export function exportGLB(doc: DesignDocument, evaluated: EvaluatedDocument) {
  const group = buildExportGroup(evaluated);
  const exporter = new GLTFExporter();
  const safeName = doc.name.replace(/[^a-z0-9_\- ]/gi, '_').trim() || 'model';
  exporter.parse(
    group,
    (result) => {
      if (result instanceof ArrayBuffer) {
        triggerDownload(new Blob([result], { type: 'model/gltf-binary' }), `${safeName}.glb`);
      } else {
        triggerDownload(
          new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' }),
          `${safeName}.gltf`
        );
      }
      disposeGroup(group);
    },
    () => {
      disposeGroup(group);
    },
    { binary: true }
  );
}

/**
 * Parses an ASCII or Binary STL file into raw triangle vertex positions (scaled/positioned for Three.js).
 */
export function parseSTLBuffer(buffer: ArrayBuffer): number[] {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  const headerStr = decoder.decode(new Uint8Array(buffer, 0, Math.min(80, buffer.byteLength)));
  const isAscii = headerStr.trimStart().startsWith('solid') && buffer.byteLength < 5_000_000 && /facet\s+normal/i.test(decoder.decode(new Uint8Array(buffer, 0, Math.min(512, buffer.byteLength))));

  const positions: number[] = [];

  if (isAscii) {
    const text = decoder.decode(buffer);
    const regex = /vertex\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      positions.push(parseFloat(m[1]), parseFloat(m[3]), -parseFloat(m[2]));
    }
    return positions;
  }

  if (buffer.byteLength < 84) return positions;
  const triCount = view.getUint32(80, true);
  let offset = 84;
  for (let i = 0; i < triCount && offset + 50 <= buffer.byteLength; i++) {
    // Skip normal (12 bytes)
    for (let v = 0; v < 3; v++) {
      const vx = view.getFloat32(offset + 12 + v * 12, true);
      const vy = view.getFloat32(offset + 16 + v * 12, true);
      const vz = view.getFloat32(offset + 20 + v * 12, true);
      positions.push(vx, vz, -vy);
    }
    offset += 50;
  }
  return positions;
}
