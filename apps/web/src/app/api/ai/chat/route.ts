import { NextRequest } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { generateAssistantReply } from "@/lib/ai/assistant";
import { resolveProvider, streamLLM } from "@/lib/ai/chat";
import type { ProviderRequest } from "@/lib/ai/providers";

// 使用 Node.js runtime（需读取 cookies，edge runtime 不支持）
export const runtime = "nodejs";

/**
 * POST /api/ai/chat — AI 助手对话（流式输出）
 *
 * 两种路径：
 * 1. 若请求体携带 provider 且服务端能解析出 API Key → 调用真实大模型，流式转发 token
 * 2. 否则降级为规则引擎，按字符分片模拟打字机效果
 *
 * 认证：可选（未登录也能使用 AI 对话，user.id 仅用于降级路径日志）
 *
 * 请求体：
 *   { messages: [{role, content}], provider?: { id, endpoint?, model?, apiKey? } }
 */
export async function POST(req: NextRequest) {
  // 认证可选：AI 对话是无状态功能，未登录也能使用
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  const body = (await req.json()) as {
    messages: { role: string; content: string }[];
    provider?: ProviderRequest;
  };
  const messages = body.messages ?? [];
  const last = messages[messages.length - 1]?.content ?? "";

  // 尝试解析用户选择的 AI 提供商
  const resolved = resolveProvider(body.provider);

  // 路径 1：真实大模型流式调用
  if (resolved) {
    const llmStream = streamLLM(messages, resolved);
    return new Response(llmStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  // 路径 2：降级为规则引擎
  const replyText = await generateAssistantReply(
    last,
    messages,
    user?.id ?? "anonymous",
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 按字符分片输出，模拟打字机
      const tokens = replyText.match(/[\s\S]{1,3}/g) ?? [replyText];
      for (const tk of tokens) {
        controller.enqueue(encoder.encode(tk));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.enqueue(encoder.encode("[DONE]"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
