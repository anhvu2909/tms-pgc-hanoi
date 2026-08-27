/* eslint-disable @typescript-eslint/no-unused-vars */
declare module '*.svg' {
  import * as React from 'react';
  import * as echarts from 'echarts';
  import * as inputmask from 'inputmask';

  const ReactComponent: React.FunctionComponent<
    React.ComponentProps<'svg'> & { title?: string }
  >;

  export default ReactComponent;
}
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_URL_SOCKET: string
  readonly VITE_URL_API: string
  readonly VITE_URL_LANGUAGES: string
  readonly VITE_URL_LANGUAGE: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
declare const echarts: echarts;
declare const Inputmask: inputmask;
