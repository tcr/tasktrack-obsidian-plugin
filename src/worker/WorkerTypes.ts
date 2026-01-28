/**
 * Types for communication between main thread and worker
 */

// RPC Request types
export type RPCRequest =
  | { type: "health-check"; id: number; appId: string }
  | {
      type: "parse-markdown";
      id: number;
      path: string;
      content: string | null;
      timestamp: string;
    };

// RPC Response types
export type RPCResponse =
  | { type: "health-check"; id: number; result: boolean }
  | {
      type: "parse-markdown";
      id: number;
      success: boolean;
      processedCount?: number;
    }
  | { type: "error"; id: number; error: string };
