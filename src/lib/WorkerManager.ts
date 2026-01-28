import { RPCRequest, RPCResponse } from "../worker/WorkerTypes";

import Worker from "../worker/Worker.worker?worker&inline";
import { Except } from "type-fest";

// map from method literal to request shape (without "type")
type RPCRequestMap = {
  [R in RPCRequest as R["type"]]: Except<R, "type">;
};

export class WorkerManager {
  private worker: Worker;
  private nextId: number = 0;
  private pendingRequests: Map<number, (response: RPCResponse) => void> =
    new Map();

  constructor() {
    this.worker = new Worker();

    this.worker.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data as RPCResponse);
    };
  }

  private handleMessage(message: RPCResponse): void {
    // Logger.debug(`Main thread received message: ${JSON.stringify(message)}`);

    // Handle RPC responses
    const callback = this.pendingRequests.get(message.id);
    if (callback) {
      this.pendingRequests.delete(message.id);

      callback(message);
      return;
    }
  }

  private nextRequestId(): number {
    return this.nextId++;
  }

  messageWorker(message: RPCRequest): void {
    this.worker.postMessage(message);
  }

  /**
   * Perform RPC call to worker
   * @param method RPC method name
   * @param params Parameterscallback Callback to invoke when response is received
   * @param params Parameters for the RPC call
   */
  RPC<T extends keyof RPCRequestMap>(
    method: T,
    params: RPCRequestMap[T],
    supplemental?: string,
  ): Promise<Partial<RPCResponse> & { type: T }> {
    return new Promise((resolve, reject) => {
      const id = this.nextRequestId();
      this.pendingRequests.set(id, resolve as (_: RPCResponse) => void);

      // Create appropriate message based on method
      switch (method) {
        case "health-check": {
          const p = params as RPCRequestMap["health-check"];
          this.messageWorker({
            type: "health-check",
            id,
            appId: p.appId,
          });
          break;
        }

        case "parse-markdown": {
          const p = params as RPCRequestMap["parse-markdown"];
          this.messageWorker({
            type: "parse-markdown",
            id,
            path: p.path,
            content: p.content,
            timestamp: p.timestamp,
          });
          break;
        }

        default:
          this.pendingRequests.delete(id);
          reject(new Error(`Unknown RPC method: ${method}`));
      }

      // Send supplemental message, if any
      if (supplemental) {
        this.worker.postMessage(supplemental);
      }
    });
  }
}
