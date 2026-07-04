# AGENTS.md

- 本项目为 Vue 3 + TypeScript 前端应用
- 构建工具：Vite 5
- 状态管理：Pinia
- UI 组件库：Ant Design Vue 4

## Project Structure

src/
├── components/     # 通用组件（PascalCase 命名）
├── pages/          # 页面组件
├── hooks/          # 自定义 Hooks
├── services/       # API 请求封装
├── models/         # 状态管理
├── utils/          # 工具函数
├── typings/        # 类型定义
└── constants/      # 常量

## Coding Style

**TypeScript**
- 使用 interface 定义 Props
- Never 使用 any 类型

**样式**
- import styles from './index.less'
- Never 使用内联样式
- Never 硬编码颜色值

**路径别名**
- @/* → src/*

## Build Commands

[你的开发命令]    # 启动开发服务器
[你的构建命令]    # 生产构建
[你的格式化命令]  # 代码格式化

## Never 规则

- Never 修改框架自动生成的目录
- Never 修改 dist/ 构建产物
- Never 在组件内使用 any 类型
- Never 使用内联样式
- Never 在渲染路径中执行耗时操作
- Never 在列表渲染中省略 key
- Never 硬编码敏感信息
- Never 修改 lock 文件

