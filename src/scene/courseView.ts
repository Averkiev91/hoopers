import * as THREE from 'three'
import type { CourseDocument, Obstacle, ZoneShape } from '../model/course.ts'
import type { Selection, ViewMode } from '../editor/types.ts'
import { GRID_M, obstacleReach } from '../rules/equipment.ts'
import {
  createObstacleMesh,
  createRotateHandle,
  createSignPlate,
  pathMaterialShared,
  selectionMaterialShared,
  signLinkMaterialShared,
  zoneMaterials,
} from './meshes.ts'

const ROOT_NAME = 'course-root'

export function syncCourseView(scene: THREE.Scene, course: CourseDocument, selected: Selection | null, view: ViewMode): void {
  const previous = scene.getObjectByName(ROOT_NAME)
  if (previous) {
    disposeOwned(previous)
    scene.remove(previous)
  }

  const root = new THREE.Group()
  root.name = ROOT_NAME
  root.add(createGround(course))
  root.add(createGrid(course))
  root.add(createBorder(course))
  root.add(createZone(course, selected?.kind === 'zone'))
  if (course.showPath) {
    const path = createPath(course)
    if (path) root.add(path)
  }
  for (const obstacle of course.obstacles) {
    const selectedObstacle = selected?.kind === 'obstacle' && selected.id === obstacle.id
    root.add(createObstacleObject(obstacle, selectedObstacle, view))
  }
  scene.add(root)
}

function createGround(course: CourseDocument): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(course.ring.lengthM, course.ring.widthM),
    new THREE.MeshStandardMaterial({ color: '#7f9a68', roughness: 1 }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(course.ring.lengthM / 2, 0, course.ring.widthM / 2)
  mesh.receiveShadow = true
  mesh.name = 'ground'
  mesh.userData.kind = 'ground'
  mesh.userData.disposeGeometry = true
  mesh.userData.disposeMaterial = true
  return mesh
}

function createGrid(course: CourseDocument): THREE.Group {
  const group = new THREE.Group()
  group.add(gridLines(course, GRID_M, '#d5e2c8'))
  group.add(gridLines(course, 5, '#f4f7ef'))
  ignoreRaycast(group)
  return group
}

function gridLines(course: CourseDocument, step: number, color: string): THREE.LineSegments {
  const points: number[] = []
  const { lengthM, widthM } = course.ring
  for (let x = 0; x <= lengthM + 0.001; x += step) {
    points.push(x, 0.035, 0, x, 0.035, widthM)
  }
  for (let z = 0; z <= widthM + 0.001; z += step) {
    points.push(0, 0.035, z, lengthM, 0.035, z)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color }))
  lines.userData.disposeGeometry = true
  lines.userData.disposeMaterial = true
  return lines
}

function createBorder(course: CourseDocument): THREE.LineLoop {
  const { lengthM, widthM } = course.ring
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.04, 0),
    new THREE.Vector3(lengthM, 0.04, 0),
    new THREE.Vector3(lengthM, 0.04, widthM),
    new THREE.Vector3(0, 0.04, widthM),
  ])
  const loop = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: '#243018' }))
  loop.userData.disposeGeometry = true
  loop.userData.disposeMaterial = true
  ignoreRaycast(loop)
  return loop
}

function createZone(course: CourseDocument, selected: boolean): THREE.Group {
  const group = new THREE.Group()
  group.name = 'zone'
  group.position.set(course.handlerZone.x, 0, course.handlerZone.y)
  const materials = zoneMaterials(selected)
  const shape = course.handlerZone.shape
  const fill = new THREE.Mesh(zoneGeometry(shape), materials.fill)
  fill.rotation.x = -Math.PI / 2
  fill.position.y = 0.02
  fill.userData.kind = 'zone'
  fill.userData.disposeGeometry = true
  group.add(fill)

  const outline = new THREE.LineLoop(zoneOutline(shape), materials.line)
  outline.userData.disposeGeometry = true
  ignoreRaycast(outline)
  group.add(outline)
  return group
}

function zoneGeometry(shape: ZoneShape): THREE.BufferGeometry {
  if (shape === 'circle') return new THREE.CircleGeometry(1, 48)
  return new THREE.PlaneGeometry(2, 2)
}

function zoneOutline(shape: ZoneShape): THREE.BufferGeometry {
  const points: THREE.Vector3[] = []
  if (shape === 'circle') {
    for (let index = 0; index < 48; index += 1) {
      const angle = (index / 48) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle), 0.045, Math.sin(angle)))
    }
  } else {
    points.push(
      new THREE.Vector3(-1, 0.045, -1),
      new THREE.Vector3(1, 0.045, -1),
      new THREE.Vector3(1, 0.045, 1),
      new THREE.Vector3(-1, 0.045, 1),
    )
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function createPath(course: CourseDocument): THREE.Group | null {
  const ordered = course.obstacles
    .filter((obstacle) => obstacle.number !== null)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0) || a.id.localeCompare(b.id))
  if (ordered.length < 2) return null

  const group = new THREE.Group()
  for (let index = 0; index < ordered.length - 1; index += 1) {
    group.add(pathSegment(ordered[index], ordered[index + 1], index === ordered.length - 2))
  }
  ignoreRaycast(group)
  return group
}

function pathSegment(from: Obstacle, to: Obstacle, last: boolean): THREE.Group {
  const group = new THREE.Group()
  const start = new THREE.Vector3(from.x, 0.06, from.y)
  const end = new THREE.Vector3(to.x, 0.06, to.y)
  const direction = end.clone().sub(start)
  const length = direction.length()
  if (length < 0.05) return group
  const segment = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, length, 8), pathMaterialShared)
  segment.position.copy(start).add(end).multiplyScalar(0.5)
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  segment.userData.disposeGeometry = true
  group.add(segment)
  if (last) {
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 12), pathMaterialShared)
    head.position.copy(end).addScaledVector(direction, -0.16)
    head.quaternion.copy(segment.quaternion)
    head.userData.disposeGeometry = true
    group.add(head)
  }
  return group
}

function createObstacleObject(obstacle: Obstacle, selected: boolean, view: ViewMode): THREE.Group {
  const group = createObstacleMesh(obstacle, view)
  group.name = `obstacle:${obstacle.id}`
  group.position.set(obstacle.x, 0, obstacle.y)
  group.rotation.y = THREE.MathUtils.degToRad(obstacle.rotationDeg)
  tag(group, { kind: 'obstacle', id: obstacle.id })

  if (obstacle.number !== null) {
    const label = String(obstacle.number)
    const plate = createSignPlate(label, view)
    plate.position.set(obstacle.signOffset.x, 0.05, obstacle.signOffset.y)
    plate.userData.kind = 'sign'
    plate.userData.id = obstacle.id
    group.add(plate)

    const link = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.07, 0),
        new THREE.Vector3(obstacle.signOffset.x, 0.07, obstacle.signOffset.y),
      ]),
      signLinkMaterialShared,
    )
    link.userData.disposeGeometry = true
    ignoreRaycast(link)
    group.add(link)
  }

  if (selected) {
    const reach = obstacleReach(obstacle.type, obstacle.width, obstacle.depth, obstacle.half)
    const ring = new THREE.Mesh(new THREE.RingGeometry(reach + 0.08, reach + 0.16, 40), selectionMaterialShared)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.045
    ring.userData.disposeGeometry = true
    ignoreRaycast(ring)
    group.add(ring)

    const handle = createRotateHandle()
    handle.position.set(reach + 0.46, 0.08, 0)
    handle.userData.kind = 'rotate'
    handle.userData.id = obstacle.id
    group.add(handle)
  }

  return group
}

function tag(object: THREE.Object3D, data: { kind: string; id: string }): void {
  object.traverse((child) => {
    child.userData.kind = data.kind
    child.userData.id = data.id
  })
}

function ignoreRaycast(object: THREE.Object3D): void {
  object.traverse((child) => {
    child.raycast = () => {}
  })
}

function disposeOwned(object: THREE.Object3D): void {
  object.traverse((child) => {
    const withGeometry = child as THREE.Mesh
    if (child.userData.disposeGeometry && withGeometry.geometry) withGeometry.geometry.dispose()
    if (child.userData.disposeMaterial) disposeMaterial(withGeometry.material)
  })
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const item of material) item.dispose()
    return
  }
  material.dispose()
}
