import { render } from "../../Renderer";
import { TaskProvider } from "../../ScriptBuilder";
import { Log, LogError, LogGroup } from "../Log";
import { Shell, ShellError, ShellLoading, ShellSuccess } from "../Shell";

const ShellExample = () => {
  return (
    <TaskProvider>
      <LogGroup label="Shell Usage">
        <Shell command="ls -la" cwd="." env={{ NODE_ENV: "development" }}>
          <ShellLoading>
            <Log content="Listing directory contents..." />
          </ShellLoading>

          <ShellError>
            {(error, stderr) => (
              <LogError
                content={`Command failed: ${error.message}\nStderr: ${stderr}`}
              />
            )}
          </ShellError>

          <ShellSuccess>{(output) => <Log content={output} />}</ShellSuccess>
        </Shell>
      </LogGroup>
    </TaskProvider>
  );
};

render(<ShellExample />);
