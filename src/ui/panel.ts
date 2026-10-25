import type { ClassLevel, CourseDocument, Obstacle, ZoneShape } from '../model/course.ts'
import type { CourseWarning } from '../rules/classChecks.ts'
import { OBSTACLE_LABEL, SIZE_LABEL, SIZE_LIMITS } from '../rules/equipment.ts'
import type { Selection, Tool, ViewMode } from '../editor/types.ts'

export interface PanelHandlers {
  onRing(lengthM: number, widthM: number): void
  onClass(level: ClassLevel): void
  onTool(tool: Tool): void
  onZoneShape(shape: ZoneShape): void
  onNumber(number: number | null): void
  onRotate(delta: number): void
  onWidth(width: number): void
  onDepth(depth: number): void
  onHalf(half: boolean): void
  onShowPath(show: boolean): void
  onView(view: ViewMode): void
  onDelete(): void
  onNew(): void
  onSave(): void
  onOpen(file: File): void
}

export interface PanelView {
  course: CourseDocument
  tool: Tool
  view: ViewMode
  selection: Selection | null
  warnings: CourseWarning[]
  status: string
}

export function mountPanel(host: HTMLElement, handlers: PanelHandlers): { sync(view: PanelView): void } {
  host.innerHTML = `
    <header class="panel-header">
      <h1>Конструктор трасс</h1>
      <p>Сетка 1 м, привязка 0,5 м</p>
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
      <h2>Снаряд</h2>
      <div class="tools" role="toolbar">
        <button type="button" data-tool="select">Выбор</button>
        <button type="button" data-tool="arch">Арка</button>
        <button type="button" data-tool="barrel">Бочка</button>
        <button type="button" data-tool="gate">Ворота</button>
        <button type="button" data-tool="tunnel">Туннель</button>
      </div>
      <p class="hint">Щелчок по рингу ставит снаряд. Жёлтый диск и кнопки поворачивают на 15°.</p>
    </section>
    <section>
      <h2>Зона управления</h2>
      <div class="segmented">
        <button type="button" data-zone="circle">Круг 2 м</button>
        <button type="button" data-zone="square">Квадрат 2×2</button>
      </div>
    </section>
    <section id="selection" hidden>
      <h2 id="selection-title">Снаряд</h2>
      <p id="selection-meta"></p>
      <div id="number-fields">
        <label>Номер <input id="number" type="number" min="1" max="25" step="1"></label>
        <div class="rotate-row">
          <button type="button" id="rotate-left">−15°</button>
          <button type="button" id="rotate-right">+15°</button>
        </div>
        <label id="span-label"><span id="span-caption">Пролёт, м</span><input id="span" type="number" step="0.1"></label>
        <label id="depth-label"><span id="depth-caption">Высота, м</span><input id="obstacle-depth" type="number" step="0.1"></label>
        <button type="button" id="half">Полуарка</button>
        <button type="button" id="clear-number">Убрать номер</button>
        <button type="button" id="delete">Удалить</button>
      </div>
    </section>
    <section>
      <label class="check"><input id="path" type="checkbox"> Линия хода</label>
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
      <button type="button" id="open">Открыть</button>
      <button type="button" id="new">Новый</button>
      <input id="file" type="file" accept="application/json,.json" hidden>
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
  const pathInput = host.querySelector<HTMLInputElement>('#path')
  const selectionBlock = host.querySelector<HTMLElement>('#selection')
  const selectionTitle = host.querySelector<HTMLElement>('#selection-title')
  const selectionMeta = host.querySelector<HTMLElement>('#selection-meta')
  const numberFields = host.querySelector<HTMLElement>('#number-fields')
  const count = host.querySelector<HTMLElement>('#count')
  const warningList = host.querySelector<HTMLUListElement>('#warning-list')
  const ok = host.querySelector<HTMLElement>('#ok')
  const status = host.querySelector<HTMLElement>('#status')
  const fileInput = host.querySelector<HTMLInputElement>('#file')
  if (!pathInput || !selectionBlock || !selectionTitle || !selectionMeta || !numberFields || !count || !warningList || !ok || !status || !fileInput) {
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
    const tool = target.dataset.tool
    if (tool === 'select' || tool === 'arch' || tool === 'barrel' || tool === 'gate' || tool === 'tunnel') {
      handlers.onTool(tool)
    }
    const zone = target.dataset.zone
    if (zone === 'circle' || zone === 'square') handlers.onZoneShape(zone)
    const view = target.dataset.view
    if (view === 'top' || view === 'perspective') handlers.onView(view)
  })
  numberInput.addEventListener('change', () => {
    if (numberInput.value === '') {
      handlers.onNumber(null)
      return
    }
    const value = Number(numberInput.value)
    if (Number.isInteger(value) && value >= 1 && value <= 25) handlers.onNumber(value)
  })
  spanInput.addEventListener('change', () => handlers.onWidth(Number(spanInput.value)))
  depthInput.addEventListener('change', () => handlers.onDepth(Number(depthInput.value)))
  requiredButton(host, '#rotate-left').addEventListener('click', () => handlers.onRotate(-15))
  requiredButton(host, '#rotate-right').addEventListener('click', () => handlers.onRotate(15))
  halfButton.addEventListener('click', () => handlers.onHalf(halfButton.getAttribute('aria-pressed') !== 'true'))
  requiredButton(host, '#clear-number').addEventListener('click', () => handlers.onNumber(null))
  requiredButton(host, '#delete').addEventListener('click', () => handlers.onDelete())
  pathInput.addEventListener('change', () => handlers.onShowPath(pathInput.checked))
  requiredButton(host, '#save').addEventListener('click', () => handlers.onSave())
  requiredButton(host, '#open').addEventListener('click', () => fileInput.click())
  requiredButton(host, '#new').addEventListener('click', () => handlers.onNew())
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    fileInput.value = ''
    if (file) handlers.onOpen(file)
  })

  const syncSelection = (view: PanelView): void => {
    const selected = view.selection
    selectionBlock.hidden = selected === null
    if (!selected) return
    if (selected.kind === 'zone') {
      selectionTitle.textContent = 'Зона управления'
      selectionMeta.textContent = 'Перетащите жёлтую зону по рингу.'
      numberFields.hidden = true
      return
    }
    const obstacle = view.course.obstacles.find((item) => item.id === selected.id)
    numberFields.hidden = false
    if (!obstacle) {
      selectionBlock.hidden = true
      return
    }
    selectionTitle.textContent = OBSTACLE_LABEL[obstacle.type]
    selectionMeta.textContent = `${obstacle.x} м × ${obstacle.y} м, поворот ${obstacle.rotationDeg}°`
    setValue(numberInput, obstacle.number === null ? '' : String(obstacle.number))
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

  return {
    sync(view) {
      setValue(lengthInput, String(view.course.ring.lengthM))
      setValue(widthInput, String(view.course.ring.widthM))
      if (document.activeElement !== classSelect) classSelect.value = view.course.classLevel
      press(host, 'tool', view.tool)
      press(host, 'zone', view.course.handlerZone.shape)
      press(host, 'view', view.view)
      if (document.activeElement !== pathInput) pathInput.checked = view.course.showPath
      count.textContent = `На трассе: ${view.course.obstacles.length}`
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

  function commitRing() {
    const lengthM = Number(lengthInput.value)
    const widthM = Number(widthInput.value)
    if (!Number.isFinite(lengthM) || !Number.isFinite(widthM) || lengthM < 1 || widthM < 1) return
    handlers.onRing(lengthM, widthM)
  }
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
