"""Basic channel publisher implementation."""

import json

from ruamel.yaml import YAML
from redis import Redis


class ChannelPublisher:
    """Simple class to publish messages to data channels."""

    def __init__(self, interface_file, redis_host="localhost", redis_port=6379):
        """
        Parse the interface file and initialize Redis connection.
        """
        self.redis = Redis(host=redis_host, port=redis_port, decode_responses=True)
        self.channels = self.parse_interface_file(interface_file)

    def parse_interface_file(self, interface_file):
        """
        Parse the YAML section of the interface file to extract channel configs.
        """
        yaml = YAML()
        with open(interface_file, "r", encoding="utf-8") as file:
            content = file.read()
        yaml_part, _ = content.split("---", 2)[1:]  # Split YAML from MDX
        config = yaml.load(yaml_part)
        return config.get("channels", {})

    def publish(self, channel_name, value):
        """
        Publish a value to a Redis channel.
        """
        if channel_name not in self.channels:
            raise ValueError(
                f"Channel '{channel_name}' is not defined in the interface file."
            )
        self.redis.publish(channel_name, json.dumps(value))
