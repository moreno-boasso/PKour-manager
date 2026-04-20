declare global {
  interface Window {
    __PKOUR_ENV__?: {
      PKOUR_API_BASE_URL?: string;
      PKOUR_TRICKS_WRITE_ENDPOINT?: string;
      PKOUR_TRICKS_DELETE_ENDPOINT?: string;
      LOCAL_TOOL_SECRET?: string;
      PKOUR_LOCAL_TOOL_SECRET?: string;
    };
  }
}

export function getRuntimeEnv() {
  const env = window.__PKOUR_ENV__ ?? {};

  return {
    apiBaseUrl: (env.PKOUR_API_BASE_URL ?? 'http://localhost:3000/api').trim(),
    tricksWriteEndpoint: (env.PKOUR_TRICKS_WRITE_ENDPOINT ?? '/tricks/upsert-local').trim(),
    tricksDeleteEndpoint: (env.PKOUR_TRICKS_DELETE_ENDPOINT ?? '/tricks/delete-local').trim(),
    localToolSecret: (env.LOCAL_TOOL_SECRET ?? env.PKOUR_LOCAL_TOOL_SECRET ?? '').trim(),
  };
}

export {};
