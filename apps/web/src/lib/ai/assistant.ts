/**
 * AI 助手回复生成器（规则引擎降级方案）
 *
 * 当用户未选择 AI 提供商、或所选提供商 API Key 未配置时，
 * 使用此规则引擎生成兜底回复。
 * 真实大模型调用由 /api/ai/chat 路由 + lib/ai/chat.ts 处理。
 */

interface ChatMessage {
  role: string;
  content: string;
}

export async function generateAssistantReply(
  input: string,
  _history: ChatMessage[],
  _userId: string,
): Promise<string> {
  return ruleBasedReply(input.trim());
}

/** 规则引擎回复 */
function ruleBasedReply(text: string): string {
  const lower = text.toLowerCase();

  if (/(规划|安排|行程|攻略)/.test(text)) {
    const dest = extractDestination(text) ?? "杭州";
    const days = extractDays(text) ?? 3;
    return buildTripPlanReply(dest, days);
  }

  if (/(下雨|天气|雨)/.test(text)) {
    const dest = extractDestination(text) ?? "目的地";
    return [
      `${dest}遇到下雨天可以这样调整行程：`,
      "",
      "1. 把户外景点（如西湖、植物园）调到雨停时段，或替换为室内景点（博物馆、美术馆、商场）",
      "2. 预留更长的交通时间，雨天路堵，相邻节点交通 +15 分钟",
      "3. 午餐选有遮蔽的美食城，避免淋雨赶路",
      `4. 我可以帮你重新生成一版${dest}"雨天适配"行程，要试试吗？`,
    ].join("\n");
  }

  if (/(美食|吃什么|餐厅)/.test(text)) {
    const dest = extractDestination(text) ?? "目的地";
    return [
      `为你推荐${dest}找美食的方式：`,
      "",
      `- 在行程页点击节点，可将${dest}景点改为「餐饮」类型并标注评分`,
      "- 社区里有旅友上报的真实排队与口味信息，可信度高的会标「已验证」",
      `- 告诉我${dest}的预算，我可以帮你圈出几条美食街`,
    ].join("\n");
  }

  if (/(你好|hi|hello|嗨)/.test(lower)) {
    return "你好！我是你的 AI 旅行助手 🧭 可以帮你规划行程、查询景点、应对旅途变化。告诉我你想去哪里？";
  }

  if (/(周末|附近|周边)/.test(text)) {
    return [
      "周末周边游建议：",
      "",
      "- 选车程 2 小时内的目的地，避免把时间花在路上",
      "- 1-2 天行程用「松弛版」节奏，留足休息",
      "- 可以试试杭州、苏州、乌镇、莫干山这类经典短途目的地",
      "",
      "需要我帮你生成具体行程吗？告诉我出发地和天数即可。",
    ].join("\n");
  }

  return [
    "我理解你想了解关于「" + text + "」的信息。",
    "",
    "我可以帮你：",
    "- 规划具体行程（告诉我目的地、日期、人数、偏好）",
    "- 查询景点与美食",
    "- 应对天气/交通变化，动态调整计划",
    "",
    "请问你的目的地是哪里？计划玩几天？",
  ].join("\n");
}

function extractDestination(text: string): string | null {
  const match = text.match(
    /(杭州|上海|苏州|南京|成都|北京|西安|厦门|重庆|长沙|广州|深圳|青岛|大连)/,
  );
  return match ? match[1] : null;
}

function extractDays(text: string): number | null {
  const match = text.match(/(\d+)\s*(天|日)/);
  return match ? Number(match[1]) : null;
}

function buildTripPlanReply(dest: string, days: number): string {
  return [
    `好的，为你规划 ${dest} ${days} 日游：`,
    "",
    `📍 第 1 天：${dest}核心景区漫步 + 品尝${dest}当地美食`,
    `📍 第 ${days > 1 ? 2 : 1} 天：${dest}周边景点深度游 + 文化体验`,
    days > 2 ? `📍 第 ${days} 天：${dest}休闲购物 + 返程` : "",
    "",
    "↓↓ 行程方案卡片 ↓↓",
    `我已为你生成 ${dest} ${days} 日松弛版行程草稿，`,
    `点击下方「采纳这个方案」可直接加入你的行程列表，`,
    "之后还能拖拽调整顺序、检测时间冲突。",
    "",
    `需要更紧凑的 ${dest} 版本，或加入亲子/美食偏好吗？`,
  ]
    .filter(Boolean)
    .join("\n");
}
