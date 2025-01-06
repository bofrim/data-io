import os from "os";
import * as http from "http";
import WebSocket from "ws";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

class DynamicProxy {
  private verbose: boolean;
  private producers: Set<WebSocket> = new Set(); // Track active producers
  private consumers: Set<WebSocket> = new Set(); // Track active consumers

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  async start(port: number, localOnly: boolean) {
    const server = http.createServer();
    const wss = new WebSocket.Server({ noServer: true });

    // Handle HTTP upgrade requests to WebSocket connections
    server.on("upgrade", (req, socket, head) => {
      if (localOnly && req.socket.remoteAddress !== "127.0.0.1") {
        this.log("Rejected non-local connection");
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) =>
        wss.emit("connection", ws, req)
      );
    });

    // Handle WebSocket connections
    wss.on("connection", (ws, req) => this.handleConnection(ws, req.url));

    // Start HTTP server
    server.listen(port, localOnly ? "127.0.0.1" : "0.0.0.0", () => {
      const host = localOnly
        ? "127.0.0.1"
        : this.getLocalIPAddress() || "localhost";

      this.log(
        `WebSocket Proxy started: \n- Producers: ws://${host}:${port}/producer\n- Consumers: ws://${host}:${port}/consumer`
      );
    });

    server.on("error", (err) => {
      this.logError(`Server error: ${err.message}`);
    });
  }

  private getLocalIPAddress(): string | null {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return null;
  }

  private handleConnection(ws: WebSocket, path: string | undefined) {
    if (path === "/producer") {
      // Add to producers
      this.producers.add(ws);
      this.log("Producer connected");

      ws.on("message", (message) => this.forwardToConsumers(message));
      ws.on("close", () => this.cleanupProducer(ws));
      ws.on("error", (err) => this.logError(`Producer error: ${err.message}`));
    } else if (path === "/consumer") {
      // Add to consumers
      this.consumers.add(ws);
      this.log("Consumer connected");

      ws.on("close", () => this.cleanupConsumer(ws));
      ws.on("error", (err) => this.logError(`Consumer error: ${err.message}`));
    } else {
      // Invalid path
      this.log("Invalid connection path");
      ws.close(4000, "Invalid path");
    }
  }

  private forwardToConsumers(message: WebSocket.Data) {
    this.log(`Forwarding message to consumers: ${message}`);
    this.consumers.forEach((consumer) => {
      if (consumer.readyState === WebSocket.OPEN) {
        consumer.send(message);
      }
    });
  }

  private cleanupProducer(ws: WebSocket) {
    this.producers.delete(ws);
    this.log("Producer disconnected");
  }

  private cleanupConsumer(ws: WebSocket) {
    this.consumers.delete(ws);
    this.log("Consumer disconnected");
  }

  private log(message: string) {
    if (this.verbose) {
      console.log(message);
    }
  }

  private logError(message: string) {
    console.error(message);
  }
}

// Parse command-line arguments
const args = yargs(hideBin(process.argv))
  .option("port", {
    alias: "p",
    type: "number",
    demandOption: true,
    description: "Port to listen on",
  })
  .option("local", {
    type: "boolean",
    default: false,
    description: "Restrict to local connections only",
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    default: false,
    description: "Enable verbose output",
  })
  .parseSync();

const proxy = new DynamicProxy(args.verbose as boolean);

(async () => {
  try {
    await proxy.start(args.port as number, args.local as boolean);
  } catch (err) {
    console.error("Error starting proxy:", err);
  }
})();
