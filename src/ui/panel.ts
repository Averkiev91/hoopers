import type { ClassLevel, CourseDocument, Obstacle, ZoneShape } from '../model/course.ts'
import type { CourseWarning } from '../rules/classChecks.ts'
import { OBSTACLE_LABEL, SIZE_LABEL, SIZE_LIMITS } from '../rules/equipment.ts'
import type { Placeable, Selection, Tool, ViewMode } from '../editor/types.ts'

export interface PanelHandlers {
  onRing(lengthM: number, widthM: number): void
  onClass(level: ClassLevel): void
  onTool(tool: Tool): void
  onPlace(kind: Placeable, clientX: number, clientY: number): void
  onZoneShape(shape: ZoneShape): void
  onNumber(number: number): void
  onRotate(delta: number): void
  onWidth(width: number): void
  onDepth(depth: number): void
  onHalf(half: boolean): void
  onView(view: ViewMode): void
  onDelete(): void
  onNew(): void
  onSave(): void
}

export interface PanelView {
  course: CourseDocument
  tool: Tool
  view: ViewMode
  selection: Selection | null
  warnings: CourseWarning[]
  status: string
}

const PLACEABLES: readonly Placeable[] = ['arch', 'barrel', 'gate', 'tunnel', 'cone', 'sign']

export function mountPanel(host: HTMLElement, handlers: PanelHandlers): { sync(view: PanelView): void } {
  host.innerHTML = `
    <header class="panel-header">
      <h1>Конструктор трасс</h1>
    </header>
    <section class="fields">
      <label>Длина, м <input id="length" type="number" min="1" max="120" step="0.5"></label>
      <label>Ширина, м <input id="width" type="number" min="1" max="120" step="0.5"></label>
      <label>Класс
        <select id="class">
          <option value="H1">H1</option>
          <option value="H2">H2</option>
          <option value="H3">H3</option>
        </select>
      </label>
    </section>
    <section>
      <h2>Снаряды</h2>
      <div class="tools" role="toolbar">
        <button type="button" data-place="arch">Арка</button>
        <button type="button" data-place="barrel">Бочка</button>
        <button type="button" data-place="gate">Ворота</button>
        <button type="button" data-place="tunnel">Туннель</button>
        <button type="button" data-place="cone">Конус</button>
      </div>
    </section>
    <section>
      <h2>Номера</h2>
      <div class="tools">
        <button type="button" data-place="sign">Добавить номер</button>
      </div>
    </section>
    <section>
      <h2>Зона 2 м</h2>
      <div class="segmented">
        <button type="button" data-zone="circle">Круг</button>
        <button type="button" data-zone="square">Квадрат</button>
      </div>
    </section>
    <section id="selection" hidden>
      <h2 id="selection-title">Снаряд</h2>
      <div id="obstacle-fields">
        <div class="rotate-row">
          <button type="button" id="rotate-left">−15°</button>
          <button type="button" id="rotate-right">+15°</button>
        </div>
        <label id="span-label"><span id="span-caption">Пролёт, м</span><input id="span" type="number" step="0.1"></label>
        <label id="depth-label"><span id="depth-caption">Высота, м</span><input id="obstacle-depth" type="number" step="0.1"></label>
        <button type="button" id="half">Полуарка</button>
      </div>
      <div id="sign-fields">
        <label>Номер <input id="number" type="number" min="1" max="25" step="1"></label>
      </div>
      <button type="button" id="delete">Удалить</button>
    </section>
    <section>
      <h2>Вид</h2>
      <div class="segmented">
        <button type="button" data-view="top">Сверху</button>
        <button type="button" data-view="perspective">Объём</button>
      </div>
    </section>
    <section class="warnings">
      <h2>Предупреждения</h2>
      <p id="count"></p>
      <ul id="warning-list"></ul>
      <p id="ok" class="ok">Замечаний нет.</p>
      <p id="status" class="status"></p>
    </section>
    <section class="file-actions">
      <button type="button" id="save">Сохранить</button>
      <button type="button" id="new">Новый</button>
    </section>
  `

  const lengthInput = requiredInput(host, '#length')
  const widthInput = requiredInput(host, '#width')
  const classSelect = requiredSelect(host, '#class')
  const numberInput = requiredInput(host, '#number')
  const spanInput = requiredInput(host, '#span')
  const depthInput = requiredInput(host, '#obstacle-depth')
  const spanCaption = requiredElement(host, '#span-caption')
  const depthCaption = requiredElement(host, '#depth-caption')
  const depthLabel = requiredElement(host, '#depth-label')
  const halfButton = requiredButton(host, '#half')
  const selectionBlock = host.querySelector<HTMLElement>('#selection')
  const selectionTitle = host.querySelector<HTMLElement>('#selection-title')
  const obstacleFields = host.querySelector<HTMLElement>('#obstacle-fields')
  const signFields = host.querySelector<HTMLElement>('#sign-fields')
  const deleteButton = requiredButton(host, '#delete')
  const count = host.querySelector<HTMLElement>('#count')
  const warningList = host.querySelector<HTMLUListElement>('#warning-list')
  const ok = host.querySelector<HTMLElement>('#ok')
  const status = host.querySelector<HTMLElement>('#status')
  if (!selectionBlock || !selectionTitle || !obstacleFields || !signFields || !count || !warningList || !ok || !status) {
    throw new Error('Панель собрана не полностью')
  }

  lengthInput.addEventListener('change', commitRing)
  widthInput.addEventListener('change', commitRing)
  classSelect.addEventListener('change', () => {
    const level = classSelect.value
    if (level === 'H1' || level === 'H2' || level === 'H3') handlers.onClass(level)
  })
  host.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof HTMLButtonElement)) return
    const zone = target.dataset.zone
    if (zone === 'circle' || zone === 'square') handlers.onZoneShape(zone)
    const view = target.dataset.view
    if (view === 'top' || view === 'perspective') handlers.onView(view)
  })
  for (const button of host.querySelectorAll<HTMLButtonElement>('[data-place]')) {
    button.addEventListener('pointerdown', (event) => startPlace(button, event))
  }
  numberInput.addEventListener('change', () => {
    const value = Number(numberInput.value)
    if (Number.isInteger(value) && value >= 1 && value <= 25) handlers.onNumber(value)
  })
  spanInput.addEventListener('change', () => handlers.onWidth(Number(spanInput.value)))
  depthInput.addEventListener('change', () => handlers.onDepth(Number(depthInput.value)))
  requiredButton(host, '#rotate-left').addEventListener('click', () => handlers.onRotate(-15))
  requiredButton(host, '#rotate-right').addEventListener('click', () => handlers.onRotate(15))
  halfButton.addEventListener('click', () => handlers.onHalf(halfButton.getAttribute('aria-pressed') !== 'true'))
  deleteButton.addEventListener('click', () => handlers.onDelete())
  requiredButton(host, '#save').addEventListener('click', () => handlers.onSave())
  requiredButton(host, '#new').addEventListener('click', () => handlers.onNew())

  const syncSelection = (view: PanelView): void => {
    const selected = view.selection
    const editable = selected !== null && selected.kind !== 'zone'
    selectionBlock.hidden = !editable
    if (!selected || selected.kind === 'zone') return
    deleteButton.hidden = false
    if (selected.kind === 'sign') {
      const sign = view.course.signs.find((item) => item.id === selected.id)
      if (!sign) {
        selectionBlock.hidden = true
        return
      }
      selectionTitle.textContent = 'Номер'
      obstacleFields.hidden = true
      signFields.hidden = false
      setValue(numberInput, String(sign.number))
      return
    }
    const obstacle = view.course.obstacles.find((item) => item.id === selected.id)
    if (!obstacle) {
      selectionBlock.hidden = true
      return
    }
    selectionTitle.textContent = OBSTACLE_LABEL[obstacle.type]
    obstacleFields.hidden = false
    signFields.hidden = true
    syncSize(obstacle)
  }

  const syncSize = (obstacle: Obstacle): void => {
    const labels = SIZE_LABEL[obstacle.type]
    const limits = SIZE_LIMITS[obstacle.type]
    spanCaption.textContent = `${labels.width}, м`
    spanInput.min = String(limits.width.min)
    spanInput.max = String(limits.width.max)
    writeNumber(spanInput, obstacle.width)
    depthLabel.hidden = labels.depth === null
    if (labels.depth) {
      depthCaption.textContent = `${labels.depth}, м`
      depthInput.min = String(limits.depth.min)
      depthInput.max = String(limits.depth.max)
      writeNumber(depthInput, obstacle.depth)
    }
    halfButton.hidden = obstacle.type !== 'arch'
    halfButton.classList.toggle('is-active', obstacle.half)
    halfButton.setAttribute('aria-pressed', obstacle.half ? 'true' : 'false')
  }

  let activeTool: Tool = 'select'

  return {
    sync(view) {
      setValue(lengthInput, String(view.course.ring.lengthM))
      setValue(widthInput, String(view.course.ring.widthM))
      if (document.activeElement !== classSelect) classSelect.value = view.course.classLevel
      activeTool = view.tool
      press(host, 'place', view.tool)
      press(host, 'zone', view.course.handlerZone.shape)
      press(host, 'view', view.view)
      count.textContent = `Снарядов: ${view.course.obstacles.length}, номеров: ${view.course.signs.length}`
      syncSelection(view)
      warningList.replaceChildren(
        ...view.warnings.map((warning) => {
          const item = document.createElement('li')
          item.textContent = warning.message
          return item
        }),
      )
      ok.hidden = view.warnings.length > 0
      status.textContent = view.status
      status.hidden = view.status.length === 0
    },
  }

  function startPlace(button: HTMLButtonElement, event: PointerEvent) {
    if (event.button !== 0) return
    const place = button.dataset.place
    if (!isPlaceable(place)) return
    event.preventDefault()
    const pointerId = event.pointerId
    const originX = event.clientX
    const originY = event.clientY
    button.setPointerCapture(pointerId)
    let ghost: HTMLElement | null = null
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      if (!ghost && Math.hypot(ev.clientX - originX, ev.clientY - originY) > 4) {
        ghost = document.createElement('div')
        ghost.className = 'drag-ghost'
        ghost.textContent = button.textContent?.trim() ?? ''
        document.body.append(ghost)
      }
      if (ghost) moveGhost(ghost, ev)
    }
    const stop = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      ghost?.remove()
      button.removeEventListener('pointermove', move)
      button.removeEventListener('pointerup', stop)
      button.removeEventListener('pointercancel', stop)
      if (ev.type !== 'pointerup') return
      const moved = Math.hypot(ev.clientX - originX, ev.clientY - originY) > 6
      if (!moved) {
        handlers.onTool(activeTool === place ? 'select' : place)
        return
      }
      handlers.onPlace(place, ev.clientX, ev.clientY)
    }
    button.addEventListener('pointermove', move)
    button.addEventListener('pointerup', stop)
    button.addEventListener('pointercancel', stop)
  }

  function commitRing() {
    const lengthM = Number(lengthInput.value)
    const widthM = Number(widthInput.value)
    if (!Number.isFinite(lengthM) || !Number.isFinite(widthM) || lengthM < 1 || widthM < 1) return
    handlers.onRing(lengthM, widthM)
  }
}

function isPlaceable(value: string | undefined): value is Placeable {
  return PLACEABLES.some((item) => item === value)
}

function moveGhost(ghost: HTMLElement, event: PointerEvent) {
  ghost.style.left = `${event.clientX + 12}px`
  ghost.style.top = `${event.clientY + 12}px`
}

function press(host: HTMLElement, key: string, value: string) {
  for (const button of host.querySelectorAll<HTMLButtonElement>(`[data-${key}]`)) {
    const active = button.dataset[key] === value
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', active ? 'true' : 'false')
  }
}

function writeNumber(input: HTMLInputElement, value: number) {
  const text = String(value)
  if (input.value !== text) input.value = text
}

function setValue(input: HTMLInputElement, value: string) {
  if (document.activeElement === input) return
  if (input.value !== value) input.value = value
}

function requiredElement(host: HTMLElement, selector: string): HTMLElement {
  const element = host.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`Не найден элемент ${selector}`)
  return element
}

function requiredInput(host: HTMLElement, selector: string): HTMLInputElement {
  const element = host.querySelector<HTMLInputElement>(selector)
  if (!element) throw new Error(`Не найдено поле ${selector}`)
  return element
}

function requiredSelect(host: HTMLElement, selector: string): HTMLSelectElement {
  const element = host.querySelector<HTMLSelectElement>(selector)
  if (!element) throw new Error(`Не найден список ${selector}`)
  return element
}

function requiredButton(host: HTMLElement, selector: string): HTMLButtonElement {
  const element = host.querySelector<HTMLButtonElement>(selector)
  if (!element) throw new Error(`Не найдена кнопка ${selector}`)
  return element
}
