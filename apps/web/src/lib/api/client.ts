/** 统一前端 API 请求封装（调用 /api 路由） */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  /** 请求体，自动 JSON 序列化（json=true 时） */
  body?: unknown;
  /** 解析为 JSON；默认 true */
  json?: boolean;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { json = true, headers, body, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };
  let finalBody: BodyInit | null | undefined;
  if (body == null) {
    finalBody = null;
  } else if (json) {
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }
    finalBody = JSON.stringify(body);
  } else {
    finalBody = body as BodyInit;
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : typeof data === "string"
          ? data
          : "请求失败") || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, (data as { code?: string })?.code);
  }

  return data as T;
}
