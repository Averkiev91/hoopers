# Graph Report - hoopers  (2026-10-25)

## Corpus Check
- 17 files · ~7,206 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 234 nodes · 481 edges · 9 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- meshes.ts
- main.ts
- interaction.ts
- package.json
- course.ts
- panel.ts
- classChecks.ts
- compilerOptions
- CourseDocument

## God Nodes (most connected - your core abstractions)
1. `bindEditor()` - 21 edges
2. `mountPanel()` - 17 edges
3. `compilerOptions` - 16 edges
4. `PanelHandlers` - 12 edges
5. `CourseDocument` - 11 edges
6. `Viewport` - 11 edges
7. `parseCourse()` - 10 edges
8. `syncCourseView()` - 10 edges
9. `clampToRing()` - 9 edges
10. `createObstacleObject()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `EditorBindings` --references--> `Viewport`  [EXTRACTED]
  src/editor/interaction.ts → src/scene/viewport.ts
- `EditorBindings` --references--> `Store`  [EXTRACTED]
  src/editor/interaction.ts → src/state/store.ts
- `bindEditor()` --calls--> `createObstacle()`  [EXTRACTED]
  src/editor/interaction.ts → src/model/course.ts
- `placeAt()` --calls--> `createObstacle()`  [EXTRACTED]
  src/editor/interaction.ts → src/model/course.ts
- `render()` --calls--> `checkCourse()`  [EXTRACTED]
  src/main.ts → src/rules/classChecks.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "meshes.ts"
Cohesion: 0.08
Nodes (47): obstacleHeight(), createBorder(), createGrid(), createGround(), createObstacleObject(), createPath(), createZone(), disposeMaterial() (+39 more)

### Community 1 - "main.ts"
Cohesion: 0.09
Nodes (17): Selection, Tool, ViewMode, openFile(), panelHost, render(), store, viewHost (+9 more)

### Community 2 - "interaction.ts"
Cohesion: 0.15
Nodes (25): bindEditor(), beginDrag(), cast(), groundPoint(), moveObstacle(), moveSign(), moveZone(), onPointerDown() (+17 more)

### Community 3 - "package.json"
Cohesion: 0.08
Nodes (23): dependencies, graphify, three, devDependencies, @types/three, typescript, vite, vitest (+15 more)

### Community 4 - "course.ts"
Cohesion: 0.17
Nodes (22): CLASS_LEVELS, COURSE_VERSION, createDefaultCourse(), createObstacle(), HandlerZone, isRecord(), OBSTACLE_TYPES, ObstacleType (+14 more)

### Community 5 - "panel.ts"
Cohesion: 0.14
Nodes (11): ClassLevel, ZoneShape, CourseWarning, OBSTACLE_LABEL, mountPanel(), commitRing(), PanelHandlers, requiredButton() (+3 more)

### Community 6 - "classChecks.ts"
Cohesion: 0.15
Nodes (20): Obstacle, checkCourse(), distance(), formatMeters(), insideRing(), kitWarnings(), numberWarnings(), placementWarnings() (+12 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 8 - "CourseDocument"
Cohesion: 0.36
Nodes (3): CourseDocument, createStore(), Store

## Knowledge Gaps
- **4 isolated node(s):** `@types/three`, `typescript`, `vite`, `graphify`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 82 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `package.json` to `meshes.ts`, `main.ts`, `interaction.ts`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `bindEditor()` (e.g. with `onPointerDown()` and `onPointerMove()`) actually correct?**
  _`bindEditor()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/three`, `typescript`, `vite` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `meshes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07993197278911565 - nodes in this community are weakly interconnected._
- **Why does `bindEditor()` connect `interaction.ts` to `main.ts`, `course.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0946969696969697 - nodes in this community are weakly interconnected._
- **Why does `mountPanel()` connect `panel.ts` to `main.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._