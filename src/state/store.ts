import type { CourseDocument } from '../model/course.ts'

export interface Store {
  get(): CourseDocument
  update(mutate: (course: CourseDocument) => void): void
  replace(course: CourseDocument): void
  subscribe(listener: () => void): () => void
}

export function createStore(initial: CourseDocument): Store {
  let course = initial
  const listeners = new Set<() => void>()
  const emit = () => {
    for (const listener of listeners) listener()
  }
  return {
    get: () => course,
    update(mutate) {
      mutate(course)
      emit()
    },
    replace(next) {
      course = next
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
