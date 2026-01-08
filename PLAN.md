# ER Editor - Development Plan

This document tracks planned features and improvements for the ER diagram editor.

## ✅ Completed Features

- [x] Basic ER diagram tools (Entity, Relationship, Attribute, Connection)
- [x] Selection and manipulation (drag, resize, rotate)
- [x] Property panel for editing element properties
- [x] Undo/Redo functionality
- [x] XML import/export
- [x] Image export (PNG/JPEG)
- [x] Responsive floating toolbar
- [x] Hamburger menu with file operations
- [x] Theme support (Light/Dark/System)
- [x] Theme-aware shape colors
- [x] Keyboard shortcuts (V, E, R, A, C, L, Space)
- [x] Zoom controls
- [x] Pan mode (Hand tool)
- [x] Line and Arrow tools
- [x] Multi-select support
- [x] Connection waypoints
- [x] Cardinality and participation settings
- [x] Weak entities and relationships
- [x] Derived, multivalued, partial key attributes

---

## 🚀 Planned Features

### High Priority

#### 1. Copy/Paste/Duplicate
**Priority:** High | **Impact:** High
- [ ] Copy selected elements (Ctrl+C)
- [ ] Paste with offset positioning (Ctrl+V)
- [ ] Duplicate selected items (Ctrl+D)
- [ ] Maintain relationships when copying connected elements
- [ ] Cross-diagram paste support

**Why:** Dramatically improves workflow and user productivity

#### 2. Diagram Validation
**Priority:** High | **Impact:** High
- [ ] Validate ER diagram structure
- [ ] Check for orphaned entities/relationships
- [ ] Validate cardinality constraints
- [ ] Ensure proper entity-relationship connections
- [ ] Show warnings/errors in validation panel
- [ ] Real-time validation feedback

**Why:** Ensures diagram correctness and professional quality

#### 3. Selection Improvements
**Priority:** High | **Impact:** Medium
- [ ] Multi-select with drag box (lasso selection)
- [ ] Select all (Ctrl+A)
- [ ] Deselect all (Esc)
- [ ] Select by type (all entities, all relationships, etc.)
- [ ] Select connected elements
- [ ] Invert selection

**Why:** Better control over element manipulation

### Medium Priority

#### 4. Auto-Layout/Arrangement
**Priority:** Medium | **Impact:** High
- [ ] Auto-arrange entities in a grid
- [ ] Hierarchical layout for relationships
- [ ] Align selected elements (left, right, center, top, bottom)
- [ ] Distribute elements evenly (horizontal/vertical)
- [ ] Snap to grid option
- [ ] Smart connectors (auto-routing)

**Why:** Helps create clean, professional-looking diagrams quickly

#### 5. Keyboard Shortcuts Modal
**Priority:** Medium | **Impact:** Medium
- [ ] Replace toast with proper modal
- [ ] Group shortcuts by category:
  - Tools (V, E, R, A, C, L)
  - Editing (Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Y, Delete)
  - View (Space, Zoom, Pan)
  - File (Ctrl+S, Ctrl+O, Ctrl+E)
- [ ] Searchable shortcuts list
- [ ] Show shortcuts on hover

**Why:** Better discoverability and learning curve

#### 6. Zoom Enhancements
**Priority:** Medium | **Impact:** Medium
- [ ] Zoom to fit entire diagram
- [ ] Zoom to selection
- [ ] Reset zoom to 100%
- [ ] Zoom with mouse wheel
- [ ] Zoom with pinch gesture (mobile/trackpad)
- [ ] Mini-map for navigation

**Why:** Better navigation for large diagrams

#### 7. Canvas Customization
**Priority:** Medium | **Impact:** Low
- [ ] Toggle grid on/off
- [ ] Adjust grid size
- [ ] Grid color customization
- [ ] Different background colors
- [ ] Canvas size presets (A4, A3, Letter, etc.)
- [ ] Infinite canvas option

**Why:** Personalization and different use cases

### Lower Priority

#### 8. Enhanced Attribute Management
**Priority:** Low | **Impact:** Medium
- [ ] Add data types for attributes (VARCHAR, INT, DATE, etc.)
- [ ] Add constraints (NOT NULL, UNIQUE, CHECK)
- [ ] Default values for attributes
- [ ] Auto-increment/sequence settings
- [ ] Attribute descriptions/comments

**Why:** More detailed and complete database modeling

#### 9. SQL Schema Export
**Priority:** Low | **Impact:** High
- [ ] Generate CREATE TABLE statements
- [ ] Export complete database schema
- [ ] Support multiple SQL dialects (MySQL, PostgreSQL, SQLite, SQL Server)
- [ ] Include indexes and constraints
- [ ] Generate INSERT statements for sample data

**Why:** Direct database implementation from diagrams

#### 10. Templates and Examples
**Priority:** Low | **Impact:** Medium
- [ ] Pre-built diagram templates
- [ ] Quick start examples
- [ ] Common patterns library (User-Auth, E-commerce, Blog, etc.)
- [ ] Import from common schemas
- [ ] Save custom templates

**Why:** Faster onboarding and common use cases

#### 11. Collaboration Features
**Priority:** Low | **Impact:** High
- [ ] Real-time collaboration
- [ ] Comments and annotations
- [ ] Version history
- [ ] Share diagrams via link
- [ ] Export to various formats (SVG, PDF)

**Why:** Team workflows and professional use

#### 12. Advanced Features
**Priority:** Low | **Impact:** Medium
- [ ] Layers support
- [ ] Custom shapes and stencils
- [ ] Diagram notes and text boxes
- [ ] Shape libraries
- [ ] Import from existing databases (reverse engineering)
- [ ] AI-assisted diagram generation
- [ ] Diagram documentation generator

**Why:** Power user features and enterprise needs

---

## 🐛 Known Issues

- None currently

---

## 🔧 Professor Feedback - Bug Fixes & Improvements

### High Priority (Critical UX Issues)

#### 1. Auto-Adjust Connection Points on Shape Move
**Priority:** High | **Impact:** High | **Status:** ✅ Completed
- [x] When entity/relationship is moved, automatically recalculate connection points
- [x] Find closest edge/point for each connection endpoint
- [x] Update `fromPoint` and `toPoint` automatically on position change
- [x] Trigger in `updateEntity` and `updateRelationship` actions
- [x] Maintain waypoints while adjusting endpoints

**Why:** Improves diagram layout workflow - connections stay properly attached when repositioning elements

**Technical Notes:**
- Add `updateConnectionPointsOnMove()` function in editorStore
- Use `getClosestEdge()` helper to determine best connection point
- Update connections reactively when element positions change

---

#### 2. Fix Line/Connection Selection
**Priority:** High | **Impact:** High | **Status:** Not Started
- [ ] Increase hit area for connections (thicker invisible stroke for hit detection)
- [ ] Add visual feedback on hover (highlight connection)
- [ ] Implement click tolerance (10px radius around line)
- [ ] Make waypoints more easily selectable/draggable
- [ ] Improve selection for thin lines

**Why:** Currently very difficult to select connections - major UX pain point

**Technical Notes:**
- Modify `ConnectionShape.tsx` to add larger hit area
- Modify `LineShape.tsx` for better selection
- Consider using Konva's `hitStrokeWidth` property

---

#### 3. Direct Text Editing on Canvas
**Priority:** High | **Impact:** Medium | **Status:** Not Started
- [ ] Double-click entity/relationship name to enter edit mode
- [ ] Show inline text input (Konva Text with editing capability)
- [ ] Save on Enter, cancel on Escape
- [ ] Works without property panel open
- [ ] Visual feedback during editing (cursor, selection)

**Why:** Users shouldn't need to open property panel just to rename elements

**Technical Notes:**
- Add text editing to `EntityShape.tsx` and `RelationshipShape.tsx`
- Consider creating reusable `EditableText` component
- Use Konva's text editing capabilities or overlay HTML input

---

#### 4. Position Consistency in Edit Mode
**Priority:** High | **Impact:** Medium | **Status:** Not Started
- [ ] Ensure property panel position fields update in real-time when dragging
- [ ] Sync bidirectional: dragging updates panel, panel input updates position
- [ ] Prevent position desync during drag operations
- [ ] Add position X/Y fields to property panel for entities and relationships
- [ ] Ensure consistent positioning when property panel is open

**Why:** Prevents confusion when editing properties while moving elements

**Technical Notes:**
- Add position input fields to `PropertyPanel.tsx`
- Ensure `ERCanvas.tsx` updates store during drag operations
- Sync position values between canvas and panel

---

### Critical Priority (Integration Requirement)

#### 5. Java App XML Format Compatibility
**Priority:** Critical | **Impact:** High | **Status:** Not Started
- [ ] Parse Java app XML format (`ERDatabaseModel` structure)
- [ ] Convert Java XML → Our Diagram format
- [ ] Convert Our Diagram → Java XML format
- [ ] Auto-detect XML format on import
- [ ] Support both formats (current + Java app format)
- [ ] Handle ID mapping (numeric IDs ↔ string IDs)
- [ ] Map relationship types: `OneToOne`, `OneToN`, `NToN` → our format
- [ ] Handle separate logical model (`ERDatabaseSchema`) and visual diagram (`ERDatabaseDiagram`)
- [ ] Map `PrimaryKey` → `isKey: true`, `Discriminant` → `isPartialKey: true`
- [ ] Map `totalParticipation` → `participation: "total" | "partial"`

**Why:** Required for compatibility with existing university Java application

**Technical Notes:**
- Create `src/lib/javaXmlParser.ts` - Parse Java XML → Our Diagram
- Create `src/lib/javaXmlSerializer.ts` - Serialize Our Diagram → Java XML
- Modify `xmlParser.ts` to detect format and route to appropriate parser
- Modify `Toolbar.tsx` to add export format option
- Handle ID conversion: numeric (Java) ↔ string (ours)

**Java XML Structure:**
```xml
<ERDatabaseModel>
  <ERDatabaseSchema>
    <EntitySets>
      <StrongEntitySet id="1" name="...">
        <Attributes><SimpleAttribute id="2" .../></Attributes>
        <PrimaryKey><SimpleAttribute refid="2"/></PrimaryKey>
      </StrongEntitySet>
      <WeakEntitySet id="4" name="...">
        <Discriminant><SimpleAttribute refid="5"/></Discriminant>
      </WeakEntitySet>
    </EntitySets>
    <RelationshipSets>
      <RelationshipSetOneToOne id="14" name="...">
        <Branches>
          <RelationshipSetBranch cardinality="1" totalParticipation="false">
            <StrongEntitySet refid="1"/>
          </RelationshipSetBranch>
        </Branches>
      </RelationshipSetOneToOne>
      <RelationshipSetOneToN id="17" name="..."/>
      <RelationshipSetNToN id="20" name="..."/>
    </RelationshipSets>
  </ERDatabaseSchema>
  <ERDatabaseDiagram>
    <StrongEntitySet refid="1"><Position x="219" y="178"/></StrongEntitySet>
    <SimpleAttribute refid="2"><Position x="269" y="63"/></SimpleAttribute>
  </ERDatabaseDiagram>
</ERDatabaseModel>
```

---

## 💡 Ideas for Future Consideration

- Mobile app version
- Desktop app (Electron/Tauri)
- Plugin system for extensibility
- Integration with database tools
- Diagram diffing and merging
- Accessibility improvements (screen reader support)
- Internationalization (i18n)
- Diagram versioning and branching

---

## 📝 Notes

- Prioritize features based on user feedback
- Keep UX simple and intuitive (inspired by Excalidraw)
- Maintain performance for large diagrams (100+ elements)
- Ensure all features work on mobile and desktop

---

---

## 📋 Implementation Priority (Based on Professor Feedback)

### Immediate (This Week)
1. Auto-adjust connection points (#1)
2. Fix line/connection selection (#2)
3. Direct text editing on canvas (#3)

### High Priority (Next Week)
4. Position consistency in property panel (#4)
5. Java XML compatibility - Parser (#5a)
6. Java XML compatibility - Serializer (#5b)

### Testing & Refinement
- Test both XML formats thoroughly
- Handle edge cases and malformed XML
- Error handling and user feedback

---

**Last Updated:** January 2025
