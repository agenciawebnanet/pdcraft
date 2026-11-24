import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Compass,
  Eye,
  Grid,
  Home,
  Maximize2,
  Move,
  Orbit,
  Ruler,
  Scissors,
  SlidersHorizontal,
} from 'lucide-react';
import { getMaterialSpec, ThemeTokens } from '../theme/tokens';
import {
  DesignDocument,
  EvaluatedDocument,
  NavPreset,
  PlaneName,
  SketchData,
  SketchEntity,
  VisualStyle,
} from '../cad/types';
import { buildPartGeometry, entityToContour } from '../cad/evaluator';

export type CameraPreset = 'iso' | 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';

export interface MeasureResult {
  p1: [number, number, number];
  p2: [number, number, number];
  distance: number;
  dx: number;
  dy: number;
  dz: number;
}

interface CadViewportProps {
  tokens: ThemeTokens;
  doc: DesignDocument;
  evaluated: EvaluatedDocument;
  selectedBodyId: string | null;
  activeSketch: SketchData | null;
  sketchTool: 'select' | 'line' | 'rectangle' | 'circle' | 'slot';
  sketchConstruction: boolean;
  measureActive: boolean;
  navPreset: NavPreset;
  cameraCommand: { preset: CameraPreset; seq: number } | null;
  fitCommandSeq: number;
  onSelectBody: (bodyId: string | null) => void;
  onSelectPlaneForSketch?: (plane: PlaneName) => void;
  onAddSketchEntity: (entity: SketchEntity) => void;
  onChangeVisualStyle: (style: VisualStyle) => void;
  onToggleGrid: () => void;
  onToggleSection: () => void;
  onChangeSectionHeight: (h: number) => void;
  onToggleMeasure: () => void;
  onChangeJointAngle: (deg: number) => void;
  onCameraPreset: (preset: CameraPreset) => void;
  onFitView: () => void;
}

// Reusable math helpers outside render loop (zero GC)
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();
const _hitPoint = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function snapCoord(v: number, step = 2.5): number {
  return Math.round(v / step) * step;
}

function worldToSketchPlane(pt: THREE.Vector3, plane: PlaneName): [number, number] {
  // CAD Z-up mapped to Three Y-up: CAD (x, y, z) -> Three (x, z, -y)
  if (plane === 'XY') return [snapCoord(pt.x), snapCoord(-pt.z)];
  if (plane === 'XZ') return [snapCoord(pt.x), snapCoord(pt.y)];
  return [snapCoord(-pt.z), snapCoord(pt.y)]; // YZ
}

function sketchPlaneToThree(u: number, v: number, plane: PlaneName, offset = 0.05): THREE.Vector3 {
  if (plane === 'XY') return new THREE.Vector3(u, offset, -v);
  if (plane === 'XZ') return new THREE.Vector3(u, v, -offset);
  return new THREE.Vector3(offset, v, -u);
}

export const CadViewport: React.FC<CadViewportProps> = ({
  tokens,
  doc,
  evaluated,
  selectedBodyId,
  activeSketch,
  sketchTool,
  sketchConstruction,
  measureActive,
  navPreset,
  cameraCommand,
  fitCommandSeq,
  onSelectBody,
  onSelectPlaneForSketch,
  onAddSketchEntity,
  onChangeVisualStyle,
  onToggleGrid,
  onToggleSection,
  onChangeSectionHeight,
  onToggleMeasure,
  onChangeJointAngle,
  onCameraPreset,
  onFitView,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);
  const [sketchDraftStart, setSketchDraftStart] = useState<[number, number] | null>(null);
  const [measurePoints, setMeasurePoints] = useState<[number, number, number][]>([]);
  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);

  // Refs for stable Three.js lifecycle
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    bodiesGroup: THREE.Group;
    originGroup: THREE.Group;
    sketchGroup: THREE.Group;
    overlayGroup: THREE.Group;
    gridHelper: THREE.GridHelper;
    shadowPlane: THREE.Mesh;
    sectionPlane: THREE.Plane;
    sectionVisual: THREE.Mesh;
    isSoftwareGl: boolean;
    animTargetPos: THREE.Vector3 | null;
    animTargetLook: THREE.Vector3 | null;
    requestRender: () => void;
    bodyMeshes: THREE.Mesh[];
    planeMeshes: THREE.Mesh[];
  } | null>(null);

  // Latest props ref for event listeners
  const propsRef = useRef({
    selectedBodyId,
    activeSketch,
    sketchTool,
    sketchConstruction,
    measureActive,
    doc,
    evaluated,
    sketchDraftStart,
    measurePoints,
    onSelectBody,
    onSelectPlaneForSketch,
    onAddSketchEntity,
  });
  propsRef.current = {
    selectedBodyId,
    activeSketch,
    sketchTool,
    sketchConstruction,
    measureActive,
    doc,
    evaluated,
    sketchDraftStart,
    measurePoints,
    onSelectBody,
    onSelectPlaneForSketch,
    onAddSketchEntity,
  };

  // Clear measure points when measure deactivated
  useEffect(() => {
    if (!measureActive) {
      setMeasurePoints([]);
      setMeasureResult(null);
    }
  }, [measureActive]);

  // Clear draft point if sketch changes
  useEffect(() => {
    setSketchDraftStart(null);
  }, [activeSketch?.id, sketchTool]);

  // Initialize Three.js scene ONCE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;

    const rect = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      40,
      Math.max(1, rect.width) / Math.max(1, rect.height),
      0.5,
      4000
    );
    camera.position.set(130, 105, 130);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 12;
    controls.maxDistance = 1200;
    controls.target.set(30, 8, -20);

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemi = new THREE.HemisphereLight(0xdce8ff, 0x7b8394, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.55);
    keyLight.position.set(140, 220, 130);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 20;
    keyLight.shadow.camera.far = 650;
    const d = 140;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc2d8ff, 0.65);
    rimLight.position.set(-150, 90, -140);
    scene.add(rimLight);

    // Ground Contact Shadow Plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(15, 20, 30, 0.28)');
    grad.addColorStop(0.6, 'rgba(15, 20, 30, 0.08)');
    grad.addColorStop(1, 'rgba(15, 20, 30, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 320),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.7 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.08;
    scene.add(shadowPlane);

    // CAD Workplane Grid
    const gridHelper = new THREE.GridHelper(300, 30, 0x8b95a5, 0xb8c2d0);
    gridHelper.position.y = -0.03;
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.38;
      });
    } else {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.38;
    }
    scene.add(gridHelper);

    const originGroup = new THREE.Group();
    const bodiesGroup = new THREE.Group();
    const sketchGroup = new THREE.Group();
    const overlayGroup = new THREE.Group();
    scene.add(originGroup, bodiesGroup, sketchGroup, overlayGroup);

    const sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 15);
    const sectionVisual = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshBasicMaterial({
        color: 0xe68228,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    sectionVisual.rotation.x = -Math.PI / 2;
    sectionVisual.visible = false;
    scene.add(sectionVisual);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Coalesced on-demand renderer with Software WebGL pacing
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const delta = Math.min(clock.getDelta(), 0.1);
        const st = threeRef.current;
        let keepAnimating = false;

        if (st && st.animTargetPos && st.animTargetLook) {
          const lambda = 12;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, st.animTargetPos.x, lambda, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, st.animTargetPos.y, lambda, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, st.animTargetPos.z, lambda, delta);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, st.animTargetLook.x, lambda, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, st.animTargetLook.y, lambda, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, st.animTargetLook.z, lambda, delta);

          if (
            camera.position.distanceTo(st.animTargetPos) < 0.25 &&
            controls.target.distanceTo(st.animTargetLook) < 0.25
          ) {
            camera.position.copy(st.animTargetPos);
            controls.target.copy(st.animTargetLook);
            st.animTargetPos = null;
            st.animTargetLook = null;
          } else {
            keepAnimating = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || keepAnimating) requestRender();
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    controls.addEventListener('change', requestRender);
    controls.addEventListener('start', () => {
      if (threeRef.current) {
        threeRef.current.animTargetPos = null;
        threeRef.current.animTargetLook = null;
      }
    });

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      bodiesGroup,
      originGroup,
      sketchGroup,
      overlayGroup,
      gridHelper,
      shadowPlane,
      sectionPlane,
      sectionVisual,
      isSoftwareGl,
      animTargetPos: null,
      animTargetLook: null,
      requestRender,
      bodyMeshes: [],
      planeMeshes: [],
    };

    const resizeObs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          requestRender();
        }
      }
    });
    resizeObs.observe(container);

    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      controls.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      threeRef.current = null;
    };
  }, []);

  // Update mouse navigation mapping when navPreset changes
  useEffect(() => {
    const st = threeRef.current;
    if (!st) return;
    if (navPreset === 'Blender') {
      st.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.PAN,
      };
    } else if (navPreset === 'Fusion') {
      st.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    } else {
      st.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      };
    }
  }, [navPreset]);

  // Rebuild Origin Axes & Planes
  useEffect(() => {
    const st = threeRef.current;
    if (!st) return;
    while (st.originGroup.children.length > 0) {
      const child = st.originGroup.children[0];
      st.originGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
    st.planeMeshes = [];

    // Axes: CAD X -> Three +X (red), CAD Y -> Three -Z (green), CAD Z -> Three +Y (blue)
    if (doc.originVisible.axes) {
      const makeAxis = (dir: THREE.Vector3, color: string) => {
        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          dir.clone().multiplyScalar(65),
        ]);
        const mat = new THREE.LineBasicMaterial({ color });
        return new THREE.Line(geom, mat);
      };
      st.originGroup.add(makeAxis(new THREE.Vector3(1, 0, 0), tokens.axisX));
      st.originGroup.add(makeAxis(new THREE.Vector3(0, 0, -1), tokens.axisY));
      st.originGroup.add(makeAxis(new THREE.Vector3(0, 1, 0), tokens.axisZ));

      // Origin sphere
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 16, 12),
        new THREE.MeshBasicMaterial({ color: tokens.mode === 'dark' ? '#d6d7da' : '#4a5262' })
      );
      st.originGroup.add(dot);
    }

    const addPlane = (name: PlaneName, visible: boolean, rotX: number, rotY: number) => {
      if (!visible) return;
      const geom = new THREE.PlaneGeometry(54, 54);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf9b886,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.set(rotX, rotY, 0);
      mesh.userData.planeName = name;
      st.originGroup.add(mesh);
      st.planeMeshes.push(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        new THREE.LineBasicMaterial({ color: 0xd68c54, transparent: true, opacity: 0.65 })
      );
      edges.rotation.set(rotX, rotY, 0);
      st.originGroup.add(edges);
    };

    addPlane('XY', doc.originVisible.xy, -Math.PI / 2, 0);
    addPlane('XZ', doc.originVisible.xz, 0, 0);
    addPlane('YZ', doc.originVisible.yz, 0, Math.PI / 2);

    st.gridHelper.visible = doc.showGrid;
    st.shadowPlane.visible = doc.showGroundShadow;
    st.requestRender();
  }, [doc.originVisible, doc.showGrid, doc.showGroundShadow, tokens, activeSketch?.id]);

  // Rebuild 3D Bodies when evaluated document, selection, visualStyle, or section cut changes
  useEffect(() => {
    const st = threeRef.current;
    if (!st) return;

    while (st.bodiesGroup.children.length > 0) {
      const obj = st.bodiesGroup.children[0];
      st.bodiesGroup.remove(obj);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    }
    st.bodyMeshes = [];

    st.sectionPlane.constant = doc.sectionHeight;
    st.sectionVisual.visible = doc.sectionEnabled;
    st.sectionVisual.position.y = doc.sectionHeight;

    const clipPlanes = doc.sectionEnabled ? [st.sectionPlane] : [];
    const edgeColor = tokens.mode === 'dark' ? '#1c2028' : '#282c34';

    for (const body of evaluated.bodies) {
      if (!body.visible) continue;
      const isSelected = selectedBodyId === body.id;
      const matSpec = getMaterialSpec(body.material);
      const baseColor = body.colorOverride || matSpec.color;

      const isWire = doc.visualStyle === 'wireframe';
      const isXray = doc.visualStyle === 'xray';

      const material = new THREE.MeshPhysicalMaterial({
        color: isSelected ? '#4c7fcb' : baseColor,
        metalness: isSelected ? 0.25 : matSpec.metalness,
        roughness: isSelected ? 0.35 : matSpec.roughness,
        clearcoat: matSpec.clearcoat ?? 0,
        transparent: isXray || (matSpec.opacity !== undefined && matSpec.opacity < 1),
        opacity: isXray ? 0.34 : matSpec.opacity ?? 1,
        wireframe: isWire,
        emissive: isSelected ? new THREE.Color('#1d4f91') : new THREE.Color(0x000000),
        emissiveIntensity: isSelected ? 0.25 : 0,
        clippingPlanes: clipPlanes,
        clipShadows: true,
        side: doc.sectionEnabled ? THREE.DoubleSide : THREE.FrontSide,
      });

      for (const part of body.meshes) {
        const geom = buildPartGeometry(part);
        const mesh = new THREE.Mesh(geom, material);
        mesh.castShadow = !st.isSoftwareGl && !isXray && !isWire;
        mesh.receiveShadow = !st.isSoftwareGl;
        mesh.userData.bodyId = body.id;
        mesh.userData.bodyName = body.name;
        st.bodiesGroup.add(mesh);
        st.bodyMeshes.push(mesh);

        if (doc.visualStyle === 'shaded_edges' || doc.visualStyle === 'xray') {
          const edgesGeom = new THREE.EdgesGeometry(geom, 24);
          const edgeMat = new THREE.LineBasicMaterial({
            color: isSelected ? tokens.accent : edgeColor,
            transparent: true,
            opacity: isSelected ? 1 : 0.72,
            clippingPlanes: clipPlanes,
          });
          const edgeLines = new THREE.LineSegments(edgesGeom, edgeMat);
          st.bodiesGroup.add(edgeLines);
        }
      }
    }

    st.requestRender();
  }, [
    evaluated,
    selectedBodyId,
    doc.visualStyle,
    doc.sectionEnabled,
    doc.sectionHeight,
    tokens,
  ]);

  // Rebuild Active/Visible Sketches Overlay
  useEffect(() => {
    const st = threeRef.current;
    if (!st) return;

    while (st.sketchGroup.children.length > 0) {
      const child = st.sketchGroup.children[0];
      st.sketchGroup.remove(child);
      if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    const sketchesToDraw = doc.sketches.filter((s) => s.visible || s.id === activeSketch?.id);
    for (const sk of sketchesToDraw) {
      const isEditing = activeSketch?.id === sk.id;
      const offset = 0.15;

      for (const ent of sk.entities) {
        const color = ent.construction
          ? '#e68228'
          : isEditing
          ? tokens.sketchInk
          : '#2b8a57';

        if (ent.kind === 'line' && ent.points && ent.points.length >= 2) {
          const pts = ent.points.map(([u, v]) => sketchPlaneToThree(u, v, sk.plane, offset));
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color });
          st.sketchGroup.add(ent.closed ? new THREE.LineLoop(geom, mat) : new THREE.Line(geom, mat));
        } else {
          const contour = entityToContour(ent, evaluated.resolvedParams);
          if (contour && contour.length >= 3) {
            const pts = contour.map(([u, v]) => sketchPlaneToThree(u, v, sk.plane, offset));
            const geom = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineBasicMaterial({ color });
            st.sketchGroup.add(new THREE.LineLoop(geom, mat));
          }
        }
      }
    }

    st.requestRender();
  }, [doc.sketches, activeSketch, evaluated.resolvedParams, tokens]);

  // Rebuild Measure 3D Overlay
  useEffect(() => {
    const st = threeRef.current;
    if (!st) return;

    while (st.overlayGroup.children.length > 0) {
      const child = st.overlayGroup.children[0];
      st.overlayGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    const pts = measurePoints.map(([x, y, z]) => new THREE.Vector3(x, z, -y));
    for (const p of pts) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 16, 12),
        new THREE.MeshBasicMaterial({ color: tokens.accent })
      );
      dot.position.copy(p);
      st.overlayGroup.add(dot);
    }
    if (pts.length === 2) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(
        lineGeom,
        new THREE.LineBasicMaterial({ color: tokens.accent })
      );
      st.overlayGroup.add(line);
    }

    st.requestRender();
  }, [measurePoints, tokens]);

  // Fit View helper
  const runFitView = useCallback(() => {
    const st = threeRef.current;
    if (!st) return;
    const box = new THREE.Box3();
    for (const mesh of st.bodyMeshes) {
      box.expandByObject(mesh);
    }
    if (box.isEmpty()) {
      st.animTargetLook = new THREE.Vector3(0, 0, 0);
      st.animTargetPos = new THREE.Vector3(110, 85, 110);
    } else {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 30);
      const dir = st.camera.position.clone().sub(st.controls.target).normalize();
      if (dir.lengthSq() < 0.01) dir.set(1, 0.8, 1).normalize();
      st.animTargetLook = center;
      st.animTargetPos = center.clone().addScaledVector(dir, maxDim * 2.05);
    }
    st.requestRender();
  }, []);

  useEffect(() => {
    if (fitCommandSeq > 0) runFitView();
  }, [fitCommandSeq, runFitView]);

  useEffect(() => {
    if (!cameraCommand) return;
    const st = threeRef.current;
    if (!st) return;

    const box = new THREE.Box3();
    for (const mesh of st.bodyMeshes) box.expandByObject(mesh);
    const center = box.isEmpty() ? new THREE.Vector3(0, 0, 0) : box.getCenter(new THREE.Vector3());
    const size = box.isEmpty() ? new THREE.Vector3(60, 40, 60) : box.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z, 50) * 2.1;

    _targetLook.copy(center);
    switch (cameraCommand.preset) {
      case 'front':
        _targetPos.set(center.x, center.y, center.z + dist);
        break;
      case 'back':
        _targetPos.set(center.x, center.y, center.z - dist);
        break;
      case 'top':
        _targetPos.set(center.x, center.y + dist, center.z + 0.01);
        break;
      case 'bottom':
        _targetPos.set(center.x, center.y - dist, center.z + 0.01);
        break;
      case 'right':
        _targetPos.set(center.x + dist, center.y, center.z);
        break;
      case 'left':
        _targetPos.set(center.x - dist, center.y, center.z);
        break;
      default:
        _targetPos.set(center.x + dist * 0.68, center.y + dist * 0.56, center.z + dist * 0.68);
        break;
    }

    st.animTargetLook = _targetLook.clone();
    st.animTargetPos = _targetPos.clone();
    st.requestRender();
  }, [cameraCommand]);

  // Pointer interaction: raycast bodies / sketch plane / measure
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = threeRef.current;
    if (!st) return;
    const rect = st.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(_rayMouse, st.camera);

    if (propsRef.current.activeSketch) {
      const sk = propsRef.current.activeSketch;
      const normal =
        sk.plane === 'XY'
          ? new THREE.Vector3(0, 1, 0)
          : sk.plane === 'XZ'
          ? new THREE.Vector3(0, 0, 1)
          : new THREE.Vector3(1, 0, 0);
      const plane = new THREE.Plane(normal, 0);
      if (raycaster.ray.intersectPlane(plane, _hitPoint)) {
        setCursorCoords(worldToSketchPlane(_hitPoint, sk.plane));
      }
      return;
    }

    const hits = raycaster.intersectObjects(st.bodyMeshes, false);
    if (hits.length > 0) {
      const name = hits[0].object.userData.bodyName;
      setHoverInfo(name ? `${name}` : null);
    } else {
      setHoverInfo(null);
    }
  };

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownPos.current) return;
    const distMoved = Math.hypot(
      e.clientX - pointerDownPos.current.x,
      e.clientY - pointerDownPos.current.y
    );
    pointerDownPos.current = null;
    if (distMoved > 5 || e.button !== 0) return;

    const st = threeRef.current;
    if (!st) return;

    const rect = st.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(_rayMouse, st.camera);

    // 1. Sketch Drawing Mode
    const { activeSketch: sk, sketchTool: tool, sketchConstruction: constr } = propsRef.current;
    if (sk && tool !== 'select') {
      const normal =
        sk.plane === 'XY'
          ? new THREE.Vector3(0, 1, 0)
          : sk.plane === 'XZ'
          ? new THREE.Vector3(0, 0, 1)
          : new THREE.Vector3(1, 0, 0);
      const plane = new THREE.Plane(normal, 0);
      if (raycaster.ray.intersectPlane(plane, _hitPoint)) {
        const pt = worldToSketchPlane(_hitPoint, sk.plane);
        if (!sketchDraftStart) {
          setSketchDraftStart(pt);
        } else {
          const id = `ent_${Date.now()}`;
          if (tool === 'line') {
            propsRef.current.onAddSketchEntity({
              id,
              kind: 'line',
              construction: constr,
              points: [sketchDraftStart, pt],
              closed: false,
            });
          } else if (tool === 'rectangle') {
            propsRef.current.onAddSketchEntity({
              id,
              kind: 'rectangle',
              construction: constr,
              p0: sketchDraftStart,
              p1: pt,
            });
          } else if (tool === 'circle') {
            const radius = Math.max(1, Math.hypot(pt[0] - sketchDraftStart[0], pt[1] - sketchDraftStart[1]));
            propsRef.current.onAddSketchEntity({
              id,
              kind: 'circle',
              construction: constr,
              center: sketchDraftStart,
              diameterExpr: `${(radius * 2).toFixed(1)} mm`,
            });
          } else if (tool === 'slot') {
            const len = Math.max(6, Math.hypot(pt[0] - sketchDraftStart[0], pt[1] - sketchDraftStart[1]));
            propsRef.current.onAddSketchEntity({
              id,
              kind: 'slot',
              construction: constr,
              center: [
                (sketchDraftStart[0] + pt[0]) / 2,
                (sketchDraftStart[1] + pt[1]) / 2,
              ],
              lengthExpr: `${len.toFixed(1)} mm`,
              widthExpr: '6 mm',
            });
          }
          setSketchDraftStart(null);
        }
      }
      return;
    }

    // 2. Measure Tool
    if (propsRef.current.measureActive) {
      const hits = raycaster.intersectObjects(st.bodyMeshes, false);
      let cadPt: [number, number, number] | null = null;
      if (hits.length > 0) {
        const p = hits[0].point;
        cadPt = [p.x, -p.z, p.y];
      } else {
        const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        if (raycaster.ray.intersectPlane(ground, _hitPoint)) {
          cadPt = [snapCoord(_hitPoint.x), snapCoord(-_hitPoint.z), 0];
        }
      }
      if (cadPt) {
        const next = measurePoints.length >= 2 ? [cadPt] : [...measurePoints, cadPt];
        setMeasurePoints(next);
        if (next.length === 2) {
          const [a, b] = next;
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const dz = b[2] - a[2];
          setMeasureResult({
            p1: a,
            p2: b,
            dx,
            dy,
            dz,
            distance: Math.hypot(dx, dy, dz),
          });
        } else {
          setMeasureResult(null);
        }
      }
      return;
    }

    // 3. Body Picking
    const bodyHits = raycaster.intersectObjects(st.bodyMeshes, false);
    if (bodyHits.length > 0) {
      const hitId = bodyHits[0].object.userData.bodyId as string;
      propsRef.current.onSelectBody(hitId);
      return;
    }

    // 4. Deselect
    propsRef.current.onSelectBody(null);
  };

  const hasRevoluteJoint = doc.features.some((f) => f.kind === 'joint.revolute' && !f.suppressed);

  return (
    <div
      className="relative flex-1 overflow-hidden select-none"
      style={{
        background: `linear-gradient(180deg, ${tokens.viewportTop} 0%, ${tokens.viewportBottom} 100%)`,
      }}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Readouts (Hover / Sketch Coords / Measure / Section / Joint Drive) */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-10">
        {hoverInfo && !activeSketch && !measureActive && (
          <div
            className="px-2.5 py-1 rounded-[5px] border text-[11.5px] font-medium shadow-sm"
            style={{
              backgroundColor: tokens.panel,
              borderColor: tokens.border,
              color: tokens.text,
            }}
          >
            {hoverInfo}
          </div>
        )}

        {activeSketch && (
          <div
            className="px-3 py-1.5 rounded-[6px] border text-[11.5px] shadow-md pointer-events-auto flex items-center gap-3"
            style={{
              backgroundColor: tokens.sketchSoft,
              borderColor: tokens.sketchInk,
              color: tokens.text,
            }}
          >
            <span className="font-semibold" style={{ color: tokens.sketchInk }}>
              Modo Esboço ({activeSketch.plane})
            </span>
            <span className="text-[11px] opacity-85">
              {sketchTool === 'select'
                ? 'Escolha uma ferramenta de esboço acima'
                : sketchDraftStart
                ? `Clique no segundo ponto (de ${sketchDraftStart[0]}, ${sketchDraftStart[1]})`
                : `Clique no primeiro ponto para desenhar`}
            </span>
            {cursorCoords && (
              <span className="cad-mono text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: tokens.panel }}>
                X:{cursorCoords[0].toFixed(1)} Y:{cursorCoords[1].toFixed(1)}
              </span>
            )}
          </div>
        )}

        {measureActive && (
          <div
            className="px-3 py-2 rounded-[6px] border text-[11.5px] shadow-md pointer-events-auto space-y-1"
            style={{
              backgroundColor: tokens.panel,
              borderColor: tokens.accent,
              color: tokens.text,
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold flex items-center gap-1.5" style={{ color: tokens.accent }}>
                <Ruler className="w-3.5 h-3.5" />
                Medir Distância
              </span>
              <button
                type="button"
                onClick={onToggleMeasure}
                className="text-[10.5px] opacity-70 hover:opacity-100 cursor-pointer"
              >
                Fechar
              </button>
            </div>
            {measureResult ? (
              <div className="cad-mono text-[11px] space-y-0.5">
                <div className="font-bold text-[12.5px]">
                  Distância: {measureResult.distance.toFixed(2)} {doc.units}
                </div>
                <div style={{ color: tokens.textDim }}>
                  ΔX {measureResult.dx.toFixed(2)} • ΔY {measureResult.dy.toFixed(2)} • ΔZ{' '}
                  {measureResult.dz.toFixed(2)}
                </div>
              </div>
            ) : (
              <div style={{ color: tokens.textDim }}>
                {measurePoints.length === 0
                  ? 'Clique no Ponto 1 no corpo ou plano'
                  : 'Clique no Ponto 2 para medir'}
              </div>
            )}
          </div>
        )}

        {doc.sectionEnabled && (
          <div
            className="px-3 py-2 rounded-[6px] border text-[11.5px] shadow-md pointer-events-auto flex items-center gap-2.5"
            style={{
              backgroundColor: tokens.panel,
              borderColor: tokens.surfaceInk,
              color: tokens.text,
            }}
          >
            <Scissors className="w-3.5 h-3.5" style={{ color: tokens.surfaceInk }} />
            <span className="font-semibold">Corte Z:</span>
            <input
              type="range"
              min={-10}
              max={60}
              step={0.5}
              value={doc.sectionHeight}
              onChange={(e) => onChangeSectionHeight(parseFloat(e.target.value))}
              className="w-28 cursor-pointer"
            />
            <span className="cad-mono w-12 text-right">{doc.sectionHeight.toFixed(1)}</span>
          </div>
        )}

        {hasRevoluteJoint && (
          <div
            className="px-3 py-2 rounded-[6px] border text-[11.5px] shadow-md pointer-events-auto flex items-center gap-2.5"
            style={{
              backgroundColor: tokens.panel,
              borderColor: tokens.formInk,
              color: tokens.text,
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: tokens.formInk }} />
            <span className="font-semibold">Acionar Junta:</span>
            <input
              type="range"
              min={0}
              max={180}
              step={1}
              value={doc.jointAngleDeg}
              onChange={(e) => onChangeJointAngle(parseFloat(e.target.value))}
              className="w-28 cursor-pointer"
            />
            <span className="cad-mono w-10 text-right">{doc.jointAngleDeg}°</span>
          </div>
        )}
      </div>

      {/* ViewCube / Tríade de Navegação Superior Direito */}
      <div
        className="absolute top-3 right-3 rounded-[8px] border p-2 shadow-md flex flex-col items-center gap-1.5 z-10"
        style={{
          backgroundColor: tokens.panel,
          borderColor: tokens.border,
          color: tokens.text,
        }}
      >
        <div className="flex items-center justify-between w-full gap-1">
          <button
            type="button"
            onClick={() => onCameraPreset('iso')}
            className="p-1 rounded hover:opacity-100 opacity-75 cursor-pointer"
            title="Vista Inicial Isométrica"
            style={{ backgroundColor: tokens.hover }}
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Vista</span>
          <button
            type="button"
            onClick={onFitView}
            className="p-1 rounded hover:opacity-100 opacity-75 cursor-pointer"
            title="Enquadrar Modelo na Vista"
            style={{ backgroundColor: tokens.hover }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold">
          <ViewCubeBtn label="ESQ" title="Vista Esquerda" onClick={() => onCameraPreset('left')} tokens={tokens} />
          <ViewCubeBtn label="SUP" title="Vista Superior" onClick={() => onCameraPreset('top')} tokens={tokens} />
          <ViewCubeBtn label="DIR" title="Vista Direita" onClick={() => onCameraPreset('right')} tokens={tokens} />
          <ViewCubeBtn label="TRÁS" title="Vista Traseira" onClick={() => onCameraPreset('back')} tokens={tokens} />
          <ViewCubeBtn label="FRENTE" title="Vista Frontal" onClick={() => onCameraPreset('front')} tokens={tokens} active />
          <ViewCubeBtn label="INF" title="Vista Inferior" onClick={() => onCameraPreset('bottom')} tokens={tokens} />
        </div>
      </div>

      {/* Barra Flutuante de Navegação e Exibição */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 h-[32px] px-2 rounded-[7px] border shadow-md flex items-center gap-1 z-10"
        style={{
          backgroundColor: tokens.panel,
          borderColor: tokens.border,
          color: tokens.text,
        }}
      >
        <NavIconBtn
          title="Orbitar (Botão Esquerdo)"
          onClick={() => onCameraPreset('iso')}
          tokens={tokens}
        >
          <Orbit className="w-3.5 h-3.5" />
        </NavIconBtn>
        <NavIconBtn title="Mover / Pan (Botão Direito ou Meio)" onClick={onFitView} tokens={tokens}>
          <Move className="w-3.5 h-3.5" />
        </NavIconBtn>
        <NavIconBtn title="Enquadrar Tudo (F)" onClick={onFitView} tokens={tokens}>
          <Maximize2 className="w-3.5 h-3.5" />
        </NavIconBtn>

        <span className="h-4 w-px mx-1" style={{ backgroundColor: tokens.border }} />

        <div className="flex items-center gap-1 px-1">
          <Eye className="w-3.5 h-3.5 opacity-65" />
          <select
            value={doc.visualStyle}
            onChange={(e) => onChangeVisualStyle(e.target.value as VisualStyle)}
            className="bg-transparent text-[11px] font-medium outline-none cursor-pointer"
            style={{ color: tokens.text }}
            title="Estilo Visual"
          >
            <option value="shaded_edges" style={{ backgroundColor: tokens.panel }}>Sombreado + Arestas</option>
            <option value="shaded" style={{ backgroundColor: tokens.panel }}>Sombreado</option>
            <option value="wireframe" style={{ backgroundColor: tokens.panel }}>Aramado</option>
            <option value="xray" style={{ backgroundColor: tokens.panel }}>Raio-X</option>
          </select>
        </div>

        <span className="h-4 w-px mx-1" style={{ backgroundColor: tokens.border }} />

        <NavIconBtn
          title="Alternar Grade de Trabalho"
          active={doc.showGrid}
          onClick={onToggleGrid}
          tokens={tokens}
        >
          <Grid className="w-3.5 h-3.5" />
        </NavIconBtn>
        <NavIconBtn
          title="Alternar Corte de Seção"
          active={doc.sectionEnabled}
          onClick={onToggleSection}
          tokens={tokens}
        >
          <Scissors className="w-3.5 h-3.5" />
        </NavIconBtn>
        <NavIconBtn
          title="Medir Distância"
          active={measureActive}
          onClick={onToggleMeasure}
          tokens={tokens}
        >
          <Ruler className="w-3.5 h-3.5" />
        </NavIconBtn>
        <NavIconBtn
          title="Vista Isométrica Inicial"
          onClick={() => onCameraPreset('iso')}
          tokens={tokens}
        >
          <Compass className="w-3.5 h-3.5" />
        </NavIconBtn>
      </div>
    </div>
  );
};

const ViewCubeBtn: React.FC<{
  label: string;
  title: string;
  onClick: () => void;
  tokens: ThemeTokens;
  active?: boolean;
}> = ({ label, title, onClick, tokens, active }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="h-[22px] min-w-[34px] px-1 rounded-[4px] border flex items-center justify-center transition-colors cursor-pointer"
    style={{
      backgroundColor: active ? tokens.accentSoft : tokens.controlFill,
      borderColor: active ? tokens.accent : tokens.controlBorder,
      color: active ? tokens.selectedInk : tokens.text,
    }}
  >
    {label}
  </button>
);

const NavIconBtn: React.FC<{
  children: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
  tokens: ThemeTokens;
}> = ({ children, title, active, onClick, tokens }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="w-[26px] h-[24px] rounded-[4px] flex items-center justify-center transition-colors cursor-pointer"
    style={{
      backgroundColor: active ? tokens.accentSoft : 'transparent',
      color: active ? tokens.selectedInk : tokens.text,
    }}
  >
    {children}
  </button>
);
