import type { ObstacleType } from '../model/course.ts'

export type Tool = 'select' | ObstacleType
export type ViewMode = 'top' | 'perspective'

export type Selection = { kind: 'obstacle'; id: string } | { kind: 'zone' }
