import ReactReconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";

interface TerminalNode {
  id: string;
  type: string;
  props: any;
  children: TerminalNode[];
  parent: TerminalNode | null;
  lineIndex: number;
  indent: number;
}

const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  createInstance(
    type: string,
    props: any,
    rootContainerInstance: any,
    hostContext: any,
    internalInstanceHandle: any
  ): TerminalNode {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      props,
      children: [],
      parent: null,
      lineIndex: 0,
      indent: 0,
    };
  },

  createTextInstance(
    text: string,
    rootContainerInstance: any,
    hostContext: any,
    internalInstanceHandle: any
  ): TerminalNode {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type: "TEXT",
      props: { text },
      children: [],
      parent: null,
      lineIndex: 0,
      indent: 0,
    };
  },

  appendInitialChild(parentInstance: TerminalNode, child: TerminalNode): void {
    child.parent = parentInstance;
    child.indent = parentInstance.indent + 1;
    parentInstance.children.push(child);
  },

  appendChild(parentInstance: TerminalNode, child: TerminalNode): void {
    child.parent = parentInstance;
    child.indent = parentInstance.indent + 1;
    parentInstance.children.push(child);
  },

  removeChild(parentInstance: TerminalNode, child: TerminalNode): void {
    const index = parentInstance.children.indexOf(child);
    if (index !== -1) {
      parentInstance.children.splice(index, 1);
    }
  },

  removeChildFromContainer(container: any, child: TerminalNode): void {
    const index = container.children.indexOf(child);
    if (index !== -1) {
      container.children.splice(index, 1);
    }
  },

  insertBefore(
    parentInstance: TerminalNode,
    child: TerminalNode,
    beforeChild: TerminalNode
  ): void {
    const index = parentInstance.children.indexOf(beforeChild);
    if (index !== -1) {
      child.parent = parentInstance;
      child.indent = parentInstance.indent + 1;
      parentInstance.children.splice(index, 0, child);
    }
  },

  finalizeInitialChildren(): boolean {
    return false;
  },

  prepareUpdate(): null {
    return null;
  },

  shouldSetTextContent(): boolean {
    return false;
  },

  getRootHostContext(): null {
    return null;
  },

  getChildHostContext(parentHostContext: null): null {
    return null;
  },

  getPublicInstance(instance: any): any {
    return instance;
  },

  prepareForCommit(): null {
    return null;
  },

  resetAfterCommit(containerInfo: any): void {
    // This is where we actually render to the terminal
    renderTerminalTree(containerInfo);
  },

  commitUpdate(
    instance: TerminalNode,
    updatePayload: null,
    type: string,
    oldProps: any,
    newProps: any
  ): void {
    instance.props = newProps;
  },

  commitTextUpdate(
    textInstance: TerminalNode,
    oldText: string,
    newText: string
  ): void {
    textInstance.props.text = newText;
  },

  clearContainer(): void {
    // console.clear();
  },

  isPrimaryRenderer: true,
  getCurrentEventPriority: () => DefaultEventPriority,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  warnsIfNotActing: true,
  appendChildToContainer(container: any, child: TerminalNode): void {
    container.children.push(child);
  },
};

// @ts-ignore
const TerminalReconciler = ReactReconciler(hostConfig);

// Helper function to render the terminal tree
function renderTerminalTree(container: { children: TerminalNode[] }): void {
  const output = renderNode(container);
}

// Recursive function to render a node and its children
function renderNode(node: TerminalNode | { children: TerminalNode[] }): string {
  let output = "";

  if ("type" in node && node.type === "TEXT") {
    output += "  ".repeat(node.indent) + node.props.text + "\n";
  }

  for (const child of node.children) {
    output += renderNode(child);
  }

  return output;
}

const createContainer = () => ({
  children: [],
  nodeName: "terminal-container",
});

export function render(element: React.ReactNode, callback?: () => void): void {
  const container = createContainer();
  const root = TerminalReconciler.createContainer(
    container,
    0,
    null,
    false,
    null,
    "",
    () => {},
    null
  );

  TerminalReconciler.updateContainer(element, root, null, callback);
}
