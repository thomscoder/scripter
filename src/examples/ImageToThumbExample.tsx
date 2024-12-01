import path, { basename, join } from "path";
import { useState } from "react";
import { render } from "../../Renderer";
import { TaskProvider } from "../../ScriptBuilder";
import { Log, LogError, LogGroup, LogSuccess } from "../Log";
import { Process, ProcessError, ProcessLoading } from "../Process";
import { Watch, WatchError, WatchMessage, WatchSuccess } from "../Watch";
import { normalLogger } from "../utils/logger";

/**
 * Creates a thumb image from a normal image using imagemagick
 * `brew install imagemagick`
 * pnpm exec ts-node ImageToThumb.tsx
 *
 * watches
 */

const ImageToThumb: React.FC = () => {
  const [watchComplete, setWatchComplete] = useState(false);

  if (watchComplete) {
    return (
      <TaskProvider>
        <LogGroup label="next-task">
          <Log content="✨ Watch mode completed. Moving to next task..." />
        </LogGroup>
      </TaskProvider>
    );
  }

  return (
    <TaskProvider>
      <LogGroup label="watch">
        <Watch
          path="./uploads"
          onClose={() => setWatchComplete(true)}
          outputPath="./thumbs"
        >
          <WatchMessage>
            <Log content="🔍 Insert images in the uploads directory to process them..." />
          </WatchMessage>

          <WatchError>
            <Log content="❌ Failed to watch directory" />
          </WatchError>

          <WatchSuccess>
            {(filepath, outputPath) => (
              <>
                <LogSuccess
                  content={`Image ${filepath} successfully uploaded`}
                />

                <Process
                  command="magick"
                  args={[
                    filepath,
                    "-resize",
                    "150x150",
                    join(outputPath, filepath.split("/").pop() || ""),
                  ]}
                  onSuccess={(output) => {
                    normalLogger(
                      `✅ Successfully processed ${filepath} to ${path.join(
                        outputPath,
                        basename(filepath)
                      )}`
                    );
                    setWatchComplete(true);
                  }}
                  onError={(error) =>
                    console.error(`❌ Process failed: ${error.message}`)
                  }
                >
                  <ProcessLoading>
                    <Log content={`🔄 Converting ${filepath}...`} />
                  </ProcessLoading>

                  <ProcessError>
                    <LogError content={`❌ Failed to convert ${filepath}`} />
                  </ProcessError>
                </Process>
              </>
            )}
          </WatchSuccess>
        </Watch>
      </LogGroup>
    </TaskProvider>
  );
};

render(<ImageToThumb />);
