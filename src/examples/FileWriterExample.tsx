import { TaskProvider } from "../../ScriptBuilder";
import { LogGroup } from "../Log";

import { render } from "../../Renderer";
import { FileWriteSuccess, FileWriter } from "../FileWriter";
import { LogSuccess } from "../Log";

const FileWriterExample = () => {
  return (
    <TaskProvider>
      <LogGroup label="File Writer Usage">
        <FileWriter
          path="./newDir/newNestedDir/data.json"
          content={{ items: [1, 2, 3] }}
          format="json"
          createDirectory
          transform={(data) => JSON.stringify(JSON.parse(data), null, 4)}
        >
          <FileWriteSuccess>
            {(path) => <LogSuccess content={`JSON written to ${path}`} />}
          </FileWriteSuccess>
        </FileWriter>
      </LogGroup>
    </TaskProvider>
  );
};

render(<FileWriterExample />);
