import type { Provider } from "./settings";

/** Antwort von POST /api/health — client-sicher, liest keine Server-Env. */
export interface HealthState {
  ok: boolean;
  modelFound: boolean;
  provider: Provider;
  model: string;
  cloud: boolean;
  error?: string;
}
