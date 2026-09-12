import NewsEvent from "../../models/NewsEvent.js";
import EventCompanyImpact from "../../models/EventCompanyImpact.js";
import {
  evaluateSignal,
} from "../signalEngine.service.js";
import {
  aggregateCompanySignals,
} from "../companySignal.service.js";

export async function getEventFeed({
  limit = 50,
  skip = 0,
} = {}) {
  const events = await NewsEvent.find({
      "metadata.testOnly": {
        $ne: true,
      },
    })
    .sort({
      occurredAt: -1,
      firstPublishedAt: -1,
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();

  if (!events.length) {
    return [];
  }

  const eventIds = events.map(
    (event) => event._id
  );

  const impacts =
    await EventCompanyImpact.find({
      eventId: {
        $in: eventIds,
      },
    })
      .populate(
        "companyId",
        "name isin sector industry listings"
      )
      .lean();
      
  const enrichedImpacts =
    await Promise.all(
      impacts.map(async (impact) => {
        try {
          const signal =
            await evaluateSignal({
              exchange: impact.exchange,
              tradingSymbol: impact.symbol,
            });

          return {
            ...impact,
            signal,
          };
        } catch (error) {
          return {
            ...impact,
            signal: {
              decision: "PENDING",
              reason:
                "Signal analysis unavailable",
              error: error.message,
            },
          };
        }
      })
    );

  const impactsByEvent =
    new Map();

  for (const impact of enrichedImpacts) {
    const eventId =
      String(impact.eventId);

    if (!impactsByEvent.has(eventId)) {
      impactsByEvent.set(
        eventId,
        []
      );
    }

    impactsByEvent
      .get(eventId)
      .push(impact);
  }

  return events.map((event) => {
      const eventImpacts =
        impactsByEvent.get(
          String(event._id)
        ) || [];

      const impactsByCompany =
        new Map();

      for (const impact of eventImpacts) {
        const companyKey =
          String(
            impact.companyId?._id ||
            impact.companyId ||
            impact.symbol
          );

        if (!impactsByCompany.has(companyKey)) {
          impactsByCompany.set(
            companyKey,
            []
          );
        }

        impactsByCompany
          .get(companyKey)
          .push(impact);
      }

      const companySignals =
        Array.from(
          impactsByCompany.entries()
        ).map(
          ([companyId, companyImpacts]) => ({
            companyId,

            companyName:
              companyImpacts[0]
                ?.companyId?.name ||
              companyImpacts[0]?.symbol,

            ...aggregateCompanySignals(
              companyImpacts.map(
                (impact) => impact.signal
              )
            ),
          })
        );

      return {
        ...event,
        impacts: eventImpacts,
        companySignals,
      };
        });
}