import * as THREE from 'three'
import type { Obstacle, ZoneShape } from '../model/course.ts'
import type { ViewMode } from '../editor/types.ts'
import { EQUIPMENT } from '../rules/equipment.ts'

// У обеих камер проекция зеркалит X, чтобы план и объём совпадали слева направо.
// BackSide снова делает наружную грань лицевой, иначе нормаль смотрит вниз.
const archMaterial = lit('#c0392b', 0.45, 0.08)
const barrelMaterial = lit('#a04020', 0.62)
const barrelBandMaterial = lit('#f0d78c', 0.45, 0.12)
const barrelCapMaterial = lit('#7b3418', 0.7)
const gateMaterial = lit('#7b241c', 0.55)
const tunnelMaterial = lit('#1a5276', 0.42, 0.06)
const tunnelRimMaterial = lit('#154360', 0.35, 0.12)
const coneMaterial = lit('#e67e22', 0.5)

const archPlanMaterial = planMaterial('#c0392b')
const barrelPlanMaterial = planMaterial('#a04020')
const barrelPlanFill = planMaterial('#c56a3a')
const gatePlanMaterial = planMaterial('#7b241c')
const tunnelPlanMaterial = planMaterial('#1a5276')
const conePlanMaterial = planMaterial('#e67e22')
const conePlanDot = planMaterial('#6e2c00')

const zoneMaterial = new THREE.MeshBasicMaterial({
  color: '#f4d03f',
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false,
})
const zoneSelectedMaterial = zoneMaterial.clone()
zoneSelectedMaterial.opacity = 0.78
const zoneCurbMaterial = lit('#e6b325', 0.45)
const handlerBodyMaterial = lit('#1f4e79', 0.55)
const handlerHeadMaterial = lit('#e0b08a', 0.65)
const handlerBodyPlan = planMaterial('#1f4e79')
const handlerHeadPlan = planMaterial('#e0b08a')
const selectionMaterial = new THREE.MeshBasicMaterial({ color: '#f7dc6f', side: THREE.DoubleSide })
const handleMaterial = new THREE.MeshBasicMaterial({ color: '#f4d03f', side: THREE.DoubleSide })
const pickMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide,
})

const textureCache = new Map<string, THREE.CanvasTexture>()
const PLAN_Y = 0.055

export function createObstacleMesh(obstacle: Obstacle, view: ViewMode): THREE.Group {
  const group = view === 'top' ? createPlan(obstacle) : createVolume(obstacle)
  group.add(pickTarget(obstacle))
  return group
}

function pickTarget(obstacle: Obstacle): THREE.Mesh {
  const radius = obstacle.type === 'tunnel'
    ? Math.max(obstacle.width, obstacle.depth) * 0.55
    : obstacle.type === 'gate'
      ? Math.max(obstacle.width * 0.55, 0.5)
      : obstacle.type === 'cone'
        ? Math.max(obstacle.width, 0.45)
        : obstacle.width * 0.62
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), pickMaterial)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.03
  mesh.userData.disposeGeometry = true
  return mesh
}

function createPlan(obstacle: Obstacle): THREE.Group {
  switch (obstacle.type) {
    case 'arch':
      return archPlan(obstacle.width, obstacle.half)
    case 'barrel':
      return barrelPlan(obstacle.width)
    case 'gate':
      return gatePlan(obstacle.width)
    case 'tunnel':
      return tunnelPlan(obstacle.width, obstacle.depth)
    case 'cone':
      return conePlan(obstacle.width)
  }
}

function createVolume(obstacle: Obstacle): THREE.Group {
  switch (obstacle.type) {
    case 'arch':
      return archVolume(obstacle.width, obstacle.half)
    case 'barrel':
      return barrelVolume(obstacle.width, obstacle.depth)
    case 'gate':
      return gateVolume(obstacle.width, obstacle.depth)
    case 'tunnel':
      return tunnelVolume(obstacle.width, obstacle.depth)
    case 'cone':
      return coneVolume(obstacle.width)
  }
}

function archPlan(width: number, half: boolean): THREE.Group {
  const group = new THREE.Group()
  const stroke = 0.07
  const bar = flatBox(width, stroke, archPlanMaterial)
  group.add(bar)
  const tick = flatBox(stroke, Math.max(width * 0.36, 0.2), archPlanMaterial)
  // Полуарка: засечка у единственной стойки (−X). Полная арка — как на схеме, засечка справа.
  tick.position.set((half ? -1 : 1) * (width / 2), PLAN_Y + 0.012, 0)
  group.add(tick)
  return group
}

function barrelPlan(diameter: number): THREE.Group {
  const group = new THREE.Group()
  const radius = diameter / 2
  group.add(layFlat(new THREE.CircleGeometry(radius * 0.9, 40), barrelPlanFill))
  group.add(layFlat(new THREE.RingGeometry(radius * 0.72, radius, 40), barrelPlanMaterial, PLAN_Y + 0.008))
  return group
}

function gatePlan(width: number): THREE.Group {
  const group = new THREE.Group()
  const post = 0.14
  const bar = flatBox(width, 0.1, gatePlanMaterial)
  group.add(bar)
  for (const side of [-1, 1]) {
    const upright = flatBox(post, 0.42, gatePlanMaterial)
    upright.position.set(side * (width / 2 - post / 2), PLAN_Y + 0.012, 0)
    group.add(upright)
  }
  return group
}

function conePlan(diameter: number): THREE.Group {
  const group = new THREE.Group()
  const radius = diameter / 2
  group.add(layFlat(new THREE.CircleGeometry(radius, 28), conePlanMaterial))
  group.add(layFlat(new THREE.CircleGeometry(Math.max(radius * 0.28, 0.025), 16), conePlanDot, PLAN_Y + 0.008))
  return group
}

function tunnelPlan(width: number, length: number): THREE.Group {
  const group = new THREE.Group()
  const stroke = 0.07
  addRectOutline(group, width, length, stroke, tunnelPlanMaterial)
  const stick = Math.min(width * 0.55, Math.max(width - stroke * 3, stroke))
  for (const side of [-1, 1]) {
    const mark = flatBox(stick, stroke, tunnelPlanMaterial)
    mark.position.set(0, PLAN_Y + 0.012, side * length * 0.22)
    group.add(mark)
  }
  return group
}

function addRectOutline(group: THREE.Group, width: number, length: number, stroke: number, material: THREE.Material): void {
  for (const side of [-1, 1]) {
    const across = flatBox(width + stroke, stroke, material)
    across.position.z = side * (length / 2)
    group.add(across)
    const along = flatBox(stroke, length + stroke, material)
    along.position.x = side * (width / 2)
    group.add(along)
  }
}

function archVolume(width: number, half: boolean): THREE.Group {
  const group = new THREE.Group()
  const radius = width / 2
  const tube = EQUIPMENT.arch.tubeRadius
  const leg = Math.max(0.18, width * 0.45)
  if (half) {
    const hoop = solid(new THREE.TorusGeometry(radius, tube, 16, 28, Math.PI / 2), archMaterial)
    hoop.rotation.z = Math.PI / 2
    hoop.position.y = leg
    group.add(hoop)
    addPost(group, -radius, leg, tube, EQUIPMENT.arch.footLength)
    return group
  }
  const hoop = solid(new THREE.TorusGeometry(radius, tube, 16, 56, Math.PI), archMaterial)
  hoop.position.y = leg
  group.add(hoop)
  for (const side of [-1, 1]) addPost(group, side * radius, leg, tube, EQUIPMENT.arch.footLength)
  return group
}

function addPost(group: THREE.Group, x: number, height: number, tube: number, footLength: number): void {
  const post = solid(new THREE.CylinderGeometry(tube, tube, height, 12), archMaterial)
  post.position.set(x, height / 2, 0)
  group.add(post)
  const foot = solid(new THREE.BoxGeometry(tube * 3.2, tube, footLength), archMaterial)
  foot.position.set(x, tube / 2, 0)
  group.add(foot)
}

function barrelVolume(diameter: number, height: number): THREE.Group {
  const group = new THREE.Group()
  const radius = diameter / 2
  const body = solid(new THREE.CylinderGeometry(radius, radius * 1.05, height, 32), barrelMaterial)
  body.position.y = height / 2
  group.add(body)
  for (const fraction of [0.24, 0.78]) {
    const band = solid(
      new THREE.CylinderGeometry(radius * 1.05 + 0.012, radius * 1.05 + 0.012, Math.max(0.035, height * 0.08), 32),
      barrelBandMaterial,
    )
    band.position.y = height * fraction
    group.add(band)
  }
  const cap = solid(new THREE.CircleGeometry(radius * 0.9, 32), barrelCapMaterial)
  cap.rotation.x = -Math.PI / 2
  cap.position.y = height + 0.004
  group.add(cap)
  return group
}

function gateVolume(width: number, height: number): THREE.Group {
  const group = new THREE.Group()
  const post = EQUIPMENT.gate.post
  const half = width / 2 - post / 2
  for (const side of [-1, 1]) {
    const upright = solid(new THREE.BoxGeometry(post, height, post), gateMaterial)
    upright.position.set(side * half, height / 2, 0)
    group.add(upright)
    const foot = solid(new THREE.BoxGeometry(post * 1.8, post * 0.7, EQUIPMENT.gate.footLength), gateMaterial)
    foot.position.set(side * half, post * 0.35, 0)
    group.add(foot)
  }
  const top = solid(new THREE.BoxGeometry(width, post, post), gateMaterial)
  top.position.y = height - post / 2
  group.add(top)
  const bars = Math.max(3, Math.round(width / 0.28))
  const span = Math.max(width - post * 4, post)
  for (let index = 0; index < bars; index += 1) {
    const bar = solid(new THREE.BoxGeometry(post * 0.5, Math.max(height - post * 2.4, post), post * 0.5), gateMaterial)
    const x = bars === 1 ? 0 : -span / 2 + (span / (bars - 1)) * index
    bar.position.set(x, height / 2, 0)
    group.add(bar)
  }
  return group
}

function coneVolume(diameter: number): THREE.Group {
  const group = new THREE.Group()
  const cone = solid(new THREE.ConeGeometry(diameter / 2, diameter, 24), coneMaterial)
  cone.position.y = diameter / 2
  group.add(cone)
  return group
}

function tunnelVolume(diameter: number, length: number): THREE.Group {
  const group = new THREE.Group()
  const outer = diameter / 2
  const wall = Math.min(0.04, outer * 0.16)
  const inner = Math.max(outer - wall, outer * 0.72)
  const shape = new THREE.Shape()
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 28 })
  geometry.translate(0, 0, -length / 2)
  const shell = solid(geometry, tunnelMaterial)
  shell.position.y = outer
  group.add(shell)
  const rimRadius = (outer + inner) / 2
  const rimTube = Math.max((outer - inner) / 2, 0.012)
  for (const end of [-1, 1]) {
    const rim = solid(new THREE.TorusGeometry(rimRadius, rimTube, 10, 28), tunnelRimMaterial)
    rim.position.set(0, outer, end * (length / 2 + rimTube * 0.35))
    group.add(rim)
  }
  return group
}

export function createSignPlate(label: string, view: ViewMode): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(0.8, 0.62)
  // Камера сверху считает «верх» осью +Z, а у лежащей плоскости верх текстуры смотрит в −Z.
  if (view === 'top') flipUvY(geometry)
  const material = new THREE.MeshBasicMaterial({
    map: numberTexture(label),
    side: THREE.DoubleSide,
  })
  const plate = new THREE.Mesh(geometry, material)
  plate.rotation.x = -Math.PI / 2
  plate.userData.disposeGeometry = true
  plate.userData.disposeMaterial = true
  return plate
}

function flipUvY(geometry: THREE.BufferGeometry): void {
  const uv = geometry.getAttribute('uv')
  for (let index = 0; index < uv.count; index += 1) {
    uv.setY(index, 1 - uv.getY(index))
  }
}

export function createRotateHandle(): THREE.Mesh {
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24), handleMaterial)
  handle.castShadow = false
  handle.userData.disposeGeometry = true
  return handle
}

export const selectionMaterialShared = selectionMaterial

export function zoneFillMaterial(selected: boolean): THREE.Material {
  return selected ? zoneSelectedMaterial : zoneMaterial
}

export function createZoneRim(shape: ZoneShape): THREE.Group {
  const group = new THREE.Group()
  if (shape === 'circle') {
    const rim = solid(new THREE.TorusGeometry(1, 0.05, 8, 64), zoneCurbMaterial)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.05
    group.add(rim)
    return group
  }
  const height = 0.1
  const thick = 0.07
  const span = 2 + thick
  const edges: Array<[number, number, number, number, number]> = [
    [span, height, thick, 0, 1],
    [span, height, thick, 0, -1],
    [thick, height, span, 1, 0],
    [thick, height, span, -1, 0],
  ]
  for (const [width, edgeHeight, depth, x, z] of edges) {
    const edge = solid(new THREE.BoxGeometry(width, edgeHeight, depth), zoneCurbMaterial)
    edge.position.set(x, edgeHeight / 2, z)
    group.add(edge)
  }
  return group
}

export function createHandler(view: ViewMode): THREE.Group {
  const group = new THREE.Group()
  group.name = 'handler'
  if (view === 'top') {
    group.add(layFlat(new THREE.CircleGeometry(0.24, 24), handlerBodyPlan, 0.09))
    const head = layFlat(new THREE.CircleGeometry(0.12, 20), handlerHeadPlan, 0.1)
    head.position.z = 0.3
    group.add(head)
    return group
  }
  const legs = solid(new THREE.CylinderGeometry(0.09, 0.1, 0.78, 12), handlerBodyMaterial)
  legs.position.y = 0.39
  const torso = solid(new THREE.CylinderGeometry(0.2, 0.17, 0.55, 16), handlerBodyMaterial)
  torso.position.y = 1.02
  const arms = solid(new THREE.CylinderGeometry(0.045, 0.045, 0.52, 8), handlerBodyMaterial)
  arms.rotation.z = Math.PI / 2
  arms.position.y = 1.18
  const head = solid(new THREE.SphereGeometry(0.15, 18, 14), handlerHeadMaterial)
  head.position.y = 1.52
  group.add(legs, torso, arms, head)
  return group
}

function numberTexture(label: string): THREE.CanvasTexture {
  const cached = textureCache.get(label)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Не удалось нарисовать номер')
  context.fillStyle = '#f7f4ec'
  context.fillRect(0, 0, 256, 256)
  context.strokeStyle = '#1e2a22'
  context.lineWidth = 18
  context.strokeRect(10, 10, 236, 236)
  context.fillStyle = '#1e2a22'
  context.font = '700 150px Segoe UI, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, 128, 138)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  textureCache.set(label, texture)
  return texture
}

function solid(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.disposeGeometry = true
  return mesh
}

function lit(color: string, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    side: THREE.BackSide,
  })
  material.shadowSide = THREE.FrontSide
  return material
}

function planMaterial(color: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
}

function layFlat(geometry: THREE.BufferGeometry, material: THREE.Material, y = PLAN_Y): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  mesh.userData.disposeGeometry = true
  return mesh
}

function flatBox(width: number, depth: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, depth), material)
  mesh.position.y = PLAN_Y
  mesh.userData.disposeGeometry = true
  return mesh
}

