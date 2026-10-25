import * as THREE from 'three'
import type { CourseDocument, NumberSign, Obstacle, ZoneShape } from '../model/course.ts'
import type { Selection, ViewMode } from '../editor/types.ts'
import { GRID_M, obstacleReach } from '../rules/equipment.ts'
import { createHandler, createObstacleMesh, createRotateHandle, createSignPlate, createZoneRim, selectionMaterialShared, zoneFillMaterial } from './meshes.ts'

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
  root.add(createZone(course, selected?.kind === 'zone', view))
  for (const obstacle of course.obstacles) {
    const selectedObstacle = selected?.kind === 'obstacle' && selected.id === obstacle.id
    root.add(createObstacleObject(obstacle, selectedObstacle, view))
  }
  for (const sign of course.signs) {
    const selectedSign = selected?.kind === 'sign' && selected.id === sign.id
    root.add(createSignObject(sign, selectedSign, view))
  }
  scene.add(root)
}

function createGround(course: CourseDocument): THREE.Mesh {
  // Без освещения: у стандартного материала трава на экране темнеет почти вдвое.
  const material = new THREE.MeshBasicMaterial({
    color: '#b6d498',
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(course.ring.lengthM, course.ring.widthM),
    material,
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(course.ring.lengthM / 2, 0, course.ring.widthM / 2)
  mesh.receiveShadow = false
  mesh.name = 'ground'
  mesh.userData.kind = 'ground'
  mesh.userData.disposeGeometry = true
  mesh.userData.disposeMaterial = true
  return mesh
}

function createGrid(course: CourseDocument): THREE.Group {
  const group = new THREE.Group()
  group.add(gridLines(course, GRID_M, '#d5ebc6'))
  group.add(gridLines(course, 5, '#f4faef'))
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
  const loop = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: '#5f7a4c' }))
  loop.userData.disposeGeometry = true
  loop.userData.disposeMaterial = true
  ignoreRaycast(loop)
  return loop
}

function createZone(course: CourseDocument, selected: boolean, view: ViewMode): THREE.Group {
  const group = new THREE.Group()
  group.name = 'zone'
  group.position.set(course.handlerZone.x, 0, course.handlerZone.y)
  const fill = new THREE.Mesh(zoneGeometry(course.handlerZone.shape), zoneFillMaterial(selected))
  fill.rotation.x = -Math.PI / 2
  fill.position.y = 0.02
  fill.userData.disposeGeometry = true
  group.add(fill)
  group.add(createZoneRim(course.handlerZone.shape))
  group.add(createHandler(view))
  tag(group, { kind: 'zone', id: 'zone' })
  return group
}

function zoneGeometry(shape: ZoneShape): THREE.BufferGeometry {
  if (shape === 'circle') return new THREE.CircleGeometry(1, 48)
  return new THREE.PlaneGeometry(2, 2)
}

function createSignObject(sign: NumberSign, selected: boolean, view: ViewMode): THREE.Group {
  const group = new THREE.Group()
  group.name = `sign:${sign.id}`
  group.position.set(sign.x, 0, sign.y)
  const plate = createSignPlate(String(sign.number), view)
  plate.position.y = 0.08
  group.add(plate)
  tag(group, { kind: 'sign', id: sign.id })
  if (selected) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.58, 32), selectionMaterialShared)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.07
    ring.userData.disposeGeometry = true
    ignoreRaycast(ring)
    group.add(ring)
  }
  return group
}

function createObstacleObject(obstacle: Obstacle, selected: boolean, view: ViewMode): THREE.Group {
  const group = createObstacleMesh(obstacle, view)
  group.name = `obstacle:${obstacle.id}`
  group.position.set(obstacle.x, 0, obstacle.y)
  group.rotation.y = THREE.MathUtils.degToRad(obstacle.rotationDeg)
  tag(group, { kind: 'obstacle', id: obstacle.id })

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
