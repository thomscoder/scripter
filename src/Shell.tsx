import { exec, ExecOptions, spawn } from 'child_process';
import React, { createContext, ReactNode, useContext } from 'react';
import { promisify } from 'util';
import { useTask } from '../ScriptBuilder';

const execAsync = promisify(exec);

// Shell execution state type
interface ShellState {
  output: string | null;
  error: Error | null;
  exitCode: number | null;
  loading: boolean;
  stderr: string | null;
}

// Create context for shell execution results
const ShellContext = createContext<ShellState | null>(null);

// Props for the main Shell component
interface ShellProps {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  shell?: 'bash' | 'zsh' | 'powershell' | 'cmd' | string;
  mode?: 'exec' | 'spawn';  // exec for simple commands, spawn for long-running or streaming
  children?: ReactNode;
  onSuccess?: (output: string, exitCode: number) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onStderr?: (data: string) => void | Promise<void>;
  onStdout?: (data: string) => void | Promise<void>;
}

export function Shell({
  command,
  cwd = process.cwd(),
  env = {},
  shell = process.platform === 'win32' ? 'powershell' : 'bash',
  mode = 'exec',
  children,
  onSuccess,
  onError,
  onStderr,
  onStdout,
}: ShellProps) {
  const [state, setState] = React.useState<ShellState>({
    output: null,
    error: null,
    exitCode: null,
    loading: false,
    stderr: null,
  });

  const { taskId, execute } = useTask(`Shell: ${command.slice(0, 20)}...`);

  React.useEffect(() => {
    const executeCommand = async () => {
      setState(prev => ({ ...prev, loading: true }));
      
      await execute(async () => {
        try {
          if (mode === 'exec') {
            // Use exec for simple commands that return all at once
            const options: ExecOptions = {
              cwd,
              env: { ...process.env, ...env },
              shell,
            };

            const { stdout, stderr } = await execAsync(command, options);
            
            setState({
              output: stdout,
              stderr,
              error: null,
              exitCode: 0,
              loading: false,
            });

            await onSuccess?.(stdout, 0);
            if (stderr && onStderr) {
              await onStderr(stderr);
            }

          } else {
            // Use spawn for long-running processes or when you need to stream output
            let stdoutBuffer = '';
            let stderrBuffer = '';

            const childProcess = spawn(command, [], {
              cwd,
              env: { ...process.env, ...env },
              shell,
              windowsHide: true,
            });

            childProcess.stdout.on('data', async (data) => {
              const chunk = data.toString();
              stdoutBuffer += chunk;
              await onStdout?.(chunk);
            });

            childProcess.stderr.on('data', async (data) => {
              const chunk = data.toString();
              stderrBuffer += chunk;
              await onStderr?.(chunk);
            });

            // Wait for process to complete
            await new Promise<void>((resolve, reject) => {
              childProcess.on('error', reject);
              childProcess.on('close', async (code) => {
                if (code === 0) {
                  setState({
                    output: stdoutBuffer,
                    stderr: stderrBuffer,
                    error: null,
                    exitCode: code,
                    loading: false,
                  });
                  await onSuccess?.(stdoutBuffer, code);
                  resolve();
                } else {
                  const error = new Error(`Command failed with exit code ${code}`);
                  setState({
                    output: stdoutBuffer,
                    stderr: stderrBuffer,
                    error,
                    exitCode: code,
                    loading: false,
                  });
                  reject(error);
                }
              });
            });
          }
        } catch (error) {
          const finalError = error instanceof Error ? error : new Error(String(error));
          setState({
            output: null,
            stderr: null,
            error: finalError,
            exitCode: 1,
            loading: false,
          });
          await onError?.(finalError);
          throw finalError;
        }
      });
    };

    executeCommand();
  }, [command, cwd, env, shell, mode, onSuccess, onError, onStderr, onStdout, execute]);

  return (
    <ShellContext.Provider value={state}>
      {children}
    </ShellContext.Provider>
  );
}

// Hook to access shell execution state
export function useShellState() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShellState must be used within a Shell component');
  }
  return context;
}

// Helper components for rendering based on shell execution state
interface ShellChildProps {
  children: ReactNode;
}

export function ShellLoading({ children }: ShellChildProps) {
  const { loading } = useShellState();
  return loading ? <>{children}</> : null;
}

export function ShellError({ children }: { children: ReactNode | ((error: Error, stderr: string | null) => ReactNode) }) {
  const { error, stderr } = useShellState();
  if (!error) return null;
  return <>{typeof children === 'function' ? children(error, stderr) : children}</>;
}

export function ShellSuccess({ children }: { children: (output: string, exitCode: number) => ReactNode }) {
  const { output, exitCode, loading, error } = useShellState();
  if (!output || loading || error || exitCode !== 0) return null;
  return <>{children(output, exitCode)}</>;
}

/* Usage examples:

// Simple command execution:
<Shell 
  command="ls -la"
  cwd="/some/directory"
  env={{ NODE_ENV: 'development' }}
>
  <ShellLoading>
    <Log content="Listing directory contents..." />
  </ShellLoading>

  <ShellError>
    {(error, stderr) => (
      <LogError content={`Command failed: ${error.message}\nStderr: ${stderr}`} />
    )}
  </ShellError>

  <ShellSuccess>
    {(output) => <Log content={output} />}
  </ShellSuccess>
</Shell>

// Long-running command with streaming output:
<Shell 
  command="npm install"
  mode="spawn"
  onStdout={async (data) => {
    console.log('Received chunk:', data);
  }}
>
  <ShellLoading>
    <Log content="Installing dependencies..." />
  </ShellLoading>

  <ShellSuccess>
    {(output) => <Success content="Dependencies installed successfully!" />}
  </ShellSuccess>
</Shell>

// PowerShell example:
<Shell
  command="Get-Process | Select-Object -First 5"
  shell="powershell"
>
  <ShellSuccess>
    {(output) => <Log content={output} />}
  </ShellSuccess>
</Shell>
*/