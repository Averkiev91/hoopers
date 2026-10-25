# Graph Report - hoopers  (2026-10-25)

## Corpus Check
- 22 files · ~11,078 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .mdc 1, (none) 1, .css 1)

## Summary
- 304 nodes · 614 edges · 13 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d302ee5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- main.ts
- courseView.ts
- guard-dev-server.mjs
- Конструктор трасс хуперса

## God Nodes (most connected - your core abstractions)
1. `mountPanel()` - 22 edges
2. `bindEditor()` - 17 edges
3. `PanelHandlers` - 16 edges
4. `compilerOptions` - 16 edges
5. `parseCourse()` - 13 edges
6. `CourseDocument` - 12 edges
7. `parseObstacle()` - 12 edges
8. `Viewport` - 12 edges
9. `ViewMode` - 10 edges
10. `clampToRing()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Карта` --references--> `snap()`  [INFERRED]
  .cursor/skills/hoopers-course/SKILL.md → src/model/course.ts
- `Карта` --references--> `parseCourse()`  [INFERRED]
  .cursor/skills/hoopers-course/SKILL.md → src/model/course.ts
- `Правка` --references--> `parseCourse()`  [INFERRED]
  .cursor/skills/hoopers-course/SKILL.md → src/model/course.ts
- `Правка` --references--> `checkCourse()`  [INFERRED]
  .cursor/skills/hoopers-course/SKILL.md → src/rules/classChecks.ts
- `Правка` --references--> `CourseDocument`  [INFERRED]
  .cursor/skills/hoopers-course/SKILL.md → src/model/course.ts

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "meshes.ts"
Cohesion: 0.06
Nodes (51): addPost(), archMaterial, archPlan(), archPlanMaterial, archPoints(), archVolume(), arcPoints(), barrelBandMaterial (+43 more)

### Community 1 - "main.ts"
Cohesion: 0.12
Nodes (11): three, Drag, groundPlane, hitPoint, raycaster, Selection, Tool, ViewMode (+3 more)

### Community 2 - "interaction.ts"
Cohesion: 0.16
Nodes (19): bindEditor(), beginDrag(), cast(), groundPoint(), moveObstacle(), moveSign(), moveZone(), onPointerDown() (+11 more)

### Community 3 - "package.json"
Cohesion: 0.08
Nodes (22): dependencies, graphify, three, devDependencies, @types/three, typescript, vite, vitest (+14 more)

### Community 4 - "course.ts"
Cohesion: 0.18
Nodes (23): CLASS_LEVELS, COURSE_VERSION, formatLimit(), HandlerZone, isRecord(), OBSTACLE_TYPES, parseAxis(), parseCourse() (+15 more)

### Community 5 - "panel.ts"
Cohesion: 0.09
Nodes (20): Placeable, ClassLevel, Obstacle, ZoneShape, CourseWarning, SIZE_LABEL, SIZE_LIMITS, isPlaceable() (+12 more)

### Community 6 - "classChecks.ts"
Cohesion: 0.14
Nodes (22): ObstacleType, checkCourse(), distance(), formatMeters(), insideRing(), kitWarnings(), nearestObstacle(), numberWarnings() (+14 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 8 - "CourseDocument"
Cohesion: 0.19
Nodes (7): Карта, Конструктор трасс хуперса, Правка, Проверка, CourseDocument, createStore(), Store

### Community 9 - "main.ts"
Cohesion: 0.10
Nodes (22): clampAxis(), openFile(), panelHost, place(), placeFromPalette(), render(), store, viewHost (+14 more)

### Community 10 - "courseView.ts"
Cohesion: 0.25
Nodes (17): obstacleReach(), createBorder(), createGrid(), createGround(), createObstacleObject(), createSignObject(), createZone(), disposeMaterial() (+9 more)

### Community 11 - "guard-dev-server.mjs"
Cohesion: 0.48
Nodes (5): main(), portOpen(), readCommand(), readStdin(), respond()

### Community 12 - "Конструктор трасс хуперса"
Cohesion: 0.40
Nodes (4): Запуск, Как собирать трассу, Классы, Конструктор трасс хуперса

## Knowledge Gaps
- **4 isolated node(s):** `@types/three`, `typescript`, `vite`, `graphify`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 103 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `main.ts` to `meshes.ts`, `courseView.ts`, `package.json`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `bindEditor()` (e.g. with `onPointerDown()` and `onPointerMove()`) actually correct?**
  _`bindEditor()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/three`, `typescript`, `vite` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `meshes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0602322206095791 - nodes in this community are weakly interconnected._
- **Why does `mountPanel()` connect `panel.ts` to `main.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `parseCourse()` (e.g. with `Карта` and `Правка`) actually correct?**
  _`parseCourse()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11956521739130435 - nodes in this community are weakly interconnected._