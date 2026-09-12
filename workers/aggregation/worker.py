import os
import time
from collections import defaultdict

from pymongo import MongoClient, UpdateOne


def get_required_env(name):
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"{name} is required")

    return value


MONGODB_URI = get_required_env("MONGODB_URI")

AGGREGATION_INTERVALS = [
    int(value.strip())
    for value in get_required_env(
        "CANDLE_AGGREGATION_INTERVALS"
    ).split(",")
    if value.strip()
]

BACKFILL_LOOKBACK_MINUTES = int(
    get_required_env(
        "CANDLE_AGGREGATION_LOOKBACK_MINUTES"
    )
)

INCREMENTAL_LOOKBACK_MINUTES = int(
    get_required_env(
        "CANDLE_AGGREGATION_INCREMENTAL_LOOKBACK_MINUTES"
    )
)

WRITE_BATCH_SIZE = int(
    get_required_env(
        "CANDLE_AGGREGATION_WRITE_BATCH_SIZE"
    )
)

POLL_INTERVAL_SECONDS = int(
    get_required_env(
        "CANDLE_AGGREGATION_POLL_SECONDS"
    )
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


def get_bucket_start(
    timestamp,
    interval_minutes
):
    interval_seconds = (
        interval_minutes * 60
    )

    return (
        timestamp
        // interval_seconds
    ) * interval_seconds


def load_one_minute_candles(
    lookback_minutes
):
    now = int(time.time())

    current_minute = (
        now // 60
    ) * 60

    start_timestamp = (
        current_minute
        - (
            lookback_minutes
            * 60
        )
    )

    candles = list(
        candles_collection.find(
            {
                "interval": "1m",

                "startTimestamp": {
                    "$gte": start_timestamp,
                    "$lt": current_minute
                }
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
                "volume": 1,
                "startTimestamp": 1,
                "lastTickTimestamp": 1
            }
        ).sort(
            [
                ("exchange", 1),
                ("tradingSymbol", 1),
                ("startTimestamp", 1)
            ]
        )
    )

    return candles


def load_historical_candle_keys(
    one_minute_candles
):
    if not one_minute_candles:
        return set()

    start_timestamp = min(
        int(candle["startTimestamp"])
        for candle in one_minute_candles
    )

    end_timestamp = max(
        int(candle["startTimestamp"])
        for candle in one_minute_candles
    )

    historical = candles_collection.find(
        {
            "source": "GROWW_HISTORICAL",
            "startTimestamp": {
                "$gte": start_timestamp,
                "$lte": end_timestamp
            }
        },
        {
            "_id": 0,
            "exchange": 1,
            "tradingSymbol": 1,
            "interval": 1,
            "startTimestamp": 1
        }
    )

    return {
        (
            candle["exchange"],
            candle["tradingSymbol"],
            candle["interval"],
            int(candle["startTimestamp"])
        )
        for candle in historical
    }

def flush_operations(
    operations,
    interval_minutes
):
    if not operations:
        return 0

    candles_collection.bulk_write(
        operations,
        ordered=False
    )

    return len(operations)


def aggregate_interval(
    one_minute_candles,
    interval_minutes,
    historical_candle_keys
):
    now = int(time.time())

    interval_seconds = (
        interval_minutes * 60
    )

    current_bucket_start = (
        now // interval_seconds
    ) * interval_seconds

    grouped = defaultdict(list)

    for candle in one_minute_candles:

        start_timestamp = int(
            candle["startTimestamp"]
        )

        bucket_start = get_bucket_start(
            start_timestamp,
            interval_minutes
        )

        # Never persist an active higher-timeframe candle.
        if bucket_start >= current_bucket_start:
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

    for (
        exchange,
        trading_symbol,
        bucket_start
    ), candles in grouped.items():

        historical_key = (
            exchange,
            trading_symbol,
            f"{interval_minutes}m",
            bucket_start
        )

        if historical_key in historical_candle_keys:
            continue


        candles.sort(
            key=lambda item:
                item["startTimestamp"]
        )

        first = candles[0]
        last = candles[-1]

        bucket_has_complete_constituents = (
            len(candles) == interval_minutes
        )


        bucket_end = (
            bucket_start
            + interval_seconds
        )

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
                    float(candle["high"])
                    for candle in candles
                ),

            "low":
                min(
                    float(candle["low"])
                    for candle in candles
                ),

            "close":
                float(
                    last["close"]
                ),
                
            "volume":
            (
                sum(
                    float(candle["volume"])
                    for candle in candles
                )
                if (
                    bucket_has_complete_constituents
                    and all(
                        candle.get("volume") is not None
                        for candle in candles
                    )
                )
                else None
            ),

            "startTimestamp":
                bucket_start,

            "endTimestamp":
                bucket_end,

            "lastTickTimestamp":
                last.get(
                    "lastTickTimestamp"
                ),

            "source":
                "AGGREGATED_1M",

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
                        bucket_start,

                    "source":
                        "AGGREGATED_1M"
                },
                {
                    "$set":
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
                    operations,
                    interval_minutes
                )
            )

            operations = []

    if operations:
        total_written += (
            flush_operations(
                operations,
                interval_minutes
            )
        )

    return total_written


def run_aggregation_cycle(
    lookback_minutes,
    mode
):
    one_minute_candles = (
        load_one_minute_candles(
            lookback_minutes
        )
    )

    print(
        f"{mode} cycle - "
        f"1m candles loaded: "
        f"{len(one_minute_candles)}"
    )

    historical_candle_keys = (
        load_historical_candle_keys(
            one_minute_candles
        )
    )

    print(
        f"{mode} historical keys loaded: "
        f"{len(historical_candle_keys)}"
    )


    for interval in (
        AGGREGATION_INTERVALS
    ):

        count = aggregate_interval(
            one_minute_candles,
            interval,
            historical_candle_keys
        )

        print(
            f"{mode} {interval}m: "
            f"{count} upserts"
        )


def run_worker():

    print(
        "Aggregation worker started"
    )

    print(
        "Intervals:",
        AGGREGATION_INTERVALS
    )

    print(
        "Backfill lookback:",
        BACKFILL_LOOKBACK_MINUTES
    )

    print(
        "Incremental lookback:",
        INCREMENTAL_LOOKBACK_MINUTES
    )

    # --------------------------------------------------
    # STARTUP BACKFILL
    # --------------------------------------------------

    print(
        "Starting aggregation backfill"
    )

    run_aggregation_cycle(
        BACKFILL_LOOKBACK_MINUTES,
        "BACKFILL"
    )

    print(
        "Aggregation backfill completed"
    )

    # --------------------------------------------------
    # CONTINUOUS INCREMENTAL MODE
    # --------------------------------------------------

    while True:

        time.sleep(
            POLL_INTERVAL_SECONDS
        )

        try:

            run_aggregation_cycle(
                INCREMENTAL_LOOKBACK_MINUTES,
                "INCREMENTAL"
            )

        except Exception as error:

            print(
                "Incremental aggregation error:",
                repr(error)
            )


if __name__ == "__main__":
    run_worker()







