# 目标任务拆解设计文档

日期:2026-08-14
状态:已获用户批准(2026-08-14)
版本目标:1.5.0

## 背景

v1.4 之前,「目标」只有名称 + 每周次数 + 单次时长,一键排期生成的事件标题都是目标名,无法区分目标下的不同活动。本设计让目标可以拆解为多个任务,每个任务独立排期、独立完成、独立统计。

## 需求(已与用户确认)

1. 目标拆解为任务列表,每个任务自带每周次数与单次时长(排期参数完全下放到任务)
2. 每任务独立排期与完成:事件关联到具体任务,勾选完成即任务进度
3. 删除任务时级联删除其关联事件(与现有目标级联删除语义一致)
4. 周报统计:目标汇总 + 任务明细

## 数据模型

### GoalTask(新增)

```ts
export interface GoalTask {
  id: string              // 客户端生成(时间戳+随机),非索引
  name: string
  weeklyFrequency: number
  durationMinutes: number
}
```

### Goal(扩展)

```ts
export interface Goal {
  id?: number
  name: string
  startDate: string
  endDate?: string
  tasks: GoalTask[]       // 新增,必填
  weeklyFrequency?: number // 废弃保留:旧数据兼容,不再使用
  durationMinutes?: number // 废弃保留:旧数据兼容,不再使用
  createdAt: string
}
```

### CalendarEvent(扩展)

```ts
export interface CalendarEvent {
  // ...现有字段
  relatedGoalId?: number
  relatedTaskId?: string // 新增:关联任务 id
}
```

### 兼容策略(不做 Dexie schema 迁移)

- 旧目标无 tasks 字段:读取时规范化——tasks 为空则合成一个默认任务(名称=目标名,参数=旧 weeklyFrequency/durationMinutes)
- 旧事件无 relatedTaskId:统计时归入该目标「未拆解」任务分组
- 规范化的实现位置:crud 读目标处(loadGoals)与 report 统计处分别做,保持各层自洽

## 排期(schedule.ts)

- `scheduleTasks` 改为按任务排期。新签名:

```ts
export function scheduleTasks(
  events: CalendarEvent[],
  goal: Pick<Goal, 'id' | 'name' | 'tasks'>,
  taskId: string,
  windowStart: Date,
  windowEnd: Date,
  now: Date,
): ScheduledSlot[]
```

- 行为:对指定任务在 [windowStart, windowEnd) 内找 `task.weeklyFrequency` 个空闲 30 分钟 slot(空闲判断包含同目标其他任务的已占用时段);标题 = 任务名;slot 携带 `taskId` 与 `goalId`
- 任务无有效参数(频次<1 或时长<1)时返回空数组
- 现有目标卡「排期一周」按任务维度调用;删除旧 `ScheduledSlot.title = goal.name` 逻辑
- 原 `WeeklyReportCard`/目标卡的「一键排满一周」交互保留,但操作粒度变为任务

## CRUD 与 hooks

### crud.ts

- `addEvent` 参数对象透传可选 `relatedTaskId`
- 新增:
  - `addTask(goalId: number, task: GoalTask)`:读目标 → push → 更新
  - `updateTask(goalId: number, task: GoalTask)`:读目标 → 替换同 id 任务 → 更新
  - `removeTaskCascade(goalId: number, taskId: string)`:事务内更新目标(移除任务)+ 删除 `relatedGoalId=goalId && relatedTaskId=taskId` 的事件
- `removeCascade(goalId)` 不变(删除目标 + 其全部事件,天然覆盖所有任务)

### useGoals.ts

- 暴露 `addTask / updateTask / removeTaskCascade / refresh`
- `removeTaskCascade` 返回被删事件数,供 UI 提示

## 统计(report.ts)

- `ReportStats.goalProgress` 每项扩展:

```ts
interface GoalProgress {
  name: string
  planned: number
  completed: number
  completedRate: number
  tasks: Array<{ name: string; planned: number; completed: number; completedRate: number }>
}
```

- 聚合:按 relatedGoalId 分组后,再按 relatedTaskId 分组;无 taskId 的事件归入「未拆解」
- 任务名解析:优先查目标 tasks;找不到(任务已删但事件残留,理论级联已清理,兜底)用「任务 #id」
- WeeklyReportCard:目标行显示汇总,展开显示任务明细

## UI

### GoalForm

- 字段:目标名称、开始日期、截止日期(选填)
- 任务编辑器:动态行列表,每行 [任务名 input] [每周次数 number] [时长 number] [删除按钮];底部「添加任务」按钮
- 校验:任务列表至少 1 个、每个任务名非空、次数≥1、时长≥1;目标名校验保留
- 编辑模式(initial 传入)同样支持任务编辑
- 旧目标编辑时:无 tasks → 先合成默认任务再编辑

### GoalView

- 目标卡:名称 + 日期 + 任务列表(每任务显示 名称/次数×时长 摘要)
- 每任务「排期一周」按钮:沿用现有 preview → 确认交互,preview 与入库的 slot 都带 taskId
- 每任务删除按钮:确认弹层(复用现有删除确认样式)显示「将同时删除 N 条关联事件」
- 目标整体删除:确认文案从「关联任务」改为「关联事件」(任务数可单独提示)

## 测试(TDD)

- schedule.test.ts:按任务排期(标题=任务名、同目标任务互斥、频次/时长各归各、无空档返回空)
- crud.test.ts:addTask/updateTask/removeTaskCascade(含级联删除计数)、addEvent 透传 relatedTaskId
- report.test.ts:任务明细聚合、旧数据(无 tasks/无 taskId)兼容
- GoalForm.test.tsx:任务编辑器增删、校验
- GoalView.test.tsx:任务排期预览/确认入库带 taskId、任务删除级联确认
- useGoals.test.tsx:removeTaskCascade
- e2e/goals.spec.ts:创建带任务的目标 → 排期 → 完成 → 删除任务级联

## 验证

- `npm test`(全部单测)+ `npm run lint` + `npm run build`
- `npm run test:e2e`
- CHANGELOG 增加 1.5.0 条目;package.json 版本升 1.5.0
