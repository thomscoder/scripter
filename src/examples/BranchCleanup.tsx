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
      <Shell command="git branch --merged" >
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
