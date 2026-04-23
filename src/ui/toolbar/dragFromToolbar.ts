// Re-export of the drag-MIME helpers. The canonical implementation lives in
// @/domain/dragMime so the canvas drop handler can reach it without crossing
// the canvas→ui layer boundary (spec §2.2). Toolbar consumers keep their
// existing import path via this re-export.
export { TOOL_MIME, writeToolToDataTransfer, readToolFromDataTransfer } from '@/domain/dragMime'
