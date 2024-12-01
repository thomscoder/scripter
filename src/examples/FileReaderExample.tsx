import { render } from "../../Renderer";
import { TaskProvider } from "../../ScriptBuilder";
import { FileError, FileReader, FileReading, FileSuccess } from "../FileReader";
import { Log, LogGroup } from "../Log";
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
            <Log content="Failed to read file" />
          </FileError>

          <FileSuccess>{(content) => <Log content={content} />}</FileSuccess>
        </FileReader>
      </LogGroup>

      <LogGroup label="file reader with transformation">
        <FileReader
          path="./data.json"
          format="json"
          transform={(data: any) => {
            // your transform function here
            normalLogger(data);
            return data;
          }}
        >
          {(transformedData) => <Log content={transformedData} format="json" />}
        </FileReader>
      </LogGroup>

      <LogGroup label="file reader with logging and callbacks">
        <FileReader
          path="./large-file.txt"
          logContent
          onSuccess={async (content) => {
            normalLogger("File read successfully");
          }}
          onError={async (error) => {
            console.error("File read failed:", error);
          }}
        >
          <FileSuccess>
            {(content) => (
              <Transform
                input={content}
                transform={(data) => {
                  normalLogger(data);
                  return data;
                }}
              >
                {(upperContent) => <Log content={upperContent} />}
              </Transform>
            )}
          </FileSuccess>
        </FileReader>
      </LogGroup>
    </TaskProvider>
  );
};

render(<FileReaderExample />);
