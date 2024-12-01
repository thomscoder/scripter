import React, { createContext, ReactNode, useContext } from "react";
import { useTask } from "../../ScriptBuilder";

// Define the shape of your operation's state
// This should include all data that child components might need
interface MyComponentState {
  data: any | null; // The result of your operation
  error: Error | null; // Any error that occurred
  status: "idle" | "processing" | "completed" | "error"; // Current state
}

// Define the props your component will accept
// Keep required props minimal and make others optional
interface MyComponentProps {
  input: string;

  onSuccess?: (result?: any) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;

  children?: ReactNode;
}

// Create a context to share state with child components
const MyComponentContext = createContext<MyComponentState | null>(null);

// Main component that handles the operation
export function MyComponent({
  input,
  onSuccess,
  onError,
  children,
}: MyComponentProps) {
  // Initialize state with safe default values
  const [state, setState] = React.useState<MyComponentState>({
    data: null,
    error: null,
    status: "idle",
  });

  // Set up task integration
  const { taskId, execute } = useTask(`MyComponent: ${input}`);

  React.useEffect(() => {
    const performOperation = async () => {
      // Update status to show operation is starting
      setState((prev) => ({ ...prev, status: "processing" }));

      try {
        // Execute the operation within the task system
        // This ensures proper task tracking and error handling
        await execute(async () => {
          // Your actual operation logic
          // This is just an example:
          const result = await new Promise((resolve) =>
            setTimeout(resolve, 1000)
          );
          // Update state with successful result
          setState({ data: result, error: null, status: "completed" });
          await onSuccess?.(result);
        });
      } catch (error) {
        // Ensure error is proper Error instance
        const finalError =
          error instanceof Error ? error : new Error(String(error));

        // Update state with error
        setState({ data: null, error: finalError, status: "error" });

        // Call error callback if provided
        await onError?.(finalError);

        // Optional - Re-throw to mark task as failed
        // throw finalError;
      }
    };

    performOperation();
  }, [input, onSuccess, onError, execute]);

  // Provide state to children through context
  return (
    <MyComponentContext.Provider value={state}>
      {children}
    </MyComponentContext.Provider>
  );
}

// Hook for child components to access operation state
export function useMyComponent() {
  const context = useContext(MyComponentContext);
  if (!context) {
    throw new Error(
      "useMyComponent must be used within a MyComponent component"
    );
  }
  return context;
}

// Helper components for different operation states
interface ChildProps {
  children: (data: any) => ReactNode;
}

export function MyComponentProcessing({ children }: ChildProps) {
  const { status } = useMyComponent();
  return status === "processing" ? children(status) : null;
}

export function MyComponentError({ children }: ChildProps) {
  const { status, error } = useMyComponent();
  return status === "error" ? children(error) : null;
}

export function MyComponentSuccess({ children }: ChildProps) {
  const { status, data } = useMyComponent();
  return status === "completed" && <>{children(data)}</>;
}

/* Example Usage:
Wrap your script in <TaskProvider> to access the task management.
The task manager is to ensure sequentiality with a depth first approach.

<TaskProvider>
  <MyComponent input="test-input">
    <MyComponentProcessing>
      {(status) => <Log content={`Status: ${status}`} />}
    </MyComponentProcessing>
    
    <MyComponentError>
      {(error) => <Log content={`Error: ${error.message}`} />}
    </MyComponentError>
    
    <MyComponentSuccess>
      {(data) => <Log content={data} format="json" />}
    </MyComponentSuccess>
  </MyComponent>
</TaskProvider>
*/
