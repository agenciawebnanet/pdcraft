export type DesignUnit = 'mm' | 'cm' | 'm' | 'in';

export type RibbonTab =
  | 'MODEL'
  | 'SURFACE'
  | 'SHEET METAL'
  | 'ASSEMBLE'
  | 'INSERT'
  | 'INSPECT'
  | 'MANAGE'
  | 'VIEW'
  | 'SKETCH';

export type WorkspaceMode = 'design' | 'render';

export type VisualStyle = 'shaded_edges' | 'shaded' | 'wireframe' | 'xray';

export type NavPreset = 'PDCraft' | 'Fusion' | 'Blender';

export type PlaneName = 'XY' | 'XZ' | 'YZ';

export interface CadParameter {
  id: string;
  name: string;
  expression: string;
  unit: string;
  comment?: string;
}

export type SketchEntityKind = 'line' | 'rectangle' | 'circle' | 'slot' | 'polygon';

export interface SketchEntity {
  id: string;
  kind: SketchEntityKind;
  construction?: boolean;
  // For line: points [x1, y1, x2, y2], or polyline points
  points?: [number, number][];
  closed?: boolean;
  // For rectangle: [x0, y0], [x1, y1]
  p0?: [number, number];
  p1?: [number, number];
  // For circle: center, diameterExpr
  center?: [number, number];
  diameterExpr?: string;
  // For slot: center, lengthExpr, widthExpr
  lengthExpr?: string;
  widthExpr?: string;
  // For polygon: sides, radiusExpr
  sides?: number;
  radiusExpr?: string;
  constraints?: string[];
}

export interface SketchData {
  id: string;
  name: string;
  plane: PlaneName;
  planeOffsetExpr?: string;
  entities: SketchEntity[];
  visible: boolean;
}

export type FeatureOperation = 'new' | 'join' | 'cut' | 'intersect';

export type FeatureKind =
  | 'sketch'
  | 'solid.box'
  | 'solid.cylinder'
  | 'solid.sphere'
  | 'solid.extrude'
  | 'solid.revolve'
  | 'solid.fillet'
  | 'solid.chamfer'
  | 'solid.shell'
  | 'solid.hole'
  | 'solid.pattern.circular'
  | 'solid.pattern.rectangular'
  | 'sheet.flange'
  | 'sheet.hem'
  | 'plastic.lip'
  | 'plastic.boss'
  | 'plastic.snap_fit'
  | 'plastic.rest'
  | 'joint.revolute'
  | 'imported.mesh';

export interface CadFeature {
  id: string;
  kind: FeatureKind;
  name: string;
  suppressed?: boolean;
  componentId: string;
  params: Record<string, any>;
}

export interface CadComponent {
  id: string;
  name: string;
  visible: boolean;
  grounded?: boolean;
  material: string;
  colorOverride?: string;
  transform?: {
    position: [number, number, number];
    rotationDeg: [number, number, number];
  };
}

export interface OriginVisibility {
  originPoint: boolean;
  axes: boolean;
  xy: boolean;
  xz: boolean;
  yz: boolean;
}

export interface DesignDocument {
  id: string;
  name: string;
  units: DesignUnit;
  parameters: CadParameter[];
  sketches: SketchData[];
  features: CadFeature[];
  components: CadComponent[];
  rollbackIndex: number; // 0..features.length
  originVisible: OriginVisibility;
  visualStyle: VisualStyle;
  showGrid: boolean;
  showGroundShadow: boolean;
  sectionEnabled: boolean;
  sectionHeight: number; // mm
  jointAngleDeg: number; // for assembly joint drive
  sheetThicknessMm: number;
  savedAt?: number;
  dirty?: boolean;
}

export interface EvaluatedBody {
  id: string;
  name: string;
  componentId: string;
  material: string;
  colorOverride?: string;
  volumeMm3: number;
  surfaceAreaMm2: number;
  massGrams: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  centerOfMass: [number, number, number];
  triangleCount: number;
  visible: boolean;
  // Serialized geometry recipe evaluated into THREE.BufferGeometry in CadViewport
  meshes: EvaluatedMeshPart[];
}

export interface EvaluatedMeshPart {
  kind: 'extrude' | 'box' | 'cylinder' | 'sphere' | 'lathe' | 'raw';
  transform: {
    position: [number, number, number];
    rotationDeg: [number, number, number];
    scale?: [number, number, number];
  };
  color?: string;
  // Extrude data (2D outer contour + holes + depth + optional bevel)
  outer?: [number, number][];
  holes?: [number, number][][];
  depth?: number;
  bevelSize?: number;
  bevelThickness?: number;
  // Box data
  boxSize?: [number, number, number];
  // Cylinder data
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  radialSegments?: number;
  // Sphere data
  radius?: number;
  // Lathe profile
  lathePoints?: [number, number][];
  latheAngleDeg?: number;
  // Raw triangles (e.g. imported STL/OBJ)
  positions?: number[];
}

export interface EvaluatedDocument {
  bodies: EvaluatedBody[];
  resolvedParams: Record<string, number>;
  totalVolumeMm3: number;
  totalMassGrams: number;
  totalAreaMm2: number;
  warnings: string[];
}

export interface SampleDesignMeta {
  id: string;
  name: string;
  about: string;
  category: 'Part' | 'Sheet Metal' | 'Assembly' | 'Plastic';
  accentColor: string;
  build: () => DesignDocument;
}
