"""Basic channel publisher implementation."""

from abc import abstractmethod
import json

from ruamel.yaml import YAML


class AbstractChannelPublisher:
    """Simple class to publish messages to data channels."""

    def __init__(self, source_name: str, interface_file: str):
        """
        Parse the interface file and initialize Redis connection.
        """
        self.name = source_name
        self.channels = self.parse_interface_file(interface_file)

    @property
    def channel_list(self):
        return list(self.channels.keys)

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

    def format(self, channel_name, value):
        """
        Format the value to be published to a channel.
        """
        return json.dumps(
            {
                "source": self.name,
                "channel": channel_name,
                "value": value,
            }
        )

    @abstractmethod
    def publish(self, channel_name, value):
        """Publish a value to a channel."""
