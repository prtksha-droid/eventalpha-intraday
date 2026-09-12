import os
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from pymongo import MongoClient, UpdateOne


IST = timezone(
    timedelta(
        hours=5,
        minutes=30
    )
)


def get_required_env(name):
    value = os.getenv(name)

    if not value:
        raise RuntimeError(
            f"{name} is required"
        )

    return value


def get_int_env(name):
    return int(
        get_required_env(name)
    )


MONGODB_URI = get_required_env(
    "MONGODB_URI"
)

SOURCE_INTERVAL = get_required_env(
    "HISTORICAL_AGGREGATION_SOURCE_INTERVAL"
)

TARGET_INTERVALS = [
    int(value.strip())
    for value in get_required_env(
        "HISTORICAL_AGGREGATION_TARGET_INTERVALS"
    ).split(",")
    if value.strip()
]

SOURCE_NAME = get_required_env(
    "HISTORICAL_AGGREGATION_SOURCE_NAME"
)

OUTPUT_SOURCE_NAME = get_required_env(
    "HISTORICAL_AGGREGATION_OUTPUT_SOURCE_NAME"
)

WRITE_BATCH_SIZE = get_int_env(
    "HISTORICAL_AGGREGATION_WRITE_BATCH_SIZE"
)

SESSION_START_HOUR = get_int_env(
    "HISTORICAL_AGGREGATION_SESSION_START_HOUR"
)

SESSION_START_MINUTE = get_int_env(
    "HISTORICAL_AGGREGATION_SESSION_START_MINUTE"
)


mongo_client = MongoClient(
    MONGODB_URI
)

db = mongo_client[
    "eventalpha_intraday"
]

candles_collection = db[
    "candles"
]


def get_source_interval_minutes():
    if not SOURCE_INTERVAL.endswith("m"):
        raise RuntimeError(
            "Only minute-based source intervals are supported"
        )

    return int(
        SOURCE_INTERVAL[:-1]
    )


SOURCE_INTERVAL_MINUTES = (
    get_source_interval_minutes()
)

SOURCE_INTERVAL_SECONDS = (
    SOURCE_INTERVAL_MINUTES * 60
)


def get_session_start_timestamp(
    timestamp
):
    dt = datetime.fromtimestamp(
        timestamp,
        tz=IST
    )

    session_start = dt.replace(
        hour=SESSION_START_HOUR,
        minute=SESSION_START_MINUTE,
        second=0,
        microsecond=0
    )

    return int(
        session_start.timestamp()
    )


def get_bucket_start(
    timestamp,
    interval_minutes
):
    session_start_timestamp = (
        get_session_start_timestamp(
            timestamp
        )
    )

    seconds_from_session_start = (
        timestamp -
        session_start_timestamp
    )

    if seconds_from_session_start < 0:
        return None

    interval_seconds = (
        interval_minutes * 60
    )

    bucket_index = (
        seconds_from_session_start
        // interval_seconds
    )

    return (
        session_start_timestamp +
        (
            bucket_index *
            interval_seconds
        )
    )


def load_historical_symbols():
    pipeline = [
        {
            "$match": {
                "interval":
                    SOURCE_INTERVAL,

                "source":
                    SOURCE_NAME
            }
        },
        {
            "$group": {
                "_id": {
                    "exchange":
                        "$exchange",

                    "tradingSymbol":
                        "$tradingSymbol"
                }
            }
        },
        {
            "$sort": {
                "_id.exchange": 1,
                "_id.tradingSymbol": 1
            }
        }
    ]

    results = list(
        candles_collection.aggregate(
            pipeline,
            allowDiskUse=True
        )
    )

    return [
        {
            "exchange":
                item["_id"]["exchange"],

            "tradingSymbol":
                item["_id"]["tradingSymbol"]
        }
        for item in results
    ]


def load_historical_candles(
    exchange,
    trading_symbol
):
    candles = list(
        candles_collection.find(
            {
                "exchange":
                    exchange,

                "tradingSymbol":
                    trading_symbol,

                "interval":
                    SOURCE_INTERVAL,

                "source":
                    SOURCE_NAME
            },
            {
                "_id": 0,
                "exchange": 1,
                "tradingSymbol": 1,
                "isin": 1,
                "open": 1,
                "high": 1,
                "low": 1,
                "close": 1,
                "startTimestamp": 1
            }
        ).sort(
            "startTimestamp",
            1
        )
    )

    return candles


def is_complete_group(
    candles,
    expected_count
):
    if len(candles) != expected_count:
        return False

    candles.sort(
        key=lambda item:
            item["startTimestamp"]
    )

    for index in range(
        1,
        len(candles)
    ):
        gap = (
            candles[index][
                "startTimestamp"
            ]
            -
            candles[index - 1][
                "startTimestamp"
            ]
        )

        if gap != SOURCE_INTERVAL_SECONDS:
            return False

    return True


def flush_operations(
    operations
):
    if not operations:
        return 0

    candles_collection.bulk_write(
        operations,
        ordered=False
    )

    return len(
        operations
    )


def aggregate_interval(
    source_candles,
    interval_minutes
):
    if (
        interval_minutes %
        SOURCE_INTERVAL_MINUTES
        != 0
    ):
        raise RuntimeError(
            "Target interval must be divisible "
            "by source interval"
        )

    expected_count = (
        interval_minutes
        //
        SOURCE_INTERVAL_MINUTES
    )

    interval_seconds = (
        interval_minutes * 60
    )

    grouped = defaultdict(list)

    for candle in source_candles:
        timestamp = int(
            candle[
                "startTimestamp"
            ]
        )

        bucket_start = (
            get_bucket_start(
                timestamp,
                interval_minutes
            )
        )

        if bucket_start is None:
            continue

        key = (
            candle["exchange"],
            candle["tradingSymbol"],
            bucket_start
        )

        grouped[key].append(
            candle
        )

    operations = []
    total_written = 0
    skipped_incomplete = 0

    for (
        exchange,
        trading_symbol,
        bucket_start
    ), candles in grouped.items():

        if not is_complete_group(
            candles,
            expected_count
        ):
            skipped_incomplete += 1
            continue

        candles.sort(
            key=lambda item:
                item["startTimestamp"]
        )

        first = candles[0]
        last = candles[-1]

        document = {
            "exchange":
                exchange,

            "tradingSymbol":
                trading_symbol,

            "isin":
                first.get(
                    "isin",
                    ""
                ),

            "interval":
                f"{interval_minutes}m",

            "open":
                float(
                    first["open"]
                ),

            "high":
                max(
                    float(
                        candle["high"]
                    )
                    for candle in candles
                ),

            "low":
                min(
                    float(
                        candle["low"]
                    )
                    for candle in candles
                ),

            "close":
                float(
                    last["close"]
                ),

            "startTimestamp":
                bucket_start,

            "endTimestamp":
                (
                    bucket_start
                    +
                    interval_seconds
                ),

            "lastTickTimestamp":
                last[
                    "startTimestamp"
                ],

            "source":
                OUTPUT_SOURCE_NAME,

            "constituentCandles":
                len(candles)
        }

        operations.append(
            UpdateOne(
                {
                    "exchange":
                        exchange,

                    "tradingSymbol":
                        trading_symbol,

                    "interval":
                        f"{interval_minutes}m",

                    "startTimestamp":
                        bucket_start
                },
                {
                    "$setOnInsert":
                        document
                },
                upsert=True
            )
        )

        if (
            len(operations)
            >= WRITE_BATCH_SIZE
        ):
            total_written += (
                flush_operations(
                    operations
                )
            )

            operations = []

    if operations:
        total_written += (
            flush_operations(
                operations
            )
        )

    print(
        f"{interval_minutes}m "
        f"written={total_written} "
        f"skippedIncomplete="
        f"{skipped_incomplete}"
    )

    return total_written


def run_worker():
    print(
        "Historical aggregation bootstrap started"
    )

    print(
        "Source interval:",
        SOURCE_INTERVAL
    )

    print(
        "Targets:",
        TARGET_INTERVALS
    )

    symbols = (
        load_historical_symbols()
    )

    print(
        "Historical symbols found:",
        len(symbols)
    )

    total_symbols = (
        len(symbols)
    )

    total_written = {
        interval: 0
        for interval in TARGET_INTERVALS
    }

    for (
        index,
        symbol
    ) in enumerate(
        symbols,
        start=1
    ):
        exchange = (
            symbol["exchange"]
        )

        trading_symbol = (
            symbol["tradingSymbol"]
        )

        source_candles = (
            load_historical_candles(
                exchange,
                trading_symbol
            )
        )

        if not source_candles:
            continue

        for interval in TARGET_INTERVALS:
            written = (
                aggregate_interval(
                    source_candles,
                    interval
                )
            )

            total_written[
                interval
            ] += written

        print(
            f"Processed "
            f"{index}/{total_symbols} "
            f"{exchange} "
            f"{trading_symbol} "
            f"sourceCandles="
            f"{len(source_candles)}"
        )

    print(
        "Historical aggregation totals:"
    )

    for interval in TARGET_INTERVALS:
        print(
            f"{interval}m="
            f"{total_written[interval]}"
        )

    print(
        "Historical aggregation bootstrap completed"
    )


if __name__ == "__main__":
    run_worker()