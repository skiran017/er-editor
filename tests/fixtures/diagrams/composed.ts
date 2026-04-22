import { makeEntity, makeRelationship, makeAttribute, makeIsa } from './makeNode'
import { makeEREdge, makeAttrEdge, makeIsaEdge } from './makeEdge'
import { makeDiagram } from './makeDiagram'
import type { Diagram } from '@/domain/types'

// Student with a key attribute `id`.
export const strongEntityWithKey = (): Diagram => {
  const student = makeEntity({ name: 'Student' })
  const id = makeAttribute({ name: 'id', isKey: true })
  return makeDiagram([student, id], [makeAttrEdge(id.id, student.id)])
}

// Room (weak) depending on Building via Located identifying rel;
// Room has discriminant `number`.
export const weakEntityWithDiscriminant = (): Diagram => {
  const building = makeEntity({ name: 'Building' })
  const bldgId = makeAttribute({ name: 'code', isKey: true })
  const room = makeEntity({ name: 'Room', isWeak: true })
  const roomNum = makeAttribute({ name: 'number', isDiscriminant: true })
  const located = makeRelationship({ name: 'Located', isIdentifying: true })
  return makeDiagram(
    [building, bldgId, room, roomNum, located],
    [
      makeAttrEdge(bldgId.id, building.id),
      makeAttrEdge(roomNum.id, room.id),
      makeEREdge(building.id, located.id, { cardinality: '1', participation: 'partial' }),
      makeEREdge(room.id, located.id, { cardinality: 'N', participation: 'total' }),
    ],
  )
}

// Project involves Employee, Department, Task — 3-way n-ary.
export const naryRelationship = (): Diagram => {
  const emp = makeEntity({ name: 'Employee' })
  const dept = makeEntity({ name: 'Department' })
  const task = makeEntity({ name: 'Task' })
  const assign = makeRelationship({ name: 'Assign' })
  return makeDiagram(
    [emp, dept, task, assign],
    [
      makeEREdge(emp.id, assign.id),
      makeEREdge(dept.id, assign.id),
      makeEREdge(task.id, assign.id),
    ],
  )
}

// Employee Supervises Employee — recursive.
export const recursiveRelationship = (): Diagram => {
  const emp = makeEntity({ name: 'Employee' })
  const empId = makeAttribute({ name: 'id', isKey: true })
  const supervises = makeRelationship({ name: 'Supervises' })
  return makeDiagram(
    [emp, empId, supervises],
    [
      makeAttrEdge(empId.id, emp.id),
      makeEREdge(emp.id, supervises.id, { role: 'supervisor' }),
      makeEREdge(emp.id, supervises.id, { role: 'subordinate' }),
    ],
  )
}

// Person ISA {Student, Employee}.
export const isaHierarchy = (): Diagram => {
  const person = makeEntity({ name: 'Person' })
  const personId = makeAttribute({ name: 'ssn', isKey: true })
  const student = makeEntity({ name: 'Student' })
  const employee = makeEntity({ name: 'Employee' })
  const i = makeIsa()
  return makeDiagram(
    [person, personId, student, employee, i],
    [
      makeAttrEdge(personId.id, person.id),
      makeIsaEdge(person.id, i.id, 'parent'),
      makeIsaEdge(i.id, student.id, 'child'),
      makeIsaEdge(i.id, employee.id, 'child'),
    ],
  )
}

// Address (composite) = {street, city}.
export const compositeAttribute = (): Diagram => {
  const person = makeEntity({ name: 'Person' })
  const personId = makeAttribute({ name: 'id', isKey: true })
  const address = makeAttribute({ name: 'address', isComposite: true })
  const street = makeAttribute({ name: 'street' })
  const city = makeAttribute({ name: 'city' })
  return makeDiagram(
    [person, personId, address, street, city],
    [
      makeAttrEdge(personId.id, person.id),
      makeAttrEdge(address.id, person.id),
      makeAttrEdge(street.id, address.id),
      makeAttrEdge(city.id, address.id),
    ],
  )
}
