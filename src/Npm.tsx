import { spawn, SpawnOptions } from "child_process";
import React, { createContext, useContext, useEffect } from "react";
import { useTask } from "../ScriptBuilder";
import { LogError, LogGroup } from "./Log";

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

interface ScriptState {
  output: string | null;
  error: Error | null;
  loading: boolean;
  stdout: string[];
  stderr: string[];
}

const ScriptContext = createContext<ScriptState | null>(null);

interface NpmProps {
  script: string;
  packageManager?: PackageManager;
  children?: React.ReactNode;
  onSuccess?: (output: string) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  options?: SpawnOptions
  flags?: string[]
}

interface ScriptRunSuccess {
  children: (output: string) => React.ReactNode;
}

interface ScriptRunError {
  children?: React.ReactNode;
}

interface ScriptRunLoading {
  children: React.ReactNode;
}

interface ScriptRunStream {
  children: (stream: { stdout: string[]; stderr: string[] }) => React.ReactNode;
}

function useScriptState() {
  const context = useContext(ScriptContext);
  if (!context) {
    throw new Error("useScriptState must be used within a Npm");
  }
  return context;
}

export function Npm({
  script,
  packageManager = "npm",
  children,
  onSuccess,
  onError,
  options,
  flags
}: NpmProps) {
  const [state, setState] = React.useState<ScriptState>({
    output: null,
    error: null,
    loading: false,
    stdout: [],
    stderr: [],
  });

  const { taskId, execute } = useTask(`${packageManager} run ${script}`);

  useEffect(() => {
    const runScript = async () => {
      setState((prev) => ({ ...prev, loading: true }));
      await execute(async () => {
        try {
          let stdoutBuffer = "";
          let stderrBuffer = "";

          const childProcess = spawn(packageManager, ["run", script, ...flags || ""], {
            shell: true,
            stdio: "pipe",
            ...(options && {
              ...options
            })

          });

          childProcess.stdout.on("data", (data) => {
            const chunk = data.toString();
            stdoutBuffer += chunk;
            setState((prev) => ({
              ...prev,
              stdout: [...prev.stdout, chunk],
            }));
          });

          childProcess.stderr.on("data", (data) => {
            const chunk = data.toString();
            stderrBuffer += chunk;
            setState((prev) => ({
              ...prev,
              stderr: [...prev.stderr, chunk],
            }));
          });

          // Wait for process to complete
          await new Promise<void>((resolve, reject) => {
            childProcess.on("error", reject);
            childProcess.on("close", async (code) => {
              if (code === 0) {
                const output = stdoutBuffer || stderrBuffer;
                setState((prev) => ({
                  ...prev,
                  output,
                  error: null,
                  loading: false,
                }));
                await onSuccess?.(output);
                resolve();
              } else {
                const error = new Error(
                  `Command failed with exit code ${code}`
                );
                setState((prev) => ({
                  ...prev,
                  output: null,
                  error,
                  loading: false,
                }));
                reject(error);
              }
            });
          });
        } catch (error) {
          const finalError =
            error instanceof Error ? error : new Error(String(error));
          setState((prev) => ({
            ...prev,
            output: null,
            error: finalError,
            loading: false,
          }));
          await onError?.(finalError);
        }
      });
    };
    runScript();
  }, [script, packageManager, execute, onSuccess, onError]);

  return (
    <ScriptContext.Provider value={state}>{children}</ScriptContext.Provider>
  );
}

export function NpmRunLoading({ children }: ScriptRunLoading) {
  const { loading } = useScriptState();

  return loading ? <>{children}</> : null;
}

export function NpmRunError({ children }: ScriptRunError) {
  const { error } = useScriptState();
  if (!error) return null;

  return (
    <LogGroup label="Script Error">
      <LogError content={`Script execution failed: ${error.message}`} />
      {children}
    </LogGroup>
  );
}

export function NpmRunSuccess({ children }: ScriptRunSuccess) {
  const { output, loading, error } = useScriptState();
  if (!output || loading || error) return null;

  return children(output);
}

export function NpmRunStream({ children }: ScriptRunStream) {
  const { stdout, stderr, loading, error } = useScriptState();
  if (loading && !error) {
    return children({ stdout, stderr });
  }
  return null;
}
