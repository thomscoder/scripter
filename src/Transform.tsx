import React, { createContext, ReactNode, useContext } from "react";
import { useTask } from "../ScriptBuilder";
import { Log } from "./Log";

const TransformContext = createContext<any>(null);

interface TransformProps {
  children?: ((data: any) => ReactNode) | ReactNode;
  input?: any;
  transform: (data: any) => any | Promise<any>;
  logTransformation?: boolean;
  onSuccess?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

export function Transform({
  children,
  input,
  onSuccess,
  onError,
  transform,
  logTransformation = true,
}: TransformProps) {
  const [transformedData, setTransformedData] = React.useState<any>(null);
  const { taskId, execute } = useTask(
    `Transform: ${transform.name || "anonymous"}`
  );

  React.useEffect(() => {
    const performTransform = async () => {
      try {
        const result = await transform(input);
        setTransformedData(result);

        onSuccess?.(result);
        if (logTransformation) {
          return (
            <Log
              content={{
                input,
                output: result,
              }}
              format="json"
              prefix="↠"
            />
          );
        }
      } catch (error) {
        onError?.(error);
      }
    };

    execute(performTransform);
  }, [input, transform, execute, logTransformation]);

  // Render nothing until we have transformed data
  if (!transformedData) return null;

  return (
    <TransformContext.Provider value={transformedData}>
      {typeof children === "function" ? children(transformedData) : children}
    </TransformContext.Provider>
  );
}

// Hook to access transformed data
export function useTransformedData<T = any>() {
  const context = useContext(TransformContext);
  if (context === null) {
    throw new Error(
      "useTransformedData must be used within a Transform component"
    );
  }
  return context as T;
}

interface FilterProps<T = any> {
  children: ((data: T[]) => ReactNode) | ReactNode;
  input?: T[];
  filterFn: (item: T) => boolean;
  logTransformation?: boolean;
}

export function Filter<T>({
  children,
  input,
  filterFn,
  logTransformation,
}: FilterProps<T>) {
  return (
    <Transform
      input={input}
      transform={(data: T[]) => data.filter(filterFn)}
      logTransformation={logTransformation}
    >
      {children}
    </Transform>
  );
}

interface MapProps<T = any, U = any> {
  children: ((data: U[]) => ReactNode) | ReactNode;
  input?: T[];
  mapper: (item: T) => U;
  logTransformation?: boolean;
}

export function Map<T, U>({
  children,
  input,
  mapper,
  logTransformation,
}: MapProps<T, U>) {
  return (
    <Transform
      input={input}
      transform={(data: T[]) => data.map(mapper)}
      logTransformation={logTransformation}
    >
      {children}
    </Transform>
  );
}
