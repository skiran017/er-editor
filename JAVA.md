# Java App (ERDesigner.jar) Analysis

## Overview
This document contains findings from analyzing the Java application `ERDesigner.jar` to understand its coordinate system, entity sizes, and XML format for compatibility.

## JAR File Location
- **Path**: `/Users/skiran017/Pictures/er-editor/ERDesigner.jar`
- **Size**: 2.5MB
- **Build Date**: November 2021 (based on file timestamps)

## Package Structure
The JAR contains the following main packages:
- `ch.supsi.database.erconstructs` - ER model constructs (EntitySet, RelationshipSet, etc.)
- `ch.supsi.database.io` - XML reading/writing (XMLReader, XMLWriter)
- `ch.supsi.dlob.erdesigner.graphicconstructs` - Graphic rendering classes (MyEntity, MyRelationship, etc.)
- `ch.supsi.dlob.erdesigner.graphicconstructs.shape` - Shape classes (EntityShape, RelationshipShape)

## Key Classes

### Entity Classes
- **MyEntity.class**: Main graphic entity class
  - Extends `GraphicObject`
  - Contains graphic information for entities
  - Has fields: `maxx`, `maxy` (bounding box coordinates)

- **EntityShape.class**: Shape rendering for entities
  - Found in: `ch/supsi/dlob/erdesigner/graphicconstructs/shape/EntityShape.class`

### XML I/O Classes
- **XMLReader.class**: Reads XML format into model
  - Location: `ch/supsi/database/io/XMLReader.class`
  - Size: ~25KB

- **XMLWriter.class**: Writes model to XML format
  - Location: `ch/supsi/database/io/XMLWriter.class`
  - Size: ~21KB

## Entity Size Analysis

### Binary Analysis Results
From analyzing the compiled class files, the following size values were found:
- **MyEntity.class**: Contains bytes for sizes: 100, 120, 150, 80, 60, 50, 40, 30
- **EntityShape.class**: Contains bytes for sizes: 80, 60, 50, 40, 30

### Entity Size Constants (CONFIRMED)
Found in `ERDGraphicsGlobal` interface (from constant-values.html):
- **ENTITY_WIDTH**: **80.0** (static final double)
- **ENTITY_HEIGHT**: **40.0** (static final double)

**Source**: `ch.supsi.dlob.erdesigner.graphicconstructs.ERDGraphicsGlobal`

### Entity Size Analysis
- **Java app constants**: 80x40 (from source code)
- **Current implementation**: Using 100x50 (inferred from position analysis)
- **Discrepancy**: The Java constants (80x40) are smaller than what we're using (100x50)
- **Possible reasons**:
  1. Java app might scale these values
  2. Java app might use different coordinate system scaling
  3. Our inference might be incorrect
  4. The constants might be in a different unit (logical vs physical pixels)

### Other Constants Found
- **BORDER_SIZE**: 50
- **POPUP_DISTANCE_X**: 80

### Coordinate System

#### Position Storage
- **Format**: XML stores positions as `<Position x="..." y="..."/>` in `ERDatabaseDiagram` section
- **Coordinate Type**: **CENTER-based** (not top-left)
  - Evidence: When treating positions as top-left, attributes overlap entities
  - Evidence: Converting from center to top-left resolves overlap issues

#### Conversion Formula
```typescript
// Java XML → Our Format (center to top-left)
ourTopLeftX = javaCenterX - (entityWidth / 2)
ourTopLeftY = javaCenterY - (entityHeight / 2)

// Our Format → Java XML (top-left to center)
javaCenterX = ourTopLeftX + (entityWidth / 2)
javaCenterY = ourTopLeftY + (entityHeight / 2)
```

## XML Format Structure

### Root Element
```xml
<ERDatabaseModel>
  <ERDatabaseSchema>...</ERDatabaseSchema>
  <ERDatabaseDiagram>...</ERDatabaseDiagram>
</ERDatabaseModel>
```

### Entity Position Example
```xml
<StrongEntitySet refid="8">
  <Position x="884" y="128" />
</StrongEntitySet>
```
- `x` and `y` represent **center coordinates** of the entity
- Entity size is **not stored** in XML (uses default)

### Attribute Position Example
```xml
<SimpleAttribute refid="9">
  <Position x="953" y="164" />
</SimpleAttribute>
```
- Attributes also use **center coordinates**
- Typical attribute size: ~80x30 pixels (calculated dynamically based on text)

## Relationship Size
- **Assumed size**: 100x50 pixels (same as entities for consistency)
- **Previous assumption**: 120x80 pixels

## Findings Summary

### Confirmed
1. ✅ XML format uses `ERDatabaseModel` as root element
2. ✅ Positions are stored in `ERDatabaseDiagram` section
3. ✅ Coordinate system is **center-based** (not top-left)
4. ✅ Entity and relationship positions use same format
5. ✅ Attribute positions also use center coordinates

### Confirmed from Source Code
1. ✅ Entity size constants: **80x40** (from `ERDGraphicsGlobal.ENTITY_WIDTH` and `ENTITY_HEIGHT`)
2. ✅ Entity size is defined as `static final double` (not int)

### Inferred/Assumed (Not Confirmed)
1. ⚠️ Current implementation uses: **100x50** (different from Java constants - needs investigation)
2. ⚠️ Relationship default size: **100x50** (assumed same as entities)
3. ⚠️ Attribute default size: **~80x30** (calculated dynamically in our app)
4. ⚠️ Why Java constants (80x40) don't match our working size (100x50) - possible scaling factor?

### Unknown/Unconfirmed
1. ❓ Exact relationship size constants (not found in ERDGraphicsGlobal)
2. ❓ Whether entity size can vary or is always fixed (constants suggest fixed)
3. ❓ How attribute sizes are calculated in Java app
4. ❓ Why Java constants (80x40) don't match our working size (100x50) - scaling factor?

## Recommendations

### For Accurate Compatibility
1. **Decompile the JAR** using a tool like JD-GUI to view source code
2. **Check MyEntity.java** for size constants (likely static final fields)
3. **Check XMLReader.java** to confirm coordinate system interpretation
4. **Check XMLWriter.java** to confirm how positions are serialized

### Current Implementation
- Using **100x50** for entities and relationships
- Using **center-based coordinate conversion**
- Attribute size calculated dynamically (80x30 default)

**⚠️ IMPORTANT**: Java app uses **80x40** according to constants, but our implementation uses **100x50**. This discrepancy needs investigation:
- Possible scaling factor: 100/80 = 1.25, 50/40 = 1.25
- May need to test with 80x40 to see if it matches Java app exactly

## Testing Notes
- Test import/export round-trip to verify coordinate conversion
- Compare visual layout with Java app output
- Verify attribute positions don't overlap entities
- Check that relationships align correctly

## References
- JAR extracted to: `/tmp/erdesigner_extract/`
- Documentation: `documents/` folder in extracted JAR
- Main classes: `ch/supsi/dlob/erdesigner/graphicconstructs/`

