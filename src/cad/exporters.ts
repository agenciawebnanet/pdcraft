import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
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
 * Parses an ASCII or Binary STL file into raw triangle vertex positions (Three.js Y-up).
 */
export function parseSTLBuffer(buffer: ArrayBuffer): Float32Array {
  if (!buffer || buffer.byteLength === 0) return new Float32Array(0);

  // 1. Parser principal via STLLoader oficial do Three.js (suporta ASCII e Binário de qualquer tamanho)
  try {
    const loader = new STLLoader();
    const geom = loader.parse(buffer);
    const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
    const pos = nonIndexed.getAttribute('position');
    if (pos && pos.count >= 3) {
      const out = new Float32Array(pos.count * 3);
      let validCount = 0;
      for (let i = 0; i < pos.count; i += 3) {
        const x0 = pos.getX(i);
        const y0 = pos.getY(i);
        const z0 = pos.getZ(i);
        const x1 = pos.getX(i + 1);
        const y1 = pos.getY(i + 1);
        const z1 = pos.getZ(i + 1);
        const x2 = pos.getX(i + 2);
        const y2 = pos.getY(i + 2);
        const z2 = pos.getZ(i + 2);
        if (
          Number.isFinite(x0) && Number.isFinite(y0) && Number.isFinite(z0) &&
          Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(z1) &&
          Number.isFinite(x2) && Number.isFinite(y2) && Number.isFinite(z2)
        ) {
          // Converte CAD Z-up (x, y, z) -> Three.js Y-up (x, z, -y)
          out[validCount++] = x0;
          out[validCount++] = z0;
          out[validCount++] = -y0;
          out[validCount++] = x1;
          out[validCount++] = z1;
          out[validCount++] = -y1;
          out[validCount++] = x2;
          out[validCount++] = z2;
          out[validCount++] = -y2;
        }
      }
      if (nonIndexed !== geom) nonIndexed.dispose();
      geom.dispose();
      if (validCount >= 9) {
        return validCount === out.length ? out : out.subarray(0, validCount);
      }
    } else {
      if (nonIndexed !== geom) nonIndexed.dispose();
      geom.dispose();
    }
  } catch {
    // Segue para fallback manual caso o arquivo tenha formatação não padrão
  }

  // 2. Fallback manual para ASCII (qualquer capitalização, qualquer tamanho) ou Binário
  const view = new DataView(buffer);
  const expectedBinarySize = buffer.byteLength >= 84 ? 84 + view.getUint32(80, true) * 50 : -1;
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const sampleText = decoder.decode(new Uint8Array(buffer, 0, Math.min(4096, buffer.byteLength)));
  const looksLikeAscii =
    expectedBinarySize !== buffer.byteLength &&
    (/^\s*(?:\uFEFF)?solid\b/i.test(sampleText) || /facet\s+normal/i.test(sampleText));

  if (looksLikeAscii) {
    const text = decoder.decode(buffer);
    const regex = /vertex\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/gi;
    const coords: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const vx = parseFloat(m[1]);
      const vy = parseFloat(m[2]);
      const vz = parseFloat(m[3]);
      if (Number.isFinite(vx) && Number.isFinite(vy) && Number.isFinite(vz)) {
        coords.push(vx, vz, -vy);
      }
    }
    return new Float32Array(coords);
  }

  if (buffer.byteLength < 84) return new Float32Array(0);
  const maxPossibleTris = Math.floor((buffer.byteLength - 84) / 50);
  const triCount = Math.min(view.getUint32(80, true), maxPossibleTris);
  const out = new Float32Array(triCount * 9);
  let outIdx = 0;
  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    for (let v = 0; v < 3; v++) {
      const vx = view.getFloat32(offset + 12 + v * 12, true);
      const vy = view.getFloat32(offset + 16 + v * 12, true);
      const vz = view.getFloat32(offset + 20 + v * 12, true);
      out[outIdx++] = Number.isFinite(vx) ? vx : 0;
      out[outIdx++] = Number.isFinite(vz) ? vz : 0;
      out[outIdx++] = Number.isFinite(vy) ? -vy : 0;
    }
    offset += 50;
  }
  return out;
}
