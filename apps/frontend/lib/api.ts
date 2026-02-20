export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

let csrfHeaderName = "";
let csrfToken = "";
let csrfReady = false;

export function resetCsrf() {
  csrfToken = "";
  csrfHeaderName = "";
  csrfReady = false;
}

export async function ensureCsrf(): Promise<{ csrfToken: string; csrfHeaderName: string }> {
  if (csrfReady) return { csrfToken, csrfHeaderName };
  const res = await fetch(`${API_BASE}/api/csrf`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("CSRF initialization failed");
  }
  const data = await res.json();
  csrfToken = data.token || "";
  csrfHeaderName = data.headerName || "X-XSRF-TOKEN";
  csrfReady = true;
  return { csrfToken, csrfHeaderName };
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const raw = await res.text();
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data?.message) message = data.message;
        else message = raw;
      } catch {
        message = raw;
      }
    }
    const error = new Error(message);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

export async function postWithCsrf<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const { csrfHeaderName, csrfToken } = await ensureCsrf();
  return fetchJson<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    ...init,
    headers: {
      ...(init?.headers || {}),
      [csrfHeaderName]: csrfToken,
    },
  });
}

export async function patchWithCsrf<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const { csrfHeaderName, csrfToken } = await ensureCsrf();
  return fetchJson<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    ...init,
    headers: {
      ...(init?.headers || {}),
      [csrfHeaderName]: csrfToken,
    },
  });
}

export async function deleteWithCsrf<T>(path: string, init?: RequestInit): Promise<T> {
  const { csrfHeaderName, csrfToken } = await ensureCsrf();
  return fetchJson<T>(path, {
    method: "DELETE",
    ...init,
    headers: {
      ...(init?.headers || {}),
      [csrfHeaderName]: csrfToken,
    },
  });
}

export async function postFormWithCsrf<T>(path: string, formData: FormData, init?: RequestInit): Promise<T> {
  const { csrfHeaderName, csrfToken } = await ensureCsrf();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
    ...init,
    headers: {
      ...(init?.headers || {}),
      [csrfHeaderName]: csrfToken,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}
