# AGENTS.md

- 本项目为 Vue 3 + TypeScript 前端应用
- 构建工具：Vite 2（`vite@2`，SFC 插件 `@vitejs/plugin-vue@1`）
- 样式：Sass（`sass`）。组件样式用 `<style lang="scss">`，不要用 Less
- 状态管理：Pinia（`src/store`）
- UI 组件库：Ant Design Vue 4

## Project Structure

src/
├── components/     # 通用组件（PascalCase 命名）
├── pages/          # 页面组件
├── hooks/          # 自定义 Hooks
├── composables/    # 组合式函数
├── service/        # API 请求封装
├── store/          # Pinia
├── lib/            # 领域逻辑
├── router/         # 路由
├── types/          # 类型定义
└── constants/      # 常量

## Coding Style

**TypeScript**
- 使用 interface 定义 Props
- Never 使用 any 类型

**样式**
- 组件：`<style lang="scss">` 或 `<style src="./xx.scss" lang="scss">`
- 颜色：页面用 `src/assets/style/tokens.scss` 的 CSS 变量（`--color-*`）；画布 Sass 变量（`$accent-primary` 等）在 `src/pages/canvas/styles/variables.scss`
- `tokens.scss` 含真实 CSS（`:root`、动画、工具类），只由 `src/assets/style/global.scss` `@use` 一次。`main.ts` 引入 `global.scss`
- `variables.scss` 只有 Sass 变量，由 `vite.config.ts` 的 `css.preprocessorOptions.scss.additionalData` 以 `@use "..." as *` 注入每个 scss，业务文件不要再引
- Never `@import`（Dart Sass 将移除）。新代码用 `@use` / `@forward`，`@use` 必须写在文件最前
- Never 把含 CSS 输出的 scss 放进 `additionalData`（会进每个组件并触发 `@import` 警告）
- Never 使用内联样式
- Never 硬编码颜色值

**路径别名**
- `@/` → `src/`

## Build Commands

```bash
npm run dev          # 开发服务器，端口 8001
npm run build        # 生产构建
npm run build:dev    # development 模式构建
npm run lint         # eslint src --fix
npm run prettier     # prettier --write .
```

改 `vite.config.ts` 的 css 配置后需重启 `npm run dev`。

## Sass 与 Vite 2

终端里的两类弃用：

| 警告 | 原因 | 处理 |
|---|---|---|
| `Deprecation Warning [import]` | `additionalData` 或 scss 里使用 `@import` | 变量用 `@use ... as *`；CSS 只在 `global.scss` `@use` 一次 |
| `Deprecation Warning [legacy-js-api]` | Vite 2 固定调用 `sass.render` | `silenceDeprecations: ['legacy-js-api']`。升级 Vite 5+ 后改为 `api: 'modern-compiler'` 并删除该静默项 |

## Never 规则

- Never 修改框架自动生成的目录
- Never 修改 dist/ 构建产物
- Never 在组件内使用 any 类型
- Never 使用内联样式
- Never 在渲染路径中执行耗时操作
- Never 在列表渲染中省略 key
- Never 硬编码敏感信息
- Never 修改 lock 文件
- Never 在 scss 中使用 `@import`
- Never 把 `tokens.scss` / `global.scss` 写入 `additionalData`
