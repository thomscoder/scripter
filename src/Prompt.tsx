import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import * as readline from "readline";
import { useTask } from "../ScriptBuilder";

interface PromptState {
  value: string | null;
  error: Error | null;
  loading: boolean;
}

const PromptContext = createContext<PromptState | null>(null);

interface PromptProps {
  message: string;
  defaultValue?: string;
  children?: ReactNode;
  onSubmit?: (value: string) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  validate?: (value: string) => boolean | string | Promise<boolean | string>;
}

export function Prompt({
  message,
  defaultValue = "",
  children,
  onSubmit,
  onCancel,
  validate,
}: PromptProps) {
  const [state, setState] = useState<PromptState>({
    value: null,
    error: null,
    loading: false,
  });

  const { taskId, execute } = useTask(`Prompt: ${message}`);

  const handlePrompt = async () => {
    setState((prev) => ({ ...prev, loading: true }));

    await execute(async () => {
      try {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const userInput = await new Promise<string>((resolve, reject) => {
          const promptMessage = defaultValue
            ? `${message} (${defaultValue}): `
            : `${message}: `;

          rl.question(promptMessage, (answer) => {
            const finalAnswer = answer.trim() || defaultValue;
            resolve(finalAnswer);
            rl.close();
          });

          // Handle Ctrl+C
          rl.on("SIGINT", () => {
            rl.close();
            reject(new Error("User cancelled"));
          });
        });

        if (!userInput) {
          await onCancel?.();
          setState({ value: null, error: null, loading: false });
          return;
        }

        if (validate) {
          const validationResult = await validate(userInput);
          if (typeof validationResult === "string") {
            const error = new Error(validationResult);
            setState({ value: null, error, loading: false });
          } else if (!validationResult) {
            const error = new Error("Invalid input");
            setState({ value: null, error, loading: false });
          }
        }

        setState({ value: userInput, error: null, loading: false });
        await onSubmit?.(userInput);
      } catch (error) {
        const finalError =
          error instanceof Error ? error : new Error(String(error));
        setState({ value: null, error: finalError, loading: false });
        throw finalError;
      }
    });
  };

  useEffect(() => {
    handlePrompt();
  }, [message, defaultValue]);

  return (
    <PromptContext.Provider value={state}>{children}</PromptContext.Provider>
  );
}

export function usePromptState() {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error("usePromptState must be used within a Prompt component");
  }
  return context;
}

interface PromptChildProps {
  children: ReactNode;
}

export function PromptLoading({ children }: PromptChildProps) {
  const { loading } = usePromptState();
  return loading ? <>{children}</> : null;
}

export function PromptError({
  children,
}: {
  children: ReactNode | ((error: Error) => ReactNode);
}) {
  const { error } = usePromptState();
  if (!error) return null;
  return <>{typeof children === "function" ? children(error) : children}</>;
}

export function PromptSuccess({
  children,
}: {
  children: (value: string) => ReactNode;
}) {
  const { value, loading, error } = usePromptState();
  return value && !loading && !error ? <>{children(value)}</> : null;
}
