# Validation System Documentation

## Overview
This document describes the validation system for the ER Diagram Editor, based on analysis of the Java application (`ERDesigner.jar`) and ER diagram theory (Chen notation).

## Java App Analysis

### Key Classes and Methods

#### ERDController
- **`checkErrors(Object object)`**: Checks the error types of a given object
- **`searchForErrors()`**: Searches the whole schema for errors
- **`setWarning(GraphicObject go, String warning)`**: Sets a warning on a graphic object
- **`removeWarning(GraphicObject go, String warning)`**: Removes a warning from a graphic object

#### ERDModel
- **`searchForErrors()`**: Searches the whole database schema for errors

#### GraphicObject / MyShape
- **`warning`** (boolean): Indicates if object has warnings
- **`warningDescriptions`** (Vector<String>): List of warning messages

### Validation Constants Found

From `ERDGlobals` and constant analysis:

#### Entity Validation
- **`erdEntityHasNoPrimaryKey`**: Entity must have a primary key

#### Relationship Validation
- **`erdRelationShouldHave2ConnectionsWarning`**: Relationship should have exactly 2 connections
- **`erdRelationShouldBeIdentifying`**: Relationship should be identifying (for weak entities)
- **`erdRelationShouldBeNonIdentifying`**: Relationship should be non-identifying
- **`erdRelationShouldBeOfType`**: Relationship should be of a specific type

#### Attribute Validation
- **`erdShouldHaveMoreChildrenWarning`**: Should have more children (likely for attributes needing more connections)
- **`erdShouldHaveParent`**: Should have a parent (attribute must connect to entity/relationship)

#### General Validation
- **`erdCyclesNotAllowedError`** / **`erdCyclesWarning`**: Cycles in relationships are not allowed
- **`erdCouldNotWriteFileError`**: File write error (not a validation rule)

### Warning System Features

1. **Visual Indicators**:
   - Red warning icon/tag displayed on objects with warnings
   - Icon path: `ch/supsi/dlob/resources/images/Warning.png`

2. **Warning Management**:
   - Warnings can be enabled/disabled via preferences (`erdShowWarnings`)
   - "Inspect Warnings" menu option to view warning descriptions
   - Warnings are stored per graphic object

3. **Validation Triggers**:
   - `checkErrors()` is called for individual objects
   - `searchForErrors()` validates the entire schema
   - Validation likely runs on:
     - Object creation
     - Object modification
     - Manual validation trigger

## Validation Rules

### Entity Rules

#### 1. Entity Must Have at Least One Key Attribute
- **Rule**: Every **regular (strong) entity** must have at least one attribute with `isKey = true`
- **Exception**: Weak entities don't need regular keys (they use partial keys)
- **Java Constant**: `erdEntityHasNoPrimaryKey`
- **Current Implementation**: ✅ Implemented (but needs fix for weak entities)

#### 2. Weak Entity Must Have Discriminant
- **Rule**: Every **weak entity** must have at least one attribute with `isPartialKey = true`
- **Reason**: Weak entities are identified by their partial key + owner entity's key
- **Current Implementation**: ✅ Implemented

#### 3. Entity Must Have at Least One Attribute
- **Rule**: Every entity should have at least one attribute
- **Status**: Currently commented out in our implementation
- **Note**: This might be too strict (entities without attributes might be valid in some cases)

### Relationship Rules

#### 1. Relationship Must Connect at Least 2 Entities
- **Rule**: Every relationship must connect at least 2 entities
- **Java Constant**: `erdRelationShouldHave2ConnectionsWarning`
- **Current Implementation**: ✅ Implemented (checks `relationship.entityIds.length < 2`)

#### 2. All Connections Must Have Cardinality Defined
- **Rule**: Every connection from/to a relationship must have a cardinality value
- **Valid Formats**: `1`, `N`, `1:N`, `N:1`, `1:1`, `N:N`, `M:N`
- **Current Implementation**: ✅ Implemented

#### 3. All Connections Must Have Participation Defined
- **Rule**: Every connection must have participation set to either `"partial"` or `"total"`
- **Current Implementation**: ✅ Implemented

#### 4. Relationship Type Validation
- **Java Constants Found**:
  - `erdRelationShouldBeIdentifying`: For weak entity relationships
  - `erdRelationShouldBeNonIdentifying`: For regular relationships
  - `erdRelationShouldBeOfType`: Type-specific validation
- **Status**: ⚠️ Not yet implemented in our app
- **Note**: This might relate to weak relationships or relationship cardinality presets

### Attribute Rules

#### 1. Attribute Must Connect to Exactly One Parent
- **Rule**: Every attribute must connect to exactly one entity **OR** exactly one relationship (XOR)
- **Java Constant**: `erdShouldHaveParent`
- **Current Implementation**: ✅ Implemented

#### 2. Attribute Cannot Connect to Both Entity and Relationship
- **Rule**: An attribute cannot have both `entityId` and `relationshipId` set
- **Current Implementation**: ✅ Implemented

#### 3. Partial Key Only Valid for Weak Entity Attributes
- **Rule**: Attributes with `isPartialKey = true` can only belong to weak entities
- **Exception**: Partial keys cannot be used for relationship attributes
- **Current Implementation**: ✅ Implemented

#### 4. Attribute Cannot Be Both Key and Derived
- **Rule**: An attribute cannot have both `isKey = true` and `isDerived = true`
- **Current Implementation**: ✅ Implemented

### Connection Rules

#### 1. Connection Must Connect Valid Elements
- **Rule**: Both `fromId` and `toId` must reference existing entities or relationships
- **Current Implementation**: ✅ Implemented

#### 2. Cardinality Format Validation
- **Rule**: Cardinality must be in a valid format
- **Valid Formats**: `1`, `N`, `1:N`, `N:1`, `1:1`, `N:N`, `M:N`
- **Current Implementation**: ✅ Implemented

#### 3. Participation Validation
- **Rule**: Participation must be either `"partial"` or `"total"`
- **Current Implementation**: ✅ Implemented

#### 4. Cycles Not Allowed
- **Java Constant**: `erdCyclesNotAllowedError` / `erdCyclesWarning`
- **Rule**: Relationships should not create cycles (likely refers to recursive relationships or invalid dependency chains)
- **Status**: ⚠️ Not yet implemented in our app
- **Note**: This might be complex to implement - needs clarification on what constitutes a "cycle"

## Current Implementation Status

### ✅ Implemented Rules

1. **Entity**:
   - ✅ Regular entities must have at least one key attribute
   - ✅ Weak entities must have discriminant (partial key)

2. **Relationship**:
   - ✅ Must connect at least 2 entities
   - ✅ All connections must have cardinality defined
   - ✅ All connections must have participation defined

3. **Attribute**:
   - ✅ Must connect to exactly one entity OR one relationship
   - ✅ Cannot connect to both entity and relationship
   - ✅ Partial key only valid for weak entity attributes
   - ✅ Cannot be both key and derived

4. **Connection**:
   - ✅ Must connect valid elements
   - ✅ Cardinality format validation
   - ✅ Participation validation

### ⚠️ Missing Rules (Found in Java App)

1. **Relationship Type Validation**:
   - Identifying vs non-identifying relationships
   - Relationship type-specific rules

2. **Cycle Detection**:
   - Prevent invalid relationship cycles
   - Needs clarification on what constitutes a "cycle"

3. **Entity Attribute Count**:
   - Currently commented out: "Entity must have at least one attribute"
   - Decision needed: Is this required or optional?

## Known Issues / Bugs

### 1. Weak Entity Key Validation Bug ✅ FIXED
**Issue**: The validation was checking `isKey` for ALL entities, including weak entities. Weak entities don't need regular keys - they need partial keys.

**Fixed**: Updated `validateEntity()` to only check for regular keys on regular (non-weak) entities. Weak entities are now correctly validated only for their partial keys.

**Fix Applied**:
```typescript
// Rule: Regular entities must have at least one key attribute
// Weak entities don't need regular keys (they use partial keys)
if (!entity.isWeak) {
  const hasKeyAttribute = entity.attributes.some(attr => attr.isKey);
  if (!hasKeyAttribute) {
    warnings.push('Entity must have at least one key attribute');
  }
}
```

### 2. Partial Key for Regular Entities ✅ CORRECT BEHAVIOR
**Note**: When a regular entity has a partial key, it correctly shows warning: "Partial key only valid for weak entity attributes" (from attribute validation). This is the expected behavior - partial keys should only be on weak entities, and regular entities need regular keys.

## Validation Architecture

### Current Implementation

1. **Validation Functions** (`src/lib/validation.ts`):
   - `validateEntity(entity, diagram): string[]`
   - `validateRelationship(relationship, diagram): string[]`
   - `validateAttribute(attribute, diagram): string[]`
   - `validateConnection(connection, diagram): string[]`
   - `validateDiagram(diagram): ValidationError[]`

2. **Store Integration** (`src/store/editorStore.ts`):
   - `validateElement(id: string): void` - validate single element
   - `validateAll(): void` - validate entire diagram
   - `getValidationErrors(): ValidationError[]` - get all errors
   - Auto-validation on mutations (add, update, delete)

3. **Visual Display**:
   - Red warning badge (circle with "!") on elements with warnings
   - Hover tooltip showing warning messages
   - `hasWarning: boolean` and `warnings: string[]` on Entity, Relationship, Attribute

4. **Configuration**:
   - `validationEnabled: boolean` in EditorState (default: true)
   - Can be disabled via query parameter: `?validation=false`

## Recommendations

### Immediate Fixes

1. **Fix Weak Entity Key Validation**:
   - Only check for `isKey` on regular entities
   - Weak entities should only be checked for `isPartialKey`

2. **Clarify Entity Attribute Requirement**:
   - Decide if "Entity must have at least one attribute" should be enforced
   - Currently commented out - needs decision

### Future Enhancements

1. **Implement Cycle Detection**:
   - Research what the Java app considers a "cycle"
   - Implement cycle detection algorithm
   - Add warning for detected cycles

2. **Relationship Type Validation**:
   - Understand identifying vs non-identifying relationships
   - Implement relationship type-specific rules
   - Possibly related to weak relationships

3. **Warning Message Localization**:
   - Store warning messages in i18n bundles
   - Support English and Italian warning messages

4. **Warning Inspection UI**:
   - Add "Inspect Warnings" menu option (like Java app)
   - Show all warnings in a dedicated panel
   - Allow filtering by element type

## References

- **Java App JAR**: `/Users/skiran017/Pictures/er-editor/ERDesigner.jar`
- **Extracted Documentation**: `/tmp/erdesigner_extract/documents/`
- **Key Classes**:
  - `ch.supsi.dlob.erdesigner.ERDController`
  - `ch.supsi.dlob.erdesigner.ERDModel`
  - `ch.supsi.dlob.erdesigner.ERDGlobals`
  - `ch.supsi.dlob.erdesigner.graphicconstructs.GraphicObject`
- **Current Implementation**: `src/lib/validation.ts`
- **Objective**: `Objective.MD` (lines 79-84)

