import './style.css'
import { clampToRing, clampZoneCenter, createDefaultCourse, createObstacle, createSign, nextNumber, normalizeDegrees } from './model/course.ts'
import type { NumberSign, Obstacle } from './model/course.ts'
import { SIZE_LIMITS } from './rules/equipment.ts'
import type { SizeAxis } from './rules/equipment.ts'
import { checkCourse } from './rules/classChecks.ts'
import { createStore } from './state/store.ts'
import { downloadCourse, loadDraft, readCourseFile, saveDraft } from './persist/storage.ts'
import { createViewport } from './scene/viewport.ts'
import { syncCourseView } from './scene/courseView.ts'
import { mountPanel } from './ui/panel.ts'
import { bindEditor } from './editor/interaction.ts'
import type { Placeable, Selection, Tool, ViewMode } from './editor/types.ts'

const panelHost = document.querySelector<HTMLElement>('#panel')
const viewHost = document.querySelector<HTMLElement>('#viewport')
if (!panelHost || !viewHost) throw new Error('Нет разметки редактора')

const store = createStore(loadDraft() ?? createDefaultCourse())
let tool: Tool = 'select'
let view: ViewMode = 'top'
let selection: Selection | null = null
let status = ''
let framed = ''

const viewport = createViewport(viewHost)

const panel = mountPanel(panelHost, {
  onRing(lengthM, widthM) {
    status = ''
    store.update((course) => {
      course.ring.lengthM = lengthM
      course.ring.widthM = widthM
      for (const obstacle of course.obstacles) {
        obstacle.x = clampToRing(obstacle.x, lengthM)
        obstacle.y = clampToRing(obstacle.y, widthM)
      }
      for (const sign of course.signs) {
        sign.x = clampToRing(sign.x, lengthM)
        sign.y = clampToRing(sign.y, widthM)
      }
      course.handlerZone.x = clampZoneCenter(course.handlerZone.x, lengthM)
      course.handlerZone.y = clampZoneCenter(course.handlerZone.y, widthM)
    })
  },
  onClass(level) {
    status = ''
    store.update((course) => {
      course.classLevel = level
    })
  },
  onTool(next) {
    tool = next
    render()
  },
  onPlace(kind, clientX, clientY) {
    placeFromPalette(kind, clientX, clientY)
  },
  onZoneShape(shape) {
    status = ''
    store.update((course) => {
      course.handlerZone.shape = shape
    })
  },
  onNumber(number) {
    updateSelectedSign((sign) => {
      sign.number = number
    })
  },
  onRotate(delta) {
    updateSelected((obstacle) => {
      obstacle.rotationDeg = normalizeDegrees(obstacle.rotationDeg + delta)
    })
  },
  onWidth(width) {
    updateSelected((obstacle) => {
      const next = clampAxis(width, SIZE_LIMITS[obstacle.type].width)
      if (next === null) return
      obstacle.width = next
      if (obstacle.type === 'cone') obstacle.depth = next
    })
  },
  onDepth(depth) {
    updateSelected((obstacle) => {
      const next = clampAxis(depth, SIZE_LIMITS[obstacle.type].depth)
      if (next === null) return
      obstacle.depth = next
    })
  },
  onHalf(half) {
    updateSelected((obstacle) => {
      if (obstacle.type !== 'arch') return
      obstacle.half = half
    })
  },
  onView(next) {
    view = next
    viewport.setView(next)
    render()
  },
  onDelete: removeSelected,
  onNew() {
    selection = null
    status = ''
    tool = 'select'
    store.replace(createDefaultCourse())
  },
  onSave() {
    downloadCourse(store.get())
    status = 'Чертёж сохранён в файл.'
    render()
  },
  onOpen(file) {
    void openFile(file)
  },
})

bindEditor({
  viewport,
  store,
  getTool: () => tool,
  select(next) {
    selection = next
  },
  render,
})

window.addEventListener('keydown', (event) => {
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    removeSelected()
  }
  if (event.key === 'Escape') {
    tool = 'select'
    render()
  }
})

store.subscribe(() => {
  saveDraft(store.get())
  render()
})

render()
viewport.start()

function render() {
  const course = store.get()
  const key = `${course.ring.lengthM}x${course.ring.widthM}`
  if (key !== framed) {
    viewport.frameRing(course.ring.lengthM, course.ring.widthM)
    framed = key
  }
  if (selection?.kind === 'obstacle') {
    const id = selection.id
    if (!course.obstacles.some((obstacle) => obstacle.id === id)) selection = null
  }
  if (selection?.kind === 'sign') {
    const id = selection.id
    if (!course.signs.some((sign) => sign.id === id)) selection = null
  }
  syncCourseView(viewport.scene, course, selection, view)
  panel.sync({
    course,
    tool,
    view,
    selection,
    warnings: checkCourse(course),
    status,
  })
  viewport.domElement.style.cursor = tool === 'select' ? 'default' : 'crosshair'
}

function placeFromPalette(kind: Placeable, clientX: number, clientY: number): void {
  const point = viewport.pointOnGround(clientX, clientY)
  if (!point) return
  const ring = store.get().ring
  if (point.x < 0 || point.z < 0 || point.x > ring.lengthM || point.z > ring.widthM) return
  const x = clampToRing(point.x, ring.lengthM)
  const y = clampToRing(point.z, ring.widthM)
  if (kind === 'sign') {
    const number = nextNumber(store.get())
    if (number === null) {
      status = 'Свободных номеров нет: знаки только от 1 до 25.'
      render()
      return
    }
    status = ''
    store.update((course) => {
      const sign = createSign(number, x, y)
      course.signs.push(sign)
      selection = { kind: 'sign', id: sign.id }
    })
    return
  }
  status = ''
  store.update((course) => {
    const obstacle = createObstacle(kind, x, y)
    course.obstacles.push(obstacle)
    selection = { kind: 'obstacle', id: obstacle.id }
  })
}

function updateSelectedSign(change: (sign: NumberSign) => void): void {
  if (selection?.kind !== 'sign') return
  const id = selection.id
  status = ''
  store.update((course) => {
    const sign = course.signs.find((item) => item.id === id)
    if (!sign) return
    change(sign)
  })
}

function updateSelected(change: (obstacle: Obstacle) => void): void {
  if (selection?.kind !== 'obstacle') return
  const id = selection.id
  status = ''
  store.update((course) => {
    const obstacle = course.obstacles.find((item) => item.id === id)
    if (!obstacle) return
    change(obstacle)
  })
}

function clampAxis(value: number, axis: SizeAxis): number | null {
  if (!Number.isFinite(value)) return null
  return Number(Math.min(axis.max, Math.max(axis.min, value)).toFixed(2))
}

function removeSelected() {
  if (selection?.kind === 'sign') {
    const id = selection.id
    selection = null
    store.update((course) => {
      course.signs = course.signs.filter((sign) => sign.id !== id)
    })
    return
  }
  if (selection?.kind !== 'obstacle') return
  const id = selection.id
  selection = null
  store.update((course) => {
    course.obstacles = course.obstacles.filter((obstacle) => obstacle.id !== id)
  })
}

async function openFile(file: File) {
  try {
    const course = await readCourseFile(file)
    selection = null
    tool = 'select'
    status = `Открыт файл ${file.name}.`
    store.replace(course)
  } catch (error) {
    status = error instanceof Error ? error.message : 'Не удалось открыть файл'
    render()
  }
}
