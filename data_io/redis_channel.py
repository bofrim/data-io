"""Basic channel publisher implementation."""

import json

from redis import Redis

from data_io.abstract_channel import AbstractChannelPublisher


class RedisChannelPublisher(AbstractChannelPublisher):
    """Simple class to publish messages to data channels."""

    def __init__(self, interface_file, redis_host="localhost", redis_port=6379):
        """
        Parse the interface file and initialize Redis connection.
        """
        super().__init__(interface_file)
        self.redis = Redis(host=redis_host, port=redis_port, decode_responses=True)

    def publish(self, channel_name, value):
        """
        Publish a value to a Redis channel.
        """
        if channel_name not in self.channels:
            raise ValueError(
                f"Channel '{channel_name}' is not defined in the interface file."
            )
        self.redis.publish(channel_name, json.dumps(value))
