declare namespace React {
  type RefObject<T> = { current: T | null };
  type ReactNode = any;
  interface KeyboardEvent<T = HTMLElement> { key: string; shiftKey: boolean; currentTarget: T; preventDefault(): void; }
  const StrictMode: any;
}
declare module "react" {
  export function useEffect(effect: () => void | (() => void), deps: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useRef<T>(initial: T | null): { current: T | null };
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void];
  const React: any;
  export default React;
}
declare module "react/jsx-runtime" { export const jsx: any; export const jsxs: any; export const Fragment: any; }
declare module "react-dom/client" { const ReactDOM: any; export default ReactDOM; }
declare module "exceljs" { const value: any; export = value; }
declare module "@fontsource-variable/vazirmatn/wght.css";
declare module "*.css";
declare module "vite" { export const defineConfig: any; }
declare module "@vitejs/plugin-react" { const plugin: any; export default plugin; }
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }
