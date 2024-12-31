import re
import sys
from ruamel.yaml import YAML, YAMLError

yaml = YAML()


def parse_front_matter(interface_file):
    """
    Parses the front matter YAML section from the interface file.
    Splits the file into YAML front matter and Markdown content.
    """
    with open(interface_file, "r", encoding="utf-8") as f:
        content = f.read()

    try:
        yaml_part, markdown_part = content.split("---", 2)[1:]
    except ValueError as exc:
        raise ValueError(
            "Interface file must contain a valid YAML front matter delimited by '---'."
        ) from exc

    config = yaml.load(yaml_part)
    data_channels = config.get("channels", {})

    return config, data_channels, markdown_part


def validate_data_channels(data_channels):
    """
    Validates that data channels are unique and correctly formatted.
    """
    if not isinstance(data_channels, dict):
        raise ValueError("data_channels must be a dictionary.")
    for name, properties in data_channels.items():
        if not isinstance(name, str):
            raise ValueError(f"Data channel name '{name}' must be a string.")
        if not isinstance(properties, dict):
            raise ValueError(f"Data channel '{name}' properties must be a dictionary.")


def parse_markdown_body(markdown_part):
    """
    Extracts YAML blocks from the Markdown body.
    """
    yaml_blocks = re.findall(r"```yaml\n(.*?)```", markdown_part, re.DOTALL)
    components = [yaml.load(block) for block in yaml_blocks]
    return components


def validate_components(components, data_channels):
    """
    Validates that components reference existing data channels.
    """
    for component in components:
        data_references = component.get("data", [])
        if isinstance(data_references, str):
            data_references = [data_references]
        for ref in data_references:
            if ref not in data_channels:
                raise ValueError(f"Data channel '{ref}' is not defined.")


def parse_interface_file(interface_file):
    """
    Parses the entire interface file and returns a structured representation.
    """
    config, data_channels, markdown_part = parse_front_matter(interface_file)

    # Validate the data channels
    validate_data_channels(data_channels)

    # Parse and validate components from Markdown body
    components = parse_markdown_body(markdown_part)
    validate_components(components, data_channels)

    return {
        "title": config.get("title", "Untitled"),
        "description": config.get("description", ""),
        "data_channels": data_channels,
        "components": components,
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python parser.py <path_to_interface_file>")
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        result = parse_interface_file(file_path)
        from pprint import pprint

        pprint(result)
    except (FileNotFoundError, ValueError, YAMLError) as e:
        print(f"Error: {e}")
        sys.exit(1)
