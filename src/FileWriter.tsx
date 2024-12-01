import { writeFile } from "fs/promises";
import { resolve } from "path";
import React, { createContext, ReactNode, useContext, useState } from "react";
import { useTask } from "../ScriptBuilder";

// Types for file writing state and options
interface WriteState {
  path: string;
  content: string | Buffer | null;
  error: Error | null;
  writing: boolean;
  written: boolean;
}

type WriteFormat = "text" | "binary" | "json" | "base64";

// Context for write state
const WriteContext = createContext<WriteState | null>(null);

// Props for the main FileWriter component
interface FileWriterProps {
  path: string;
  content?: string | Buffer | object;
  format?: WriteFormat;
  children?: ReactNode;
  onSuccess?: (path: string) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  transform?: (content: any) => string | Buffer | Promise<string | Buffer>;
  createDirectory?: boolean;
  encoding?: BufferEncoding;
}

// Props for state-specific components
interface FileWritingProps {
  children: ReactNode;
}

interface FileWriteErrorProps {
  children: ReactNode | ((error: Error) => ReactNode);
}

interface FileWriteSuccessProps {
  children: ReactNode | ((path: string) => ReactNode);
}

export function FileWriter({
  path,
  content = "",
  format = "text",
  children,
  onSuccess,
  onError,
  transform,
  createDirectory = false,
  encoding = "utf-8",
}: FileWriterProps) {
  const [state, setState] = useState<WriteState>({
    path,
    content: null,
    error: null,
    writing: false,
    written: false,
  });

  const { taskId, execute } = useTask(`FileWriter: ${path}`);

  const processContent = async (input: any): Promise<Buffer | string> => {
    let processed: string | Buffer;

    switch (format) {
      case "json":
        processed = JSON.stringify(input, null, 2);
        break;
      case "base64":
        processed = Buffer.from(String(input)).toString("base64");
        break;
      case "binary":
        processed = Buffer.from(input);
        break;
      default:
        processed = String(input);
    }

    return processed;
  };

  React.useEffect(() => {
    const writeContent = async () => {
      try {
        setState((prev) => ({ ...prev, writing: true, error: null }));

        // Process the content
        const processedContent = await processContent(content);
        const finalContent = transform
          ? await transform(processedContent)
          : processedContent;

        // Resolve the path relative to current working directory
        const resolvedPath = resolve(process.cwd(), path);

        // Create directory if requested
        if (createDirectory) {
          const { mkdir } = require("fs/promises");
          const { dirname } = require("path");
          await mkdir(dirname(resolvedPath), { recursive: true });
        }

        // Write the file
        await writeFile(resolvedPath, finalContent, { encoding });

        setState((prev) => ({
          ...prev,
          content: finalContent,
          writing: false,
          written: true,
        }));

        await onSuccess?.(resolvedPath);
      } catch (error) {
        const finalError =
          error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          error: finalError,
          writing: false,
        }));
        await onError?.(finalError);
        throw finalError;
      }
    };

    execute(writeContent);
  }, [
    path,
    content,
    format,
    transform,
    createDirectory,
    encoding,
    execute,
    onSuccess,
    onError,
  ]);

  // If there's a transform function, wrap the content
  const renderContent = () => {
    return children;
  };

  return (
    <WriteContext.Provider value={state}>
      {renderContent()}
    </WriteContext.Provider>
  );
}

// Component for showing writing state
export function FileWriting({ children }: FileWritingProps) {
  const state = useContext(WriteContext);
  if (!state) {
    throw new Error("FileWriting must be used within a FileWriter");
  }

  return state.writing ? <>{children}</> : null;
}

// Component for showing error state
export function FileWriteError({ children }: FileWriteErrorProps) {
  const state = useContext(WriteContext);
  if (!state) {
    throw new Error("FileWriteError must be used within a FileWriter");
  }

  if (!state.error) return null;

  return (
    <>{typeof children === "function" ? children(state.error) : children}</>
  );
}

// Component for showing success state
export function FileWriteSuccess({ children }: FileWriteSuccessProps) {
  const state = useContext(WriteContext);
  if (!state) {
    throw new Error("FileWriteSuccess must be used within a FileWriter");
  }

  if (state.writing || state.error || !state.written) return null;

  return typeof children === "function" ? children(state.path) : children;
}

// Hook for accessing write state
export function useWriteState() {
  const state = useContext(WriteContext);
  if (!state) {
    throw new Error("useWriteState must be used within a FileWriter");
  }
  return state;
}

/* Usage examples:

// Basic text file writing
<FileWriter path="./output.txt" content="Hello, World!">
  <FileWriting>
    <Log content="Writing file..." />
  </FileWriting>
  
  <FileWriteError>
    <Log content="Failed to write file" />
  </FileWriteError>
  
  <FileWriteSuccess>
    {(path) => <Log content={`File written to ${path}`} />}
  </FileWriteSuccess>
</FileWriter>

// JSON file with transformation
<FileWriter 
  path="./data.json" 
  content={{ items: [1, 2, 3] }}
  format="json"
  transform={(data) => JSON.stringify(JSON.parse(data), null, 4)}
>
  <FileWriteSuccess>
    {(path) => <Log content={`JSON written to ${path}`} />}
  </FileWriteSuccess>
</FileWriter>

// With directory creation and callbacks
<FileWriter 
  path="./nested/dir/file.txt"
  content="Creating nested directories"
  createDirectory={true}
  onSuccess={async (path) => {
    console.log('File written successfully');
  }}
  onError={async (error) => {
    console.error('File write failed:', error);
  }}
>
  <FileWriteSuccess>
    {(path) => <Log content={`File written with nested directories to ${path}`} />}
  </FileWriteSuccess>
</FileWriter>
*/
