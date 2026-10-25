import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewMode } from '../editor/types.ts'
import { orientSigns } from './courseView.ts'

export interface Viewport {
  readonly scene: THREE.Scene
  readonly domElement: HTMLCanvasElement
  readonly controls: OrbitControls
  readonly perspectiveCamera: THREE.PerspectiveCamera
  getView(): ViewMode
  setView(view: ViewMode): void
  activeCamera(): THREE.Camera
  frameRing(lengthM: number, widthM: number): void
  panTop(dx: number, dy: number): void
  zoomTop(factor: number): void
  ndc(event: { clientX: number; clientY: number }): THREE.Vector2
  pointOnGround(clientX: number, clientY: number): THREE.Vector3 | null
  capture(): string
  start(): void
}

export function createViewport(host: HTMLElement): Viewport {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#d7e4ee')

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.append(renderer.domElement)

  const topCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 300)
  const perspectiveCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 400)
  const controls = new OrbitControls(perspectiveCamera, renderer.domElement)
  controls.enableDamping = false
  controls.maxPolarAngle = Math.PI / 2.08
  controls.minDistance = 3
  controls.maxDistance = 180
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN
  controls.enabled = false
  // Проекция объёма зеркалит X. Без этого перетаскивание едет в обратную сторону.
  const orbit = controls as unknown as {
    _rotateLeft(angle: number): void
    _panLeft(distance: number, matrix: THREE.Matrix4): void
  }
  const rotateLeft = orbit._rotateLeft.bind(orbit)
  const panLeft = orbit._panLeft.bind(orbit)
  orbit._rotateLeft = (angle) => rotateLeft(-angle)
  orbit._panLeft = (distance, matrix) => panLeft(-distance, matrix)

  scene.add(new THREE.AmbientLight('#f6f7f2', 0.55))
  const hemi = new THREE.HemisphereLight('#f7f8f4', '#d5e4be', 0.45)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#fff8ee', 0.85)
  sun.position.set(18, 36, 12)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -40
  sun.shadow.camera.right = 40
  sun.shadow.camera.top = 40
  sun.shadow.camera.bottom = -40
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 90
  scene.add(sun)
  scene.add(sun.target)

  let view: ViewMode = 'top'
  let ring = { lengthM: 30, widthM: 20 }
  const topTarget = new THREE.Vector3(15, 0, 10)
  let framed = false
  const pointer = new THREE.Vector2()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const groundRay = new THREE.Raycaster()
  const groundHit = new THREE.Vector3()

  const viewport: Viewport = {
    scene,
    domElement: renderer.domElement,
    controls,
    perspectiveCamera,
    getView: () => view,
    setView(next) {
      view = next
      controls.enabled = next === 'perspective'
    },
    activeCamera: () => (view === 'top' ? topCamera : perspectiveCamera),
    frameRing(lengthM, widthM) {
      const previous = controls.target.clone()
      const offset = perspectiveCamera.position.clone().sub(previous)
      ring = { lengthM, widthM }
      const center = new THREE.Vector3(lengthM / 2, 0, widthM / 2)
      topTarget.copy(center)
      topCamera.zoom = 1
      controls.target.copy(center)
      sun.target.position.copy(center)
      sun.target.updateMatrixWorld()
      if (!framed) {
        // С юга (−Z) верх плана остаётся вдали. Зеркало проекции по X ставит малый x, как цифру 1, слева.
        perspectiveCamera.position.set(center.x + lengthM * 0.05, Math.max(lengthM, widthM) * 0.62, center.z - widthM * 1.05)
        framed = true
      } else if (offset.lengthSq() > 0) {
        perspectiveCamera.position.copy(center).add(offset)
      }
      layout()
      controls.update()
    },
    panTop(dx, dy) {
      const canvas = renderer.domElement
      if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return
      const spanX = Math.abs(topCamera.right - topCamera.left) / topCamera.zoom
      const spanY = Math.abs(topCamera.top - topCamera.bottom) / topCamera.zoom
      topTarget.x -= (dx * spanX) / canvas.clientWidth
      topTarget.z += (dy * spanY) / canvas.clientHeight
    },
    zoomTop(factor) {
      topCamera.zoom = THREE.MathUtils.clamp(topCamera.zoom * factor, 0.25, 14)
      topCamera.updateProjectionMatrix()
    },
    ndc(event) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      return pointer
    },
    pointOnGround(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null
      groundRay.setFromCamera(viewport.ndc({ clientX, clientY }), view === 'top' ? topCamera : perspectiveCamera)
      return groundRay.ray.intersectPlane(groundPlane, groundHit) ? groundHit.clone() : null
    },
    capture() {
      if (view === 'top') {
        topCamera.position.set(topTarget.x, 80, topTarget.z)
        topCamera.up.set(0, 0, 1)
        topCamera.lookAt(topTarget)
        renderer.render(scene, topCamera)
      } else {
        controls.update()
        orientSigns(scene, controls.getAzimuthalAngle())
        mirrorProjectionX(perspectiveCamera)
        renderer.render(scene, perspectiveCamera)
      }
      return renderer.domElement.toDataURL('image/png')
    },
    start() {
      renderer.setAnimationLoop(() => {
        if (view === 'top') {
          topCamera.position.set(topTarget.x, 80, topTarget.z)
          topCamera.up.set(0, 0, 1)
          topCamera.lookAt(topTarget)
          renderer.render(scene, topCamera)
        } else {
          controls.update()
          orientSigns(scene, controls.getAzimuthalAngle())
          mirrorProjectionX(perspectiveCamera)
          renderer.render(scene, perspectiveCamera)
        }
      })
    },
  }

  function mirrorProjectionX(camera: THREE.PerspectiveCamera) {
    camera.updateProjectionMatrix()
    const elements = camera.projectionMatrix.elements
    elements[0] = -Math.abs(elements[0])
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  }

  function layout() {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    renderer.setSize(width, height, false)
    perspectiveCamera.aspect = width / height
    perspectiveCamera.updateProjectionMatrix()

    const aspect = width / height
    const margin = 1.18
    const ringAspect = ring.lengthM / ring.widthM
    let viewWidth: number
    let viewHeight: number
    if (aspect >= ringAspect) {
      viewHeight = ring.widthM * margin
      viewWidth = viewHeight * aspect
    } else {
      viewWidth = ring.lengthM * margin
      viewHeight = viewWidth / aspect
    }
    // Камера смотрит сверху, вектор «вверх» — это +Z. У правой тройки
    // экранный X оказывается зеркальным, поэтому левая и правая грани меняются местами.
    topCamera.left = viewWidth / 2
    topCamera.right = -viewWidth / 2
    topCamera.top = viewHeight / 2
    topCamera.bottom = -viewHeight / 2
    topCamera.updateProjectionMatrix()
  }

  const observer = new ResizeObserver(() => layout())
  observer.observe(host)
  layout()
  return viewport
}
