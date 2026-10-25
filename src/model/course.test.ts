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
})
