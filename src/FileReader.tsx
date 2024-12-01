import { readFile } from "fs/promises";
import { resolve } from "path";
import React, { createContext, ReactNode, useContext } from "react";
import { useTask } from "../ScriptBuilder";

type FileContent = string | Buffer | ArrayBuffer | null;
type FileFormat = "text" | "binary" | "json" | "base64";

interface FileState {
  content: FileContent;
  path: string;
  format: FileFormat;
  error: Error | null;
  loading: boolean;
}

const FileContext = createContext<FileState | null>(null);

interface FileReaderProps {
  path: string;
  format?: FileFormat;
  children?: ReactNode | ((content: FileContent) => ReactNode);
  onSuccess?: (content: FileContent) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  logContent?: boolean;
}

interface FileReadingProps {
  children: ReactNode;
}

interface FileErrorProps {
  children: ReactNode | ((error: Error) => ReactNode);
}

interface FileSuccessProps {
  children: ReactNode | ((content: FileContent) => ReactNode);
}

export function FileReader({
  path,
  format = "text",
  children,
  onSuccess,
  onError,
  logContent = false,
}: FileReaderProps) {
  const [state, setState] = React.useState<FileState>({
    content: null,
    path,
    format,
    error: null,
    loading: true,
  });

  const { taskId, execute } = useTask(`FileReader: ${path}`);

  const processContent = async (buffer: Buffer): Promise<FileContent> => {
    switch (format) {
      case "text":
        return buffer.toString("utf-8");
      case "json":
        return JSON.parse(buffer.toString("utf-8"));
      case "base64":
        return buffer.toString("base64");
      case "binary":
        return buffer;
      default:
        return buffer;
    }
  };

  React.useEffect(() => {
    const readFileContent = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const resolvedPath = resolve(process.cwd(), path);
        const buffer = await readFile(resolvedPath);
        const content = await processContent(buffer);

        setState((prev) => ({
          ...prev,
          content,
          loading: false,
        }));

        await onSuccess?.(content);
      } catch (error) {
        const finalError =
          error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          error: finalError,
          loading: false,
        }));
        await onError?.(finalError);
      }
    };

    execute(readFileContent);
  }, [path, format, execute, onSuccess, onError, logContent]);

  const renderContent = () => {
    return typeof children === "function" ? children(state.content) : children;
  };

  return (
    <FileContext.Provider value={state}>{renderContent()}</FileContext.Provider>
  );
}

export function FileReading({ children }: FileReadingProps) {
  const state = useContext(FileContext);
  if (!state) {
    throw new Error("FileReading must be used within a FileReader");
  }

  return state.loading ? <>{children}</> : null;
}

export function FileError({ children }: FileErrorProps) {
  const state = useContext(FileContext);
  if (!state) {
    throw new Error("FileError must be used within a FileReader");
  }

  if (!state.error) return null;

  return (
    <>{typeof children === "function" ? children(state.error) : children}</>
  );
}

export function FileSuccess({ children }: FileSuccessProps) {
  const state = useContext(FileContext);
  if (!state) {
    throw new Error("FileSuccess must be used within a FileReader");
  }

  if (state.loading || state.error || !state.content) return null;

  return typeof children === "function" ? children(state.content) : children;
}

export function useFileContent() {
  const state = useContext(FileContext);
  if (!state) {
    throw new Error("useFileContent must be used within a FileReader");
  }
  return state;
}
