import argparse
import random
import asyncio
import aiohttp
from data_io.channel import ChannelPublisher


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


async def temperature_publisher(publisher):
    """Task that continuously publishes random temperature values."""
    temperature = 0.0  # Local state for temperature
    while True:
        temperature += random.uniform(-1, 1)
        publisher.publish("temperature", temperature)
        await asyncio.sleep(0.001)  # Publish every 1ms


async def iss_location_publisher(publisher):
    """Task that continuously fetches and publishes the ISS location."""
    while True:
        try:
            lat, lon = await get_iss_location()
            publisher.publish("position", {"lat": lat, "lon": lon})
        except Exception as e:
            print(f"Error fetching ISS location: {e}")
        await asyncio.sleep(10)  # Fetch and publish every 10 seconds


async def main(path: str):
    """Initialize the publisher and run the tasks."""
    publisher = ChannelPublisher(interface_file=path)
    print(f"Publisher initialized with channels: {publisher.channels.keys()}")

    # Run the tasks concurrently
    await asyncio.gather(
        temperature_publisher(publisher),
        iss_location_publisher(publisher),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=str)
    args = parser.parse_args()

    try:
        asyncio.run(main(args.path))
    except KeyboardInterrupt:
        print("Shutting down tasks.")
