import React, {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

// Core types
type TaskId = string;
type TaskStatus = "pending" | "running" | "completed" | "failed";

interface Task {
  id: TaskId;
  name: string;
  status: TaskStatus;
  error?: Error;
  startTime?: number;
  endTime?: number;
  parentId?: TaskId;
  childIds: TaskId[];
  index: number; // Add index to track which render cycle the task belongs to
}
interface TaskMap {
  [key: TaskId]: Task;
}

// State management
interface TaskState {
  tasks: TaskMap;
  rootTaskIds: TaskId[];
  completedTaskIds: TaskId[]; // Track completed tasks
}

type TaskAction =
  | { type: "REGISTER_TASK"; task: Task }
  | { type: "START_TASK"; id: TaskId }
  | { type: "COMPLETE_TASK"; id: TaskId }
  | { type: "FAIL_TASK"; id: TaskId; error: Error }
  | { type: "SET_PARENT"; id: TaskId; parentId: TaskId }
  | { type: "CLEANUP_TASKS"; currentIndex: number }; // New action for cleanup

function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case "REGISTER_TASK": {
      const { task } = action;
      return {
        ...state,
        tasks: { ...state.tasks, [task.id]: task },
        rootTaskIds: task.parentId
          ? state.rootTaskIds
          : [...state.rootTaskIds, task.id],
      };
    }

    case "START_TASK": {
      const task = state.tasks[action.id];
      if (!task) return state;

      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.id]: {
            ...task,
            status: "running",
            startTime: Date.now(),
          },
        },
      };
    }

    case "COMPLETE_TASK": {
      const task = state.tasks[action.id];
      if (!task) return state;

      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.id]: {
            ...task,
            status: "completed",
            endTime: Date.now(),
          },
        },
        completedTaskIds: [...state.completedTaskIds, action.id],
      };
    }

    case "FAIL_TASK": {
      const task = state.tasks[action.id];
      if (!task) return state;

      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.id]: {
            ...task,
            status: "failed",
            error: action.error,
            endTime: Date.now(),
          },
        },
      };
    }

    case "SET_PARENT": {
      const { id, parentId } = action;
      const task = state.tasks[id];
      const parent = state.tasks[parentId];
      if (!task || !parent) return state;

      return {
        ...state,
        tasks: {
          ...state.tasks,
          [id]: { ...task, parentId },
          [parentId]: {
            ...parent,
            childIds: [...parent.childIds, id],
          },
        },
        rootTaskIds: state.rootTaskIds.filter((tid) => tid !== id),
      };
    }

    case "CLEANUP_TASKS": {
      const { currentIndex } = action;
      // Filter out tasks from future indices
      const filteredTasks = Object.entries(state.tasks).reduce(
        (acc, [id, task]) => {
          if (task.index <= currentIndex) {
            acc[id] = task;
          }
          return acc;
        },
        {} as TaskMap
      );

      // Filter root task IDs
      const filteredRootTaskIds = state.rootTaskIds.filter(
        (id) => filteredTasks[id]
      );

      return {
        ...state,
        tasks: filteredTasks,
        rootTaskIds: filteredRootTaskIds,
      };
    }

    default:
      return state;
  }
}

// Context definition
interface TaskContextValue {
  // Task management
  registerTask: (name: string, parentId?: TaskId) => TaskId;
  startTask: (id: TaskId) => void;
  completeTask: (id: TaskId) => void;
  failTask: (id: TaskId, error: Error) => void;
  setParent: (id: TaskId, parentId: TaskId) => void;

  // Task queries
  getTask: (id: TaskId) => Task | undefined;
  getChildren: (id: TaskId) => Task[];
  isCompleted: (id: TaskId) => boolean;
  hasFailed: (id: TaskId) => boolean;

  // State access
  tasks: TaskMap;
  rootTaskIds: TaskId[];
}

const TaskContext = createContext<TaskContextValue | null>(null);

// Provider component
interface TaskProviderProps {
  children: React.ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const [state, dispatch] = useReducer(taskReducer, {
    tasks: {},
    rootTaskIds: [],
    completedTaskIds: [],
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  // Memoize childrenArray to prevent unnecessary recalculations
  const childrenArray = useMemo(
    () => Children.toArray(children).filter(isValidElement),
    [children]
  );

  // Use ref to track previous completion state
  const previousCompletionState = useRef<boolean[]>([]);

  const isCurrentChildComplete = useCallback(
    (childIndex: number) => {
      const child = childrenArray[childIndex];
      if (!isValidElement(child)) return true;

      const childTasks = Object.values(state.tasks).filter(
        (task) => task.index === childIndex
      );

      const isComplete =
        childTasks.length > 0 &&
        childTasks.every(
          (task) =>
            state.completedTaskIds.includes(task.id) ||
            task.status === "completed"
        );

      // Update completion state in ref
      previousCompletionState.current[childIndex] = isComplete;
      return isComplete;
    },
    [state.tasks, state.completedTaskIds, childrenArray]
  );

  // Cleanup effect with stable dependencies
  useEffect(() => {
    dispatch({ type: "CLEANUP_TASKS", currentIndex });
  }, [currentIndex]);

  // Progression effect with completion check
  useEffect(() => {
    const currentComplete = isCurrentChildComplete(currentIndex);
    const previousComplete = previousCompletionState.current[currentIndex];

    if (
      currentComplete &&
      previousComplete &&
      currentIndex < childrenArray.length - 1
    ) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, childrenArray.length, isCurrentChildComplete]);

  const registerTask = useCallback(
    (name: string, parentId?: TaskId): TaskId => {
      const id = `${currentIndex}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const task: Task = {
        id,
        name,
        status: "pending",
        childIds: [],
        parentId,
        index: currentIndex,
      };

      dispatch({ type: "REGISTER_TASK", task });
      return id;
    },
    [currentIndex]
  );

  // Memoize handler functions to prevent unnecessary recreations
  const startTask = useCallback((id: TaskId) => {
    dispatch({ type: "START_TASK", id });
  }, []);

  const completeTask = useCallback((id: TaskId) => {
    dispatch({ type: "COMPLETE_TASK", id });
  }, []);

  const failTask = useCallback((id: TaskId, error: Error) => {
    dispatch({ type: "FAIL_TASK", id, error });
  }, []);

  const setParent = useCallback((id: TaskId, parentId: TaskId) => {
    dispatch({ type: "SET_PARENT", id, parentId });
  }, []);

  const getTask = useCallback((id: TaskId) => state.tasks[id], [state.tasks]);

  const getChildren = useCallback(
    (id: TaskId) => {
      const task = state.tasks[id];
      return task
        ? task.childIds.map((childId) => state.tasks[childId]).filter(Boolean)
        : [];
    },
    [state.tasks]
  );

  const isCompleted = useCallback(
    (id: TaskId) => state.tasks[id]?.status === "completed",
    [state.tasks]
  );

  const hasFailed = useCallback(
    (id: TaskId) => state.tasks[id]?.status === "failed",
    [state.tasks]
  );

  // Memoize context value to prevent unnecessary recreations
  const value = useMemo(
    () => ({
      registerTask,
      startTask,
      completeTask,
      failTask,
      setParent,
      getTask,
      getChildren,
      isCompleted,
      hasFailed,
      tasks: state.tasks,
      rootTaskIds: state.rootTaskIds,
    }),
    [
      registerTask,
      startTask,
      completeTask,
      failTask,
      setParent,
      getTask,
      getChildren,
      isCompleted,
      hasFailed,
      state.tasks,
      state.rootTaskIds,
    ]
  );

  return (
    <TaskContext.Provider value={value}>
      {childrenArray[currentIndex]}
    </TaskContext.Provider>
  );
}

// Hook for consuming the context
export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
}

// Utility hook for task management
export function useTask(name: string, parentId?: TaskId) {
  const { registerTask, startTask, completeTask, failTask, getTask } =
    useTaskContext();

  // Use ref to store taskId to avoid recreating it on every render
  const taskIdRef = useRef<TaskId | null>(null);

  // Register task in an effect instead of during render
  useEffect(() => {
    if (!taskIdRef.current) {
      taskIdRef.current = registerTask(name, parentId);
    }
    // Clean up task on unmount if needed
    return () => {
      taskIdRef.current = null;
    };
  }, [name, parentId, registerTask]);

  const execute = useCallback(
    async (fn: () => Promise<unknown>) => {
      if (!taskIdRef.current) {
        throw new Error("Task not initialized");
      }

      try {
        startTask(taskIdRef.current);
        await fn();
        completeTask(taskIdRef.current);
      } catch (error) {
        failTask(
          taskIdRef.current,
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    },
    [startTask, completeTask, failTask]
  );

  // Get current task state using the ref
  const task = taskIdRef.current ? getTask(taskIdRef.current) : undefined;

  return {
    taskId: taskIdRef.current ?? "",
    status: task?.status,
    error: task?.error,
    execute,
  };
}
