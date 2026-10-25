import type { ObstacleType } from '../model/course.ts'

/** Шаг сетки на чертеже, метры. */
export const GRID_M = 1

/** Привязка постановки и перетаскивания, метры. */
export const SNAP_M = 0.5

export const MIN_RING_AREA_M2 = 400
export const MIN_RING_SIDE_M = 20
export const ZONE_SIZE_M = 2
export const NUMBER_MIN = 1
export const NUMBER_MAX = 25

/**
 * Номиналы мешей внутри вилок РКФ.
 * Арка: на рисунке подпись обрезана, читается только окончание «00 cm».
 * Ворота: ширина 100–130 см снята с рисунка; в тексте высота оборвана («80–10 см»),
 * вертикальная подпись на рисунке тоже обрезана. Высота 90 см — середина ожидаемых 80–100 см.
 */
export const EQUIPMENT = {
  arch: {
    clearWidth: 0.8,
    clearHeight: 0.8,
    tubeRadius: 0.028,
    footLength: 0.5,
  },
  barrel: {
    diameter: 0.6,
    height: 0.8,
  },
  gate: {
    width: 1.15,
    height: 0.9,
    post: 0.04,
    footLength: 0.55,
  },
  tunnel: {
    diameter: 0.8,
    length: 1,
  },
} as const

export interface SizeAxis {
  min: number
  max: number
  default: number
}

/** Пределы редактора. Это не пороги предупреждений класса. */
export const SIZE_LIMITS: Record<ObstacleType, { width: SizeAxis; depth: SizeAxis }> = {
  arch: {
    width: { min: 0.5, max: 1.6, default: 0.8 },
    depth: { min: 0, max: 0, default: 0 },
  },
  barrel: {
    width: { min: 0.45, max: 0.8, default: 0.6 },
    depth: { min: 0.5, max: 1.1, default: 0.8 },
  },
  gate: {
    width: { min: 0.8, max: 1.8, default: 1.15 },
    depth: { min: 0.7, max: 1.2, default: 0.9 },
  },
  tunnel: {
    width: { min: 0.6, max: 1, default: 0.8 },
    depth: { min: 0.6, max: 2.5, default: 1 },
  },
}

export const SIZE_LABEL: Record<ObstacleType, { width: string; depth: string | null }> = {
  arch: { width: 'Пролёт', depth: null },
  barrel: { width: 'Диаметр', depth: 'Высота' },
  gate: { width: 'Ширина', depth: 'Высота' },
  tunnel: { width: 'Диаметр', depth: 'Длина' },
}

export function defaultObstacleSize(type: ObstacleType): { width: number; depth: number } {
  const limits = SIZE_LIMITS[type]
  return { width: limits.width.default, depth: limits.depth.default }
}

/** Радиус круга выделения вокруг снаряда, метры. */
export function obstacleReach(type: ObstacleType, width: number, depth: number, half: boolean): number {
  switch (type) {
    case 'arch':
      return (half ? width * 0.62 : width / 2) + 0.16
    case 'barrel':
      return width / 2 + 0.04
    case 'gate':
      return width / 2 + 0.1
    case 'tunnel':
      return Math.hypot(width / 2, depth / 2) + 0.06
  }
}

export const KIT_LIMITS: Record<ObstacleType, number> = {
  arch: 12,
  barrel: 6,
  gate: 3,
  tunnel: 2,
}

export const OBSTACLE_LABEL: Record<ObstacleType, string> = {
  arch: 'Арка',
  barrel: 'Бочка',
  gate: 'Ворота',
  tunnel: 'Туннель',
}

export interface ClassLimit {
  minCount: number
  maxCount: number
  spacingMin: number
  spacingMax: number
  maxReach: number
}

export const CLASS_LIMITS = {
  H1: { minCount: 10, maxCount: 15, spacingMin: 4, spacingMax: 8, maxReach: 12 },
  H2: { minCount: 15, maxCount: 20, spacingMin: 5, spacingMax: 10, maxReach: 18 },
  H3: { minCount: 20, maxCount: 25, spacingMin: 6, spacingMax: 12, maxReach: 30 },
} as const satisfies Record<string, ClassLimit>

