import os
import time
import threading
from datetime import datetime, timezone

import redis
from pymongo import MongoClient, UpdateOne


def get_required_env(name):
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"{name} is required")

    return value
    
def get_required_int_env(name):
    value = get_required_env(name)

    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise RuntimeError(
            f"{name} must be an integer"
        )

    if parsed <= 0:
        raise RuntimeError(
            f"{name} must be greater than zero"
        )

    return parsed


REDIS_URL = get_required_env("REDIS_URL")
MONGODB_URI = get_required_env("MONGODB_URI")

STREAM_NAME = get_required_env("TICK_STREAM_NAME")
GROUP_NAME = get_required_env("CANDLE_CONSUMER_GROUP")
CONSUMER_NAME = get_required_env("CANDLE_CONSUMER_NAME")

PENDING_MIN_IDLE_MS = (
    get_required_int_env(
        "CANDLE_PENDING_MIN_IDLE_MS"
    )
)

PENDING_RECOVERY_COUNT = (
    get_required_int_env(
        "CANDLE_PENDING_RECOVERY_COUNT"
    )
)

PENDING_RECOVERY_INTERVAL_SECONDS = (
    get_required_int_env(
        "CANDLE_PENDING_RECOVERY_INTERVAL_SECONDS"
    )
)

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True,
    socket_timeout=15,
    socket_connect_timeout=5,
    health_check_interval=30
)

mongo_client = MongoClient(
    MONGODB_URI
)

mongo_db = mongo_client[
    "eventalpha_intraday"
]

candles_collection = mongo_db[
    "candles"
]

def ensure_consumer_group():
    try:
        redis_client.xgroup_create(
            STREAM_NAME,
            GROUP_NAME,
            id="0",
            mkstream=True
        )

        print(
            f"Created consumer group: "
            f"{GROUP_NAME}"
        )

    except redis.exceptions.ResponseError as error:
        if "BUSYGROUP" not in str(error):
            raise


def get_minute_bucket(timestamp_ms):
    timestamp_seconds = timestamp_ms / 1000

    dt = datetime.fromtimestamp(
        timestamp_seconds,
        tz=timezone.utc
    )

    bucket = dt.replace(
        second=0,
        microsecond=0
    )

    return bucket


def process_tick(fields):
    exchange = fields.get("exchange")
    trading_symbol = fields.get(
        "tradingSymbol"
    )
    isin = fields.get("isin")

    ltp_value = fields.get("ltp")
    timestamp_value = fields.get(
        "timestamp"
    )
    volume_value = fields.get("volume")
    source_value = fields.get("source")

    if (
        not exchange
        or not trading_symbol
        or not ltp_value
        or not timestamp_value
    ):
        return

    try:
        ltp = float(ltp_value)

        timestamp_ms = float(
            timestamp_value
        )

        volume = (
            float(volume_value)
            if volume_value is not None
            else None
        )

    except (ValueError, TypeError):
        return

    bucket = get_minute_bucket(
        timestamp_ms
    )

    bucket_timestamp = int(
        bucket.timestamp()
    )

    candle_key = (
        f"market:candle:1m:"
        f"{exchange}:"
        f"{trading_symbol}:"
        f"{bucket_timestamp}"
    )

    existing = redis_client.hgetall(
        candle_key
    )

    if not existing:
        mapping = {
            "exchange": exchange,
            "tradingSymbol":
                trading_symbol,
            "isin": isin or "",
            "interval": "1m",
            "open": ltp,
            "high": ltp,
            "low": ltp,
            "close": ltp,
            "startTimestamp":
                bucket_timestamp,

            # Allows future out-of-order
            # ticks to preserve the true open.
            "firstTickTimestamp":
                timestamp_ms,

            "lastTickTimestamp":
                timestamp_ms,

            "source":
                source_value
                or "LIVE_FEED",
        }

        if volume is not None:
            mapping[
                "startCumulativeVolume"
            ] = volume

            mapping[
                "lastCumulativeVolume"
            ] = volume

        redis_client.hset(
            candle_key,
            mapping=mapping
        )

        return

    try:
        high = float(
            existing["high"]
        )

        low = float(
            existing["low"]
        )

        existing_last_timestamp = float(
            existing.get(
                "lastTickTimestamp",
                0
            )
            or 0
        )

        existing_first_timestamp_value = (
            existing.get(
                "firstTickTimestamp"
            )
        )

        existing_first_timestamp = (
            float(
                existing_first_timestamp_value
            )
            if existing_first_timestamp_value
            not in (
                None,
                ""
            )
            else None
        )

    except (
        KeyError,
        TypeError,
        ValueError
    ):
        print(
            "Skipping malformed candle:",
            candle_key
        )

        return

    update_mapping = {
        # High and low can safely incorporate
        # ticks regardless of arrival order.
        "high": max(
            high,
            ltp
        ),

        "low": min(
            low,
            ltp
        )
    }

    # Older ticks can improve the true opening
    # price, but must never move the close
    # backwards.
    if (
        existing_first_timestamp
        is None
    ):
        update_mapping[
            "firstTickTimestamp"
        ] = timestamp_ms

    elif (
        timestamp_ms <
        existing_first_timestamp
    ):
        update_mapping[
            "open"
        ] = ltp

        update_mapping[
            "firstTickTimestamp"
        ] = timestamp_ms

        if volume is not None:
            update_mapping[
                "startCumulativeVolume"
            ] = volume

    # Only the newest observed tick may change
    # the close / last-tick information.
    if (
        timestamp_ms >=
        existing_last_timestamp
    ):
        update_mapping[
            "close"
        ] = ltp

        update_mapping[
            "lastTickTimestamp"
        ] = timestamp_ms

        if volume is not None:
            update_mapping[
                "lastCumulativeVolume"
            ] = volume

        if source_value:
            update_mapping[
                "source"
            ] = source_value

    redis_client.hset(
        candle_key,
        mapping=update_mapping
    )

def process_reclaimed_tick(fields):
    exchange = fields.get("exchange")

    trading_symbol = fields.get(
        "tradingSymbol"
    )

    ltp_value = fields.get("ltp")

    timestamp_value = fields.get(
        "timestamp"
    )

    source_value = fields.get(
        "source"
    )

    if (
        not exchange
        or not trading_symbol
        or not ltp_value
        or not timestamp_value
    ):
        return

    try:
        ltp = float(ltp_value)

        timestamp_ms = float(
            timestamp_value
        )

    except (
        TypeError,
        ValueError
    ):
        return

    bucket = get_minute_bucket(
        timestamp_ms
    )

    start_timestamp = int(
        bucket.timestamp()
    )

    current_minute_start = (
        int(time.time()) // 60
    ) * 60

    candle_key = (
        f"market:candle:1m:"
        f"{exchange}:"
        f"{trading_symbol}:"
        f"{start_timestamp}"
    )

    # If this is still the current candle,
    # or its Redis candle still exists,
    # use the normal timestamp-safe logic.
    if (
        start_timestamp >=
        current_minute_start
        or redis_client.exists(
            candle_key
        )
    ):
        process_tick(fields)
        return

    candle_filter = {
        "exchange": exchange,
        "tradingSymbol":
            trading_symbol,
        "interval": "1m",
        "startTimestamp":
            start_timestamp,
    }

    stored = (
        candles_collection.find_one(
            candle_filter,
            {
                "_id": 1,
                "lastTickTimestamp": 1
            }
        )
    )

    # If Mongo does not yet contain the
    # completed candle, reconstruct the Redis
    # candle and allow the normal persistence
    # thread to store it.
    if not stored:
        process_tick(fields)
        return

    stored_last_timestamp = float(
        stored.get(
            "lastTickTimestamp",
            0
        )
        or 0
    )

    update = {
        "$max": {
            "high": ltp
        },

        "$min": {
            "low": ltp
        }
    }

    # A reclaimed tick may change the close
    # only when it is newer than Mongo's
    # currently stored final tick.
    if (
        timestamp_ms >=
        stored_last_timestamp
    ):
        update["$set"] = {
            "close": ltp,
            "lastTickTimestamp":
                timestamp_ms
        }

        if source_value:
            update["$set"][
                "source"
            ] = source_value

    candles_collection.update_one(
        candle_filter,
        update
    )
    
def recover_abandoned_messages():
    try:
        result = (
            redis_client.xautoclaim(
                STREAM_NAME,
                GROUP_NAME,
                CONSUMER_NAME,
                PENDING_MIN_IDLE_MS,
                "0-0",
                count=
                    PENDING_RECOVERY_COUNT
            )
        )

        if (
            not result
            or len(result) < 2
        ):
            return

        messages = result[1]

        if not messages:
            return

        recovered = 0

        for (
            message_id,
            fields
        ) in messages:
            try:
                process_reclaimed_tick(
                    fields
                )

                redis_client.xack(
                    STREAM_NAME,
                    GROUP_NAME,
                    message_id
                )

                recovered += 1

            except Exception as error:
                print(
                    "Recovered candle "
                    "processing error:",
                    message_id,
                    repr(error)
                )

        if recovered:
            print(
                "Recovered abandoned "
                f"ticks: {recovered}"
            )

    except Exception as error:
        print(
            "Pending tick recovery "
            "error:",
            repr(error)
        )

def persist_completed_candles():
    while True:
        try:
            now = int(time.time())

            current_minute_start = (
                now // 60
            ) * 60

            keys = list(
                redis_client.scan_iter(
                    match="market:candle:1m:*",
                    count=1000
                )
            )

            operations = []
            processed_keys = []

            batch_size = 500

            for batch_start in range(
                0,
                len(keys),
                batch_size
            ):
                batch_keys = keys[
                    batch_start:
                    batch_start + batch_size
                ]

                pipeline = redis_client.pipeline(
                    transaction=False
                )

                for candle_key in batch_keys:
                    pipeline.hgetall(
                        candle_key
                    )

                candles = pipeline.execute()

                for candle_key, candle in zip(
                    batch_keys,
                    candles
                ):

                    if not candle:
                        continue

                    if "startTimestamp" not in candle:
                        print(
                            "Skipping malformed candle:",
                            candle_key
                        )
                        continue

                    start_timestamp = int(
                        float(
                            candle[
                                "startTimestamp"
                            ]
                        )
                    )

                    # Current minute is still active.
                    if (
                        start_timestamp
                        >= current_minute_start
                    ):
                        continue

                    end_timestamp = (
                        start_timestamp + 60
                    )

                    # Calculate actual volume traded during this 1-minute candle.
                    # Groww provides cumulative volume, so we calculate the difference
                    # between the first and last cumulative values seen in this minute.

                    start_cumulative_volume = candle.get(
                        "startCumulativeVolume"
                    )

                    last_cumulative_volume = candle.get(
                        "lastCumulativeVolume"
                    )

                    minute_volume = None

                    if (
                        start_cumulative_volume is not None
                        and last_cumulative_volume is not None
                    ):
                        start_cumulative_volume = float(
                            start_cumulative_volume
                        )

                        last_cumulative_volume = float(
                            last_cumulative_volume
                        )

                        volume_delta = (
                            last_cumulative_volume
                            - start_cumulative_volume
                        )

                        if volume_delta >= 0:
                            minute_volume = volume_delta

                    document = {
                        "exchange":
                            candle["exchange"],

                        "tradingSymbol":
                            candle[
                                "tradingSymbol"
                            ],

                        "isin":
                            candle.get(
                                "isin",
                                ""
                            ),

                        "interval":
                            candle["interval"],

                        "open":
                            float(
                                candle["open"]
                            ),

                        "high":
                            float(
                                candle["high"]
                            ),

                        "low":
                            float(
                                candle["low"]
                            ),
                        "close":
                            float(
                                candle["close"]
                            ),

                        "volume":
                            minute_volume,

                        "source":
                            candle.get(
                                "source",
                                "LIVE_FEED"
                            ),

                        "startTimestamp":
                            start_timestamp,

                        "endTimestamp":
                            end_timestamp,

                        "lastTickTimestamp":
                            float(
                                candle.get(
                                    "lastTickTimestamp",
                                    0
                                )
                            )
                    }

                    operations.append(
                        UpdateOne(
                            {
                                "exchange":
                                    document[
                                        "exchange"
                                    ],

                                "tradingSymbol":
                                    document[
                                        "tradingSymbol"
                                    ],

                                "interval":
                                    document[
                                        "interval"
                                    ],

                                "startTimestamp":
                                    document[
                                        "startTimestamp"
                                    ]
                            },
                            {
                                "$set":
                                    document
                            },
                            upsert=True
                        )
                    )

                    processed_keys.append(
                        candle_key
                    )

            if operations:
                result = (
                    candles_collection
                    .bulk_write(
                        operations,
                        ordered=False
                    )
                )

                print(
                    "Persisted completed candles:",
                    len(operations)
                )

                # Remove completed candle hashes
                # from Redis after successful persistence.
                redis_client.delete(
                    *processed_keys
                )

        except Exception as error:
            print(
                "Candle persistence error:",
                repr(error)
            )

        time.sleep(10)

def start_worker():
    ensure_consumer_group()

    print("Candle worker started")
    print(f"Stream: {STREAM_NAME}")
    print(f"Group: {GROUP_NAME}")
    print(f"Consumer: {CONSUMER_NAME}")
    
    threading.Thread(
        target=persist_completed_candles,
        daemon=True
    ).start()

    print(
        "Candle persistence thread started"
    )
    next_recovery_at = 0
    while True:
        now_monotonic = (
            time.monotonic()
        )

        if (
            now_monotonic >=
            next_recovery_at
        ):
            recover_abandoned_messages()

            next_recovery_at = (
                now_monotonic
                +
                PENDING_RECOVERY_INTERVAL_SECONDS
            )
        try:
            messages = redis_client.xreadgroup(
                GROUP_NAME,
                CONSUMER_NAME,
                {
                    STREAM_NAME: ">"
                },
                count=100,
                block=5000
            )

        except redis.exceptions.TimeoutError:
            # No stream data arrived before the socket
            # wait completed. This is not fatal.
            continue

        except redis.exceptions.ConnectionError as error:
            print(
                "Redis connection error:",
                repr(error)
            )

            time.sleep(2)
            continue

        if not messages:
            continue

        for stream_name, entries in messages:

            for message_id, fields in entries:

                try:
                    process_tick(
                        fields
                    )

                    redis_client.xack(
                        STREAM_NAME,
                        GROUP_NAME,
                        message_id
                    )

                except Exception as error:
                    print(
                        "Candle processing error:",
                        repr(error)
                    )

        time.sleep(0.01)


if __name__ == "__main__":
    start_worker()