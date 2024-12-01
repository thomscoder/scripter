import { render } from "../../Renderer";
import { TaskProvider } from "../../ScriptBuilder";
import { Log, LogGroup } from "../Log";
import { Npm, NpmRunSuccess } from "../Npm";
import { Watch, WatchSuccess } from "../Watch";

const TsWatcher = () => (
  <TaskProvider>
    <LogGroup label="TypeScript Build">
      <Watch path="./src">
        <WatchSuccess>
          {(filePath) => {
            return (
              <>
                <Log content={`Changed: ${filePath}`} />
                <Npm script="build">
                  <NpmRunSuccess>
                    {() => <Log content="✨ Build successful" />}
                  </NpmRunSuccess>
                </Npm>
              </>
            );
          }}
        </WatchSuccess>
      </Watch>
    </LogGroup>
  </TaskProvider>
);

render(<TsWatcher />);
