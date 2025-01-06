from websocket import create_connection
from data_io.abstract_channel import AbstractChannelPublisher


class WebSocketChannelPublisher(AbstractChannelPublisher):
    """Simple class to publish messages to data channels via WebSocket."""

    def __init__(
        self, source_name: str, interface_file: str, ws_url="ws://localhost:8080"
    ):
        """
        Parse the interface file and initialize WebSocket connection.
        """
        super().__init__(source_name, interface_file)
        self.ws_url = f"{ws_url}/producer"
        self.ws = None

        try:
            self.ws = create_connection(self.ws_url)
            print(f"Connected to WebSocket server at {self.ws_url}")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to WebSocket server: {e}") from e

    def publish(self, channel_name, value):
        """
        Publish a value to a WebSocket channel.
        """
        if channel_name not in self.channels:
            raise ValueError(
                f"Channel '{channel_name}' is not defined in the interface file."
            )

        try:
            self.ws.send(self.format(channel_name, value))
            print(f"Published: [{channel_name}] {value}")
        except Exception as e:
            raise RuntimeError(f"Failed to publish message: {e}") from e

    def close(self):
        """
        Close the WebSocket connection.
        """
        if self.ws:
            try:
                self.ws.close()
                print("WebSocket connection closed.")
            except Exception as e:
                raise RuntimeError(f"Failed to close WebSocket connection: {e}") from e
