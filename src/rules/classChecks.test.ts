/// <reference types="vitest/globals" />
import { createDefaultCourse, createObstacle, type CourseDocument, type ObstacleType } from '../model/course.ts'
import { checkCourse } from './classChecks.ts'

function courseWith(points: Array<{ x: number; y: number; type?: ObstacleType; number?: number | null }>, patch?: Partial<CourseDocument>): CourseDocument {
  const course = createDefaultCourse()
  if (patch?.ring) course.ring = patch.ring
  if (patch?.classLevel) course.classLevel = patch.classLevel
  if (patch?.handlerZone) course.handlerZone = patch.handlerZone
  course.obstacles = points.map((point, index) => {
    const obstacle = createObstacle(point.type ?? 'arch', point.x, point.y, point.number === undefined ? index + 1 : point.number)
    return obstacle
  })
  return course
}

const validH1 = [
  { x: 10, y: 10 },
  { x: 10, y: 15 },
  { x: 15, y: 15 },
  { x: 20, y: 15 },
  { x: 20, y: 10 },
  { x: 20, y: 5 },
  { x: 15, y: 5 },
  { x: 10, y: 5 },
  { x: 12, y: 12 },
  { x: 17, y: 16 },
]

describe('checkCourse', () => {
  it('не предупреждает о собранной трассе H1', () => {
    expect(checkCourse(courseWith(validH1))).toEqual([])
  })

  it('предупреждает о пустой трассе, маленьком ринге и доле арок', () => {
    const empty = checkCourse(createDefaultCourse()).map((warning) => warning.code)
    expect(empty).toContain('count')

    const small = checkCourse(courseWith([{ x: 2, y: 2 }], { ring: { lengthM: 10, widthM: 10 } }))
    expect(small.map((warning) => warning.code)).toEqual(expect.arrayContaining(['ring-area', 'ring-side']))

    const fewArches = courseWith([
      ...Array.from({ length: 4 }, (_, index) => ({ x: 4 + index, y: 4, type: 'arch' as const })),
      ...Array.from({ length: 6 }, (_, index) => ({ x: 4 + index, y: 10, type: 'barrel' as const })),
    ])
    expect(checkCourse(fewArches).some((warning) => warning.code === 'arches')).toBe(true)
  })

  it('проверяет номера, старт, дистанцию, дальность и комплект', () => {
    const duplicate = courseWith([
      { x: 4, y: 4, number: 1 },
      { x: 10, y: 4, number: 1 },
    ])
    expect(checkCourse(duplicate).some((warning) => warning.code === 'duplicate-number')).toBe(true)

    const gap = courseWith([
      { x: 4, y: 4, number: 1 },
      { x: 10, y: 4, number: 3 },
    ])
    expect(checkCourse(gap).some((warning) => warning.code === 'number-gap')).toBe(true)

    const start = courseWith([
      { x: 4, y: 4, type: 'barrel', number: 1 },
      { x: 10, y: 4, type: 'arch', number: 2 },
    ])
    expect(checkCourse(start).some((warning) => warning.code === 'start')).toBe(true)

    const finish = courseWith([
      { x: 4, y: 4, type: 'arch', number: 1 },
      { x: 10, y: 4, type: 'barrel', number: 2 },
    ])
    expect(checkCourse(finish).some((warning) => warning.code === 'finish')).toBe(true)

    const spacing = courseWith([
      { x: 4, y: 4, number: 1 },
      { x: 6, y: 4, number: 2 },
    ])
    expect(checkCourse(spacing).some((warning) => warning.code === 'spacing')).toBe(true)

    const reach = courseWith([{ x: 15, y: 23, number: 1 }], {
      ring: { lengthM: 40, widthM: 30 },
      handlerZone: { shape: 'circle', x: 15, y: 10 },
    })
    expect(checkCourse(reach).some((warning) => warning.code === 'reach')).toBe(true)

    const kit = courseWith(Array.from({ length: 13 }, (_, index) => ({ x: 2 + index, y: 4, type: 'arch' as const })))
    expect(checkCourse(kit).some((warning) => warning.code === 'kit')).toBe(true)
  })
})
