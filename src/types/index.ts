export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  type: string;
  position: Position;
  selected: boolean;
}

// Simplified attribute stored in entity (for reference)
export interface EntityAttribute {
  id: string;
  name: string;
  isKey: boolean;
  isPartialKey: boolean; // Weak key/partial key/discriminator
  isMultivalued: boolean;
  isDerived: boolean;
}

// Full attribute with position for canvas rendering
export interface Attribute extends BaseElement {
  id: string;
  name: string;
  isKey: boolean;
  isPartialKey: boolean; // Weak key/partial key/discriminator (dashed underline)
  isMultivalued: boolean;
  isDerived: boolean;
  entityId?: string; // Parent entity ID (optional - can be on relationship)
  relationshipId?: string; // Parent relationship ID (optional - for relationship attributes)
  type: 'attribute';
  hasWarning?: boolean; // Indicates if attribute has validation warnings
  warnings?: string[]; // List of warning messages
}

export interface Entity extends BaseElement {
  type: 'entity';
  name: string;
  attributes: EntityAttribute[]; // Simplified attributes for reference
  isWeak: boolean;
  size: Size;
  rotation?: number;
  hasWarning?: boolean; // Indicates if entity has validation warnings
  warnings?: string[]; // List of warning messages
}

export interface Relationship extends BaseElement {
  type: 'relationship';
  name: string;
  entityIds: string[];
  attributes: EntityAttribute[]; // Attributes for relationships
  cardinalities: Record<string, Cardinality>;
  participations: Record<string, Participation>;
  isWeak: boolean; // Weak/identifying relationship (double border)
  size: Size;
  rotation?: number;
  hasWarning?: boolean; // Indicates if relationship has validation warnings
  warnings?: string[]; // List of warning messages
}

// Connection point on an element (which edge/side)
export type ConnectionPoint = 'top' | 'right' | 'bottom' | 'left' | 'center';

// Connection style
export type ConnectionStyle = 'straight' | 'curved' | 'orthogonal';

export interface Connection extends BaseElement {
  id: string;
  type: 'connection';
  fromId: string;
  toId: string;
  fromPoint: ConnectionPoint; // Which edge of the source element
  toPoint: ConnectionPoint; // Which edge of the target element
  points: number[]; // Main path points [x1, y1, x2, y2, ...]
  waypoints: Position[]; // Optional intermediate points for custom routing
  style: ConnectionStyle;
  cardinality: Cardinality; // Cardinality at the 'to' end
  participation: Participation; // Participation at the 'to' end
  labelPosition?: Position; // Position of the cardinality/participation label
}

export interface Generalization extends BaseElement {
  type: 'generalization';
  parentId: string; // Entity ID (superclass)
  childIds: string[]; // Entity IDs (subclasses)
  isTotal: boolean; // Total participation (double line) vs partial (single line)
  size: Size; // For the ISA triangle shape
}

export interface LineShape extends BaseElement {
  type: 'line';
  points: number[];
  strokeWidth: number;
}

export interface ArrowShape extends BaseElement {
  type: 'arrow-left' | 'arrow-right';
  points: number[];
  strokeWidth: number;
  pointerLength: number;
  pointerWidth: number;
}

export type Cardinality = '1' | 'N' | 'M';
export type Participation = 'total' | 'partial';

export interface DiagramElement extends BaseElement {
  type: 'entity' | 'relationship' | 'attribute' | 'line' | 'arrow-left' | 'arrow-right' | 'connection' | 'generalization';
}

export interface Diagram {
  entities: Entity[];
  relationships: Relationship[];
  connections: Connection[];
  generalizations: Generalization[];
  lines: LineShape[];
  arrows: ArrowShape[];
  attributes: Attribute[]; // Attributes as separate canvas elements
}

export interface EditorState {
  diagram: Diagram;
  selectedIds: string[];
  history: {
    past: Diagram[];
    future: Diagram[];
  };
  viewport: {
    scale: number;
    position: Position;
  };
  mode: 'select' | 'pan' | 'entity' | 'relationship' | 'relationship-1-1' | 'relationship-1-n' | 'relationship-n-n' | 'generalization' | 'generalization-total' | 'attribute' | 'line' | 'arrow-left' | 'arrow-right' | 'connect';
  drawingLine: {
    isDrawing: boolean;
    startPoint: Position | null;
    currentPoint: Position | null;
  };
  drawingConnection: {
    isDrawing: boolean;
    fromId: string | null;
    fromPoint: ConnectionPoint | null;
    currentPoint: Position | null;
    waypoints: Position[];
  };
  nextEntityNumber: number;
  nextRelationshipNumber: number;
  examMode: boolean; // Whether exam mode is enabled (controlled via ?examMode=true query param)
  validationEnabled: boolean; // Whether validation is enabled (controlled via Menu toggle, default: false)
  /** When set, user is in "quick relationship" flow: first entity chosen, waiting for second click */
  pendingQuickRelationship: { firstEntityId: string; mode: 'relationship-1-1' | 'relationship-1-n' | 'relationship-n-n' } | null;
  /** When set, user is in "quick generalization" flow: first entity (parent) chosen, waiting for second click (child) */
  pendingQuickGeneralization: { firstEntityId: string; mode: 'generalization' | 'generalization-total' } | null;
  /** When set, user is in "connect to generalization" flow: generalization chosen, waiting for entity to add as child */
  pendingGeneralizationConnect: string | null; // generalizationId
}

export interface ValidationError {
  elementId: string;
  message: string;
  severity: 'error' | 'warning';
}