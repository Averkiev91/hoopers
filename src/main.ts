import './style.css'
import { clampToRing, clampZoneCenter, createDefaultCourse } from './model/course.ts'
import { checkCourse } from './rules/classChecks.ts'
import { createStore } from './state/store.ts'
import { downloadCourse, loadDraft, readCourseFile, saveDraft } from './persist/storage.ts'
import { createViewport } from './scene/viewport.ts'
import { syncCourseView } from './scene/courseView.ts'
import { mountPanel } from './ui/panel.ts'
import { bindEditor } from './editor/interaction.ts'
import type { Selection, Tool, ViewMode } from './editor/types.ts'

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
  onZoneShape(shape) {
    status = ''
    store.update((course) => {
      course.handlerZone.shape = shape
    })
  },
  onNumber(number) {
    if (selection?.kind !== 'obstacle') return
    const id = selection.id
    store.update((course) => {
      const obstacle = course.obstacles.find((item) => item.id === id)
      if (!obstacle) return
      obstacle.number = number
    })
  },
  onShowPath(show) {
    store.update((course) => {
      course.showPath = show
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
  syncCourseView(viewport.scene, course, selection)
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

function removeSelected() {
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
