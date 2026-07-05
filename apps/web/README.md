# 旅智 TripAI — AI 驱动的智能旅行规划平台

> **让 AI 为你规划完美旅程。** 一个会"陪你看天气、躲人流、找厕所"的 AI 旅行管家。
>
> 规划只是起点,陪伴全程才是核心。

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2014-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-green?style=for-the-badge&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

---

## 📖 目录

- [一、项目简介](#一项目简介)
- [二、核心价值](#二核心价值)
- [三、功能特性](#三功能特性)
- [四、技术架构](#四技术架构)
- [五、Harness Engineering 方法论](#五harness-engineering-方法论)
- [六、项目结构](#六项目结构)
- [七、快速开始](#七快速开始)
- [八、环境变量](#八环境变量)
- [九、开发规范](#九开发规范)
- [十、路线图](#十路线图)

---

## 一、项目简介

**旅智 TripAI** 是一个 AI 驱动的智能旅行规划平台,核心解决三大旅行痛点:

| 痛点 | 描述 | 解决方案 |
| --- | --- | --- |
| **规划难** | 手动规划耗时耗力,查景点、排路线、算时间需要 3 天 | AI 30 秒生成可执行行程 |
| **变化多** | 计划赶不上变化,突降暴雨、景点排队、交通延误 | 实时预警 + 备选方案一键采纳 |
| **信息滞后** | 实时人流/天气/交通不可知,现场翻车 | 多源数据交叉验证 + 实时推送 |

### 产品形态

- **Web 控制台** — 完整产品体验(行程规划、AI 助手、社区) — 一期核心
- **桌面应用** — Electron 桌面端实时推送 — 一期同步
- **Flutter 移动端** — iOS + Android 原生 App — 二期跟进
- **REST API** — 开放能力,支持二次集成

### 目标用户

自由行旅客、家庭出行者、独立旅行者、5 人以下小团队。需要个性化的行程推荐,但又不想花 3 天查资料;想要说走就走的自由,但又怕现场翻车。

---

## 二、核心价值

### 🎯 三层减负

不同于传统行程生成器只解决"规划层",TripAI 通过三层闭环真正实现"机器陪人":

```
┌─────────────────────────────────────────────────────┐
│                    旅智 TripAI                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│   规划层 ──→ 应变层 ──→ 决策层                       │
│                                                     │
│   AI 生成行程    实时预警推送    全程陪伴推荐          │
│   30 秒出方案    一键采纳替换    餐厅/厕所/休息点      │
│                                                     │
│        ↑                ↑                ↑           │
│        └──── UGC 数据回流(社区反馈) ────┘           │
│              让模型越用越懂真实世界                    │
└─────────────────────────────────────────────────────┘
```

| 层面 | 以前怎么扛 | 用了之后 |
| --- | --- | --- |
| **规划层** | 小红书、马蜂窝、Google Maps 反复横跳,3 天只排出 1 个草案 | 输入目的地+天数+偏好,AI 30 秒生成可执行行程,紧凑/松弛任选 |
| **应变层** | 突降暴雨、景点排队 2 小时,现场手忙脚乱查替代方案 | 天气/人流/交通实时预警,AI 推荐备选方案,一键采纳替换节点 |
| **决策层** | 景点门口随便进一家被宰,找不到厕所憋一路 | 高德扫街榜推荐餐厅、最近公共厕所、AI 休息点推荐,全程陪伴 |

### 💡 差异化优势

1. **不是生成器,是管家** — 规划只是起点,实时陪伴全程才是核心
2. **三源交叉验证** — 天气 API + 高德人流 + UGC 上报,置信度 ≥ 0.7 才推送
3. **AI 关心小贴士** — 忽略预警后 AI 根据内容生成 15 字 tip,写入对应节点
4. **社区数据回流** — 用户上报真实体验,数据回流模型,形成闭环

---

## 三、功能特性

### 3.1 AI 行程生成 ⚡

- **意图理解** — 输入目的地、天数、人数、风格(紧凑版/松弛版)
- **策略模式** — 紧凑策略(最大化景点覆盖) vs 松弛策略(预留休息时间)
- **多源数据** — 高德 API(交通耗时) + 景点官方数据 + 餐厅评分 + 气象 API
- **可执行时间轴** — 带交通方式、停留时长、备选方案的完整行程
- **冲突检测** — 修改时自动检测时间/交通冲突,给出调整建议

### 3.2 实时预警 + 备选方案 🚨

- **三源预警** — 天气突变、人流超阈值、交通异常
- **置信度过滤** — 仅推送 confidence ≥ 0.7 的高置信度预警,避免信息过载
- **备选方案** — 每个预警附 AI 建议 + 替代方案,一键采纳替换原节点
- **动画过渡** — 采纳后原节点消失,新节点动画移入时间轴
- **Supabase Realtime** — 基于 PostgreSQL 变更捕获的 WebSocket 实时订阅

### 3.3 AI 关心小贴士 💝

- **AI 生成** — 根据预警标题/描述/类型/目的地 LLM 流式生成 15 字 tip
- **场景化** — 施工灰尘→"佩戴口罩防护呼吸道";暴雨→"雨天路滑备好伞具"
- **持久化** — 写入对应行程节点 metadata,旅途中持续提醒
- **降级策略** — AI 不可用时降级到关键词规则引擎

### 3.4 高德周边搜索 🗺️

- **餐厅推荐** — 按餐品类型筛选(川菜/火锅/日料),高德扫街榜数据
- **公共厕所** — 最近厕所按距离排序,一键标记
- **AI 休息点** — 智能推荐附近咖啡馆/商场/公园,基于距离 + 评分排序
- **地理围栏** — UGC 上报需在景点 500m 内,确保真实性

### 3.5 天气背景动画 🌤️

- **动态渲染** — 根据实时天气渲染整个头部卡片背景
- **多天气适配** — 晴天太阳光环旋转/雨天雨滴下落/雪天雪花飘落
- **GPU 加速** — 纯 CSS 实现,避免 JS 动画卡顿
- **饱和度优化** — 阴天加入淡蓝调避免压抑,暴雨降低暗色保持氛围

### 3.6 UGC 社区分享 👥

- **多维度验证** — 地理围栏 + 时间戳 + 用户信誉 + 多源交叉验证
- **三级可信度** — "已验证" / "待审核" / "低可信" 标识展示
- **数据回流** — 验证后的 UGC 反馈至 AI 模型,优化后续推荐
- **社区信息流** — 瀑布流展示,支持点赞、评论、举报

---

## 四、技术架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     旅智 TripAI 架构                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Web 端     │  │  桌面端     │  │  Flutter (二期)     │ │
│  │  Next.js 14 │  │  Electron   │  │  Flutter 3.22+      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         └────────────────┴────────────────────┘             │
│                          ↓                                  │
│                   REST API / Realtime                       │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Supabase 后端 (共享)                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  PostgreSQL  │  Auth  │  Storage  │  Realtime  │  Edge│  │
│  │  + RLS       │  JWT   │  S3 兼容  │  WebSocket │  Func│  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 第三方服务                            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  高德地图 API  │  和风天气  │  LLM (OpenAI 兼容)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 技术栈

#### Web 端(一期核心)

| 层级 | 技术选型 | 选择理由 |
| --- | --- | --- |
| 框架 | Next.js 14+ (App Router) | SSR/SSG/ISR 混合渲染,Server Components,SEO 友好 |
| 语言 | TypeScript 5.x | 类型安全,Supabase 自动生成类型定义 |
| 样式 | Tailwind CSS 3.x | 原子化 CSS,与 Design Token 系统天然契合 |
| 组件库 | shadcn/ui + Radix Primitives | 无样式原语 + Tailwind 定制,完全匹配设计规范 |
| 状态管理 | Zustand + TanStack Query | Zustand 管全局状态,TanStack Query 管服务端数据缓存 |
| 表单 | React Hook Form + Zod | 类型安全表单验证 |
| 动效 | Framer Motion | 声明式动画 API,性能优化好 |
| 地图 | 高德地图 JS API 2.0 | 国内地图服务首选 |
| 国际化 | next-intl | App Router 原生适配 |
| 部署 | Vercel | Next.js 官方推荐,自动 CI/CD |

#### 后端(Supabase)

| 服务 | 技术选型 | 说明 |
| --- | --- | --- |
| 数据库 | Supabase PostgreSQL | 开源 PostgreSQL,支持 RLS 行级安全 |
| 用户认证 | Supabase Auth | 手机号 + 邮箱 + OAuth,内置 JWT |
| 文件存储 | Supabase Storage | S3 兼容对象存储 |
| 实时推送 | Supabase Realtime | 基于 PostgreSQL CDC 的 WebSocket |
| 服务端逻辑 | Edge Functions (Deno) | AI 行程生成、UGC 验证、API 代理 |
| 数据库函数 | PostgreSQL RPC | 行程冲突检测、统计聚合 |

#### 移动端(Flutter · 二期)

| 层级 | 技术选型 |
| --- | --- |
| 开发框架 | Flutter 3.22+ |
| 语言 | Dart 3.4+ (空安全、sealed class) |
| 状态管理 | flutter_bloc 8.x (Event-Driven) |
| 后端对接 | supabase_flutter 2.x |
| 路由 | go_router 14.x |

### 4.3 核心设计模式

| 模式 | 场景 | 实现 |
| --- | --- | --- |
| **观察者模式** | 实时预警推送 | Supabase Realtime + `useRealtimeAlerts` Hook |
| **策略模式** | 多版本行程生成 | TightStrategy / RelaxedStrategy + 策略工厂 |
| **装饰器模式** | UGC 多维度验证 | BaseValidator → GeoFence → TimeConsistency → UserReputation |
| **仓储模式** | 数据访问封装 | TripRepository (Supabase + 缓存) |
| **Server Components** | 官网 SEO | 服务端直接查询 Supabase,零客户端 JS |
| **Optimistic Updates** | 行程编辑 | useOptimistic + useTransition 即时反馈 |

### 4.4 数据库设计

核心表结构:

- `user_profiles` — 用户扩展(Supabase Auth + 信誉分)
- `trips` — 行程主表
- `trip_nodes` — 行程节点(spot/meal/rest/transit)
- `spots` — 景点信息
- `ugc_reports` — UGC 上报
- `realtime_alerts` — 实时预警

所有表均启用 **RLS 行级安全策略**,确保用户只能访问自己的数据。

---

## 五、Harness Engineering 方法论

本项目采用 **Harness Engineering(驾驭工程)** 方法论进行 AI 开发,这是一套围绕大模型构建的完整工程体系。

### 5.1 核心思想

> **大模型只是引擎,Harness 是围绕引擎的一整套驾驭系统。**

### 5.2 七层架构

```
Harness Engineering =
    大模型(LLM)
    + 提示词工程(Prompt Engineering)      ← 控制模型说什么
    + 上下文工程(Context Engineering)      ← 控制什么时候放什么内容
    + 记忆层(Memory Layer)                ← 保证核心信息不丢失
    + 编排层(Orchestration Layer)         ← 控制整体流程不失控
    + 执行层(Acting Layer)                ← 让模型能真正干活
    + 反馈层(Feedback Layer)              ← 形成试错和自我修正
```

| 层级 | 解决问题 | 本项目应用 |
| --- | --- | --- |
| **提示词工程** | 模型输出不稳定 | 角色设定 + 限制条件 + 输出格式约束 |
| **上下文工程** | 上下文窗口溢出 | 召回→压缩→组装,精准召回相关信息 |
| **记忆层** | 模型失忆、前后不一致 | 项目文档 + 规则文件自动注入 |
| **执行层** | 只能说话、不能干活 | 文件读写 + Shell + MCP 工具调用 |
| **反馈层** | 错误无法自修正 | 试错循环 + 报错注入下一轮上下文 |
| **编排层** | 无限循环、无法结束 | 任务拆解 + 结束条件 + 分步执行 |

### 5.3 ReAct 循环

```
1. 上下文构建(记忆层 + 提示词 + 上下文)
              ↓
2. 大模型思考(Reasoning)
              ↓
3. 执行层执行(Acting)
              ↓
4. 反馈层收集结果(Feedback)
              ↓
5. 反馈加入上下文,循环回到步骤 1
```

### 5.4 项目中的实践

- **规则文件** — `docs/` 目录作为系统提示词,每次对话自动加载
- **任务拆解** — 复杂功能拆分为多个小任务分步执行
- **试错循环** — AI 生成代码后自动运行测试,根据报错修正
- **上下文管理** — 长对话自动总结,保留核心信息

---

## 六、项目结构

```
trip-ai/
├── apps/
│   └── web/                           # Next.js 应用(官网 + 体验平台)
│       ├── src/
│       │   ├── app/                   #   App Router 页面
│       │   │   ├── (auth)/            #     登录注册
│       │   │   ├── (dashboard)/       #     体验平台(行程/AI/社区/个人)
│       │   │   ├── (marketing)/       #     官网页面(SSG)
│       │   │   └── api/               #     API Routes
│       │   ├── components/            #   全局组件
│       │   │   ├── ui/                #     shadcn/ui 基础组件
│       │   │   ├── glass/             #     Glassmorphism 组件
│       │   │   ├── marketing/         #     官网组件
│       │   │   ├── weather/           #     天气卡片 + 动画
│       │   │   ├── trip-timeline.tsx  #     行程时间轴(核心)
│       │   │   ├── realtime-alert-card.tsx # 实时预警卡片
│       │   │   └── ugc-card.tsx       #     UGC 卡片
│       │   ├── lib/                   #   工具函数与业务逻辑
│       │   │   ├── ai/                #     AI 提供商封装
│       │   │   ├── supabase/          #     Supabase Client 工厂
│       │   │   ├── hooks/             #     自定义 Hooks
│       │   │   ├── stores/            #     Zustand 状态仓库
│       │   │   └── utils/             #     工具函数
│       │   └── types/                 #   TypeScript 类型定义
│       ├── public/                    #   静态资源
│       └── package.json
│
├── packages/
│   └── shared/                        # 共享代码(Web + Flutter 逻辑复用)
│
├── supabase/
│   ├── migrations/                    #   数据库迁移 SQL
│   ├── seed.sql                       #   种子数据
│   ├── functions/                     #   Edge Functions
│   │   ├── generate-trip/             #     AI 行程生成
│   │   └── validate-ugc/              #     UGC 验证
│   └── config.toml                    #   Supabase 本地配置
│
├── docs/                              # 项目文档
│   ├── 项目总纲.md                     #   完整项目指南
│   └── Harness_Engineering_完整架构.md # AI 工程方法论
│
├── package.json                       # Monorepo 根配置
├── pnpm-workspace.yaml                # pnpm workspace 配置
├── turbo.json                         # Turborepo 构建编排
└── vercel.json                        # Vercel 部署配置
```

---

## 七、快速开始

### 7.1 环境要求

- Node.js >= 20
- pnpm >= 9
- Supabase 账号(免费层即可)
- 高德开放平台 API Key
- 和风天气 API Key
- LLM API Key(OpenAI 兼容协议)

### 7.2 安装

```bash
# 克隆仓库
git clone https://github.com/nh6666662/trip-ai.git
cd trip-ai

# 安装依赖
pnpm install

# 复制环境变量模板
cp apps/web/.env.example apps/web/.env.local

# 编辑 .env.local 填入你的 API Key
# (参考下方环境变量说明)
```

### 7.3 数据库初始化

```bash
# 执行 Supabase 迁移
supabase db push

# 导入种子数据
supabase db reset
```

### 7.4 启动开发服务器

```bash
# 启动 Web 开发服务器
pnpm dev

# 打开浏览器访问
# http://localhost:3000
```

### 7.5 构建生产版本

```bash
pnpm build
pnpm start
```

---

## 八、环境变量

在 `apps/web/.env.local` 中配置以下变量:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SECRET_KEY=your-supabase-secret-key

# 高德地图
NEXT_PUBLIC_AMAP_KEY=your-amap-webservice-key
NEXT_PUBLIC_AMAP_SECURITY_JS_CODE=your-amap-security-js-code

# 和风天气
QWEATHER_API_KEY=your-qweather-api-key
QWEATHER_HOST=your-subdomain.re.qweatherapi.com

# AI 提供商(OpenAI 兼容协议)
AGNES_API_KEY=your-agnes-api-key
LONGCAT_API_KEY=your-longcat-api-key

# 数据库连接(用于迁移脚本)
DATABASE_URL=your-database-connection-string

# UGC 快速通过模式(测试用)
UGC_SKIP_REVIEW=true
```

---

## 九、开发规范

### 9.1 代码规范

- **TypeScript** — 严格模式,所有 Supabase 查询使用自动生成类型
- **命名** — 文件 `kebab-case`(如 `trip-timeline.tsx`),组件 `PascalCase`(如 `TripTimeline`)
- **Server Components** — 默认不加 `'use client'`,仅在需要客户端交互时标注
- **Zod schema** — 与 TypeScript 类型保持单一数据源

### 9.2 Git 规范

- **分支策略** — `main`(生产) → `develop`(开发) → `feature/*`(功能分支)
- **提交格式** — `<type>(<scope>): <description>`
  - type: `feat` / `fix` / `refactor` / `style` / `test` / `chore`
  - scope: `trip` / `realtime` / `ugc` / `ai` / `community` / `core`

### 9.3 测试策略

| 类型 | 工具 | 覆盖范围 |
| --- | --- | --- |
| 单元测试 | Vitest | API Routes、工具函数、业务逻辑 |
| 组件测试 | React Testing Library | 核心组件渲染(时间轴、预警卡片) |
| E2E 测试 | Playwright | 核心用户路径(行程创建、UGC 提交) |

---

## 十、路线图

### 一期:Web 优先(当前)

- ✅ Monorepo 脚手架 + Design Token 系统
- ✅ 官网首页(SSG + Framer Motion 动效)
- ✅ Supabase 数据库 + RLS 策略
- ✅ 体验平台骨架(侧边导航 + 认证集成)
- ✅ AI 行程生成(策略模式 + 多源数据)
- ✅ 实时预警(Supabase Realtime + 备选方案)
- ✅ UGC 与社区(验证链 + 信息流)
- ✅ AI 关心小贴士(LLM 流式生成)
- ✅ 天气背景动画(纯 CSS GPU 加速)
- ✅ 高德周边搜索(餐厅/厕所/休息点)
- ✅ 页面切换动画(Framer Motion + AnimatePresence)

### 二期:Flutter 移动端

- ⏳ Flutter 项目搭建(Clean Architecture + BLoC)
- ⏳ 首页与行程(推荐流 + 时间轴组件)
- ⏳ AI 助手(对话界面 + 快捷操作)
- ⏳ 社区与 UGC(瀑布流 + 上传)
- ⏳ 个人中心与收尾

### V1.0+ 后续迭代

- 🔮 AI 个性化推荐(用户画像 + 协同过滤)
- 🔮 UGC 激励机制(积分/等级/徽章)
- 🔮 多语言支持(中文简体 + 英文)
- 🔮 离线优先策略(SQLite 本地数据库)
- 🔮 CI/CD 流水线 + Sentry 错误监控

---

## 📄 文档

- [项目总纲](docs/项目总纲.md) — 完整项目指南(功能/架构/技术栈)
- [Harness Engineering 完整架构](docs/Harness_Engineering_完整架构.md) — AI 工程方法论

---

## 📝 License

Private — © 2026 旅智 TripAI

---

## 🙏 致谢

本项目基于以下优秀开源项目构建:

- [Next.js](https://nextjs.org) — React 全栈框架
- [Supabase](https://supabase.com) — 开源 Firebase 替代品
- [Tailwind CSS](https://tailwindcss.com) — 原子化 CSS 框架
- [shadcn/ui](https://ui.shadcn.com) — 可定制组件库
- [Framer Motion](https://www.framer.com/motion) — 声明式动画库
- [高德地图](https://lbs.amap.com) — 国内地图服务
- [和风天气](https://dev.qweather.com) — 气象数据服务

---

> **旅智 TripAI** — 让 AI 为你规划完美旅程。
>
> 规划只是起点,陪伴全程才是核心。 🌍✈️
