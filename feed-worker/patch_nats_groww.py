from pathlib import Path


NATS_CLIENT_PATH = Path(
    "/usr/local/lib/python3.12/site-packages/nats/aio/client.py"
)

source = NATS_CLIENT_PATH.read_text()

old = """        if PONG_PROTO in next_op:
            self._status = Client.CONNECTED
        elif ERR_OP in next_op:"""

new = """        if PING_PROTO in next_op:
            # Groww's NATS gateway may send a server PING immediately
            # after CONNECT instead of replying with a PONG to the
            # client's initialization PING. Respond to that PING and
            # treat the authenticated connection as established.
            self._transport.write(PONG_PROTO)
            await self._transport.drain()
            self._status = Client.CONNECTED

        if PONG_PROTO in next_op:
            self._status = Client.CONNECTED
        elif ERR_OP in next_op:"""

if old not in source:
    raise RuntimeError(
        "Groww NATS compatibility patch target not found. "
        "The installed nats-py version may have changed."
    )

NATS_CLIENT_PATH.write_text(
    source.replace(old, new, 1)
)

print("Groww NATS compatibility patch applied")