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

export function downloadPicture(dataUrl: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = 'trassa-hupers.png'
  document.body.append(link)
  link.click()
  link.remove()
}
