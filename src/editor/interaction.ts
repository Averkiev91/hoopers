import * as THREE from 'three'
import { clampToRing, clampZoneCenter, normalizeDegrees } from '../model/course.ts'
import type { Store } from '../state/store.ts'
import type { Viewport } from '../scene/viewport.ts'
import type { Selection, Tool } from './types.ts'

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const raycaster = new THREE.Raycaster()
const hitPoint = new THREE.Vector3()

interface EditorBindings {
  viewport: Viewport
  store: Store
  getTool(): Tool
  select(selection: Selection | null): void
  place(clientX: number, clientY: number): void
  render(): void
}

type Drag =
  | { kind: 'obstacle'; id: string; offsetX: number; offsetY: number }
  | { kind: 'sign'; id: string; offsetX: number; offsetY: number }
  | { kind: 'rotate'; id: string }
  | { kind: 'zone'; offsetX: number; offsetY: number }

export function bindEditor(bindings: EditorBindings): void {
  const { viewport, store, getTool, select, place, render } = bindings
  const dom = viewport.domElement
  let drag: Drag | null = null
  let pointerId = -1
  let startX = 0
  let startY = 0
  let armed: 'place' | 'clear' | null = null
  let cameraSnapshot: { position: THREE.Vector3; target: THREE.Vector3 } | null = null
  let panning = false

  dom.addEventListener('pointerdown', onPointerDown, { capture: true })
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  dom.addEventListener('wheel', onWheel, { capture: true, passive: false })
  dom.addEventListener('contextmenu', (event) => event.preventDefault())

  function onPointerDown(event: PointerEvent) {
    if (event.button === 2 && viewport.getView() === 'top') {
      panning = true
      pointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (event.button !== 0) return

    const point = groundPoint(event)
    const hit = pick(event)
    const tool = getTool()
    startX = event.clientX
    startY = event.clientY
    armed = null
    drag = null
    cameraSnapshot = null

    if (hit?.kind === 'rotate' && hit.id && point) {
      beginDrag(event, { kind: 'rotate', id: hit.id })
      select({ kind: 'obstacle', id: hit.id })
      render()
      return
    }
    if (hit?.kind === 'sign' && hit.id && point) {
      const sign = store.get().signs.find((item) => item.id === hit.id)
      if (!sign) return
      beginDrag(event, {
        kind: 'sign',
        id: hit.id,
        offsetX: point.x - sign.x,
        offsetY: point.z - sign.y,
      })
      select({ kind: 'sign', id: hit.id })
      render()
      return
    }
    if (hit?.kind === 'obstacle' && hit.id && point) {
      const obstacle = store.get().obstacles.find((item) => item.id === hit.id)
      if (!obstacle) return
      beginDrag(event, {
        kind: 'obstacle',
        id: hit.id,
        offsetX: point.x - obstacle.x,
        offsetY: point.z - obstacle.y,
      })
      select({ kind: 'obstacle', id: hit.id })
      render()
      return
    }
    if (hit?.kind === 'zone' && point) {
      const zone = store.get().handlerZone
      beginDrag(event, {
        kind: 'zone',
        offsetX: point.x - zone.x,
        offsetY: point.z - zone.y,
      })
      select({ kind: 'zone' })
      render()
      return
    }

    if (viewport.getView() === 'perspective') {
      cameraSnapshot = {
        position: viewport.perspectiveCamera.position.clone(),
        target: viewport.controls.target.clone(),
      }
    }
    armed = tool === 'select' ? 'clear' : 'place'
    pointerId = event.pointerId
  }

  function beginDrag(event: PointerEvent, next: Drag) {
    drag = next
    pointerId = event.pointerId
    viewport.controls.enabled = false
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function onPointerMove(event: PointerEvent) {
    if (panning && event.pointerId === pointerId) {
      viewport.panTop(event.clientX - startX, event.clientY - startY)
      startX = event.clientX
      startY = event.clientY
      return
    }
    if (!drag || event.pointerId !== pointerId) return
    const point = groundPoint(event)
    if (!point) return
    if (drag.kind === 'obstacle') moveObstacle(drag, point)
    else if (drag.kind === 'sign') moveSign(drag, point)
    else if (drag.kind === 'rotate') rotateObstacle(drag.id, point)
    else moveZone(drag, point)
  }

  function onPointerUp(event: PointerEvent) {
    if (panning && event.pointerId === pointerId) {
      panning = false
      pointerId = -1
      return
    }
    if (pointerId !== event.pointerId && drag === null && armed === null) return
    const wasDrag = drag
    const wasArmed = armed
    const didMove = Math.hypot(event.clientX - startX, event.clientY - startY) > 5
    drag = null
    armed = null
    pointerId = -1
    if (viewport.getView() === 'perspective') viewport.controls.enabled = true
    if (wasDrag || !wasArmed || didMove) return

    if (cameraSnapshot) {
      viewport.perspectiveCamera.position.copy(cameraSnapshot.position)
      viewport.controls.target.copy(cameraSnapshot.target)
      viewport.controls.update()
      cameraSnapshot = null
    }
    if (wasArmed === 'place') {
      place(event.clientX, event.clientY)
      return
    }
    if (wasArmed === 'clear') {
      select(null)
      render()
    }
  }

  function onWheel(event: WheelEvent) {
    if (viewport.getView() !== 'top') return
    event.preventDefault()
    event.stopImmediatePropagation()
    viewport.zoomTop(event.deltaY > 0 ? 0.92 : 1.08)
  }

  function moveObstacle(current: Extract<Drag, { kind: 'obstacle' }>, point: THREE.Vector3) {
    const ring = store.get().ring
    const x = clampToRing(point.x - current.offsetX, ring.lengthM)
    const y = clampToRing(point.z - current.offsetY, ring.widthM)
    store.update((course) => {
      const obstacle = course.obstacles.find((item) => item.id === current.id)
      if (!obstacle) return
      obstacle.x = x
      obstacle.y = y
    })
  }

  function moveSign(current: Extract<Drag, { kind: 'sign' }>, point: THREE.Vector3) {
    const ring = store.get().ring
    const x = clampToRing(point.x - current.offsetX, ring.lengthM)
    const y = clampToRing(point.z - current.offsetY, ring.widthM)
    store.update((course) => {
      const sign = course.signs.find((item) => item.id === current.id)
      if (!sign) return
      sign.x = x
      sign.y = y
    })
  }

  function rotateObstacle(id: string, point: THREE.Vector3) {
    const obstacle = store.get().obstacles.find((item) => item.id === id)
    if (!obstacle) return
    const radians = Math.atan2(-(point.z - obstacle.y), point.x - obstacle.x)
    const degrees = normalizeDegrees(Math.round(THREE.MathUtils.radToDeg(radians) / 15) * 15)
    store.update((course) => {
      const target = course.obstacles.find((item) => item.id === id)
      if (!target) return
      target.rotationDeg = degrees
    })
  }

  function moveZone(current: Extract<Drag, { kind: 'zone' }>, point: THREE.Vector3) {
    const ring = store.get().ring
    const x = clampZoneCenter(point.x - current.offsetX, ring.lengthM)
    const y = clampZoneCenter(point.z - current.offsetY, ring.widthM)
    store.update((course) => {
      course.handlerZone.x = x
      course.handlerZone.y = y
    })
  }

  function pick(event: PointerEvent): { kind: string; id?: string } | null {
    for (const hit of cast(event)) {
      const kind = hit.object.userData.kind
      if (typeof kind !== 'string' || kind === 'ground') continue
      const id = hit.object.userData.id
      return { kind, id: typeof id === 'string' ? id : undefined }
    }
    return null
  }

  function groundPoint(event: PointerEvent): THREE.Vector3 | null {
    raycaster.setFromCamera(viewport.ndc(event), viewport.activeCamera())
    return raycaster.ray.intersectPlane(groundPlane, hitPoint) ? hitPoint : null
  }

  function cast(event: PointerEvent): THREE.Intersection[] {
    raycaster.setFromCamera(viewport.ndc(event), viewport.activeCamera())
    return raycaster.intersectObjects(viewport.scene.children, true)
  }
}

