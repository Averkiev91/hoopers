/// <reference types="vitest/globals" />
import { createDefaultCourse, createObstacle, createSign, parseCourse, serializeCourse, snap } from './course.ts'

describe('snap', () => {
  it('привязывает координату к шагу 0,5 м', () => {
    expect(snap(1.24)).toBe(1)
    expect(snap(1.25)).toBe(1.5)
    expect(snap(0)).toBe(0)
  })
})

describe('parseCourse', () => {
  it('возвращает чертёж после сохранения', () => {
    const course = createDefaultCourse()
    course.obstacles.push(createObstacle('arch', 4, 6))
    course.signs.push(createSign(1, 3, 6))
    const parsed = parseCourse(JSON.parse(serializeCourse(course)))
    expect(parsed).toEqual(course)
  })

  it('отклоняет чужую версию и пустой файл', () => {
    expect(() => parseCourse(null)).toThrow(/чертёж/)
    expect(() => parseCourse({ version: 2 })).toThrow(/версия/)
  })

  it('подставляет номиналы старому снаряду и сохраняет направление туннеля', () => {
    const parsed = parseCourse(legacyCourse())
    expect(parsed.obstacles[0]).toMatchObject({ type: 'arch', width: 0.8, depth: 0, half: false, rotationDeg: 15 })
    expect(parsed.obstacles[1]).toMatchObject({ type: 'tunnel', width: 0.8, depth: 1, half: false, rotationDeg: 90 })
    expect(parsed).not.toHaveProperty('showPath')
    expect(parsed.obstacles[0]).not.toHaveProperty('number')
    const radians = (15 * Math.PI) / 180
    expect(parsed.signs[0]).toMatchObject({ number: 1 })
    expect(parsed.signs[0]?.x).toBeCloseTo(4 + Math.sin(radians) * 1.4)
    expect(parsed.signs[0]?.y).toBeCloseTo(6 + Math.cos(radians) * 1.4)
    expect(parsed.signs[1]?.number).toBe(2)
    expect(parsed.signs[1]?.x).toBeCloseTo(9)
    expect(parsed.signs[1]?.y).toBeCloseTo(6)
  })

  it('сохраняет полуарку и размеры', () => {
    const course = createDefaultCourse()
    const arch = createObstacle('arch', 2, 3)
    arch.half = true
    arch.width = 1.2
    course.obstacles.push(arch)
    const parsed = parseCourse(JSON.parse(serializeCourse(course)))
    expect(parsed.obstacles[0]).toMatchObject({ half: true, width: 1.2, depth: 0 })
  })

  it('отклоняет слишком большой пролёт и полуарку у бочки', () => {
    const wide = legacyCourse()
    Object.assign(wide.obstacles[0], { width: 5, depth: 0, half: false })
    expect(() => parseCourse(wide)).toThrow(/Пролёт/)

    const course = createDefaultCourse()
    const barrel = createObstacle('barrel', 1, 1)
    barrel.half = true
    course.obstacles.push(barrel)
    expect(() => parseCourse(JSON.parse(serializeCourse(course)))).toThrow(/Полуарка/)

    const cone = createObstacle('cone', 1, 1)
    cone.width = 0.5
    course.obstacles.splice(0, course.obstacles.length, cone)
    expect(() => parseCourse(JSON.parse(serializeCourse(course)))).toThrow(/Диаметр/)
  })

  it('у конуса высота равна диаметру', () => {
    const cone = createObstacle('cone', 2, 3)
    expect(cone).toMatchObject({ width: 0.25, depth: 0.25, half: false })
    cone.width = 0.3
    cone.depth = 0.2
    const course = createDefaultCourse()
    course.obstacles.push(cone)
    const parsed = parseCourse(JSON.parse(serializeCourse(course)))
    expect(parsed.obstacles[0]).toMatchObject({ width: 0.3, depth: 0.3 })
  })
})

function legacyCourse() {
  return {
    version: 1,
    ring: { lengthM: 30, widthM: 20 },
    classLevel: 'H1',
    handlerZone: { shape: 'circle', x: 15, y: 10 },
    showPath: true,
    obstacles: [
      {
        id: 'arch-old',
        type: 'arch',
        x: 4,
        y: 6,
        rotationDeg: 15,
        number: 1,
        signOffset: { x: 0, y: 1.4 },
      },
      {
        id: 'tunnel-old',
        type: 'tunnel',
        x: 8,
        y: 6,
        rotationDeg: 0,
        number: 2,
        signOffset: { x: 0, y: 1 },
      },
    ],
  }
}
