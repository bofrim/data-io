import argparse
import asyncio
import numpy as np
import sounddevice as sd
from scipy.signal import spectrogram
from data_io.websocket_channel import WebSocketChannelPublisher


class AudioStreamer:
    def __init__(
        self,
        publisher,
        samplerate=44100,
        blocksize=1024,
        nperseg=256,
        vocal_range=(85, 3000),
    ):
        """
        Initialize the AudioStreamer.
        :param publisher: ChannelPublisher instance to publish data.
        :param samplerate: Audio sampling rate.
        :param blocksize: Number of samples per audio block.
        :param nperseg: Number of samples per segment for spectrogram.
        :param vocal_range: Tuple representing the frequency range to prioritize (min_freq, max_freq).
        """
        self.publisher = publisher
        self.samplerate = samplerate
        self.blocksize = blocksize
        self.nperseg = nperseg
        self.vocal_range = vocal_range
        self.buffer = np.zeros((blocksize * 10,), dtype=np.float32)  # Circular buffer
        self.write_index = 0

    def audio_callback(self, indata, frames, time, status):
        """Callback to continuously record audio into the circular buffer."""
        if status:
            print(f"Audio callback status: {status}")
        indata = indata.flatten()
        available_space = len(self.buffer) - self.write_index
        if len(indata) <= available_space:
            self.buffer[self.write_index : self.write_index + len(indata)] = indata
        else:
            # Wrap-around to the beginning of the buffer
            self.buffer[self.write_index :] = indata[:available_space]
            self.buffer[: len(indata) - available_space] = indata[available_space:]
        self.write_index = (self.write_index + len(indata)) % len(self.buffer)

    def compute_vocal_spectrogram(self):
        """Compute the spectrogram focusing on the human vocal range."""
        # Align the buffer to start with the oldest data
        data = np.roll(self.buffer, -self.write_index)

        # Compute the spectrogram
        f, t, Sxx = spectrogram(data, fs=self.samplerate, nperseg=self.nperseg)

        # Filter frequencies to focus on the vocal range
        vocal_min, vocal_max = self.vocal_range
        vocal_mask = (f >= vocal_min) & (f <= vocal_max)
        vocal_frequencies = f[vocal_mask]
        vocal_sxx = Sxx[vocal_mask, :]

        # Average amplitudes across the time axis
        averaged_vocal_amplitudes = np.mean(vocal_sxx, axis=1)

        # Normalize the averaged amplitudes
        normalized_amplitudes = (
            averaged_vocal_amplitudes - np.min(averaged_vocal_amplitudes)
        ) / (
            np.max(averaged_vocal_amplitudes) - np.min(averaged_vocal_amplitudes) + 1e-9
        )

        return vocal_frequencies, normalized_amplitudes.tolist()

    async def stream_audio(self):
        """Process the audio buffer and publish averaged frequency data."""
        with sd.InputStream(
            samplerate=self.samplerate,
            channels=1,
            blocksize=self.blocksize,
            callback=self.audio_callback,
            dtype="float32",
        ):
            while True:
                # Compute the vocal spectrogram
                vocal_frequencies, averaged_data = self.compute_vocal_spectrogram()

                # Publish the processed spectrogram data
                self.publisher.publish(
                    "audio_spectrogram",
                    {
                        "frequencies": vocal_frequencies.tolist(),
                        "amplitudes": averaged_data,
                    },
                )
                await asyncio.sleep(0.05)  # Publish every 100ms


async def audio_publisher(publisher):
    """Initialize the audio streamer and start streaming."""
    streamer = AudioStreamer(publisher)
    await streamer.stream_audio()


async def main(path: str):
    """Initialize the publisher and run the tasks."""
    publisher = WebSocketChannelPublisher(interface_file=path)
    print(f"Publisher initialized with channels: {publisher.channels.keys()}")

    # Run the audio publisher task
    await asyncio.gather(audio_publisher(publisher))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=str)
    args = parser.parse_args()

    try:
        asyncio.run(main(args.path))
    except KeyboardInterrupt:
        print("Shutting down tasks.")
