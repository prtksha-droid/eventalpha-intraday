import os
import sys
import json
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from pymongo import MongoClient
import redis
from growwapi import GrowwAPI, GrowwFeed
import growwapi.groww.nats_client as groww_nats_client


def get_required_env(name):
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"{name} is required")

    return value


SHARD_ID = int(get_required_env("FEED_SHARD_ID"))
SHARD_COUNT = int(get_required_env("FEED_SHARD_COUNT"))

MONGODB_URI = get_required_env("MONGODB_URI")
REDIS_URL = get_required_env("REDIS_URL")
GROWW_ACCESS_TOKEN_REDIS_KEY = (
    get_required_env(
        "GROWW_ACCESS_TOKEN_REDIS_KEY"
    )
)

TICK_STREAM_NAME = get_required_env(
    "TICK_STREAM_NAME"
)

TICK_STREAM_MAXLEN = int(
    get_required_env(
        "TICK_STREAM_MAXLEN"
    )
)

if TICK_STREAM_MAXLEN <= 0:
    raise RuntimeError(
        "TICK_STREAM_MAXLEN must be greater than zero"
    )

FEED_RECONNECT_DELAY_SECONDS = int(
    get_required_env(
        "FEED_RECONNECT_DELAY_SECONDS"
    )
)

FEED_LTP_STALE_SECONDS = int(
    get_required_env(
        "FEED_LTP_STALE_SECONDS"
    )
)

FEED_INITIAL_LTP_TIMEOUT_SECONDS = int(
    get_required_env(
        "FEED_INITIAL_LTP_TIMEOUT_SECONDS"
    )
)

GROWW_NATS_CONNECT_TIMEOUT_SECONDS = int(
    get_required_env(
        "GROWW_NATS_CONNECT_TIMEOUT_SECONDS"
    )
)

FEED_MODE = get_required_env(
    "FEED_MODE"
).upper()

REST_POLL_SECONDS = int(
    get_required_env(
        "REST_POLL_SECONDS"
    )
)

REST_BATCH_SIZE = int(
    get_required_env(
        "REST_BATCH_SIZE"
    )
)

REST_BATCH_DELAY_SECONDS = float(
    get_required_env(
        "REST_BATCH_DELAY_SECONDS"
    )
)

original_groww_nats_connect = groww_nats_client.connect


async def groww_nats_connect_with_timeout(
    *args,
    **kwargs
):
    kwargs["connect_timeout"] = (
        GROWW_NATS_CONNECT_TIMEOUT_SECONDS
    )

    return await original_groww_nats_connect(
        *args,
        **kwargs
    )


groww_nats_client.connect = (
    groww_nats_connect_with_timeout
)

MARKET_TIMEZONE = get_required_env(
    "MARKET_TIMEZONE"
)

MARKET_OPEN_TIME = get_required_env(
    "MARKET_OPEN_TIME"
)

MARKET_CLOSE_TIME = get_required_env(
    "MARKET_CLOSE_TIME"
)

def is_market_session_active():
    market_tz = ZoneInfo(MARKET_TIMEZONE)
    now = datetime.now(market_tz)

    if now.weekday() >= 5:
        return False

    open_hour, open_minute = map(
        int,
        MARKET_OPEN_TIME.split(":")
    )

    close_hour, close_minute = map(
        int,
        MARKET_CLOSE_TIME.split(":")
    )

    market_open = now.replace(
        hour=open_hour,
        minute=open_minute,
        second=0,
        microsecond=0
    )

    market_close = now.replace(
        hour=close_hour,
        minute=close_minute,
        second=0,
        microsecond=0
    )

    return market_open <= now < market_close

# MongoDB
mongo_client = MongoClient(MONGODB_URI)

db = mongo_client["eventalpha_intraday"]

instruments_collection = db["instruments"]


# Redis
redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True
)

groww_client_lock = threading.Lock()

groww = None
groww_access_token = None


def get_groww_access_token():
    token = redis_client.get(
        GROWW_ACCESS_TOKEN_REDIS_KEY
    )

    if not token:
        raise RuntimeError(
            "Groww access token is not "
            f"available in Redis key "
            f"{GROWW_ACCESS_TOKEN_REDIS_KEY}"
        )

    token = token.strip()

    if not token:
        raise RuntimeError(
            "Groww access token in Redis "
            "is empty"
        )

    return token


def get_groww_client():
    global groww
    global groww_access_token

    token = get_groww_access_token()

    with groww_client_lock:
        if (
            groww is None
            or token != groww_access_token
        ):
            groww = GrowwAPI(token)
            groww_access_token = token

            print(
                "Groww client initialized/"
                "refreshed from Redis"
            )

        return groww

redis_client.set(
    f"health:market-feed-worker:{SHARD_ID}:status",
    "WAITING_FOR_LTP"
)

redis_client.delete(
    f"health:market-feed-worker:{SHARD_ID}:last-fresh-ltp"
)


def load_intraday_instruments():
    instruments = list(
        instruments_collection.find(
            {
                "isActive": True,
                "isIntraday": True,
                "isin": {
                    "$regex": "^INE"
                }
            },
            {
                "_id": 0,
                "exchange": 1,
                "exchangeToken": 1,
                "tradingSymbol": 1,
                "isin": 1,
                "series": 1
            }
        ).sort([
            ("exchange", 1),
            ("tradingSymbol", 1)
        ])
    )

    return instruments


def assign_shard(instruments):
    return [
        instrument
        for index, instrument in enumerate(instruments)
        if index % SHARD_COUNT == SHARD_ID
    ]



print("Feed worker started")
print(f"Shard ID: {SHARD_ID}")
print(f"Shard Count: {SHARD_COUNT}")


# Load complete intraday company universe
all_instruments = load_intraday_instruments()

assigned_instruments = assign_shard(
    all_instruments
)



nse_count = sum(
    1
    for instrument in assigned_instruments
    if instrument.get("exchange") == "NSE"
)

bse_count = sum(
    1
    for instrument in assigned_instruments
    if instrument.get("exchange") == "BSE"
)


print(
    f"Total intraday company listings: "
    f"{len(all_instruments)}"
)

print(
    f"Worker {SHARD_ID} assigned: "
    f"{len(assigned_instruments)}"
)

print(f"NSE: {nse_count}")
print(f"BSE: {bse_count}")


# --------------------------------------------------
# TEMPORARY LIVE FEED TEST
# Only subscribe to 5 instruments for now
# --------------------------------------------------



test_instruments = assigned_instruments


subscription = [
    {
        "exchange": instrument["exchange"],
        "segment": "CASH",
        "exchange_token": str(
            instrument["exchangeToken"]
        )
    }
    for instrument in test_instruments
]


print(
    f"Subscribing full shard with "
    f"{len(test_instruments)} instruments"
)

def run_rest_feed():
    print(
        f"Starting Groww REST fallback for "
        f"{len(assigned_instruments)} instruments"
    )

    instrument_by_symbol = {
        (
            f"{instrument['exchange']}_"
            f"{instrument['tradingSymbol']}"
        ): instrument
        for instrument in assigned_instruments
    }

    while True:
        cycle_started_at = time.time()
        stored = 0

        if not is_market_session_active():
            redis_client.set(
                f"health:market-feed-worker:"
                f"{SHARD_ID}:status",
                "MARKET_CLOSED"
            )

            time.sleep(
                REST_POLL_SECONDS
            )

            continue

        try:
            current_groww = (
                get_groww_client()
            )

            instruments = list(
                instrument_by_symbol.keys()
            )

            for start in range(
                0,
                len(instruments),
                REST_BATCH_SIZE
            ):
                batch = instruments[
                    start:start + REST_BATCH_SIZE
                ]

                ltp_data = current_groww.get_ltp(
                    segment="CASH",
                    exchange_trading_symbols=batch
                )

                if not isinstance(ltp_data, dict):
                    continue

                pipeline = redis_client.pipeline()
                batch_stored = 0

                timestamp = int(
                    time.time() * 1000
                )

                for groww_symbol, ltp in ltp_data.items():
                    if ltp is None:
                        continue

                    instrument = (
                        instrument_by_symbol.get(
                            groww_symbol
                        )
                    )

                    if not instrument:
                        continue

                    exchange = instrument["exchange"]
                    trading_symbol = (
                        instrument["tradingSymbol"]
                    )

                    payload = {
                        "exchange": exchange,
                        "exchangeToken": str(
                            instrument["exchangeToken"]
                        ),
                        "tradingSymbol": trading_symbol,
                        "isin": instrument["isin"],
                        "ltp": ltp,
                        "timestamp": timestamp,
                        "source": "LIVE_REST"
                    }

                    redis_key = (
                        f"market:ltp:"
                        f"{exchange}:"
                        f"{trading_symbol}"
                    )

                    pipeline.set(
                        redis_key,
                        json.dumps(payload)
                    )

                    pipeline.xadd(
                        TICK_STREAM_NAME,
                        {
                            "exchange": exchange,
                            "exchangeToken": str(
                                instrument["exchangeToken"]
                            ),
                            "tradingSymbol":
                                trading_symbol,
                            "isin": instrument["isin"],
                            "ltp": str(ltp),
                            "timestamp": str(timestamp),
                            "source": "LIVE_REST"
                        },
                        maxlen=TICK_STREAM_MAXLEN,
                        approximate=True
                    )

                    batch_stored += 1

                if batch_stored:
                    pipeline.execute()
                    stored += batch_stored

                time.sleep(
                    REST_BATCH_DELAY_SECONDS
                )

            if stored:
                fresh_at = time.time()

                redis_client.set(
                    f"health:market-feed-worker:"
                    f"{SHARD_ID}:last-fresh-ltp",
                    str(fresh_at)
                )

                redis_client.set(
                    f"health:market-feed-worker:"
                    f"{SHARD_ID}:status",
                    "HEALTHY"
                )

                print(
                    f"Worker {SHARD_ID} stored "
                    f"{stored} REST LTP values"
                )
            elif is_market_session_active():
                redis_client.set(
                    f"health:market-feed-worker:"
                    f"{SHARD_ID}:status",
                    "STALE"
                )

                print(
                    f"Worker {SHARD_ID} REST cycle "
                    f"returned no LTP values"
                )

        except Exception as error:
            print(
                "REST LTP processing error:",
                repr(error)
            )

        elapsed = (
            time.time() - cycle_started_at
        )

        sleep_seconds = max(
            0,
            REST_POLL_SECONDS - elapsed
        )

        time.sleep(sleep_seconds)


if FEED_MODE == "REST":
    run_rest_feed()
    sys.exit(0)

# Groww feed connection
feed = None


# Allows us to map the Groww exchange token back
# to our MongoDB instrument.
instrument_lookup = {
    (
        instrument["exchange"],
        str(instrument["exchangeToken"])
    ): instrument
    for instrument in test_instruments
}

def connect_feed():
    current_groww = get_groww_client()

    new_feed = GrowwFeed(
        current_groww
    )

    print(
        f"Subscribing to "
        f"{len(subscription)} instruments..."
    )

    new_feed.subscribe_ltp(
        subscription
    )

    print(
        "Groww live feed subscription created"
    )

    return new_feed


# --------------------------------------------------
# SUBSCRIBE
# --------------------------------------------------

feed_result = {}
feed_error = {}


def connect_feed_with_timeout():
    try:
        feed_result["feed"] = connect_feed()
    except Exception as error:
        feed_error["error"] = error


connect_thread = threading.Thread(
    target=connect_feed_with_timeout,
    daemon=True
)

connect_thread.start()

connect_thread.join(
    FEED_INITIAL_LTP_TIMEOUT_SECONDS
)

if connect_thread.is_alive():
    print(
        f"Groww feed subscription did not complete within "
        f"{FEED_INITIAL_LTP_TIMEOUT_SECONDS} seconds. "
        f"Restarting worker..."
    )
    sys.stdout.flush()
    os._exit(1)

if "error" in feed_error:
    raise feed_error["error"]

feed = feed_result.get("feed")

if feed is None:
    raise RuntimeError(
        "Groww feed subscription returned no feed"
    )

time.sleep(5)

successful_subscriptions = len(
    feed._nats_client._subscriptions
)

print(
    f"Groww confirmed subscriptions: "
    f"{successful_subscriptions}/{len(subscription)}"
)

last_seen_timestamps = {}
last_fresh_ltp_at = None
feed_started_at = time.time()

while True:

    time.sleep(3)

    try:
        ltp_data = feed.get_ltp()

        if not ltp_data:
            if (
                 is_market_session_active()
                 and last_fresh_ltp_at is None
                 and time.time() - feed_started_at
                 > FEED_INITIAL_LTP_TIMEOUT_SECONDS
               ):
                print(
                    f"Worker {SHARD_ID} received no initial LTP "
                    f"within {FEED_INITIAL_LTP_TIMEOUT_SECONDS} seconds. "
                    f"Restarting worker..."
                )

                time.sleep(
                    FEED_RECONNECT_DELAY_SECONDS
                )

                sys.exit(1)

            continue

        pipeline = redis_client.pipeline()

        stored = 0

        for exchange, segments in ltp_data.items():

            if not isinstance(segments, dict):
                continue

            cash_data = segments.get(
                "CASH",
                {}
            )

            for exchange_token, quote in cash_data.items():

                # Groww can return None until an
                # instrument receives its first tick.
                if quote is None:
                    continue

                timestamp = quote.get("tsInMillis")

                instrument_key = (
                    exchange,
                    str(exchange_token)
                )

                previous_timestamp = last_seen_timestamps.get(
                    instrument_key
                )

                if (
                    timestamp is not None
                    and previous_timestamp == timestamp
                ):
                    continue

                instrument = instrument_lookup.get(
                    (
                        exchange,
                        str(exchange_token)
                    )
                )

                if not instrument:
                    print(
                        "Instrument not found:",
                        exchange,
                        exchange_token
                    )
                    continue

                ltp = quote.get("ltp")
                volume = quote.get("volume")

                if ltp is None:
                    continue

                payload = {
                    "exchange": exchange,
                    "exchangeToken": str(
                        exchange_token
                    ),
                    "tradingSymbol":
                        instrument["tradingSymbol"],
                    "isin":
                        instrument["isin"],
                    "ltp":
                        ltp,
                    "timestamp":
                        timestamp,
                    "source":
                        "LIVE_FEED"
                }

                redis_key = (
                    f"market:ltp:"
                    f"{exchange}:"
                    f"{instrument['tradingSymbol']}"
                )

                pipeline.set(
                    redis_key,
                    json.dumps(payload)
                )

                # Publish the changed tick to a Redis Stream.
                # The candle worker will consume this stream later.
                pipeline.xadd(
                    TICK_STREAM_NAME,
                    {
                        "exchange": exchange,
                        "exchangeToken": str(
                            exchange_token
                        ),
                        "tradingSymbol":
                            instrument["tradingSymbol"],
                        "isin":
                            instrument["isin"],
                        "ltp":
                            str(ltp),
                        "timestamp":
                            str(timestamp),
                        "source":
                            "LIVE_FEED",
                        **(
                            {
                                "volume":
                                    str(volume)
                            }
                            if volume is not None
                            else {}
                        )
                    },
                    maxlen=TICK_STREAM_MAXLEN,
                    approximate=True
                )

                if timestamp is not None:
                    last_seen_timestamps[
                        instrument_key
                    ] = timestamp

                    last_fresh_ltp_at = time.time()

                stored += 1

        if stored:
            pipeline.execute()

            redis_client.set(
                f"health:market-feed-worker:{SHARD_ID}:last-fresh-ltp",
                str(last_fresh_ltp_at)
            )



            print(
                f"Worker {SHARD_ID} stored "
                f"{stored} live LTP values in Redis"
            )

        if (
            is_market_session_active()
            and last_fresh_ltp_at is None
            and time.time() - feed_started_at
            > FEED_INITIAL_LTP_TIMEOUT_SECONDS
        ):
            print(
                f"Worker {SHARD_ID} received no initial fresh LTP "
                f"within {FEED_INITIAL_LTP_TIMEOUT_SECONDS} seconds. "
                f"Restarting worker..."
            )

            time.sleep(
                FEED_RECONNECT_DELAY_SECONDS
            )

            sys.exit(1)

        if last_fresh_ltp_at is not None:
            ltp_age_seconds = (
                time.time() - last_fresh_ltp_at
            )

            feed_health = (
                "HEALTHY"
                if ltp_age_seconds <= FEED_LTP_STALE_SECONDS
                else "STALE"
            )

            redis_client.set(
                f"health:market-feed-worker:{SHARD_ID}:status",
                feed_health
            )

            if (
                 feed_health == "STALE"
                 and is_market_session_active()
              ):
                print(
                    f"Worker {SHARD_ID} has received no fresh LTP "
                    f"for {ltp_age_seconds:.1f} seconds. "
                    f"Restarting worker..."
                )

                time.sleep(
                    FEED_RECONNECT_DELAY_SECONDS
                )

                sys.exit(1)

    except Exception as error:

        print(
            "LTP processing error:",
            repr(error)
        )
        print(
            f"Groww feed failed. Worker will restart in "
            f"{FEED_RECONNECT_DELAY_SECONDS} seconds..."
        )

        time.sleep(
            FEED_RECONNECT_DELAY_SECONDS
        )

        sys.exit(1)
