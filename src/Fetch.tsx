import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useTask } from '../ScriptBuilder';

// Basic fetch state type
interface FetchState<T = any> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

// Create context for fetch results
const FetchContext = createContext<FetchState | null>(null);

// Props for the main Fetch component
interface FetchProps {
  url: string;
  children?: React.ReactNode;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function Fetch({
  url,
  children,
  onSuccess,
  onError,
}: FetchProps) {
  const [state, setState] = useState<FetchState>({
    data: null,
    error: null,
    loading: false,
  });

  const { taskId, execute } = useTask(`Fetch: ${url}`);

  useEffect(() => {
    const fetchData = async () => {
      setState(prev => ({ ...prev, loading: true }));
      
      await execute(async () => {
        try {
          const response = await fetch(url);
          
          if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          setState({ data, error: null, loading: false });
            await onSuccess?.(data);
        } catch (error) {
          const finalError = error instanceof Error ? error : new Error(String(error));
          setState({ data: null, error: finalError, loading: false });
          await onError?.(finalError);
          // throw finalError; // Re-throw to mark the task as failed
        }
      });
    };

    fetchData();
  }, [url, onSuccess, onError, execute]);

  return (
    <FetchContext.Provider value={state}>
      {children}
    </FetchContext.Provider>
  );
}

// Hook to access fetch state
export function useFetchState<T = any>() {
  const context = useContext(FetchContext);
  if (!context) {
    throw new Error('useFetchState must be used within a Fetch component');
  }
  return context as FetchState<T>;
}

// Helper components for rendering based on fetch state
interface FetchChildProps {
  children: React.ReactNode;
}

export function FetchLoading({ children }: FetchChildProps) {
  const { loading } = useFetchState();
  return loading ? <>{children}</> : null;
}

export function FetchError({ children }: FetchChildProps) {
  const { error } = useFetchState();
  return error ? <>{children}</> : null;
}

export function FetchSuccess({ children }: {children: (data: any) => ReactNode}) {
  const { data, loading, error } = useFetchState();
  return data && !loading && !error ? <>{children(data)}</> : null;
}