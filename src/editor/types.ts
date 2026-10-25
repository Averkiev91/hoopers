import type { ObstacleType } from '../model/course.ts'

export type Placeable = ObstacleType | 'sign'
export type Tool = 'select' | Placeable
export type ViewMode = 'top' | 'perspective'

export type Selection = { kind: 'obstacle'; id: string } | { kind: 'sign'; id: string } | { kind: 'zone' }
