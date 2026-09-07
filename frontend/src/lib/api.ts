import type {
  ActionInput,
  ActionItem,
  Library,
  MeetingCreate,
  MeetingDetail,
  MeetingInput,
} from "./types";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      cache: "no-store",
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      "Cannot reach Minutes AI. Check that the API is running, then try again.",
      0,
    );
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    let message = `Request failed (${response.status}). Please try again.`;
    if (body && typeof body === "object" && "detail" in body) {
      const detail = body.detail;
      if (typeof detail === "string") message = detail;
      else if (Array.isArray(detail))
        message = detail
          .map(
            (item: { loc?: string[]; msg?: string }) =>
              `${item.loc?.slice(1).join(".") || "Input"}: ${item.msg || "Invalid value"}`,
          )
          .join("; ");
    }
    throw new ApiError(message, response.status);
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
export const api = {
  library: (query = "", signal?: AbortSignal) =>
    request<Library>(`/meetings${query ? `?${query}` : ""}`, { signal }),
  meeting: (id: string | number, signal?: AbortSignal) =>
    request<MeetingDetail>(`/meetings/${id}`, { signal }),
  create: (data: MeetingCreate) =>
    request<MeetingDetail>("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<MeetingInput>) =>
    request<MeetingDetail>(`/meetings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/meetings/${id}`, { method: "DELETE" }),
  addAction: (id: number, data: ActionInput) =>
    request<ActionItem>(`/meetings/${id}/action-items`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAction: (id: number, data: Partial<ActionInput>) =>
    request<ActionItem>(`/action-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteAction: (id: number) =>
    request<void>(`/action-items/${id}`, { method: "DELETE" }),
};
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
