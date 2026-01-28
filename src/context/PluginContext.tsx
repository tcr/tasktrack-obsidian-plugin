import TaskTrackPlugin from "@/main";
import { createContext, ComponentChildren, h } from "preact";
import { useContext } from "preact/hooks";

interface PluginContextData {
  plugin: TaskTrackPlugin;
}

const PluginContext = createContext<PluginContextData | undefined>(undefined);

export function PluginProvider({
  plugin,
  children,
}: {
  plugin: TaskTrackPlugin;
  children: ComponentChildren;
}) {
  return (
    <PluginContext.Provider value={{ plugin }}>
      {children}
    </PluginContext.Provider>
  );
}

export function usePlugin(): TaskTrackPlugin {
  const context = useContext(PluginContext);
  if (context === undefined) {
    throw new Error("usePlugin must be used within a PluginProvider");
  }
  return context.plugin;
}
