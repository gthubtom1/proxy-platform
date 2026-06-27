/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SURFACE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PUBLIC_PROXY_HOST?: string;
  readonly VITE_PUBLIC_PROXY_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
