import { defaultObstacleSize, NUMBER_MAX, NUMBER_MIN, SIZE_LABEL, SIZE_LIMITS, SNAP_M, ZONE_SIZE_M } from '../rules/equipment.ts'
import type { SizeAxis } from '../rules/equipment.ts'

export const COURSE_VERSION = 1 as const

export type ClassLevel = 'H1' | 'H2' | 'H3'
export type ObstacleType = 'arch' | 'barrel' | 'gate' | 'tunnel' | 'cone'
export type ZoneShape = 'circle' | 'square'

export interface PlanPoint {
  x: number
  y: number
}

export interface Obstacle {
  id: string
  type: ObstacleType
  x: number
  y: number
  rotationDeg: number
  /** Пролёт арки и ворот, диаметр бочки, туннеля и конуса. */
  width: number
  /** Высота бочки и ворот, длина туннеля. У арки не используется. У конуса равна диаметру. */
  depth: number
  /** Полуарка. У остальных снарядов всегда false. */
  half: boolean
}

export interface NumberSign {
  id: string
  number: number
  x: number
  y: number
}

export interface HandlerZone {
  shape: ZoneShape
  x: number
  y: number
}

export interface RingSize {
  lengthM: number
  widthM: number
}

export interface CourseDocument {
  version: typeof COURSE_VERSION
  ring: RingSize
  classLevel: ClassLevel
  handlerZone: HandlerZone
  obstacles: Obstacle[]
  signs: NumberSign[]
}

const OBSTACLE_TYPES: readonly ObstacleType[] = ['arch', 'barrel', 'gate', 'tunnel', 'cone']
const CLASS_LEVELS: readonly ClassLevel[] = ['H1', 'H2', 'H3']
const ZONE_SHAPES: readonly ZoneShape[] = ['circle', 'square']

export function snap(value: number, step = SNAP_M): number {
  if (!Number.isFinite(value)) return 0
  const snapped = Math.round(value / step) * step
  const rounded = Number(snapped.toFixed(4))
  return Object.is(rounded, -0) ? 0 : rounded
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampToRing(value: number, size: number): number {
  return snap(clamp(value, 0, size))
}

export function clampZoneCenter(value: number, size: number): number {
  const margin = Math.min(ZONE_SIZE_M / 2, size / 2)
  return snap(clamp(value, margin, Math.max(margin, size - margin)))
}

export function normalizeDegrees(value: number): number {
  const full = ((value % 360) + 360) % 360
  return full === 360 ? 0 : full
}

export function createObstacle(type: ObstacleType, x: number, y: number): Obstacle {
  const size = defaultObstacleSize(type)
  return {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    rotationDeg: 0,
    width: size.width,
    depth: type === 'cone' ? size.width : size.depth,
    half: false,
  }
}

export function createSign(number: number, x: number, y: number): NumberSign {
  return {
    id: crypto.randomUUID(),
    number,
    x,
    y,
  }
}

export function nextNumber(course: CourseDocument): number | null {
  const used = new Set(course.signs.map((sign) => sign.number))
  for (let number = NUMBER_MIN; number <= NUMBER_MAX; number += 1) {
    if (!used.has(number)) return number
  }
  return null
}

export function createDefaultCourse(): CourseDocument {
  return {
    version: COURSE_VERSION,
    ring: { lengthM: 30, widthM: 20 },
    classLevel: 'H1',
    handlerZone: { shape: 'circle', x: 15, y: 10 },
    obstacles: [],
    signs: [],
  }
}

export function serializeCourse(course: CourseDocument): string {
  return JSON.stringify(course, null, 2)
}

export function parseCourse(raw: unknown): CourseDocument {
  if (!isRecord(raw)) throw new Error('Файл не похож на чертёж')
  if (raw.version !== COURSE_VERSION) throw new Error('Неизвестная версия чертежа')

  const ring = parseRing(raw.ring)
  const classLevel = parseEnum(raw.classLevel, CLASS_LEVELS, 'Неизвестный класс')
  const handlerZone = parseZone(raw.handlerZone)
  if (!Array.isArray(raw.obstacles)) throw new Error('В чертеже нет списка снарядов')
  const legacy = !Object.hasOwn(raw, 'signs')
  if (!legacy && !Array.isArray(raw.signs)) throw new Error('В чертеже нет списка знаков')
  const parsed = raw.obstacles.map((item) => parseObstacle(item, legacy))
  const obstacles = parsed.map((item) => item.obstacle)
  const ids = new Set(obstacles.map((obstacle) => obstacle.id))
  if (ids.size !== obstacles.length) throw new Error('В чертеже повторяется идентификатор снаряда')
  const signs = legacy ? parsed.flatMap((item) => (item.sign ? [item.sign] : [])) : (raw.signs as unknown[]).map(parseSign)
  const signIds = new Set(signs.map((sign) => sign.id))
  if (signIds.size !== signs.length) throw new Error('В чертеже повторяется идентификатор знака')

  return {
    version: COURSE_VERSION,
    ring,
    classLevel,
    handlerZone,
    obstacles,
    signs,
  }
}

function parseRing(raw: unknown): RingSize {
  if (!isRecord(raw)) throw new Error('Не указан размер ринга')
  return {
    lengthM: parsePositive(raw.lengthM, 'Длина ринга'),
    widthM: parsePositive(raw.widthM, 'Ширина ринга'),
  }
}

function parseZone(raw: unknown): HandlerZone {
  if (!isRecord(raw)) throw new Error('Не указана зона управления')
  return {
    shape: parseEnum(raw.shape, ZONE_SHAPES, 'Неизвестная форма зоны управления'),
    x: parseFinite(raw.x, 'Координата зоны'),
    y: parseFinite(raw.y, 'Координата зоны'),
  }
}

function parseObstacle(raw: unknown, legacySigns: boolean): { obstacle: Obstacle; sign: NumberSign | null } {
  if (!isRecord(raw)) throw new Error('Снаряд в файле повреждён')
  if (typeof raw.id !== 'string' || raw.id.length === 0) throw new Error('У снаряда нет идентификатора')
  const type = parseEnum(raw.type, OBSTACLE_TYPES, 'Неизвестный тип снаряда')
  const legacySize = !Object.hasOwn(raw, 'width') && !Object.hasOwn(raw, 'depth') && !Object.hasOwn(raw, 'half')
  const defaults = defaultObstacleSize(type)
  const width = legacySize ? defaults.width : parseAxis(raw.width, SIZE_LIMITS[type].width, SIZE_LABEL[type].width)
  const depth = type === 'cone'
    ? width
    : legacySize
      ? defaults.depth
      : parseAxis(raw.depth, SIZE_LIMITS[type].depth, SIZE_LABEL[type].depth ?? 'Второй размер')
  const half = legacySize ? false : parseHalf(raw.half, type)
  let rotationDeg = parseFinite(raw.rotationDeg, 'Поворот снаряда')
  if (legacySize && type === 'tunnel') rotationDeg = normalizeDegrees(rotationDeg + 90)
  const x = parseFinite(raw.x, 'Координата снаряда')
  const y = parseFinite(raw.y, 'Координата снаряда')
  const obstacle: Obstacle = {
    id: raw.id,
    type,
    x,
    y,
    rotationDeg,
    width,
    depth,
    half,
  }
  if (!legacySigns) return { obstacle, sign: null }
  const number = parseNumber(raw.number)
  const signOffset = parsePoint(raw.signOffset, 'Сдвиг таблички')
  if (number === null) return { obstacle, sign: null }
  const world = rotateOffset(x, y, rotationDeg, signOffset)
  return {
    obstacle,
    sign: {
      id: crypto.randomUUID(),
      number,
      x: world.x,
      y: world.y,
    },
  }
}

function parseSign(raw: unknown): NumberSign {
  if (!isRecord(raw)) throw new Error('Знак в файле повреждён')
  if (typeof raw.id !== 'string' || raw.id.length === 0) throw new Error('У знака нет идентификатора')
  const number = parseNumber(raw.number)
  if (number === null) throw new Error('У знака нет номера')
  const point = parsePoint(raw, 'Координата знака')
  return {
    id: raw.id,
    number,
    x: point.x,
    y: point.y,
  }
}

function rotateOffset(x: number, y: number, rotationDeg: number, offset: PlanPoint): PlanPoint {
  const radians = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: x + offset.x * cos + offset.y * sin,
    y: y - offset.x * sin + offset.y * cos,
  }
}

function parseHalf(raw: unknown, type: ObstacleType): boolean {
  if (typeof raw !== 'boolean') throw new Error('Не указано, полуарка ли это')
  if (raw && type !== 'arch') throw new Error('Полуарка бывает только у арки')
  return raw
}

function parseAxis(raw: unknown, axis: SizeAxis, label: string): number {
  const value = parseFinite(raw, label)
  if (value < axis.min - 0.001 || value > axis.max + 0.001) {
    throw new Error(`${label}: нужно от ${formatLimit(axis.min)} до ${formatLimit(axis.max)} м`)
  }
  return value
}

function formatLimit(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function parseNumber(raw: unknown): number | null {
  if (raw === null) return null
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < NUMBER_MIN || raw > NUMBER_MAX) {
    throw new Error('Номер снаряда должен быть от 1 до 25 или пустым')
  }
  return raw
}

function parsePoint(raw: unknown, label: string): PlanPoint {
  if (!isRecord(raw)) throw new Error(`${label} не указан`)
  return {
    x: parseFinite(raw.x, label),
    y: parseFinite(raw.y, label),
  }
}

function parsePositive(raw: unknown, label: string): number {
  const value = parseFinite(raw, label)
  if (value <= 0) throw new Error(`${label} должна быть больше нуля`)
  return value
}

function parseFinite(raw: unknown, label: string): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new Error(`${label} указана неверно`)
  return raw
}

function parseEnum<T extends string>(raw: unknown, allowed: readonly T[], message: string): T {
  if (typeof raw === 'string' && allowed.includes(raw as T)) return raw as T
  throw new Error(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
