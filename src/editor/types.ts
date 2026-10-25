import type { ObstacleType } from '../model/course.ts'

export type Tool = 'select'
export type Placeable = ObstacleType | 'sign'
export type ViewMode = 'top' | 'perspective'

export type Selection = { kind: 'obstacle'; id: string } | { kind: 'sign'; id: string } | { kind: 'zone' }
