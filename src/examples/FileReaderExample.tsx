import { render } from "../../Renderer";
import { TaskProvider } from "../../ScriptBuilder";
import { FileError, FileReader, FileReading, FileSuccess } from "../FileReader";
import { Log, LogError, LogGroup, LogSuccess } from "../Log";
import { Transform } from "../Transform";
import { normalLogger } from "../utils/logger";

const FileReaderExample = () => {
  return (
    <TaskProvider>
      <LogGroup label="file reader simple">
        <FileReader path="./config.txt">
          <FileReading>
            <Log content="Reading file..." />
          </FileReading>

          <FileError>
            {(err: Error) => {
              return <LogError content={err.message} />;
            }}
          </FileError>

          <FileSuccess>{(content) => <Log content={content} />}</FileSuccess>
        </FileReader>
      </LogGroup>

      <LogGroup label="file reader with transformation">
        <FileReader path="./src/examples/BranchCleanup.tsx">
          <FileError>
            {(err: Error) => {
              return <LogError content={err.message} />;
            }}
          </FileError>
          <FileSuccess>
            {(f) => {
              return (
                <Transform
                  input={f}
                  transform={async (data: string) => {
                    if (data.length <= 100) {
                      return data;
                    }
                    const truncated = data.slice(0, 100);
                    return truncated + "...";
                  }}
                  onSuccess={async (cont) => {}}
                >
                  {(t) => <Log content={t} format="json" />}
                </Transform>
              );
            }}
          </FileSuccess>
        </FileReader>
      </LogGroup>

      <LogGroup label="file reader with logging and callbacks">
        <FileReader
          path="./tsconfig.json"
          format="json"
          logContent
          onSuccess={async (content) => {
            // normalLogger("File read successfully");
          }}
          onError={async (error) => {
            // console.error("File read failed:", error);
          }}
        >
          <FileSuccess>
            {(content) => (
              <Transform
                input={content}
                transform={(data) => {
                  normalLogger(data)
                  return data;
                }}
              >
                {(upperContent) => <LogSuccess content="File read successfully" />}
              </Transform>
            )}
          </FileSuccess>
        </FileReader>
      </LogGroup>
    </TaskProvider>
  );
};

render(<FileReaderExample />);
