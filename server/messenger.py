import dataclasses
import json
import base64
import sys

TYPE_FILE = "FILE"
TYPE_READY = "READY"
TYPE_REQUEST = "REQUEST"
TYPE_ERROR = "ERROR"


@dataclasses.dataclass
class SerializedMessage:
    """
      Encodes a message to be sent to the VSCode extension host.
    """
    type: str
    json: dict = None
    bin: bytes = None

    def __post_init__(self):
        if not self.json and not self.bin:
            raise ValueError(
                "[SerializedMessage] Either .json or .bin must be set")
        if self.json and self.bin:
            raise ValueError(
                "[SerializedMessage] Either .json or .bin must be set, not both")

    @property
    def body(self):
        if not self.bin:
            return self.json

        return base64.b64encode(self.bin)

    def to_json(self):
        return json.dumps({
            "type": self.type,
            "body": self.body,
        })


def to_stdout(message: SerializedMessage):
    sys.stdout.write("MTTP 0.1\n")
    sys.stdout.write(message.to_json())
    sys.stdout.write("0.1 MTTP\n")
    sys.stdout.flush()


def to_stderr(message: SerializedMessage):
    sys.stderr.write("MTTP 0.1\n")
    sys.stderr.write(message.to_json())
    sys.stderr.write("0.1 MTTP\n")
    sys.stderr.flush()
