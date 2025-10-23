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

export interface Attribute {
  id: string;
  name: string;
  isKey: boolean;
  isMultivalued: boolean;
  isDerived: boolean;
}

export interface Entity extends BaseElement {
  type: 'entity';
  name: string;
  attributes: Attribute[];
  isWeak: boolean;
  size: Size;
}

export interface Relationship extends BaseElement {
  type: 'relationship';
  name: string;
  entityIds: string[];
  cardinalities: Record<string, Cardinality>;
  participations: Record<string, Participation>;
  size: Size;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  points: number[];
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
  type: 'entity' | 'relationship' | 'attribute' | 'line' | 'arrow-left' | 'arrow-right';
}

export interface Diagram {
  entities: Entity[];
  relationships: Relationship[];
  connections: Connection[];
  lines: LineShape[];
  arrows: ArrowShape[];
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
  mode: 'select' | 'pan' | 'entity' | 'relationship' | 'attribute' | 'line' | 'arrow-left' | 'arrow-right';
  drawingLine: {
    isDrawing: boolean;
    startPoint: Position | null;
    currentPoint: Position | null;
  };
}

export interface ValidationError {
  elementId: string;
  message: string;
  severity: 'error' | 'warning';
}