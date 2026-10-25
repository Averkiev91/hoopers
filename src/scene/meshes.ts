import * as THREE from 'three'
import type { ObstacleType } from '../model/course.ts'
import { EQUIPMENT } from '../rules/equipment.ts'

const archMaterial = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.55, metalness: 0.05 })
const archMarkMaterial = new THREE.MeshBasicMaterial({ color: '#e74c3c', side: THREE.DoubleSide })
const barrelMaterial = new THREE.MeshStandardMaterial({ color: '#a04020', roughness: 0.72 })
const barrelBandMaterial = new THREE.MeshStandardMaterial({ color: '#f0d78c', roughness: 0.6 })
const gateMaterial = new THREE.MeshStandardMaterial({ color: '#7b241c', roughness: 0.62 })
const gateMarkMaterial = new THREE.MeshBasicMaterial({ color: '#922b21', side: THREE.DoubleSide })
const tunnelMaterial = new THREE.MeshStandardMaterial({ color: '#1a5276', roughness: 0.45, side: THREE.DoubleSide })
const tunnelMarkMaterial = new THREE.MeshBasicMaterial({ color: '#1f618d', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
const zoneMaterial = new THREE.MeshBasicMaterial({
  color: '#f4d03f',
  transparent: true,
  opacity: 0.38,
  side: THREE.DoubleSide,
  depthWrite: false,
})
const zoneSelectedMaterial = zoneMaterial.clone()
zoneSelectedMaterial.opacity = 0.62
const zoneLineMaterial = new THREE.LineBasicMaterial({ color: '#9a7b12' })
const selectionMaterial = new THREE.MeshBasicMaterial({ color: '#f7dc6f', side: THREE.DoubleSide })
const pathMaterial = new THREE.MeshStandardMaterial({ color: '#f7f1d0', roughness: 0.4 })
const signLinkMaterial = new THREE.LineBasicMaterial({ color: '#f7f1d0' })
const handleMaterial = new THREE.MeshStandardMaterial({ color: '#f4d03f', roughness: 0.4 })

const textureCache = new Map<string, THREE.CanvasTexture>()

function createArch(): THREE.Group {
  const group = new THREE.Group()
  const radius = EQUIPMENT.arch.clearWidth / 2
  const leg = EQUIPMENT.arch.clearHeight - radius
  const tube = EQUIPMENT.arch.tubeRadius

  const hoop = solid(new THREE.TorusGeometry(radius, tube, 10, 28, Math.PI), archMaterial)
  hoop.position.y = leg
  group.add(hoop)

  for (const side of [-1, 1]) {
    const post = solid(new THREE.CylinderGeometry(tube, tube, leg, 10), archMaterial)
    post.position.set(side * radius, leg / 2, 0)
    group.add(post)

    const foot = solid(new THREE.BoxGeometry(tube * 3, tube, EQUIPMENT.arch.footLength), archMaterial)
    foot.position.set(side * radius, tube / 2, 0)
    group.add(foot)
  }

  const mark = flat(new THREE.RingGeometry(radius - 0.07, radius + 0.07, 40), archMarkMaterial)
  group.add(mark)
  return group
}

function createBarrel(): THREE.Group {
  const group = new THREE.Group()
  const radius = EQUIPMENT.barrel.diameter / 2
  const height = EQUIPMENT.barrel.height
  const body = solid(new THREE.CylinderGeometry(radius, radius, height, 28), barrelMaterial)
  body.position.y = height / 2
  group.add(body)
  const band = solid(new THREE.CylinderGeometry(radius + 0.012, radius + 0.012, height * 0.18, 28), barrelBandMaterial)
  band.position.y = height * 0.62
  group.add(band)
  return group
}

function createGate(): THREE.Group {
  const group = new THREE.Group()
  const { width, height, post, footLength } = EQUIPMENT.gate
  const half = width / 2 - post / 2

  for (const side of [-1, 1]) {
    const upright = solid(new THREE.BoxGeometry(post, height, post), gateMaterial)
    upright.position.set(side * half, height / 2, 0)
    group.add(upright)
    const foot = solid(new THREE.BoxGeometry(post * 1.4, post, footLength), gateMaterial)
    foot.position.set(side * half, post / 2, 0)
    group.add(foot)
  }

  const top = solid(new THREE.BoxGeometry(width, post, post), gateMaterial)
  top.position.y = height - post / 2
  group.add(top)

  const bars = 5
  for (let index = 0; index < bars; index += 1) {
    const bar = solid(new THREE.BoxGeometry(post * 0.55, height - post * 2, post * 0.55), gateMaterial)
    const span = width - post * 3
    bar.position.set(-span / 2 + (span / (bars - 1)) * index, height / 2, 0)
    group.add(bar)
  }

  const mark = flat(new THREE.PlaneGeometry(width, 0.14), gateMarkMaterial)
  group.add(mark)
  return group
}

function createTunnel(): THREE.Group {
  const group = new THREE.Group()
  const radius = EQUIPMENT.tunnel.diameter / 2
  const length = EQUIPMENT.tunnel.length
  const shell = solid(new THREE.CylinderGeometry(radius, radius, length, 28, 1, true), tunnelMaterial)
  shell.rotation.z = Math.PI / 2
  shell.position.y = radius
  group.add(shell)
  const mark = flat(new THREE.PlaneGeometry(length, EQUIPMENT.tunnel.diameter), tunnelMarkMaterial)
  group.add(mark)
  return group
}

export function createObstacleMesh(type: ObstacleType): THREE.Group {
  switch (type) {
    case 'arch':
      return createArch()
    case 'barrel':
      return createBarrel()
    case 'gate':
      return createGate()
    case 'tunnel':
      return createTunnel()
  }
}

export function createNumberSprite(label: string, height: number): THREE.Sprite {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: numberTexture(label) }))
  sprite.position.y = height + 0.35
  sprite.scale.set(1.5, 1.5, 1)
  sprite.userData.disposeMaterial = true
  return sprite
}

export function createSignPlate(label: string): THREE.Mesh {
  const side = new THREE.MeshBasicMaterial({ color: '#f7f4ec' })
  const top = new THREE.MeshBasicMaterial({ map: numberTexture(label), color: '#ffffff' })
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.85), [side, side, top, side, side, side])
  plate.userData.disposeGeometry = true
  plate.userData.disposeMaterial = true
  return plate
}

export function createRotateHandle(): THREE.Mesh {
  const handle = solid(new THREE.SphereGeometry(0.32, 16, 12), handleMaterial)
  handle.castShadow = false
  return handle
}

export const signLinkMaterialShared = signLinkMaterial
export const selectionMaterialShared = selectionMaterial
export const pathMaterialShared = pathMaterial
export function zoneMaterials(selected: boolean): { fill: THREE.Material; line: THREE.Material } {
  return { fill: selected ? zoneSelectedMaterial : zoneMaterial, line: zoneLineMaterial }
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
  context.lineWidth = 16
  context.strokeRect(8, 8, 240, 240)
  context.fillStyle = '#1e2a22'
  context.font = '700 148px Segoe UI, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, 128, 136)
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

function flat(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.03
  mesh.userData.disposeGeometry = true
  return mesh
}
