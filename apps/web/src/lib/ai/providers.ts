/**
 * AI 提供商配置
 * 内置提供商的 API Key 存储在服务端环境变量（不暴露给浏览器）；
 * 自定义提供商的配置由用户在设置中填写，存储在 localStorage。
 */

/** 提供商类型 */
export interface AIProvider {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** OpenAI 兼容的 chat completions 端点 */
  endpoint: string
  /** 模型名称 */
  model: string
  /** 是否内置（内置的 key 由服务端 env 提供） */
  builtin: boolean
  /** 内置提供商的服务端环境变量名（仅 builtin 有意义） */
  keyEnvVar?: string
  /** 描述 */
  description?: string
}

/** 用户自定义提供商（含 API Key，仅存储在客户端 localStorage） */
export interface CustomProvider extends AIProvider {
  builtin: false
  /** 用户的 API Key（仅发送到服务端用于发起 LLM 请求） */
  apiKey: string
}

/** 客户端传入的提供商请求体（用于 /api/ai/chat） */
export interface ProviderRequest {
  id: string
  /** 自定义提供商需提供 endpoint / model / apiKey；内置留空由服务端解析 */
  endpoint?: string
  model?: string
  apiKey?: string
}

/** 内置提供商列表（不含 Key，前后端共享） */
export const BUILTIN_PROVIDERS: AIProvider[] = [
  {
    id: 'agnes',
    name: 'Agnes 2.0 Flash',
    endpoint: 'https://apihub.agnes-ai.com/v1/chat/completions',
    model: 'agnes-2.0-flash',
    builtin: true,
    keyEnvVar: 'AGNES_API_KEY',
    description: '快速高效，适合智能体工作流与编码任务',
  },
  {
    id: 'longcat',
    name: 'LongCat 2.0（硅基流动）',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'meituan-longcat/LongCat-2.0',
    builtin: true,
    keyEnvVar: 'LONGCAT_API_KEY',
    description: '美团 LongCat，经硅基流动平台调用',
  },
]

/** 默认激活的提供商 id */
export const DEFAULT_PROVIDER_ID = 'agnes'

/** 根据 id 查找内置提供商 */
export function findBuiltinProvider(id: string): AIProvider | undefined {
  return BUILTIN_PROVIDERS.find((p) => p.id === id)
}

/** 用于客户端展示的提供商信息（不含 key） */
export type ProviderDisplay = Pick<
  AIProvider,
  'id' | 'name' | 'model' | 'builtin' | 'description'
>

/** 获取所有提供商的展示信息（内置 + 自定义） */
export function toDisplay(p: AIProvider): ProviderDisplay {
  return { id: p.id, name: p.name, model: p.model, builtin: p.builtin, description: p.description }
}
