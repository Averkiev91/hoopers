/// <reference types="vitest/globals" />
import { createDefaultCourse, createObstacle, parseCourse, serializeCourse, snap } from './course.ts'

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
    course.obstacles.push(createObstacle('arch', 4, 6, 1))
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
  })

  it('сохраняет полуарку и размеры', () => {
    const course = createDefaultCourse()
    const arch = createObstacle('arch', 2, 3, 1)
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
    const barrel = createObstacle('barrel', 1, 1, 1)
    barrel.half = true
    course.obstacles.push(barrel)
    expect(() => parseCourse(JSON.parse(serializeCourse(course)))).toThrow(/Полуарка/)
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
