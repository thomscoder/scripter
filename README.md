# Scripter

Run your scripts programmatically with React.

Just me experimenting with custom renderers.

Scripter is a custom React renderer that allows you to build scripts declaratively using React components. It provides a powerful way to handle network requests, file operations, script execution, and more in a composable manner.

## Installation

```bash
npm install scripter
# or
yarn add scripter
# or
pnpm add scripter
```

## Local installation

```bash
pnpm build && pnpm pack
```

Scripter comes with a set of Components that I developed for my use cases, but can be expanded by developing your own components for your own use cases (in the `./src/tutorial` folder a nice guide to build your following the architecture), and of course contributions are more than welcomed.

## Example: Git Branch Cleanup

Here's a practical example that helps you clean up old Git branches by checking if they've been merged and when they were last updated:

```tsx
import { useEffect, useState } from "react";
import { render } from "../../Renderer";
import { TaskProvider } from "../../ScriptBuilder";
import { Log, LogGroup } from "../Log";
import { Prompt, PromptSuccess } from "../Prompt";
import { Shell, ShellSuccess } from "../Shell";
import { Transform } from "../Transform";
import { normalLogger } from "../utils/logger";

const BranchCleanup = () => {
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    if (branches.length > 0) normalLogger(branches);
  }, [branches]);

  return (
    <TaskProvider>
      {/* Get all merged branches */}
      <Shell command="git branch --merged">
        <ShellSuccess>
          {(output) => {
            return (
              <Transform
                input={output}
                onSuccess={(o: string[]) => setBranches(o)}
                transform={(data) =>
                  data
                    .split("\n")
                    .map((b) => b.trim())
                    .filter(
                      (b: string) =>
                        b &&
                        !b.startsWith("*") &&
                        b !== "main" &&
                        b !== "master"
                    )
                }
              />
            );
          }}
        </ShellSuccess>
      </Shell>

      {/** Use the branches */}
      <LogGroup label="Do something with those branches">
        <>
          <Log content={`Found ${branches.length} merged branches`} />

          {branches.length > 0 && (
            <Prompt message="Do you want to delete these branches? (yes/no)">
              <PromptSuccess>
                {(answer) =>
                  answer.toLowerCase() === "yes" && (
                    <Shell command={`git branch -d ${branches.join(" ")}`}>
                      <ShellSuccess>
                        {() => (
                          <Log
                            content={`Cleaned up ${branches.length} branches`}
                          />
                        )}
                      </ShellSuccess>
                    </Shell>
                  )
                }
              </PromptSuccess>
            </Prompt>
          )}
        </>
      </LogGroup>
    </TaskProvider>
  );
};

render(<BranchCleanup />);
```

## Custom Hooks

Each component may or may not come with its own custom hooks (depends on the implementation).

### useFetchState

Access fetch operation state:

```tsx
const MyComponent = () => {
  const { isLoading, error, data } = useFetchState();
  // Access fetch state in your component
};
```

### useShellState

Monitor shell command execution:

```tsx
const ShellStatus = () => {
  const { output, isRunning, error } = useShellState();
  return isRunning ? <Log content="Running..." /> : <Log content={output} />;
};
```

### useTransformedData

Access transformed data:

```tsx
const DataTransformer = () => {
  const transformedData = useTransformedData();
  return <Log content={transformedData} />;
};
```

### usePromptState

Monitor prompt state:

```tsx
const PromptStatus = () => {
  const { input, isWaiting } = usePromptState();
  return isWaiting ? (
    <Log content="Waiting for input..." />
  ) : (
    <Log content={`Received: ${input}`} />
  );
};
```

Please report any bug. Still fighting with infinite rendering ;)