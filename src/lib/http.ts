export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

import { startFaviconLoading, stopFaviconLoading } from "@/lib/favicon-loader"

export class HttpError extends Error {
  status: number
  data: unknown
  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function http<T>(
  url: string,
  opts?: {
    method?: HttpMethod
    body?: BodyInit | FormData | Record<string, unknown> | null
    token?: string
    headers?: Record<string, string>
  }
): Promise<T> {
  const isBrowser = typeof window !== "undefined"
  const method = opts?.method ?? "GET"
  const isFormData = typeof FormData !== "undefined" && opts?.body instanceof FormData
  const isRawBody =
    typeof opts?.body === "string" ||
    (typeof Blob !== "undefined" && opts?.body instanceof Blob) ||
    (typeof ArrayBuffer !== "undefined" && opts?.body instanceof ArrayBuffer)

  const headers: Record<string, string> = {
    ...(isFormData || isRawBody ? {} : { "Content-Type": "application/json" }),
    ...(opts?.headers || {}),
  }
  if (opts?.token) headers["Authorization"] = `Bearer ${opts.token}`

  const body: BodyInit | undefined =
    opts?.body == null
      ? undefined
      : isFormData || isRawBody
      ? (opts.body as BodyInit)
      : JSON.stringify(opts.body)

  if (isBrowser) {
    startFaviconLoading()
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
    })

    const ct = res.headers.get("content-type") || ""
    const data = ct.includes("application/json") ? await res.json() : await res.text()

    if (!res.ok) {
      const payload = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null
      const msg =
        (payload && (String(payload.message || payload.error || ""))) ||
        (typeof data === "string" && data) ||
        `HTTP ${res.status}`
      throw new HttpError(res.status, msg, data)
    }

    return data as T
  } finally {
    if (isBrowser) {
      stopFaviconLoading()
    }
  }
}
