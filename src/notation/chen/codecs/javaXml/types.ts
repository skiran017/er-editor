// 1:1 mirror of Java class hierarchy in
// /Users/kiri/SUPSI/.../ch/supsi/database/erconstructs/. Discriminator
// `_kind` matches the XML element name verbatim — that's how XMLReader
// dispatches and how XMLWriter emits.

export type JavaAttribute = JavaSimpleAttribute | JavaCompositeAttribute

export interface JavaSimpleAttribute {
  readonly _kind: 'SimpleAttribute'
  readonly id: number
  readonly name: string
  readonly multiValued: boolean
  readonly derived: boolean
}

export interface JavaCompositeAttribute {
  readonly _kind: 'CompositeAttribute'
  readonly id: number
  readonly name: string
  readonly multiValued: boolean
  readonly derived: boolean
  readonly children: readonly JavaAttribute[]
}

export type JavaEntitySet = JavaStrongEntitySet | JavaWeakEntitySet

export interface JavaStrongEntitySet {
  readonly _kind: 'StrongEntitySet'
  readonly id: number
  readonly name: string
  readonly attributes: readonly JavaAttribute[]
  /** Refs into `attributes` by id. Empty array means no key declared. */
  readonly primaryKey: readonly number[]
}

export interface JavaWeakEntitySet {
  readonly _kind: 'WeakEntitySet'
  readonly id: number
  readonly name: string
  readonly attributes: readonly JavaAttribute[]
  /** Refs into `attributes` by id. Empty array means no discriminant declared. */
  readonly discriminant: readonly number[]
}

// Seven concrete Java classes for relationship sets. Class name encodes
// the cardinality combo + identifying flag.
export type JavaRelationshipSetKind =
  | 'RelationshipSetOneToOne'
  | 'RelationshipSetOneToN'
  | 'RelationshipSetNToOne'
  | 'RelationshipSetNToN'
  | 'IdentifyingRelationshipSetOneToOne'
  | 'IdentifyingRelationshipSetOneToN'
  | 'IdentifyingRelationshipSetNToOne'

export type JavaIdentifyingRelationshipSetKind =
  | 'IdentifyingRelationshipSetOneToOne'
  | 'IdentifyingRelationshipSetOneToN'
  | 'IdentifyingRelationshipSetNToOne'

/**
 * Single interface for all 7 Java relationship-set classes.
 *
 * Design note: every concrete Java class (RelationshipSetOneToOne,
 * RelationshipSetOneToN, RelationshipSetNToOne, RelationshipSetNToN,
 * IdentifyingRelationshipSetOneToOne, IdentifyingRelationshipSetOneToN,
 * IdentifyingRelationshipSetNToOne) carries exactly the same fields —
 * id, name, attributes, branches. There is NO structural difference
 * between variants, so we model them with ONE interface and use `_kind`
 * purely as a tag for logic dispatch (cardinality extraction,
 * identifying-flag check). Transformer code MUST branch on `_kind`
 * (or use `isIdentifyingRelationship`) rather than expecting per-variant
 * structural narrowing.
 */
export interface JavaRelationshipSet {
  readonly _kind: JavaRelationshipSetKind
  readonly id: number
  readonly name: string
  readonly attributes: readonly JavaAttribute[]
  readonly branches: readonly JavaRelationshipSetBranch[]
}

export interface JavaIdentifyingRelationshipSet extends JavaRelationshipSet {
  readonly _kind: JavaIdentifyingRelationshipSetKind
}

export interface JavaRelationshipSetBranch {
  readonly _kind: 'RelationshipSetBranch'
  readonly id: number
  readonly cardinality: '1' | 'N'
  readonly totalParticipation: boolean
  readonly role: string
  /** Reference to a StrongEntitySet or WeakEntitySet. */
  readonly entityRef: { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }
}

export type JavaGeneralization = JavaPartialGeneralization | JavaTotalGeneralization

export interface JavaPartialGeneralization {
  readonly _kind: 'Generalization'
  readonly id: number
  readonly total: boolean // Java sets `total="true|false"` even on this class
  readonly parent: { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }
  readonly children: readonly { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }[]
}

/**
 * Class invariant: `total` is ALWAYS `true` for a TotalGeneralization per
 * Java's class hierarchy. Readers must set `total: true`; writers must NOT
 * rely on the `total` field alone to choose the XML element name — use
 * `_kind` instead (a PartialGeneralization with `total: true` set in the
 * XML would still have `_kind: 'Generalization'`).
 */
export interface JavaTotalGeneralization {
  readonly _kind: 'TotalGeneralization'
  readonly id: number
  readonly total: boolean
  readonly parent: { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }
  readonly children: readonly { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }[]
}

export interface JavaSchema {
  readonly name: string
  readonly lastId: number
  readonly entities: readonly JavaEntitySet[]
  readonly relationships: readonly JavaRelationshipSet[]
  readonly generalizations: readonly JavaGeneralization[]
}

export interface JavaPosition {
  readonly x: number
  readonly y: number
}

export interface JavaDiagram {
  /**
   * Position map keyed by integer element id.
   * Covers entities (StrongEntitySet, WeakEntitySet), relationships
   * (all 7 RelationshipSet kinds), generalizations (Generalization,
   * TotalGeneralization), and attributes — including composite children.
   * Branches (RelationshipSetBranch) are the ONLY diagrammable construct
   * excluded; Java does not store branch positions.
   */
  readonly positions: ReadonlyMap<number, JavaPosition>
}

export interface JavaModel {
  readonly schema: JavaSchema
  readonly diagram: JavaDiagram
}

// Type guards
export const isStrongEntity = (e: JavaEntitySet): e is JavaStrongEntitySet =>
  e._kind === 'StrongEntitySet'

export const isWeakEntity = (e: JavaEntitySet): e is JavaWeakEntitySet =>
  e._kind === 'WeakEntitySet'

export const isCompositeAttribute = (a: JavaAttribute): a is JavaCompositeAttribute =>
  a._kind === 'CompositeAttribute'

const IDENTIFYING_KINDS: ReadonlySet<JavaIdentifyingRelationshipSetKind> = new Set([
  'IdentifyingRelationshipSetOneToOne',
  'IdentifyingRelationshipSetOneToN',
  'IdentifyingRelationshipSetNToOne',
])

export const isIdentifyingRelationship = (
  r: JavaRelationshipSet,
): r is JavaIdentifyingRelationshipSet =>
  IDENTIFYING_KINDS.has(r._kind as JavaIdentifyingRelationshipSetKind)

export const isTotalGeneralization = (g: JavaGeneralization): g is JavaTotalGeneralization =>
  g._kind === 'TotalGeneralization'
