function getTimestamp(): string {
  const now = new Date();
  return `[${now.toISOString()}]`;
}

export const normalLogger = (...args: any[]) => {
  return console.log(getTimestamp(), ...args);
};
