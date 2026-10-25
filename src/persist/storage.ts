import type { CourseDocument } from '../model/course.ts'
import { parseCourse, serializeCourse } from '../model/course.ts'

const DRAFT_KEY = 'hoopers.course.draft'

export function saveDraft(course: CourseDocument): void {
  try {
    localStorage.setItem(DRAFT_KEY, serializeCourse(course))
  } catch (error) {
    console.warn('Черновик не записан', error)
  }
}

export function loadDraft(): CourseDocument | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY)
    if (!stored) return null
    return parseCourse(JSON.parse(stored))
  } catch (error) {
    console.warn('Черновик пропущен', error)
    return null
  }
}

export function downloadCourse(course: CourseDocument): void {
  const blob = new Blob([serializeCourse(course)], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = 'trassa-hupers.json'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function readCourseFile(file: File): Promise<CourseDocument> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Файл не является JSON')
  }
  return parseCourse(raw)
}
