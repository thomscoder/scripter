import React, { createContext, useCallback, useContext } from "react";

import chalk from "chalk";
import { useTask } from "../ScriptBuilder";

type LogLevel = "info" | "success" | "warning" | "error" | "debug" | "trace";
type LogFormat = "default" | "json" | "table";

interface LogOptions {
  level?: LogLevel;
  format?: LogFormat;
  timestamp?: boolean;
  prefix?: string;
  indent?: number;
  muted?: boolean;
}

interface LogState {
  messages: LogMessage[];
  groupLevel: number;
}

interface LogMessage {
  id: string;
  content: any;
  level: LogLevel;
  timestamp: Date;
  format: LogFormat;
  prefix?: string;
  indent: number;
}

const LogContext = createContext<LogState>({
  messages: [],
  groupLevel: 0,
});

const levelStyles: Record<LogLevel, (text: string) => string> = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.gray,
  trace: chalk.magenta,
};

const levelPrefixes: Record<LogLevel, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✖",
  debug: "⚙",
  trace: "→",
};

interface LogProps extends LogOptions {
  children?: React.ReactNode;
  content?: any;
}

export function Log({
  children,
  content,
  level = "info",
  format = "default",
  timestamp = true,
  prefix,
  indent: explicitIndent,
  muted = false,
}: LogProps) {
  const parentContext = useContext(LogContext);
  const { taskId, execute } = useTask(
    `Log: ${String(content).slice(0, 20)}...`
  );
  const indent = explicitIndent ?? parentContext.groupLevel;

  // Format content based on type and format option
  const formatContent = useCallback(
    (content: any): string => {
      if (format === "json") {
        return JSON.stringify(content, null, 2);
      }

      if (format === "table" && typeof content === "object") {
        if (Array.isArray(content)) {
          return formatTable(content);
        }
        return formatTable([content]);
      }

      return String(content);
    },
    [format]
  );

  // Format as table
  const formatTable = (data: any[]): string => {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const rows = data.map((item) =>
      headers.map((header) => String(item[header] ?? ""))
    );

    const columnWidths = headers.map((header, i) => {
      const columnValues = [header, ...rows.map((row) => row[i])];
      return Math.max(...columnValues.map((val) => val.length));
    });

    const separator = columnWidths
      .map((width) => "-".repeat(width))
      .join("-+-");

    const formatRow = (values: string[]) =>
      values.map((val, i) => val.padEnd(columnWidths[i])).join(" | ");

    return [
      formatRow(headers),
      separator,
      ...rows.map((row) => formatRow(row)),
    ].join("\n");
  };

  const createLogMessage = useCallback(
    (content: any): LogMessage => ({
      id: Math.random().toString(36).slice(2),
      content,
      level,
      timestamp: new Date(),
      format,
      prefix,
      indent,
    }),
    [level, format, prefix, indent]
  );

  // Handle the actual logging
  const performLog = useCallback(async () => {
    if (!content && !children) return;

    const formattedContent = content ? formatContent(content) : "";
    const message = createLogMessage(formattedContent);

    // Apply styling
    const style = levelStyles[level];
    const prefix = levelPrefixes[level];

    let output = "";

    // Build the log line
    if (timestamp) {
      output += chalk.gray(`[${message.timestamp.toISOString()}] `);
    }

    if (prefix) {
      output += `${prefix} `;
    }

    // Add indentation
    output = "  ".repeat(indent) + output;

    // Apply level-specific styling
    if (!muted) {
      output += style(`${message.content}`);
    } else {
      output += chalk.gray(message.content);
    }


    console.log(output);
  }, [
    content,
    children,
    formatContent,
    createLogMessage,
    indent,
    level,
    muted,
    timestamp,
  ]);

  React.useEffect(() => {
    execute(performLog as any);
  }, [execute, performLog]);

  const contextValue: LogState = {
    messages: [],
    groupLevel: parentContext.groupLevel + (children ? 1 : 0),
  };

  return children ? (
    <LogContext.Provider value={contextValue}>{children}</LogContext.Provider>
  ) : null;
}

interface LogGroupProps {
  children: React.ReactNode;
  label?: string;
  collapsed?: boolean;
}

export function LogGroup({
  children,
  label,
  collapsed = false,
}: LogGroupProps) {
  const parentContext = useContext(LogContext);

  return (
    <LogContext.Provider
      value={{
        messages: [],
        groupLevel: parentContext.groupLevel + 1,
      }}
    >
      {label && (
        <Log
          content={collapsed ? `▶ ${label}` : `▼ ${label}`}
          indent={parentContext.groupLevel}
          muted
        />
      )}
      {!collapsed && children}
    </LogContext.Provider>
  );
}

interface LogHelperProps {
  children?: React.ReactNode;
  content?: any;
}

export const LogSuccess = (props: LogHelperProps) => (
  <Log {...props} level="success" />
);
export const LogWarning = (props: LogHelperProps) => (
  <Log {...props} level="warning" />
);
export const LogError = (props: LogHelperProps) => (
  <Log {...props} level="error" />
);
export const LogDebug = (props: LogHelperProps) => (
  <Log {...props} level="debug" />
);
export const LogTrace = (props: LogHelperProps) => (
  <Log {...props} level="trace" />
);