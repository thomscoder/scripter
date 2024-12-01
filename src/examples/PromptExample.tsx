import { render } from "../../Renderer";
import { TaskProvider } from "../../ScriptBuilder";
import { Log, LogError, LogGroup, LogSuccess } from "../Log";
import { Prompt, PromptError, PromptLoading, PromptSuccess } from "../Prompt";

const PromptExample = () => {
  return (
    <TaskProvider>
      <LogGroup label="Prompt Usage">
        <Prompt
          message="What's your name?"
          defaultValue="..."
          validate={(value) =>
            value.length >= 2 || "Name must be at least 2 characters"
          }
          onSubmit={async (value) => {
            // console.log(value)
          }}
          onCancel={async () => {
            console.log("User cancelled the prompt");
          }}
        >
          <PromptLoading>
            <Log content="Waiting for user input..." />
          </PromptLoading>

          <PromptError>
            {(error) => <LogError content={error.message} />}
          </PromptError>

          <PromptSuccess>
            {(value) => <LogSuccess content={`Hello, ${value}!`} />}
          </PromptSuccess>
        </Prompt>
      </LogGroup>
    </TaskProvider>
  );
};

render(<PromptExample />);
