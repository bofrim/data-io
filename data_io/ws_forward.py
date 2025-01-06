import argparse
import asyncio
import websockets
from websockets.exceptions import ConnectionClosed


class MultiPortProxy:
    def __init__(self, ws_host, ws_port, listen_ports, verbose=False, retry_interval=1):
        """
        Initialize the proxy with WebSocket host, port, and ports to listen on.
        """
        self.ws_url = f"ws://{ws_host}:{ws_port}"
        self.ports = listen_ports
        self.web_socket = None
        self.verbose = verbose
        self.retry_interval = retry_interval
        self.reconnecting = False

    async def start(self):
        """
        Start the proxy server and retry WebSocket connection periodically.
        """
        # Start listeners for each port
        listener_tasks = [self.listen_on_port(port) for port in self.ports]

        # Retry WebSocket connection periodically
        retry_task = asyncio.create_task(self.retry_connection())

        await asyncio.gather(*listener_tasks, retry_task)

    async def retry_connection(self):
        """
        Periodically attempt to connect to the WebSocket server if disconnected.
        """
        while True:
            if self.web_socket is None or self.web_socket.closed:
                if not self.reconnecting:
                    self.reconnecting = True
                    if self.verbose:
                        print("WebSocket disconnected. Attempting to reconnect...")
                try:
                    self.web_socket = await websockets.connect(self.ws_url)
                    self.reconnecting = False
                    if self.verbose:
                        print(f"Reconnected to WebSocket server at {self.ws_url}")
                except Exception:
                    await asyncio.sleep(self.retry_interval)
            else:
                await asyncio.sleep(self.retry_interval)

    async def listen_on_port(self, port):
        """
        Listen for incoming TCP connections on a specific port.
        """
        server = await asyncio.start_server(
            lambda r, w: self.handle_connection(r, w, port), "0.0.0.0", port
        )
        print(f"Listening on port {port}")
        async with server:
            await server.serve_forever()

    async def handle_connection(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter, port: int
    ):
        """
        Handle a single client connection, proxying data to the WebSocket.
        """
        peer_name = writer.get_extra_info("peername")
        if self.verbose:
            print(f"[Port {port}] New connection from {peer_name}")

        try:
            while True:
                print("listen again...")
                data = await reader.readline()
                print("data: ", data)
                if not data:
                    if self.verbose:
                        print(f"[Port {port}] Connection from {peer_name} closed")
                    break  # Connection closed
                message = data.decode().strip()

                if self.verbose:
                    print(f"[Port {port}] Received: {message} from {peer_name}")

                # Forward data to the WebSocket
                if self.web_socket and not self.web_socket.closed:
                    try:
                        await self.web_socket.send(message)
                        if self.verbose:
                            print(f"[Port {port}] Forwarded to WebSocket: {message}")
                    except ConnectionClosed:
                        if self.verbose:
                            print(
                                f"[Port {port}] WebSocket disconnected. Message not sent."
                            )
                elif self.verbose:
                    print(f"[Port {port}] WebSocket unavailable. Message not sent.")
        except Exception as e:
            print(f"[Port {port}] Error handling connection from {peer_name}: {e}")
        finally:
            if self.verbose:
                print(f"[Port {port}] Connection from {peer_name} closed")
            writer.close()
            await writer.wait_closed()

    async def close(self):
        """
        Close the WebSocket connection.
        """
        if self.web_socket:
            await self.web_socket.close()
            print("WebSocket connection closed.")


if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Multi-port proxy to WebSocket")
    parser.add_argument(
        "--host", default="localhost", help="WebSocket server host (default: localhost)"
    )
    parser.add_argument(
        "-o", "--output-port", required=True, type=int, help="WebSocket server port"
    )
    parser.add_argument(
        "-p", "--ports", required=True, nargs="+", type=int, help="Ports to listen on"
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Enable verbose output"
    )
    args = parser.parse_args()

    # Initialize and start the proxy
    proxy = MultiPortProxy(
        ws_host=args.host,
        ws_port=args.output_port,
        listen_ports=args.ports,
        verbose=args.verbose,
    )

    try:
        asyncio.run(proxy.start())
    except KeyboardInterrupt:
        print("Shutting down...")
        asyncio.run(proxy.close())
