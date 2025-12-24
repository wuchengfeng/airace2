# Airace2 全面测试用例计划

本文档旨在为 Airace2 项目提供一套全面的测试策略，涵盖单元测试、集成测试、端到端 (E2E) 测试以及 UI/UX 测试。

## 1. 测试策略概述

由于本项目是重前端交互、依赖本地状态管理 (Context + Reducer) 且包含 AI 生成内容的应用，测试策略应侧重于：

1.  **核心逻辑稳定性**：确保练习流程（Practice Flow）的状态流转无误。
2.  **数据持久化**：确保进度、历史记录、错题本在刷新或关闭后不丢失。
3.  **用户体验流畅性**：AI 内容生成的加载状态、键盘快捷键响应、移动端适配。

---

## 2. 单元测试 (Unit Testing)

**目标**：验证独立函数和核心状态管理逻辑的正确性。

### 2.1 Reducer 状态管理 (`src/app/storeContext.ts`)
这是应用的大脑，必须覆盖所有 Action。

*   **List Management**
    *   `lists/create`: 验证新列表被添加到 state，且 ID 唯一。
    *   `lists/delete`: 验证列表及其关联的 items、进度被移除。
    *   `lists/sync`: 验证从 Teable 同步数据时，现有数据合并逻辑正确（保留进度）。
*   **Practice Flow (核心)**
    *   `practice/ensure`:
        *   验证初次进入生成乱序/顺序列表。
        *   验证 `reshuffle=true` 时重置进度。
    *   `practice/correct`:
        *   验证 `correctByAttempt` 计数增加。
        *   验证 `records` 数组正确追加了本次作答详情。
        *   验证 `attemptNo` 不同阶段的积分逻辑。
    *   `practice/finalWrong`:
        *   验证 `finalWrongCount` 增加。
        *   验证错题记录被添加到 `records`。
    *   `practice/next`:
        *   验证 `cursor` 指针前移。
        *   验证当 `cursor` 到达末尾时，`run` 被归档到 `practiceHistory`。
        *   验证 `run.endedAt` 被正确设置。
*   **Mistakes**
    *   `mistakes/record`: 验证错题被加入错题本，如果已存在则更新计数和时间。

### 2.2 Domain Logic
*   **Shuffle Algorithm**: 验证洗牌算法的随机性和公平性（如果使用了自定义 shuffle）。
*   **Time Helpers**: `src/lib/time.ts` 中的格式化函数测试。

---

## 3. 集成测试 (Integration Testing)

**目标**：验证模块间的协作，特别是外部服务和存储。

### 3.1 AI Provider (`src/ai/`)
*   **Mock Provider**: 验证在开发模式下，Mock 数据能按预期返回，不阻塞流程。
*   **Real Provider**:
    *   验证 Prompt 构建是否符合预期（检查 `generateArticle`, `generateContext` 的输入参数）。
    *   验证 API 错误处理（如网络超时、Quota 耗尽）是否有对应的 UI 反馈（如 Error Toast）。

### 3.2 Storage (`src/storage/localState.ts`)
*   **Persistence**: 验证 Reducer 状态变更后，`localStorage` 中的数据是否同步更新。
*   **Hydration**: 验证页面刷新后，`AppStoreProvider` 能正确从 `localStorage` 恢复完整状态（特别是深层嵌套的对象，如 `practiceHistory`）。

---

## 4. 端到端 (E2E) 测试场景

**目标**：模拟真实用户路径，验证业务闭环。建议使用 Cypress 或 Playwright。

### 4.1 管理员路径 (Admin Flow)
1.  **创建/导入词表**：
    *   进入“词表管理”。
    *   点击“刷新”或手动添加词表。
    *   验证列表出现在首页。
2.  **查看详情**：
    *   点击列表进入详情页。
    *   验证条目数量正确。
    *   验证“原始数据”开关能显示 JSON。

### 4.2 练习核心路径 (Practice Core Loop)
1.  **开始练习**：
    *   选择一个词表，点击“去练习”。
    *   选择模式（如“固定词表序列模式”）。
2.  **阶段 1 (盲猜)**：
    *   显示句子（挖空）。
    *   输入错误答案 -> 验证进入阶段 2。
    *   输入正确答案 -> 验证显示“已正确”并锁定，点击“提交”进入下一题。
3.  **阶段 2 (上下文)**：
    *   验证 AI 生成上下文（Loading 状态 -> 显示上下文）。
    *   再次尝试作答。
4.  **阶段 3 (短文)**：
    *   验证 AI 生成短文。
5.  **阶段 4 (放弃)**：
    *   多次错误或直接放弃。
    *   验证显示最终解释和中文释义。
    *   验证自动加入错题本。
6.  **结算与历史**：
    *   完成所有题目。
    *   自动跳转结果页。
    *   验证结果页数据（正确率、分布图）准确。
    *   点击“返回首页”，进入“历史”，验证刚完成的练习在列表中。

### 4.3 错题回顾 (Mistakes Review)
1.  进入“错题本”。
2.  验证此前练习中做错的题在列表中。
3.  验证点击“清理”可移除错题。

---

## 5. UI/UX 与交互测试

### 5.1 响应式设计 (Responsive Design)
*   **Mobile (iPhone SE/12/14)**:
    *   验证 Admin 列表页的按钮组是否正确换行（不溢出屏幕）。
    *   验证练习页底部的输入框在软键盘弹出时是否可见。
*   **Desktop**:
    *   验证宽屏下的布局利用率。

### 5.2 键盘快捷键
*   **Enter**:
    *   输入框有值时 -> 提交。
    *   结果锁定状态（已正确/已结束） -> 下一题。
*   **Shift + Enter**:
    *   验证在输入框中换行，而不是提交。

### 5.3 语音输入 (Speech Recognition)
*   **Availability**: 验证在不支持 Speech API 的浏览器中隐藏麦克风图标。
*   **Functionality**: 验证点击麦克风能录入文字并自动填充到输入框。

---

## 6. 边界与异常测试 (Edge Cases)

1.  **空状态**：
    *   没有词表时的首页显示。
    *   词表为空（0 items）时尝试练习的反应。
    *   历史记录/错题本为空时的显示。
2.  **网络异常**：
    *   在练习过程中断网，触发 AI 生成 -> 验证错误提示及重试机制。
3.  **数据损坏**：
    *   `localStorage` 数据格式错误时的恢复能力（是否会白屏 crash）。
4.  **极端数据**：
    *   超长单词/句子显示（是否截断或换行）。
    *   超大词表（1000+ 词）的渲染性能。

