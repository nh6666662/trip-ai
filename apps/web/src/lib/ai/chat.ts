/**
 * 服务端 LLM 调用 — OpenAI 兼容协议
 * 支持流式输出（SSE），将 LLM 的增量 token 转为纯文本流。
 * 内置提供商的 API Key 由服务端环境变量提供；
 * 自定义提供商的 API Key 由客户端传入（仅用于本次请求，不持久化到服务端）。
 */

import type { ProviderRequest } from "@/lib/ai/providers";

interface ChatMessage {
  role: string;
  content: string;
}

/** 解析后的提供商调用配置 */
export interface ResolvedProvider {
  endpoint: string;
  model: string;
  apiKey: string;
}

/** 旅智 AI 助手系统提示词 */
const SYSTEM_PROMPT = `你是旅智 TripAI 的 AI 旅行助手。你可以帮助用户规划行程、查询景点信息、应对旅途变化（天气、交通、人流）。
请用简洁友好的中文回答。当用户询问行程规划时，请给出具体的目的地、天数安排和景点建议，并在结尾提到可在行程页采纳方案。`;

/**
 * 根据客户端传入的 provider 信息解析出实际的调用配置。
 * - 内置提供商：从环境变量读取 key
 * - 自定义提供商：使用客户端传入的 endpoint / model / apiKey
 * 返回 null 表示无法解析（如环境变量未配置），调用方应降级到规则引擎。
 */
export function resolveProvider(req: ProviderRequest | undefined): ResolvedProvider | null {
  if (!req) return null;

  // 自定义提供商：直接使用客户端传入的配置
  if (req.endpoint && req.model && req.apiKey) {
    return {
      endpoint: req.endpoint,
      model: req.model,
      apiKey: req.apiKey,
    };
  }

  // 内置提供商：从环境变量读取 key
  const builtinMap: Record<string, { endpoint: string; model: string; keyEnvVar: string }> = {
    agnes: {
      endpoint: "https://apihub.agnes-ai.com/v1/chat/completions",
      model: "agnes-2.0-flash",
      keyEnvVar: "AGNES_API_KEY",
    },
    longcat: {
      endpoint: "https://api.siliconflow.cn/v1/chat/completions",
      model: "meituan-longcat/LongCat-2.0",
      keyEnvVar: "LONGCAT_API_KEY",
    },
  };

  const cfg = builtinMap[req.id];
  if (!cfg) return null;

  const apiKey = process.env[cfg.keyEnvVar];
  if (!apiKey) return null;

  return { endpoint: cfg.endpoint, model: cfg.model, apiKey };
}

/**
 * 调用 LLM 并以流式方式产出文本片段。
 * 返回一个 ReadableStream<Uint8Array>，内容为 LLM 生成的纯文本。
 */
export function streamLLM(
  messages: ChatMessage[],
  provider: ResolvedProvider,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  const fullMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model,
            messages: fullMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "未知错误");
          controller.enqueue(
            encoder.encode(`（AI 服务异常：${res.status} ${errText.slice(0, 200)}）`),
          );
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // 保留最后一行（可能不完整）
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // 忽略解析失败的 chunk
            }
          }
        }

        // 处理缓冲区残留
        const tail = buffer.trim();
        if (tail.startsWith("data:") && tail.slice(5).trim() !== "[DONE]") {
          try {
            const json = JSON.parse(tail.slice(5).trim());
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // 忽略
          }
        }

        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "网络异常";
        controller.enqueue(
          encoder.encode(`（AI 调用失败：${msg}）`),
        );
        controller.close();
      }
    },
  });
}
