import { NextRequest, NextResponse } from "next/server";
import { resolveProvider, streamLLM } from "@/lib/ai/chat";

export const runtime = "nodejs";

/**
 * POST /api/ai/care-tip — 根据预警内容 AI 生成 15 字出行小贴士
 *
 * 请求体: { alertTitle, alertDescription, alertType, destination }
 * 返回: { careTip: string }
 *
 * 若 AI 不可用，降级为基于关键词的规则生成。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { alertTitle = "", alertDescription = "", alertType = "", destination = "" } = body as {
    alertTitle?: string;
    alertDescription?: string;
    alertType?: string;
    destination?: string;
  };

  const context = [
    alertTitle && `标题：${alertTitle}`,
    alertDescription && `描述：${alertDescription}`,
    alertType && `类型：${alertType}`,
    destination && `目的地：${destination}`,
  ]
    .filter(Boolean)
    .join("\n");

  // 尝试 AI 生成
  const resolved = resolveProvider({ id: "agnes" });
  if (resolved) {
    try {
      const messages = [
        {
          role: "system",
          content:
            "你是旅行出行小贴士生成器。根据预警信息生成一条 15 字以内的中文出行小贴士，要求：1)针对预警问题给出具体建议 2)简洁实用 3)不超过15个汉字 4)不要标点符号结尾 5)直接输出小贴士内容，不要解释。",
        },
        { role: "user", content: context || "请生成一条通用出行小贴士" },
      ];

      const stream = streamLLM(messages, resolved);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let tip = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        tip += decoder.decode(value, { stream: true });
      }
      tip = tip.trim().replace(/^["'"，。！！!]+|["'"，。！！!]+$/g, "");
      // 截断到 15 字
      if (tip.length > 15) tip = tip.slice(0, 15);
      if (tip) {
        return NextResponse.json({ careTip: tip });
      }
    } catch {
      // 降级到规则生成
    }
  }

  // 降级：基于预警类型和内容的关键词规则生成
  const fallbackTip = generateFallbackTip(alertTitle + alertDescription, alertType);
  return NextResponse.json({ careTip: fallbackTip });
}

/** 规则引擎：根据预警内容关键词生成小贴士 */
function generateFallbackTip(content: string, type: string): string {
  const text = content || "";

  // 按类型 + 关键词匹配
  if (/雨|暴雨|阵雨/.test(text)) return "雨天路滑备好伞具";
  if (/雪|冰冻/.test(text)) return "雪天注意保暖防滑";
  if (/高温|炎热|酷暑/.test(text)) return "高温天气多补水防暑";
  if (/大风|台风/.test(text)) return "大风天气避免户外活动";
  if (/雾|霾|灰尘|扬尘|施工/.test(text)) return "佩戴口罩防护呼吸道";
  if (/拥挤|人流|排队|密集/.test(text)) return "错峰出行避开人流高峰";
  if (/交通管制|限行|堵车|拥堵/.test(text)) return "提前规划路线避拥堵";
  if (/关闭|停业|装修/.test(text)) return "提前确认景点营业状态";
  if (/排队|等待/.test(text)) return "提前预约减少等待";
  if (/餐饮|餐厅|菜/.test(text)) return "选择口碑餐厅避免踩雷";
  if (/安全|危险|事故/.test(text)) return "注意人身财物安全";

  // 按类型兜底
  if (type === "weather") return "关注天气变化做好准备";
  if (type === "crowd") return "错峰出行体验更佳";
  if (type === "traffic") return "提前出发预留充足时间";
  if (type === "facility") return "提前了解设施开放情况";
  if (type === "dining") return "选择评价好的餐厅用餐";

  return "出行前确认信息做好准备";
}
