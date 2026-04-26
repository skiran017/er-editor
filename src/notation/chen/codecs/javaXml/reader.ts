// src/notation/chen/codecs/javaXml/reader.ts
import type {
  JavaAttribute,
  JavaCompositeAttribute,
  JavaSimpleAttribute,
  JavaEntitySet,
  JavaGeneralization,
  JavaModel,
  JavaPosition,
  JavaRelationshipSet,
  JavaRelationshipSetBranch,
  JavaRelationshipSetKind,
  JavaSchema,
  JavaStrongEntitySet,
  JavaWeakEntitySet,
} from './types'

const RELATIONSHIP_KINDS: ReadonlySet<JavaRelationshipSetKind> = new Set([
  'RelationshipSetOneToOne', 'RelationshipSetOneToN', 'RelationshipSetNToOne', 'RelationshipSetNToN',
  'IdentifyingRelationshipSetOneToOne', 'IdentifyingRelationshipSetOneToN', 'IdentifyingRelationshipSetNToOne',
])

const childByName = (parent: Element, name: string): Element | null =>
  Array.from(parent.children).find((c) => c.tagName === name) ?? null

const childrenOf = (parent: Element | null): readonly Element[] =>
  parent ? Array.from(parent.children) : []

const intAttr = (el: Element, name: string): number => {
  const raw = el.getAttribute(name)
  if (raw === null) throw new Error(`Missing attribute "${name}" on <${el.tagName}>`)
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) throw new Error(`Invalid integer "${raw}" for "${name}" on <${el.tagName}>`)
  return n
}

const stringAttr = (el: Element, name: string): string => {
  const raw = el.getAttribute(name)
  if (raw === null) throw new Error(`Missing attribute "${name}" on <${el.tagName}>`)
  return raw
}

const boolAttr = (el: Element, name: string): boolean => {
  const raw = stringAttr(el, name)
  if (raw !== 'true' && raw !== 'false') {
    throw new Error(`Expected "true" or "false" for "${name}" on <${el.tagName}>, got "${raw}"`)
  }
  return raw === 'true'
}

const parseSimpleAttribute = (el: Element): JavaSimpleAttribute => ({
  _kind: 'SimpleAttribute',
  id: intAttr(el, 'id'),
  name: stringAttr(el, 'name'),
  multiValued: boolAttr(el, 'multiValued'),
  derived: boolAttr(el, 'derived'),
})

const parseCompositeAttribute = (el: Element): JavaCompositeAttribute => ({
  _kind: 'CompositeAttribute',
  id: intAttr(el, 'id'),
  name: stringAttr(el, 'name'),
  multiValued: boolAttr(el, 'multiValued'),
  derived: boolAttr(el, 'derived'),
  children: childrenOf(childByName(el, 'Children')).map(parseAttribute),
})

const parseAttribute = (el: Element): JavaAttribute => {
  if (el.tagName === 'SimpleAttribute') return parseSimpleAttribute(el)
  if (el.tagName === 'CompositeAttribute') return parseCompositeAttribute(el)
  throw new Error(`Unexpected attribute element <${el.tagName}>`)
}

const parseRefList = (parent: Element | null): readonly number[] =>
  parent ? Array.from(parent.children).map((c) => intAttr(c, 'refid')) : []

const parseStrongEntity = (el: Element): JavaStrongEntitySet => ({
  _kind: 'StrongEntitySet',
  id: intAttr(el, 'id'),
  name: stringAttr(el, 'name'),
  attributes: childrenOf(childByName(el, 'Attributes')).map(parseAttribute),
  primaryKey: parseRefList(childByName(el, 'PrimaryKey')),
})

const parseWeakEntity = (el: Element): JavaWeakEntitySet => ({
  _kind: 'WeakEntitySet',
  id: intAttr(el, 'id'),
  name: stringAttr(el, 'name'),
  attributes: childrenOf(childByName(el, 'Attributes')).map(parseAttribute),
  discriminant: parseRefList(childByName(el, 'Discriminant')),
})

const parseEntity = (el: Element): JavaEntitySet => {
  if (el.tagName === 'StrongEntitySet') return parseStrongEntity(el)
  if (el.tagName === 'WeakEntitySet') return parseWeakEntity(el)
  throw new Error(`Unexpected entity element <${el.tagName}>`)
}

const parseEntityRef = (el: Element): { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number } => {
  if (el.tagName !== 'StrongEntitySet' && el.tagName !== 'WeakEntitySet') {
    throw new Error(`Unexpected entity ref element <${el.tagName}>`)
  }
  return { _kind: el.tagName, refid: intAttr(el, 'refid') }
}

const parseBranch = (el: Element): JavaRelationshipSetBranch => {
  const ses = childByName(el, 'StrongEntitySet')
  const wes = childByName(el, 'WeakEntitySet')
  const ref = ses ?? wes
  if (!ref) throw new Error('RelationshipSetBranch missing entity reference')
  const cardinality = stringAttr(el, 'cardinality')
  if (cardinality !== '1' && cardinality !== 'N') {
    throw new Error(`Unexpected cardinality "${cardinality}"`)
  }
  return {
    _kind: 'RelationshipSetBranch',
    id: intAttr(el, 'id'),
    cardinality,
    totalParticipation: boolAttr(el, 'totalParticipation'),
    role: stringAttr(el, 'role'),
    entityRef: parseEntityRef(ref),
  }
}

const parseRelationship = (el: Element): JavaRelationshipSet => {
  if (!RELATIONSHIP_KINDS.has(el.tagName as JavaRelationshipSetKind)) {
    throw new Error(`Unexpected relationship element <${el.tagName}>`)
  }
  const kind = el.tagName as JavaRelationshipSetKind
  return {
    _kind: kind,
    id: intAttr(el, 'id'),
    name: stringAttr(el, 'name'),
    attributes: childrenOf(childByName(el, 'Attributes')).map(parseAttribute),
    branches: childrenOf(childByName(el, 'Branches')).map(parseBranch),
  }
}

const parseGeneralization = (el: Element): JavaGeneralization => {
  const kind = el.tagName
  if (kind !== 'Generalization' && kind !== 'TotalGeneralization') {
    throw new Error(`Unexpected generalization element <${el.tagName}>`)
  }
  const parent = childByName(el, 'Parent')
  if (!parent) throw new Error('Generalization missing <Parent>')
  const parentRef = parent.children[0]
  if (!parentRef) throw new Error('Generalization parent has no entity ref')
  return {
    _kind: kind,
    id: intAttr(el, 'id'),
    total: boolAttr(el, 'total'),
    parent: parseEntityRef(parentRef),
    children: childrenOf(childByName(el, 'Children')).map(parseEntityRef),
  }
}

const parseSchema = (root: Element): JavaSchema => {
  const schemaEl = childByName(root, 'ERDatabaseSchema')
  if (!schemaEl) throw new Error('Missing <ERDatabaseSchema>')
  return {
    name: stringAttr(schemaEl, 'name'),
    lastId: intAttr(schemaEl, 'lastId'),
    entities: childrenOf(childByName(schemaEl, 'EntitySets')).map(parseEntity),
    relationships: childrenOf(childByName(schemaEl, 'RelationshipSets')).map(parseRelationship),
    generalizations: childrenOf(childByName(schemaEl, 'Generalizations')).map(parseGeneralization),
  }
}

const parseDiagram = (root: Element): { readonly positions: ReadonlyMap<number, JavaPosition> } => {
  const diagramEl = childByName(root, 'ERDatabaseDiagram')
  const positions = new Map<number, JavaPosition>()
  if (!diagramEl) return { positions }
  for (const child of Array.from(diagramEl.children)) {
    const refid = intAttr(child, 'refid')
    const positionEl = childByName(child, 'Position')
    if (!positionEl) continue
    positions.set(refid, { x: intAttr(positionEl, 'x'), y: intAttr(positionEl, 'y') })
  }
  return { positions }
}

export const parseJavaXml = (xml: string): JavaModel => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const errorEl = doc.querySelector('parsererror')
  if (errorEl) throw new Error(`XML parse error: ${errorEl.textContent ?? 'unknown'}`)
  const root = doc.documentElement
  if (root.tagName !== 'ERDatabaseModel') {
    throw new Error(`Expected <ERDatabaseModel>, got <${root.tagName}>`)
  }
  return { schema: parseSchema(root), diagram: parseDiagram(root) }
}
