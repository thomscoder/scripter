import { render } from "../../Renderer";
import { TaskProvider } from "../../ScriptBuilder";
import { FileWriter, FileWriteSuccess } from "../FileWriter";
import { Log, LogDebug } from "../Log";
import {
  Npm,
  NpmRunError,
  NpmRunLoading,
  NpmRunStream,
  NpmRunSuccess,
} from "../Npm";

/**
 * Run NPM scripts and write logs on file
 */

const NpmExample = () => {
  return (
    <TaskProvider>
      <Npm
        packageManager="pnpm"
        script="test"
        onSuccess={(o) => void 0}
        onError={(e) => void 0}
        // Optional options
        // flags={["--watch", "--verbose"]}
        // options={{
        //   cwd: process.cwd(),
        // }}
      >
        <NpmRunLoading>
          <Log content="Running script..." />
        </NpmRunLoading>

        <NpmRunStream>
          {({ stdout, stderr }) => (
            <>
              {stdout.length > 0 && (
                <FileWriter
                  path="./npm-output.log"
                  content={stdout.join("")}
                  createDirectory
                >
                  <FileWriteSuccess>
                    {(path) => <LogDebug content={`Wrote stdout to ${path}`} />}
                  </FileWriteSuccess>
                </FileWriter>
              )}

              {stderr.length > 0 && (
                <FileWriter
                  path="./npm-error.log"
                  content={stderr.join("")}
                  createDirectory
                >
                  <FileWriteSuccess>
                    {(path) => <LogDebug content={`Wrote stderr to ${path}`} />}
                  </FileWriteSuccess>
                </FileWriter>
              )}
            </>
          )}
        </NpmRunStream>

        <NpmRunError>
          <Log content="Script failed" />
        </NpmRunError>

        <NpmRunSuccess>
          {(output) => <Log content={`Script completed: ${output}`} />}
        </NpmRunSuccess>
      </Npm>
    </TaskProvider>
  );
};

render(<NpmExample />);
