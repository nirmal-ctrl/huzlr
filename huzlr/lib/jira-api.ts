export interface JiraSite { id: string; name: string; url: string; scopes: string[] }
export interface JiraSpace { id: string; key: string; name: string; projectTypeKey?: string; description?: string }
export interface JiraTask { dataset: string; status: string; records: number; pages: number; error?: string | null }
export interface JiraBindingStatus {
  id: string; project_id: number; name: string; key: string; status: string; graph: string; enrichment: string; connection_status: string;
  synced_at: string | null; revision: number; filter_id: number | null;
  run: { id: string; status: string; mode: string; error?: string | null; coverage: Record<string, unknown>; tasks: JiraTask[] } | null;
}

export async function jiraRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Sign in before connecting Jira");
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jira${path}`, {
    ...options, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Jira request failed");
  return result as T;
}

export async function authorizeJira(): Promise<void> {
  const { authorization_url } = await jiraRequest<{ authorization_url: string }>("/authorize");
  if (!authorization_url) throw new Error("Unable to open Jira authorization");
  window.location.assign(authorization_url);
}
