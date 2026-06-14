import { createContext, useContext, useState, type ReactNode } from "react";

interface ShellHeaderContextValue {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}

const ShellHeaderContext = createContext<ShellHeaderContextValue>({
  content: null,
  setContent: () => {},
});

export function ShellHeaderProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);
  return (
    <ShellHeaderContext.Provider value={{ content, setContent }}>
      {children}
    </ShellHeaderContext.Provider>
  );
}

export function useShellHeader() {
  return useContext(ShellHeaderContext);
}
