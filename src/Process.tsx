import { spawn, SpawnOptions } from 'child_process';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useTask } from '../ScriptBuilder';

interface ProcessState {
  output: string | null;
  error: Error | null;
  loading: boolean;
}

const ProcessContext = createContext<ProcessState | null>(null);

interface ProcessProps {
  command: string;
  args?: string[];
  options?: SpawnOptions;
  children?: ReactNode;
  onSuccess?: (output: string) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}

export function Process({
  command,
  args = [],
  options = {},
  children,
  onSuccess,
  onError,
}: ProcessProps) {
  const [state, setState] = useState<ProcessState>({
    output: null,
    error: null,
    loading: false,
  });

  const { taskId, execute } = useTask(`Process ${command}`);

  useEffect(() => {
    setState(prev => ({ ...prev, loading: true }));

    execute(async () => {
      return new Promise((resolve, reject) => {
        const process = spawn(command, args, options);
        let output = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.stderr.on('data', async (data) => {
          const error = new Error(data.toString());
          setState({ output: null, error, loading: false });
          await onError?.(error);
        });

        process.on('close', async (code) => {
          if (code === 0) {
            await onSuccess?.(output);

            console.log("hello")
            resolve(output);
            setState({ output, error: null, loading: false });
          } else {
            const error = new Error(`Process exited with code ${code}\n${output}`);
            await onError?.(error);
            setState({ output: null, error, loading: false });
            reject(error);
          }
        });

        process.on('error', async (error) => {
          setState({ output: null, error, loading: false });
          await onError?.(error);
          reject(error);
        });
      });
    });
  }, [command, JSON.stringify(args), JSON.stringify(options)]);

  return (
    <ProcessContext.Provider value={state}>
      {children}
    </ProcessContext.Provider>
  );
}

export function useProcessState() {
  const context = useContext(ProcessContext);
  if (!context) {
    throw new Error('useProcessState must be used within a Process component');
  }
  return context;
}

interface ProcessChildProps {
  children: ReactNode;
}

export function ProcessLoading({ children }: ProcessChildProps) {
  const { loading } = useProcessState();
  return loading ? <>{children}</> : null;
}

export function ProcessError({ children }: ProcessChildProps) {
  const { error } = useProcessState();
  return error ? <>{children}</> : null;
}

export function ProcessSuccess({ children }: { children: (output: string) => ReactNode }) {
  const { output, loading, error } = useProcessState();
  return output && !loading && !error ? <>{children(output)}</> : null;
}
