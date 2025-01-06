import argparse
import asyncio
import random

from data_io.websocket_channel import WebSocketChannelPublisher

BW_IMAGE_PERIOD_SEC = 0.0001  # Period to publish black/white images in seconds


async def bw_image_publisher(publisher: WebSocketChannelPublisher, channel="bw_image"):
    """
    Task that publishes a 128x128 matrix of black/white pixels.
    Each pixel is randomly 0 (black) or 255 (white).
    """
    while True:
        # Generate a random 128×128 matrix
        image_matrix = [
            [random.choice([0, 255]) for _ in range(256)] for _ in range(256)
        ]
        # Publish the matrix
        publisher.publish(channel, image_matrix)
        await asyncio.sleep(BW_IMAGE_PERIOD_SEC)


async def main(path: str):
    """
    Initialize the publisher and run the black/white image publishing task.
    """
    publisher = WebSocketChannelPublisher(
        source_name="bw_image_script", interface_file=path
    )
    print(f"Publisher initialized with channels: {publisher.channels.keys()}")

    # Only run the black-and-white image publisher in this script
    await bw_image_publisher(publisher)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=str)
    args = parser.parse_args()

    try:
        asyncio.run(main(args.path))
    except KeyboardInterrupt:
        print("Shutting down tasks.")
