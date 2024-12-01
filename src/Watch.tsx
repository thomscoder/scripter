import { existsSync, lstatSync, mkdirSync, watch } from "fs";
import { join } from "path";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { createInterface } from "readline";
import { useTask } from "../ScriptBuilder";

interface WatchState {
  file: string | null;
  error: Error | null;
  loading: boolean;
  active: boolean;
  outputPath: string;
}

const WatchContext = createContext<WatchState | null>(null);

interface WatchProps {
  path: string;
  outputPath?: string;
  children?: ReactNode;
  message?: string;
  onSuccess?: (filename: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export function Watch({ 
  path, 
  outputPath,
  children, 
  onSuccess, 
  onError,
  onClose 
}: WatchProps) {
  const [state, setState] = useState<WatchState>({
    file: null,
    error: null,
    loading: true,
    active: true,
    outputPath: outputPath || ''
  });

  const { taskId, execute } = useTask(`Watch ${path}`);

  useEffect(() => {
    if (!state.active) return;

    [path, outputPath].forEach(dir => {
      if (dir && (!existsSync(dir) || !lstatSync(dir).isDirectory())) {
        mkdirSync(dir);
      }
    });

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', (key) => {
      if (key.toLowerCase() === 'q') {
        setState(prev => ({ ...prev, active: false }));
        onClose?.();
        rl.close();
      }
    });

    const watcher = watch(path, async (eventType, filename) => {
      if (!filename || !state.active) return;

      process.nextTick(async () => {
        setState(prev => ({ ...prev, loading: true }));

        await execute(async () => {
          try {
            const fullPath = join(path, filename);
            setState(prev => ({ ...prev, file: fullPath, error: null, loading: false }));
            await onSuccess?.(fullPath);
            return { eventType, filename: fullPath };
          } catch (error) {
            const finalError =
              error instanceof Error ? error : new Error(String(error));
            setState(prev => ({ ...prev, file: null, error: finalError, loading: false }));
            await onError?.(finalError);
          }
        });
      });
    });

    return () => {
      watcher.close();
      rl.close();
      setState(prev => ({ ...prev, file: null, error: null, loading: false }));
    };
  }, [path, outputPath, onSuccess, onError, state.active]);

  if (!state.active) return null;

  return (
    <WatchContext.Provider value={state}>
      {children}
    </WatchContext.Provider>
  );
}

export function useWatchState() {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error("useWatchState must be used within a Watch component");
  }
  return context;
}

interface WatchChildProps {
  children: ReactNode;
}

export function WatchError({ children }: WatchChildProps) {
  const { error, active } = useWatchState();
  return error && active ? <>{children}</> : null;
}

export function WatchMessage({ children }: { children: ReactNode }) {
  const { loading, error, file, active } = useWatchState();
  const shouldShow = loading && !error && active;
  return shouldShow ? <>{children}</> : null;
}

export function WatchSuccess({
  children,
}: {
  children: (filename: string, outputPath: string) => ReactNode;
}) {
  const { file, loading, error, active, outputPath } = useWatchState();
  const shouldShow = file && !loading && !error && active;
  return shouldShow ? <>{children(file, outputPath)}</> : null;
}
