import { useEffect, useState, type ReactNode } from "react";

type Listener = (content: ReactNode | null) => void;

let current: ReactNode | null = null;
const listeners = new Set<Listener>();

function setContent(content: ReactNode | null) {
  current = content;
  listeners.forEach((l) => l(content));
}

export function ShellHeaderProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Set the sticky topbar content. `setContent` is stable across renders. */
export function useShellHeader() {
  return { setContent };
}

/** Subscribe to the topbar content (used by the shell header only). */
export function useShellHeaderContent() {
  const [content, setLocal] = useState<ReactNode | null>(current);
  useEffect(() => {
    const listener: Listener = (c) => setLocal(c);
    listeners.add(listener);
    setLocal(current);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return content;
}
