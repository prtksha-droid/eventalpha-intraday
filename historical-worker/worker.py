import os
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from growwapi import GrowwAPI
from pymongo import MongoClient, UpdateOne


# --------------------------------------------------
# ENV HELPERS
# --------------------------------------------------

def get_required_env(name):
    value = os.getenv(name)

    if value is None or value == "":
        raise RuntimeError(
            f"{name} is required"
        )

    return value


def get_int_env(name):
    return int(
        get_required_env(name)
    )


def get_float_env(name):
    return float(
        get_required_env(name)
    )


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

GROWW_ACCESS_TOKEN = get_required_env(
    "GROWW_ACCESS_TOKEN"
)

MONGODB_URI = get_required_env(
    "MONGODB_URI"
)

HISTORICAL_INTERVAL = get_required_env(
    "HISTORICAL_INTERVAL"
)

HISTORICAL_LOOKBACK_DAYS = get_int_env(
    "HISTORICAL_LOOKBACK_DAYS"
)

HISTORICAL_REQUEST_WINDOW_DAYS = get_int_env(
    "HISTORICAL_REQUEST_WINDOW_DAYS"
)

HISTORICAL_REQUEST_DELAY_SECONDS = get_float_env(
    "HISTORICAL_REQUEST_DELAY_SECONDS"
)

HISTORICAL_MAX_RETRIES = get_int_env(
    "HISTORICAL_MAX_RETRIES"
)

HISTORICAL_RETRY_DELAY_SECONDS = get_float_env(
    "HISTORICAL_RETRY_DELAY_SECONDS"
)

HISTORICAL_WRITE_BATCH_SIZE = get_int_env(
    "HISTORICAL_WRITE_BATCH_SIZE"
)

HISTORICAL_WORKER_ID = get_int_env(
    "HISTORICAL_WORKER_ID"
)

HISTORICAL_WORKER_COUNT = get_int_env(
    "HISTORICAL_WORKER_COUNT"
)
HISTORICAL_JOB_ID = get_required_env(
    "HISTORICAL_JOB_ID"
)

# --------------------------------------------------
# CLIENTS
# --------------------------------------------------

groww = GrowwAPI(
    GROWW_ACCESS_TOKEN
)

mongo_client = MongoClient(
    MONGODB_URI
)

db = mongo_client[
    "eventalpha_intraday"
]

instruments_collection = db[
    "instruments"
]

candles_collection = db[
    "candles"
]

progress_collection = db[
    "historical_backfill_progress"
]


print(
    "Historical worker started"
)

print(
    f"Worker ID: {HISTORICAL_WORKER_ID}"
)

print(
    f"Worker Count: {HISTORICAL_WORKER_COUNT}"
)

print(
    f"Interval: {HISTORICAL_INTERVAL}"
)

print(
    f"Lookback days: {HISTORICAL_LOOKBACK_DAYS}"
)


# --------------------------------------------------
# INTERVAL MAPPING
# --------------------------------------------------

def get_groww_interval(interval):
    mapping = {
        "1m":
            groww.CANDLE_INTERVAL_MIN_1,

        "5m":
            groww.CANDLE_INTERVAL_MIN_5
    }

    value = mapping.get(
        interval
    )

    if value is None:
        raise RuntimeError(
            f"Unsupported historical interval: "
            f"{interval}"
        )

    return value


GROWW_CANDLE_INTERVAL = (
    get_groww_interval(
        HISTORICAL_INTERVAL
    )
)


# --------------------------------------------------
# LOAD HISTORICAL UNIVERSE
# --------------------------------------------------

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
                "growwSymbol": 1,
                "isin": 1
            }
        ).sort(
            [
                ("exchange", 1),
                ("tradingSymbol", 1)
            ]
        )
    )

    assigned = [
        instrument
        for index, instrument
        in enumerate(instruments)
        if (
            index
            % HISTORICAL_WORKER_COUNT
        ) == HISTORICAL_WORKER_ID
    ]

    return assigned


# --------------------------------------------------
# SYMBOL RESOLUTION
# --------------------------------------------------

def get_groww_symbol(
    instrument
):
    existing = instrument.get(
        "growwSymbol"
    )

    if existing:
        return existing

    exchange = instrument[
        "exchange"
    ]

    trading_symbol = instrument[
        "tradingSymbol"
    ]

    return (
        f"{exchange}-"
        f"{trading_symbol}"
    )


# --------------------------------------------------
# DATE WINDOWS
# --------------------------------------------------

def build_request_windows():
    end_time = datetime.now()

    start_time = (
        end_time
        - timedelta(
            days=(
                HISTORICAL_LOOKBACK_DAYS
            )
        )
    )

    windows = []

    cursor = start_time

    while cursor < end_time:
        window_end = min(
            cursor
            + timedelta(
                days=(
                    HISTORICAL_REQUEST_WINDOW_DAYS
                )
            ),
            end_time
        )

        windows.append(
            (
                cursor,
                window_end
            )
        )

        cursor = window_end

    return windows


# --------------------------------------------------
# PROGRESS TRACKING
# --------------------------------------------------
def progress_key(
    instrument
):
    return {
        "jobId":
            HISTORICAL_JOB_ID,

        "exchange":
            instrument[
                "exchange"
            ],

        "tradingSymbol":
            instrument[
                "tradingSymbol"
            ],

        "interval":
            HISTORICAL_INTERVAL
    }


def already_completed(
    instrument
):
    progress = (
        progress_collection
        .find_one(
            progress_key(
                instrument
            )
        )
    )

    return bool(
        progress
        and progress.get(
            "status"
        ) == "COMPLETED"
    )


def update_progress(
    instrument,
    status,
    **extra
):
    payload = {
        "status":
            status,

        "updatedAt":
            datetime.utcnow(),

        **extra
    }

    progress_collection.update_one(
        progress_key(
            instrument
        ),
        {
            "$set":
                payload
        },
        upsert=True
    )


# --------------------------------------------------
# VALIDATE CANDLE
# --------------------------------------------------

def normalize_candle(
    raw_candle,
    instrument
):
    if (
        not isinstance(
            raw_candle,
            list
        )
        or len(raw_candle) < 6
    ):
        return None

    (
        timestamp_string,
        open_price,
        high_price,
        low_price,
        close_price,
        volume,
        *_
    ) = raw_candle

    # Skip unusable bars such as
    # pre-open placeholders containing
    # missing OHLC values.
    if (
        open_price is None
        or high_price is None
        or low_price is None
        or close_price is None
    ):
        return None

    try:
        candle_datetime = (
            datetime.fromisoformat(
                timestamp_string
            )
        )

        if candle_datetime.tzinfo is None:
            candle_datetime = (
                candle_datetime.replace(
                    tzinfo=ZoneInfo(
                        "Asia/Kolkata"
                    )
                )
            )

        start_timestamp = int(
            candle_datetime.timestamp()
        )

    except Exception:
        return None

    interval_minutes = int(
        HISTORICAL_INTERVAL[
            :-1
        ]
    )

    end_timestamp = (
        start_timestamp
        + (
            interval_minutes
            * 60
        )
    )

    return {
        "exchange":
            instrument[
                "exchange"
            ],

        "tradingSymbol":
            instrument[
                "tradingSymbol"
            ],

        "isin":
            instrument.get(
                "isin",
                ""
            ),

        "interval":
            HISTORICAL_INTERVAL,

        "open":
            float(
                open_price
            ),

        "high":
            float(
                high_price
            ),

        "low":
            float(
                low_price
            ),

        "close":
            float(
                close_price
            ),

        "volume":
            (
                float(volume)
                if volume is not None
                else None
            ),

        "startTimestamp":
            start_timestamp,

        "endTimestamp":
            end_timestamp,

        "source":
            "GROWW_HISTORICAL"
    }


# --------------------------------------------------
# STORE CANDLES
# --------------------------------------------------

def store_candles(
    candles
):
    if not candles:
        return 0

    total = 0

    operations = []

    for candle in candles:
        operations.append(
            UpdateOne(
                {
                    "exchange":
                        candle[
                            "exchange"
                        ],

                    "tradingSymbol":
                        candle[
                            "tradingSymbol"
                        ],

                    "interval":
                        candle[
                            "interval"
                        ],

                    "startTimestamp":
                        candle[
                            "startTimestamp"
                        ]
                },
                {
                    "$set":
                        candle
                },
                upsert=True
            )
        )

        if (
            len(operations)
            >= HISTORICAL_WRITE_BATCH_SIZE
        ):
            candles_collection.bulk_write(
                operations,
                ordered=False
            )

            total += len(
                operations
            )

            operations = []

    if operations:
        candles_collection.bulk_write(
            operations,
            ordered=False
        )

        total += len(
            operations
        )

    return total


# --------------------------------------------------
# FETCH ONE WINDOW
# --------------------------------------------------

def fetch_window(
    instrument,
    start_time,
    end_time
):
    groww_symbol = (
        get_groww_symbol(
            instrument
        )
    )

    response = (
        groww.get_historical_candles(
            exchange=
                instrument[
                    "exchange"
                ],

            segment=
                groww.SEGMENT_CASH,

            groww_symbol=
                groww_symbol,

            start_time=
                start_time.strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),

            end_time=
                end_time.strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),

            candle_interval=
                GROWW_CANDLE_INTERVAL
        )
    )

    if not response:
        return []

    raw_candles = response.get(
        "candles",
        []
    )

    normalized = []

    for raw_candle in raw_candles:
        candle = normalize_candle(
            raw_candle,
            instrument
        )

        if candle:
            normalized.append(
                candle
            )

    return normalized


# --------------------------------------------------
# RETRY WRAPPER
# --------------------------------------------------

def fetch_with_retry(
    instrument,
    start_time,
    end_time
):
    last_error = None

    for attempt in range(
        1,
        HISTORICAL_MAX_RETRIES
        + 1
    ):
        try:
            return fetch_window(
                instrument,
                start_time,
                end_time
            )

        except Exception as error:
            last_error = error

            print(
                f"Historical request failed "
                f"{instrument['exchange']} "
                f"{instrument['tradingSymbol']} "
                f"attempt "
                f"{attempt}/"
                f"{HISTORICAL_MAX_RETRIES}: "
                f"{repr(error)}"
            )

            if (
                attempt
                < HISTORICAL_MAX_RETRIES
            ):
                time.sleep(
                    HISTORICAL_RETRY_DELAY_SECONDS
                )

    raise last_error


# --------------------------------------------------
# PROCESS ONE INSTRUMENT
# --------------------------------------------------

def process_instrument(
    instrument,
    request_windows
):
    if already_completed(
        instrument
    ):
        print(
            f"Skipping completed: "
            f"{instrument['exchange']} "
            f"{instrument['tradingSymbol']}"
        )

        return 0

    print(
        f"Backfilling: "
        f"{instrument['exchange']} "
        f"{instrument['tradingSymbol']}"
    )

    update_progress(
        instrument,
        "RUNNING"
    )

    total_stored = 0

    try:
        for (
            start_time,
            end_time
        ) in request_windows:

            candles = (
                fetch_with_retry(
                    instrument,
                    start_time,
                    end_time
                )
            )

            stored = store_candles(
                candles
            )

            total_stored += stored

            update_progress(
                instrument,
                "RUNNING",
                lastWindowStart=
                    start_time,

                lastWindowEnd=
                    end_time,

                storedCandles=
                    total_stored
            )

            print(
                f"{instrument['exchange']} "
                f"{instrument['tradingSymbol']} "
                f"{start_time} -> "
                f"{end_time}: "
                f"{stored} stored"
            )

            time.sleep(
                HISTORICAL_REQUEST_DELAY_SECONDS
            )

        update_progress(
            instrument,
            "COMPLETED",
            storedCandles=
                total_stored,

            completedAt=
                datetime.utcnow()
        )

        return total_stored

    except Exception as error:
        update_progress(
            instrument,
            "FAILED",
            error=
                repr(error)
        )

        print(
            f"Backfill FAILED: "
            f"{instrument['exchange']} "
            f"{instrument['tradingSymbol']} "
            f"{repr(error)}"
        )

        return 0


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def run_worker():
    instruments = (
        load_intraday_instruments()
    )

    request_windows = (
        build_request_windows()
    )

    print(
        f"Assigned instruments: "
        f"{len(instruments)}"
    )

    print(
        f"Request windows: "
        f"{len(request_windows)}"
    )

    completed = 0

    total_candles = 0

    for index, instrument in enumerate(
        instruments,
        start=1
    ):
        stored = process_instrument(
            instrument,
            request_windows
        )

        total_candles += stored

        if stored > 0:
            completed += 1

        print(
            f"Progress: "
            f"{index}/"
            f"{len(instruments)} "
            f"companies processed, "
            f"{total_candles} candles "
            f"stored"
        )

    print(
        "Historical backfill worker "
        "completed"
    )

    print(
        f"Companies with candles: "
        f"{completed}"
    )

    print(
        f"Total candles stored: "
        f"{total_candles}"
    )


if __name__ == "__main__":
    run_worker()