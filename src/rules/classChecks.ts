import type { CourseDocument, NumberSign, Obstacle, ObstacleType } from '../model/course.ts'
import { CLASS_LIMITS, KIT_LIMITS, MIN_RING_AREA_M2, MIN_RING_SIDE_M, OBSTACLE_LABEL, ZONE_SIZE_M } from './equipment.ts'

export interface CourseWarning {
  code: string
  message: string
}

const EPS = 0.02

const START_TYPES: readonly ObstacleType[] = ['arch', 'tunnel']

export function checkCourse(course: CourseDocument): CourseWarning[] {
  const warnings: CourseWarning[] = []
  const limits = CLASS_LIMITS[course.classLevel]
  const count = course.obstacles.length
  const area = course.ring.lengthM * course.ring.widthM
  const shortSide = Math.min(course.ring.lengthM, course.ring.widthM)

  if (area < MIN_RING_AREA_M2 - EPS) {
    warnings.push({
      code: 'ring-area',
      message: `Площадь ринга ${formatMeters(area)} м², нужно не меньше ${MIN_RING_AREA_M2} м².`,
    })
  }
  if (shortSide < MIN_RING_SIDE_M - EPS) {
    warnings.push({
      code: 'ring-side',
      message: `Короткая сторона ${formatMeters(shortSide)} м, нужно не меньше ${MIN_RING_SIDE_M} м.`,
    })
  }
  if (count < limits.minCount || count > limits.maxCount) {
    warnings.push({
      code: 'count',
      message: `В классе ${course.classLevel} на трассе ${count} снарядов, нужно от ${limits.minCount} до ${limits.maxCount}.`,
    })
  }

  const arches = course.obstacles.filter((obstacle) => obstacle.type === 'arch').length
  if (count > 0 && arches / count < 0.5 - EPS) {
    warnings.push({
      code: 'arches',
      message: `Арок ${arches} из ${count}, нужно не меньше половины.`,
    })
  }

  warnings.push(...kitWarnings(course.obstacles))
  warnings.push(...placementWarnings(course))
  warnings.push(...numberWarnings(course, limits))
  return warnings
}

function kitWarnings(obstacles: Obstacle[]): CourseWarning[] {
  const warnings: CourseWarning[] = []
  for (const type of Object.keys(KIT_LIMITS) as Array<keyof typeof KIT_LIMITS>) {
    const count = obstacles.filter((obstacle) => obstacle.type === type).length
    const limit = KIT_LIMITS[type]
    if (count > limit) {
      warnings.push({
        code: 'kit',
        message: `${OBSTACLE_LABEL[type]}: ${count}, в комплекте организатора ${limit}.`,
      })
    }
  }
  return warnings
}

function placementWarnings(course: CourseDocument): CourseWarning[] {
  const warnings: CourseWarning[] = []
  const outside = course.obstacles.filter((obstacle) => !insideRing(course, obstacle.x, obstacle.y)).length
  if (outside > 0) {
    warnings.push({
      code: 'outside',
      message: outside === 1 ? 'Один снаряд стоит вне ринга.' : `Вне ринга ${outside} снарядов.`,
    })
  }
  const zoneReach = ZONE_SIZE_M / 2
  const zone = course.handlerZone
  if (
    zone.x - zoneReach < -EPS ||
    zone.y - zoneReach < -EPS ||
    zone.x + zoneReach > course.ring.lengthM + EPS ||
    zone.y + zoneReach > course.ring.widthM + EPS
  ) {
    warnings.push({
      code: 'zone-outside',
      message: 'Зона управления выходит за ринг.',
    })
  }

  if (course.obstacles.length === 0) return warnings

  let farthest = 0
  for (const obstacle of course.obstacles) {
    farthest = Math.max(farthest, distance(obstacle, course.handlerZone))
  }
  const maxReach = CLASS_LIMITS[course.classLevel].maxReach
  if (farthest > maxReach + EPS) {
    warnings.push({
      code: 'reach',
      message: `До дальнего снаряда от зоны управления ${formatMeters(farthest)} м, в ${course.classLevel} не больше ${maxReach} м.`,
    })
  }
  return warnings
}

function numberWarnings(course: CourseDocument, limits: (typeof CLASS_LIMITS)[keyof typeof CLASS_LIMITS]): CourseWarning[] {
  const warnings: CourseWarning[] = []
  const { obstacles, signs } = course
  if (obstacles.length === 0) return warnings

  if (signs.length === 0) {
    warnings.push({
      code: 'missing-number',
      message: 'Трасса не обозначена номерами.',
    })
    return warnings
  }

  const byNumber = new Map<number, NumberSign[]>()
  for (const sign of signs) {
    const group = byNumber.get(sign.number) ?? []
    group.push(sign)
    byNumber.set(sign.number, group)
  }

  for (const [number, group] of byNumber) {
    if (group.length > 1) {
      warnings.push({
        code: 'duplicate-number',
        message: `Номер ${number} повторяется.`,
      })
    }
  }

  const maxNumber = Math.max(...byNumber.keys())
  for (let number = 1; number < maxNumber; number += 1) {
    if (!byNumber.has(number)) {
      warnings.push({
        code: 'number-gap',
        message: `В нумерации нет номера ${number}.`,
      })
    }
  }

  const startSign = byNumber.get(Math.min(...byNumber.keys()))?.[0]
  const finishSign = byNumber.get(maxNumber)?.[0]
  const startObstacle = startSign ? nearestObstacle(startSign, obstacles) : null
  const finishObstacle = finishSign ? nearestObstacle(finishSign, obstacles) : null
  if (startObstacle && !START_TYPES.includes(startObstacle.type)) {
    warnings.push({
      code: 'start',
      message: `Старт (номер ${startSign?.number}) должен быть аркой или туннелем.`,
    })
  }
  if (
    finishSign &&
    startSign &&
    finishSign.id !== startSign.id &&
    finishObstacle &&
    !START_TYPES.includes(finishObstacle.type)
  ) {
    warnings.push({
      code: 'finish',
      message: `Финиш (номер ${finishSign.number}) должен быть аркой или туннелем.`,
    })
  }

  for (const sign of signs) {
    const nextGroup = byNumber.get(sign.number + 1)
    if (!nextGroup || nextGroup.length !== 1 || (byNumber.get(sign.number)?.length ?? 0) !== 1) continue
    const from = nearestObstacle(sign, obstacles)
    const to = nearestObstacle(nextGroup[0], obstacles)
    if (!from || !to || from.id === to.id) continue
    const span = distance(from, to)
    if (span < limits.spacingMin - EPS || span > limits.spacingMax + EPS) {
      warnings.push({
        code: 'spacing',
        message: `Между номерами ${sign.number} и ${sign.number + 1} ${formatMeters(span)} м, в этом классе нужно от ${limits.spacingMin} до ${limits.spacingMax} м.`,
      })
    }
  }

  return warnings
}

function nearestObstacle(sign: { x: number; y: number }, obstacles: Obstacle[]): Obstacle | null {
  let best: Obstacle | null = null
  let bestDistance = Infinity
  for (const obstacle of obstacles) {
    const span = distance(sign, obstacle)
    if (span < bestDistance) {
      best = obstacle
      bestDistance = span
    }
  }
  return best
}

function insideRing(course: CourseDocument, x: number, y: number): boolean {
  return x >= -EPS && y >= -EPS && x <= course.ring.lengthM + EPS && y <= course.ring.widthM + EPS
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function formatMeters(value: number): string {
  return value.toFixed(1).replace('.', ',')
}
