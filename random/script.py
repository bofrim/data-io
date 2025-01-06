""""""

import argparse
import asyncio
import random
import aiohttp
from data_io.websocket_channel import WebSocketChannelPublisher

ISS_PERIOD_SEC = 10  # Period to fetch ISS location in seconds
RANDOM_DATA_PERIOD_SEC = 0.001  # Period to publish random data in seconds


async def get_iss_location():
    """Asynchronously fetch the current latitude and longitude of the ISS."""
    url = "http://api.open-notify.org/iss-now.json"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                position = data["iss_position"]
                latitude = float(position["latitude"])
                longitude = float(position["longitude"])
                return latitude, longitude
            else:
                raise Exception(
                    f"Failed to fetch ISS location. HTTP status code: {response.status}"
                )


async def temperature_publisher(
    publisher: WebSocketChannelPublisher, channel="temperature"
):
    """Task that continuously publishes random temperature values."""
    temperature = 0.0  # Local state for temperature
    while True:
        temperature += random.uniform(-1, 1)
        publisher.publish(channel, temperature)
        await asyncio.sleep(RANDOM_DATA_PERIOD_SEC)  # Publish every 1ms


async def iss_location_publisher(publisher, channel="position"):
    """Task that continuously fetches and publishes the ISS location."""
    while True:
        try:
            lat, lon = await get_iss_location()
            publisher.publish(channel, {"lat": lat, "lon": lon})
        except Exception as e:
            print(f"Error fetching ISS location: {e}")
        await asyncio.sleep(ISS_PERIOD_SEC)  # Fetch and publish every 10 seconds


async def earthquake_data_publisher(publisher, channel="earthquake_data"):
    """Fetch and publish real-time earthquake data."""
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"

    while True:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        earthquakes = [
                            {
                                "lat": feature["geometry"]["coordinates"][1],
                                "lon": feature["geometry"]["coordinates"][0],
                                "magnitude": feature["properties"]["mag"],
                            }
                            for feature in data["features"]
                        ]
                        publisher.publish(channel, earthquakes)
                    else:
                        print(
                            f"Failed to fetch earthquake data. HTTP status: {response.status}"
                        )
        except Exception as e:
            print(f"Error fetching earthquake data: {e}")

        await asyncio.sleep(60)  # Fetch every minute


async def main(path: str):
    """Initialize the publisher and run the tasks."""
    publisher = WebSocketChannelPublisher(source_name="script", interface_file=path)
    print(f"Publisher initialized with channels: {publisher.channels.keys()}")

    # Run the tasks concurrently
    await asyncio.gather(
        temperature_publisher(publisher),
        # iss_location_publisher(publisher),
        # earthquake_data_publisher(publisher),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=str)
    args = parser.parse_args()

    try:
        asyncio.run(main(args.path))
    except KeyboardInterrupt:
        print("Shutting down tasks.")
