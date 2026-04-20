// Shared result contract for the data-access layer.
//
// Invariant: every exported function in src/lib/api/** returns
// Promise<ApiResult<T>>. No throws, no domain-specific ad-hoc shapes.
// Callers branch on `error` (truthy = failure). This keeps the boundary
// uniform and lets us layer future adapters (TanStack Query, retries,
// telemetry) on top without rewriting call sites.
//
// Shape mirrors the Supabase client response shape:
//   - { data: T,    error: null   }  on success
//   - { data: null, error: string }  on failure
export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export function apiOk<T>(data: T): ApiResult<T> {
  return { data, error: null };
}

/**
 * The fail branch is structurally assignable to ApiResult<T> for any T,
 * so this helper is intentionally non-generic — avoids the `<T = never>`
 * trap and lets callers return it directly inside any typed wrapper.
 */
export function apiFail(error: string): { data: null; error: string } {
  return { data: null, error };
}
