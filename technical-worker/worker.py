import math
import os
import time

from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed
)

from pymongo import MongoClient
import redis


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


def get_float_env(name):
    return float(
        get_required_env(name)
    )


MONGODB_URI = get_required_env(
    "MONGODB_URI"
)

REDIS_URL = get_required_env(
    "REDIS_URL"
)

TECHNICAL_INTERVALS = [
    value.strip()
    for value in get_required_env(
        "TECHNICAL_INTERVALS"
    ).split(",")
    if value.strip()
]


RSI_PERIOD = get_int_env(
    "RSI_PERIOD"
)

EMA_FAST_PERIOD = get_int_env(
    "EMA_FAST_PERIOD"
)

EMA_SLOW_PERIOD = get_int_env(
    "EMA_SLOW_PERIOD"
)

MACD_SIGNAL_PERIOD = get_int_env(
    "MACD_SIGNAL_PERIOD"
)

ATR_PERIOD = get_int_env(
    "ATR_PERIOD"
)

BOLLINGER_PERIOD = get_int_env(
    "BOLLINGER_PERIOD"
)

BOLLINGER_STDDEV = get_float_env(
    "BOLLINGER_STDDEV"
)

MOMENTUM_PERIOD = get_int_env(
    "MOMENTUM_PERIOD"
)

TECHNICAL_HISTORY_LIMIT = get_int_env(
    "TECHNICAL_HISTORY_LIMIT"
)

TECHNICAL_POLL_SECONDS = get_int_env(
    "TECHNICAL_POLL_SECONDS"
)

TECHNICAL_CONCURRENCY = get_int_env(
    "TECHNICAL_CONCURRENCY"
)

if TECHNICAL_CONCURRENCY <= 0:
    raise RuntimeError(
        "TECHNICAL_CONCURRENCY must be greater than zero"
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

instruments_collection = db[
    "instruments"
]

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True
)


def calculate_ema(values, period):
    if len(values) < period:
        return None

    multiplier = (
        2 / (period + 1)
    )

    initial = sum(
        values[:period]
    ) / period

    ema = initial

    for value in values[period:]:
        ema = (
            value * multiplier
            + ema * (1 - multiplier)
        )

    return ema


def calculate_ema_series(
    values,
    period
):
    if len(values) < period:
        return []

    multiplier = (
        2 / (period + 1)
    )

    initial = sum(
        values[:period]
    ) / period

    result = [initial]

    ema = initial

    for value in values[period:]:
        ema = (
            value * multiplier
            + ema * (1 - multiplier)
        )

        result.append(
            ema
        )

    return result


def calculate_rsi(
    closes,
    period
):
    if len(closes) <= period:
        return None

    gains = []
    losses = []

    for index in range(
        1,
        len(closes)
    ):
        change = (
            closes[index]
            - closes[index - 1]
        )

        gains.append(
            max(change, 0)
        )

        losses.append(
            max(-change, 0)
        )

    if len(gains) < period:
        return None

    average_gain = (
        sum(gains[:period])
        / period
    )

    average_loss = (
        sum(losses[:period])
        / period
    )

    for index in range(
        period,
        len(gains)
    ):
        average_gain = (
            (
                average_gain
                * (period - 1)
            )
            + gains[index]
        ) / period

        average_loss = (
            (
                average_loss
                * (period - 1)
            )
            + losses[index]
        ) / period

    if average_loss == 0:
        return 100.0

    relative_strength = (
        average_gain
        / average_loss
    )

    return (
        100
        - (
            100
            / (
                1
                + relative_strength
            )
        )
    )


def calculate_macd(
    closes,
    fast_period,
    slow_period,
    signal_period
):
    if (
        len(closes)
        < slow_period + signal_period
    ):
        return None

    fast_series = calculate_ema_series(
        closes,
        fast_period
    )

    slow_series = calculate_ema_series(
        closes,
        slow_period
    )

    offset = (
        slow_period
        - fast_period
    )

    aligned_fast = fast_series[
        offset:
    ]

    length = min(
        len(aligned_fast),
        len(slow_series)
    )

    macd_series = [
        aligned_fast[index]
        - slow_series[index]
        for index in range(length)
    ]

    if len(macd_series) < signal_period:
        return None

    signal = calculate_ema(
        macd_series,
        signal_period
    )

    macd_value = (
        macd_series[-1]
    )

    histogram = (
        macd_value
        - signal
    )

    return {
        "macd": macd_value,
        "signal": signal,
        "histogram": histogram
    }


def calculate_atr(
    candles,
    period
):
    if len(candles) <= period:
        return None

    true_ranges = []

    for index in range(
        1,
        len(candles)
    ):
        current = candles[index]
        previous = candles[
            index - 1
        ]

        high = float(
            current["high"]
        )

        low = float(
            current["low"]
        )

        previous_close = float(
            previous["close"]
        )

        true_range = max(
            high - low,
            abs(
                high
                - previous_close
            ),
            abs(
                low
                - previous_close
            )
        )

        true_ranges.append(
            true_range
        )

    if len(true_ranges) < period:
        return None

    atr = (
        sum(
            true_ranges[:period]
        )
        / period
    )

    for value in true_ranges[
        period:
    ]:
        atr = (
            (
                atr
                * (period - 1)
            )
            + value
        ) / period

    return atr


def calculate_bollinger(
    closes,
    period,
    stddev_multiplier
):
    if len(closes) < period:
        return None

    values = closes[
        -period:
    ]

    middle = (
        sum(values)
        / period
    )

    variance = (
        sum(
            (
                value
                - middle
            ) ** 2
            for value in values
        )
        / period
    )

    standard_deviation = math.sqrt(
        variance
    )

    upper = (
        middle
        + (
            stddev_multiplier
            * standard_deviation
        )
    )

    lower = (
        middle
        - (
            stddev_multiplier
            * standard_deviation
        )
    )

    return {
        "middle": middle,
        "upper": upper,
        "lower": lower
    }


def calculate_momentum(
    closes,
    period
):
    if len(closes) <= period:
        return None

    previous = closes[
        -(period + 1)
    ]

    current = closes[-1]

    absolute_change = (
        current
        - previous
    )

    percentage_change = (
        absolute_change
        / previous
        * 100
    ) if previous else None

    return {
        "absolute": absolute_change,
        "percentage": percentage_change
    }


def get_securities_for_interval(
    interval
):
    results = instruments_collection.find(
        {
            "isActive": True,
            "isIntraday": True
        },
        {
            "_id": 0,
            "exchange": 1,
            "tradingSymbol": 1
        }
    )

    return [
        {
            "exchange":
                item["exchange"],

            "tradingSymbol":
                item["tradingSymbol"]
        }
        for item in results
        if item.get("exchange")
        and item.get("tradingSymbol")
    ]


def load_candles(
    exchange,
    trading_symbol,
    interval
):
    candles = list(
        candles_collection.find(
            {
                "exchange":
                    exchange,

                "tradingSymbol":
                    trading_symbol,

                "interval":
                    interval
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
                "startTimestamp": 1,
                "endTimestamp": 1,
            }
        )
        .sort(
            "startTimestamp",
            -1
        )
        .limit(
            TECHNICAL_HISTORY_LIMIT
        )
    )

    candles.reverse()

    return candles


def calculate_snapshot(
    candles
):
    if not candles:
        return None

    closes = [
        float(
            candle["close"]
        )
        for candle in candles
    ]

    latest = candles[-1]

    ema_fast = calculate_ema(
        closes,
        EMA_FAST_PERIOD
    )

    ema_slow = calculate_ema(
        closes,
        EMA_SLOW_PERIOD
    )

    rsi = calculate_rsi(
        closes,
        RSI_PERIOD
    )

    macd = calculate_macd(
        closes,
        EMA_FAST_PERIOD,
        EMA_SLOW_PERIOD,
        MACD_SIGNAL_PERIOD
    )

    atr = calculate_atr(
        candles,
        ATR_PERIOD
    )

    bollinger = calculate_bollinger(
        closes,
        BOLLINGER_PERIOD,
        BOLLINGER_STDDEV
    )

    momentum = calculate_momentum(
        closes,
        MOMENTUM_PERIOD
    )

    return {
        "exchange":
            latest["exchange"],

        "tradingSymbol":
            latest[
                "tradingSymbol"
            ],

        "isin":
            latest.get(
                "isin",
                ""
            ),

        "close":
            closes[-1],

        "emaFast":
            ema_fast,

        "emaSlow":
            ema_slow,

        "rsi":
            rsi,

        "macd":
            macd,

        "atr":
            atr,

        "bollinger":
            bollinger,

        "momentum":
            momentum,

        "lastCandleTimestamp":
            latest[
                "endTimestamp"
            ]
    }

def build_technical_payload(
    security,
    interval
):
    exchange = (
        security["exchange"]
    )

    trading_symbol = (
        security[
            "tradingSymbol"
        ]
    )

    candles = load_candles(
        exchange,
        trading_symbol,
        interval
    )

    snapshot = calculate_snapshot(
        candles
    )

    if not snapshot:
        return None

    redis_key = (
        f"technical:"
        f"{interval}:"
        f"{exchange}:"
        f"{trading_symbol}"
    )

    mapping = {
        "exchange":
            exchange,

        "tradingSymbol":
            trading_symbol,

        "isin":
            snapshot["isin"],

        "close":
            snapshot["close"],

        "emaFast":
            snapshot["emaFast"]
            if snapshot["emaFast"] is not None
            else "",

        "emaSlow":
            snapshot["emaSlow"]
            if snapshot["emaSlow"] is not None
            else "",

        "rsi":
            snapshot["rsi"]
            if snapshot["rsi"] is not None
            else "",

        "macd":
            snapshot["macd"]["macd"]
            if snapshot["macd"]
            else "",

        "macdSignal":
            snapshot["macd"]["signal"]
            if snapshot["macd"]
            else "",

        "macdHistogram":
            snapshot["macd"]["histogram"]
            if snapshot["macd"]
            else "",

        "atr":
            snapshot["atr"]
            if snapshot["atr"] is not None
            else "",

        "bollingerMiddle":
            snapshot["bollinger"]["middle"]
            if snapshot["bollinger"]
            else "",

        "bollingerUpper":
            snapshot["bollinger"]["upper"]
            if snapshot["bollinger"]
            else "",

        "bollingerLower":
            snapshot["bollinger"]["lower"]
            if snapshot["bollinger"]
            else "",

        "momentumAbsolute":
            snapshot["momentum"]["absolute"]
            if snapshot["momentum"]
            else "",

        "momentumPercentage":
            snapshot["momentum"]["percentage"]
            if snapshot["momentum"]
            else "",

        "lastCandleTimestamp":
            snapshot[
                "lastCandleTimestamp"
            ]
    }

    return (
        redis_key,
        mapping
    )

def process_interval(
    interval
):
    started_at = time.time()

    securities = (
        get_securities_for_interval(
            interval
        )
    )

    stored = 0
    failed = 0

    pipeline = (
        redis_client.pipeline()
    )

    with ThreadPoolExecutor(
        max_workers=TECHNICAL_CONCURRENCY
    ) as executor:

        futures = [
            executor.submit(
                build_technical_payload,
                security,
                interval
            )
            for security in securities
        ]

        for future in as_completed(
            futures
        ):
            try:
                result = (
                    future.result()
                )
            except Exception as error:
                failed += 1

                print(
                    f"{interval} technical "
                    f"security processing error:",
                    repr(error)
                )

                continue

            if not result:
                continue

            redis_key, mapping = (
                result
            )

            pipeline.hset(
                redis_key,
                mapping=mapping
            )

            stored += 1

    if stored:
        pipeline.execute()

    elapsed_seconds = (
        time.time() -
        started_at
    )

    print(
        f"{interval}: processed "
        f"{len(securities)} securities "
        f"in {elapsed_seconds:.1f}s "
        f"with {failed} failures"
    )

    return stored


def run_worker():

    print(
        "Technical worker started"
    )

    print(
        "Intervals:",
        TECHNICAL_INTERVALS
    )

    print(
        "Concurrency:",
        TECHNICAL_CONCURRENCY
    )

    while True:

        try:

            for interval in (
                TECHNICAL_INTERVALS
            ):

                count = (
                    process_interval(
                        interval
                    )
                )

                print(
                    f"{interval}: "
                    f"{count} technical "
                    f"snapshots stored"
                )

        except Exception as error:

            print(
                "Technical worker error:",
                repr(error)
            )

        time.sleep(
            TECHNICAL_POLL_SECONDS
        )


if __name__ == "__main__":
    run_worker()
