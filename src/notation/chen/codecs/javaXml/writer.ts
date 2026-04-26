// src/notation/chen/codecs/javaXml/writer.ts
import type {
  JavaAttribute,
  JavaEntitySet,
  JavaGeneralization,
  JavaModel,
  JavaRelationshipSet,
  JavaRelationshipSetBranch,
  JavaSchema,
} from './types'
import { isStrongEntity, isWeakEntity, isCompositeAttribute } from './types'

const INDENT = '  '

// Apostrophe is intentionally NOT escaped: attribute values use double-quote
// delimiters, so bare ' is legal XML and the SUPSI fixtures contain it
// literally (e.g. ENTITA'). Escaping to &apos; would break byte-clean round-trip.
const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const attr = (name: string, value: string | number | boolean): string =>
  `${name}="${escape(String(value))}"`

const open = (depth: number, name: string, attrs: readonly string[]): string =>
  `${INDENT.repeat(depth)}<${name}${attrs.length ? ' ' + attrs.join(' ') : ''}>`

const empty = (depth: number, name: string, attrs: readonly string[]): string =>
  `${INDENT.repeat(depth)}<${name}${attrs.length ? ' ' + attrs.join(' ') : ''} />`

const close = (depth: number, name: string): string => `${INDENT.repeat(depth)}</${name}>`

const writeSimpleAttribute = (depth: number, a: JavaAttribute): string => {
  if (isCompositeAttribute(a)) {
    if (a.children.length === 0) {
      return empty(depth, 'CompositeAttribute', [
        attr('id', a.id), attr('name', a.name),
        attr('multiValued', a.multiValued), attr('derived', a.derived),
      ])
    }
    const head = open(depth, 'CompositeAttribute', [
      attr('id', a.id), attr('name', a.name),
      attr('multiValued', a.multiValued), attr('derived', a.derived),
    ])
    const children = [
      open(depth + 1, 'Children', []),
      ...a.children.map((c) => writeSimpleAttribute(depth + 2, c)),
      close(depth + 1, 'Children'),
    ]
    return [head, ...children, close(depth, 'CompositeAttribute')].join('\n')
  }
  return empty(depth, 'SimpleAttribute', [
    attr('id', a.id), attr('name', a.name),
    attr('multiValued', a.multiValued), attr('derived', a.derived),
  ])
}

const writeAttributesContainer = (depth: number, attrs: readonly JavaAttribute[]): string => {
  if (attrs.length === 0) return empty(depth, 'Attributes', [])
  return [
    open(depth, 'Attributes', []),
    ...attrs.map((a) => writeSimpleAttribute(depth + 1, a)),
    close(depth, 'Attributes'),
  ].join('\n')
}

const writeRefList = (depth: number, container: string, attrs: readonly JavaAttribute[], refs: readonly number[]): string => {
  if (refs.length === 0) return ''
  const lookup = new Map<number, JavaAttribute>()
  for (const a of attrs) lookup.set(a.id, a)
  return [
    open(depth, container, []),
    ...refs.map((id) => {
      const a = lookup.get(id)
      const tag = a && isCompositeAttribute(a) ? 'CompositeAttribute' : 'SimpleAttribute'
      return empty(depth + 1, tag, [attr('refid', id)])
    }),
    close(depth, container),
  ].join('\n')
}

const writeEntity = (depth: number, e: JavaEntitySet): string => {
  const head = open(depth, e._kind, [attr('id', e.id), attr('name', e.name)])
  const attrsBlock = writeAttributesContainer(depth + 1, e.attributes)
  if (isStrongEntity(e)) {
    const pk = writeRefList(depth + 1, 'PrimaryKey', e.attributes, e.primaryKey)
    return [head, attrsBlock, ...(pk ? [pk] : []), close(depth, 'StrongEntitySet')].join('\n')
  }
  if (isWeakEntity(e)) {
    const dscr = writeRefList(depth + 1, 'Discriminant', e.attributes, e.discriminant)
    return [head, attrsBlock, ...(dscr ? [dscr] : []), close(depth, 'WeakEntitySet')].join('\n')
  }
  const _exhaustive: never = e
  return _exhaustive
}

const writeBranch = (depth: number, b: JavaRelationshipSetBranch): string => [
  open(depth, 'RelationshipSetBranch', [
    attr('id', b.id),
    attr('cardinality', b.cardinality),
    attr('totalParticipation', b.totalParticipation),
    attr('role', b.role),
  ]),
  empty(depth + 1, b.entityRef._kind, [attr('refid', b.entityRef.refid)]),
  close(depth, 'RelationshipSetBranch'),
].join('\n')

const writeRelationship = (depth: number, r: JavaRelationshipSet): string => [
  open(depth, r._kind, [attr('id', r.id), attr('name', r.name)]),
  writeAttributesContainer(depth + 1, r.attributes),
  r.branches.length === 0
    ? empty(depth + 1, 'Branches', [])
    : [
        open(depth + 1, 'Branches', []),
        ...r.branches.map((b) => writeBranch(depth + 2, b)),
        close(depth + 1, 'Branches'),
      ].join('\n'),
  close(depth, r._kind),
].join('\n')

const writeGeneralization = (depth: number, g: JavaGeneralization): string => [
  open(depth, g._kind, [attr('id', g.id), attr('total', g.total)]),
  open(depth + 1, 'Parent', []),
  empty(depth + 2, g.parent._kind, [attr('refid', g.parent.refid)]),
  close(depth + 1, 'Parent'),
  g.children.length === 0
    ? empty(depth + 1, 'Children', [])
    : [
        open(depth + 1, 'Children', []),
        ...g.children.map((c) => empty(depth + 2, c._kind, [attr('refid', c.refid)])),
        close(depth + 1, 'Children'),
      ].join('\n'),
  close(depth, g._kind),
].join('\n')

const writeSchema = (depth: number, s: JavaSchema): string => {
  const lines = [
    open(depth, 'ERDatabaseSchema', [attr('name', s.name), attr('lastId', s.lastId)]),
    s.entities.length === 0
      ? empty(depth + 1, 'EntitySets', [])
      : [
          open(depth + 1, 'EntitySets', []),
          ...s.entities.map((e) => writeEntity(depth + 2, e)),
          close(depth + 1, 'EntitySets'),
        ].join('\n'),
    s.relationships.length === 0
      ? empty(depth + 1, 'RelationshipSets', [])
      : [
          open(depth + 1, 'RelationshipSets', []),
          ...s.relationships.map((r) => writeRelationship(depth + 2, r)),
          close(depth + 1, 'RelationshipSets'),
        ].join('\n'),
    s.generalizations.length === 0
      ? empty(depth + 1, 'Generalizations', [])
      : [
          open(depth + 1, 'Generalizations', []),
          ...s.generalizations.map((g) => writeGeneralization(depth + 2, g)),
          close(depth + 1, 'Generalizations'),
        ].join('\n'),
    close(depth, 'ERDatabaseSchema'),
  ]
  return lines.join('\n')
}

const buildKindLookup = (s: JavaSchema): ReadonlyMap<number, string> => {
  const map = new Map<number, string>()
  const recordAttr = (a: JavaAttribute): void => {
    map.set(a.id, a._kind)
    if (isCompositeAttribute(a)) for (const c of a.children) recordAttr(c)
  }
  for (const e of s.entities) {
    map.set(e.id, e._kind)
    for (const a of e.attributes) recordAttr(a)
  }
  for (const r of s.relationships) {
    map.set(r.id, r._kind)
    for (const a of r.attributes) recordAttr(a)
  }
  for (const g of s.generalizations) {
    map.set(g.id, g._kind)
  }
  return map
}

const writeDiagram = (depth: number, model: JavaModel): string => {
  const positions = Array.from(model.diagram.positions.entries())
  if (positions.length === 0) return empty(depth, 'ERDatabaseDiagram', [])
  const kinds = buildKindLookup(model.schema)
  const sorted = positions
    .filter(([id]) => kinds.has(id))
    .sort(([a], [b]) => b - a)   // descending refid
  const lines = [
    open(depth, 'ERDatabaseDiagram', []),
    ...sorted.map(([id, p]) => {
      const kind = kinds.get(id)!
      return [
        open(depth + 1, kind, [attr('refid', id)]),
        empty(depth + 2, 'Position', [attr('x', p.x), attr('y', p.y)]),
        close(depth + 1, kind),
      ].join('\n')
    }),
    close(depth, 'ERDatabaseDiagram'),
  ]
  return lines.join('\n')
}

export interface SerializeOptions {
  readonly trailingNewline?: boolean
}

export const serializeJavaXml = (model: JavaModel, opts: SerializeOptions = {}): string => {
  const decl = '<?xml version="1.0" encoding="UTF-8"?>\n'
  const body = [
    '<ERDatabaseModel>',
    writeSchema(1, model.schema),
    writeDiagram(1, model),
    '</ERDatabaseModel>',
  ].join('\n')
  return decl + body + (opts.trailingNewline === false ? '' : '\n')
}
