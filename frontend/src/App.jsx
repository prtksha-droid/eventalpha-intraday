import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import StockOpportunityCard from "./components/StockOpportunityCard";
import Login from "./components/Login";
import "./App.css";
import { apiUrl } from "./config/api";


async function readJsonResponse(
  response,
  fallbackMessage
) {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `${fallbackMessage} - server returned an empty response`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      response.ok
        ? fallbackMessage
        : `${fallbackMessage} (${response.status})`
    );
  }
}


function nullableNumber(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const number = Number(text);

  if (!Number.isFinite(number)) {
    throw new Error("Please enter valid numeric values.");
  }

  return number;
}


function App() {
  const [authToken, setAuthToken] = useState(
    sessionStorage.getItem(
      "eventalpha_token"
    )
  );

  useEffect(() => {
    localStorage.removeItem(
      "eventalpha_token"
    );
  }, []);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [activeView, setActiveView] =
    useState("overview");

  const [events, setEvents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [notifications, setNotifications] =
    useState([]);

  const [
    notificationError,
    setNotificationError,
  ] = useState("");

  const [userCompanies, setUserCompanies] =
    useState([]);

  const [
    userCompaniesError,
    setUserCompaniesError,
  ] = useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [decisionFilter, setDecisionFilter] =
    useState("ALL");

  const [selectedStock, setSelectedStock] =
    useState(null);

  const [
    editingUserCompanyId,
    setEditingUserCompanyId,
  ] = useState(null);

  const [
    editingTargetPrice,
    setEditingTargetPrice,
  ] = useState("");

  const [
    editingQuantity,
    setEditingQuantity,
  ] = useState("");

  const [
    editingAveragePurchasePrice,
    setEditingAveragePurchasePrice,
  ] = useState("");

  const [
    editingIsWatchlisted,
    setEditingIsWatchlisted,
  ] = useState(false);

  const [
    editingIsInvested,
    setEditingIsInvested,
  ] = useState(false);

  const [
    editingError,
    setEditingError,
  ] = useState("");

  const [
    editingSaving,
    setEditingSaving,
  ] = useState(false);

  const [discoverCompanies, setDiscoverCompanies] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState("");
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotal, setDiscoverTotal] = useState(0);
  const [discoverTotalPages, setDiscoverTotalPages] = useState(1);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [discoverSearchInput, setDiscoverSearchInput] = useState("");
  const [
      discoverRefreshing,
      setDiscoverRefreshing
    ] = useState(false);

    const [
      discoverLastUpdated,
      setDiscoverLastUpdated
    ] = useState(null);

    const [
      discoverRefreshError,
      setDiscoverRefreshError
    ] = useState("");

    const [
      marketSession,
      setMarketSession
    ] = useState(null);

    const [
      marketSessionError,
      setMarketSessionError
    ] = useState("");

    const discoverLastUpdatedText =
      discoverLastUpdated
        ? discoverLastUpdated.toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            }
          )
        : null;


    function handleLogin({ token, user }) {
      localStorage.removeItem(
        "eventalpha_token"
      );

      sessionStorage.setItem(
        "eventalpha_token",
        token
      );

      setAuthToken(token);
      setCurrentUser(user);
    }


  function handleLogout() {
      localStorage.removeItem(
        "eventalpha_token"
      );

      sessionStorage.removeItem(
        "eventalpha_token"
      );

    setAuthToken(null);
    setCurrentUser(null);
    setEvents([]);
    setNotifications([]);
    setUserCompanies([]);
    setSelectedStock(null);
    setActiveView("overview");
  }

  async function handleDiscoverSearchSubmit(event) {
      event.preventDefault();

      setDiscoverPage(1);
      setDiscoverSearch(discoverSearchInput.trim());

      await loadEvents();
    }

    function clearDiscoverSearch() {
      setDiscoverSearchInput("");
      setDiscoverSearch("");
      setDiscoverPage(1);
    }

  const loadCurrentUser =
    useCallback(async () => {
      if (!authToken) {
        return;
      }

      try {
        const response = await fetch(
            apiUrl("/api/auth/me"),
          {
            headers: {
              Authorization:
                `Bearer ${authToken}`,
            },
          }
        );

        if (response.status === 401) {
          handleLogout();
          return;
        }

        const data =
          await readJsonResponse(
            response,
            "Unable to load your account"
          );

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to load your account"
          );
        }

        setCurrentUser(data.user || null);
      } catch (err) {
        console.error(
          "Unable to load current user:",
          err
        );
      }
    }, [authToken]);


  const loadNotifications =
    useCallback(async () => {
      if (!authToken) {
        return;
      }

      setNotificationError("");

      try {
        const response = await fetch(
            apiUrl("/api/notifications"),
          {
            headers: {
              Authorization:
                `Bearer ${authToken}`,
            },
          }
        );

        const data =
          await readJsonResponse(
            response,
            "Unable to load notifications"
          );

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to load notifications"
          );
        }

        setNotifications(
          data.notifications || []
        );
      } catch (err) {
        setNotificationError(
          err.message ||
            "Unable to load notifications"
        );

        console.error(
          "Unable to load notifications:",
          err
        );
      }
    }, [authToken]);

  const loadDiscoverCompanies =
      useCallback(
        async ({
          background = false
        } = {}) => {
          if (!authToken) {
            return;
          }

          try {
            if (background) {
              setDiscoverRefreshing(true);
              setDiscoverRefreshError("");
            } else {
              setDiscoverLoading(true);
              setDiscoverError("");
            }

            const params =
              new URLSearchParams();

            params.set(
              "page",
              String(discoverPage)
            );

            if (
              decisionFilter !== "ALL"
            ) {
              params.set(
                "decision",
                decisionFilter
              );
            }

            if (
              discoverSearch.trim()
            ) {
              params.set(
                "search",
                discoverSearch.trim()
              );
            }

            const response =
              await fetch(
                apiUrl(
                  `/api/companies/intraday-universe?${params.toString()}`
                ),
                {
                  headers: {
                    Authorization:
                      `Bearer ${authToken}`
                  }
                }
              );

            const data =
              await readJsonResponse(
                response,
                "Unable to load companies"
              );

            setDiscoverCompanies(
              Array.isArray(data.companies)
                ? data.companies
                : []
            );

            setDiscoverTotal(
              Number(data.total) || 0
            );

            setDiscoverTotalPages(
              Math.max(
                Number(data.totalPages) || 1,
                1
              )
            );

            setDiscoverLastUpdated(
              new Date()
            );

            setDiscoverError("");
            setDiscoverRefreshError("");
          } catch (error) {
            console.error(
              "Failed to load Discover companies:",
              error
            );

            if (background) {
              /*
               * Background refresh failure must
               * NOT remove the data already being
               * displayed to the user.
               */
              setDiscoverRefreshError(
                error.message ||
                  "Automatic refresh failed"
              );
            } else {
              setDiscoverCompanies([]);

              setDiscoverError(
                error.message ||
                  "Unable to load companies"
              );
            }
          } finally {
            if (background) {
              setDiscoverRefreshing(false);
            } else {
              setDiscoverLoading(false);
            }
          }
        },
        [
          authToken,
          discoverPage,
          discoverSearch,
          decisionFilter
        ]
      );

  const loadUserCompanies =
    useCallback(async () => {
      if (!authToken) {
        return;
      }

      setUserCompaniesError("");

      try {
        const response = await fetch(
            apiUrl("/api/user-companies"),
          {
            headers: {
              Authorization:
                `Bearer ${authToken}`,
            },
          }
        );

        const data =
          await readJsonResponse(
            response,
            "Unable to load your stocks"
          );

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to load your stocks"
          );
        }

        setUserCompanies(
          data.records || []
        );
      } catch (err) {
        setUserCompaniesError(
          err.message ||
            "Unable to load your stocks"
        );

        console.error(
          "Unable to load user companies:",
          err
        );
      }
    }, [authToken]);


  const loadEvents =
      useCallback(async () => {
        if (!authToken) {
          return;
        }

        try {
          setLoading(true);
          setError("");

          const response = await fetch(
            apiUrl("/api/news/events"),
            {
              headers: {
                Authorization:
                  `Bearer ${authToken}`
              }
            }
          );

          const data =
            await readJsonResponse(
              response,
              "Unable to load market events"
            );

          if (!response.ok || !data.success) {
            throw new Error(
              data.error ||
                `Unable to load market events (${response.status})`
            );
          }

          setEvents(data.events || []);
        } catch (err) {
          setError(
            err.message ||
              "Unable to load market events"
           );
          } finally {
          setLoading(false);
        }
      }, [authToken]);

  const loadMarketSession =
    useCallback(async () => {
        if (!authToken) {
          setMarketSession(null);
          setMarketSessionError("");
          return;
        }

        try {
          const response =
            await fetch(
              apiUrl(
                "/api/market/session"
              ),
              {
                headers: {
                  Authorization:
                    `Bearer ${authToken}`
                }
              }
            );

          const data =
            await readJsonResponse(
              response,
              "Unable to load market session"
            );

          if (
            !response.ok ||
            !data.success ||
            !data.session
          ) {
            throw new Error(
              data.error ||
                `Unable to load market session (${response.status})`
            );
          }

          setMarketSession(
            data.session
          );

          setMarketSessionError("");
        } catch (error) {
          console.error(
            "Failed to load market session:",
            error
          );

          setMarketSession(null);

          setMarketSessionError(
            error.message ||
              "Unable to determine market session"
          );
        }
      }, [authToken]);

  useEffect(() => {
      if (!authToken) {
        return undefined;
      }

      loadMarketSession();

      const configuredInterval =
        Number(
          import.meta.env
            .VITE_DISCOVER_REFRESH_MS
        );

      if (
        !Number.isFinite(
          configuredInterval
        ) ||
        configuredInterval <= 0
      ) {
        console.warn(
          "VITE_DISCOVER_REFRESH_MS is not configured correctly. Market-session refresh is disabled."
        );

        return undefined;
      }

      const intervalId =
        window.setInterval(
          () => {
            loadMarketSession();
          },
          configuredInterval
        );

      return () => {
        window.clearInterval(
          intervalId
        );
      };
    }, [
      authToken,
      loadMarketSession
    ]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);


  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);


  useEffect(() => {
    loadUserCompanies();
  }, [loadUserCompanies]);


  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
      const configuredInterval =
        Number(
          import.meta.env
            .VITE_DISCOVER_REFRESH_MS
        );

      const refreshInterval =
        Number.isFinite(
          configuredInterval
        ) &&
        configuredInterval > 0
          ? configuredInterval
          : null;

      /*
       * Load immediately whenever page,
       * search or decision filter changes.
       */
      loadDiscoverCompanies();

  /*
   * No silent hardcoded fallback.
   * If the config is missing or invalid,
   * automatic polling stays disabled.
   */
  if (!refreshInterval) {
    console.warn(
      "VITE_DISCOVER_REFRESH_MS is not configured correctly. Discover auto-refresh is disabled."
    );

    return undefined;
  }

  const intervalId =
    window.setInterval(() => {
      loadDiscoverCompanies({
        background: true
      });
    }, refreshInterval);

  return () => {
    window.clearInterval(
      intervalId
    );
  };
}, [loadDiscoverCompanies]);


  const stockOpportunities =
    useMemo(() => {
      const stockOpportunityMap =
        new Map();

      for (const event of events) {
        const companySignalMap =
          new Map(
            (event.companySignals || []).map(
              (companySignal) => [
                String(
                  companySignal.companyId
                ),
                companySignal,
              ]
            )
          );

        for (
          const impact of event.impacts || []
        ) {
          const companyKey =
            impact.companyId?._id ||
            `${impact.companyId?.name || impact.symbol}`;

          const companySignal =
            companySignalMap.get(
              String(
                impact.companyId?._id
              )
            );

          if (
            !stockOpportunityMap.has(
              companyKey
            )
          ) {
            stockOpportunityMap.set(
              companyKey,
              {
                id: companyKey,

                companyName:
                  impact.companyId?.name ||
                  impact.symbol,

                symbol:
                  impact.symbol,

                exchanges: [],

                action:
                  companySignal?.decision ||
                  null,

                decisionReason:
                  companySignal?.reason ||
                  null,

                reason:
                  event.summary ||
                  event.headline,

                risk: null,
                confidence: null,
                technicalScore: null,

                impacts: [],
              }
            );
          }

          const opportunity =
            stockOpportunityMap.get(
              companyKey
            );

          opportunity.impacts.push(
            impact
          );

          if (
            impact.exchange &&
            !opportunity.exchanges.includes(
              impact.exchange
            )
          ) {
            opportunity.exchanges.push(
              impact.exchange
            );
          }
        }
      }

      return Array.from(
        stockOpportunityMap.values()
      ).map((stock) => {
        const marketReactionEvidence =
          stock.impacts
            .flatMap(
              (impact) =>
                impact.evidence || []
            )
            .find(
              (evidence) =>
                evidence?.type ===
                "MARKET_REACTION"
            );

        const availableReactions =
          marketReactionEvidence?.reactions
            ?.filter(
              (reaction) =>
                reaction.available
            ) || [];

        return {
          ...stock,

          exchange:
            stock.exchanges.join(" / "),

          marketReaction:
            marketReactionEvidence
              ? {
                  interval:
                    marketReactionEvidence.interval,

                  availableCount:
                    availableReactions.length,

                  totalCount:
                    marketReactionEvidence
                      .reactions?.length || 0,
                }
              : null,
        };
      });
    }, [events]);


  const filteredStockOpportunities =
    useMemo(() => {
      return stockOpportunities.filter(
        (stock) => {
          const searchValue =
            searchTerm
              .trim()
              .toLowerCase();

          const matchesSearch =
            !searchValue ||
            stock.companyName
              ?.toLowerCase()
              .includes(searchValue) ||
            stock.symbol
              ?.toLowerCase()
              .includes(searchValue);

          const matchesDecision =
            decisionFilter === "ALL" ||
            stock.action ===
              decisionFilter;

          return (
            matchesSearch &&
            matchesDecision
          );
        }
      );
    }, [
      stockOpportunities,
      searchTerm,
      decisionFilter,
    ]);

  const signalByCompanyId = useMemo(() => {
      const map = new Map();

      for (const event of events) {
        for (const companySignal of event.companySignals || []) {
          const companyId = String(companySignal.companyId || "");

          if (!companyId) {
            continue;
          }

          if (!map.has(companyId)) {
            map.set(companyId, {
              ...companySignal,
              eventHeadline: event.headline || null,
              eventType: event.eventType || null,
              occurredAt: event.occurredAt || null
            });
          }
        }
      }

      return map;
    }, [events]);



  const buyCount =
    stockOpportunities.filter(
      (stock) =>
        stock.action === "BUY"
    ).length;


  const watchCount =
    stockOpportunities.filter(
      (stock) =>
        stock.action === "WATCH"
    ).length;


  const avoidCount =
    stockOpportunities.filter(
      (stock) =>
        stock.action === "AVOID"
    ).length;


  const pendingCount =
    stockOpportunities.filter(
      (stock) =>
        stock.action === "PENDING" ||
        !stock.action
    ).length;


  const unreadNotificationCount =
    notifications.filter(
      (notification) =>
        !notification.isRead
    ).length;


  const editingRecord =
    userCompanies.find(
      (record) =>
        record._id ===
        editingUserCompanyId
    );


  function openStockEditor(record) {
    setEditingUserCompanyId(
      record._id
    );

    setEditingTargetPrice(
      record.userTargetPrice ?? ""
    );

    setEditingQuantity(
      record.quantity ?? ""
    );

    setEditingAveragePurchasePrice(
      record.averagePurchasePrice ?? ""
    );

    setEditingIsWatchlisted(
      Boolean(record.isWatchlisted)
    );

    setEditingIsInvested(
      Boolean(record.isInvested)
    );

    setEditingError("");
  }


  function closeStockEditor() {
    setEditingUserCompanyId(null);
    setEditingTargetPrice("");
    setEditingQuantity("");
    setEditingAveragePurchasePrice("");
    setEditingIsWatchlisted(false);
    setEditingIsInvested(false);
    setEditingError("");
    setEditingSaving(false);
  }


  async function saveStockEditor() {
    if (!editingRecord) {
      return;
    }

    try {
      setEditingSaving(true);
      setEditingError("");

      const companyId =
        editingRecord.companyId?._id ||
        editingRecord.companyId;

      if (!companyId) {
        throw new Error(
          "Company information is missing."
        );
      }

      const response = await fetch(
        apiUrl("/api/user-companies"),
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${authToken}`,
          },

          body: JSON.stringify({
            companyId,

            isWatchlisted:
              editingIsWatchlisted,

            isInvested:
              editingIsInvested,

            quantity:
              nullableNumber(
                editingQuantity
              ),

            averagePurchasePrice:
              nullableNumber(
                editingAveragePurchasePrice
              ),

            userTargetPrice:
              nullableNumber(
                editingTargetPrice
              ),
          }),
        }
      );

      const data =
        await readJsonResponse(
          response,
          "Unable to save stock"
        );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to save stock"
        );
      }

      await loadUserCompanies();

      closeStockEditor();
    } catch (err) {
      setEditingError(
        err.message ||
          "Unable to save stock"
      );
    } finally {
      setEditingSaving(false);
    }
  }


  async function markNotificationRead(
    notificationId
  ) {
    try {
      const response = await fetch(
          apiUrl(
            `/api/notifications/${notificationId}/read`
          ),
        {
          method: "PATCH",

          headers: {
            Authorization:
              `Bearer ${authToken}`,
          },
        }
      );

      const data =
        await readJsonResponse(
          response,
          "Unable to update notification"
        );

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to update notification"
        );
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification._id ===
              notificationId
                ? {
                    ...notification,
                    isRead: true,
                  }
                : notification
          )
      );
    } catch (err) {
      console.error(
        "Unable to mark notification read:",
        err
      );
    }
  }


  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "discover",
      label: "Discover",
    },
    {
      id: "stocks",
      label: "My Stocks",
    },
    {
      id: "events",
      label: "Market Events",
    },
    {
      id: "alerts",
      label: "Alerts",
    },
  ];


  if (!authToken) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }


  function renderSummaryCards() {
    return (
      <div className="summary-grid">
        <button
          type="button"
          className="summary-card summary-buy"
          onClick={() => {
            setDecisionFilter("BUY");
            setActiveView("discover");
          }}
        >
          <span>Buy</span>
          <strong>{buyCount}</strong>
          <small>
            Current opportunities
          </small>
        </button>

        <button
          type="button"
          className="summary-card summary-watch"
          onClick={() => {
            setDecisionFilter("WATCH");
            setActiveView("discover");
          }}
        >
          <span>Watch</span>
          <strong>{watchCount}</strong>
          <small>
            Worth monitoring
          </small>
        </button>

        <button
          type="button"
          className="summary-card summary-avoid"
          onClick={() => {
            setDecisionFilter("AVOID");
            setActiveView("discover");
          }}
        >
          <span>Avoid</span>
          <strong>{avoidCount}</strong>
          <small>
            Current caution signals
          </small>
        </button>

        <button
          type="button"
          className="summary-card summary-pending"
          onClick={() => {
            setDecisionFilter("PENDING");
            setActiveView("discover");
          }}
        >
          <span>Pending</span>
          <strong>{pendingCount}</strong>
          <small>
            Waiting for evidence
          </small>
        </button>
      </div>
    );
  }


  function renderStockGrid(
    stocks
  ) {
    if (loading) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            ...
          </div>

          <h4>
            Analysing the market
          </h4>

          <p>
            Neurava Alpha is loading the
            latest market intelligence.
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            !
          </div>

          <h4>
            Market intelligence unavailable
          </h4>

          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={loadEvents}
          >
            Try again
          </button>
        </div>
      );
    }

    if (stocks.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            -
          </div>

          <h4>
            No matching stock signals
          </h4>

          <p>
            There is no available market
            evidence matching this view
            right now.
          </p>
        </div>
      );
    }

    return (
      <div className="stock-opportunity-grid">
        {stocks.map((stock) => (
          <StockOpportunityCard
            key={stock.id}
            companyName={
              stock.companyName
            }
            symbol={stock.symbol}
            exchange={stock.exchange}
            action={stock.action}
            reason={stock.reason}
            risk={stock.risk}
            confidence={
              stock.confidence
            }
            onViewDetails={() =>
              setSelectedStock(stock)
            }
          />
        ))}
      </div>
    );
  }


  function renderOverview() {
    return (
      <div className="view-content">
        <section className="page-intro">
          <div>
            <p className="eyebrow">
              MARKET PULSE
            </p>

            <h2>
              What needs your attention?
            </h2>

            <p>
              Neurava Alpha combines market
              events and technical evidence
              to surface stocks worth
              reviewing.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              loadEvents();
              loadNotifications();
            }}
          >
            Refresh intelligence
          </button>
        </section>

        {renderSummaryCards()}

        <section className="overview-section">
          <div className="overview-section-header">
            <div>
              <p className="eyebrow">
                ATTENTION
              </p>

              <h3>
                Stocks to review
              </h3>
            </div>

            <button
              type="button"
              className="text-button"
              onClick={() => {
                setDecisionFilter("ALL");
                setActiveView("discover");
              }}
            >
              View all
            </button>
          </div>

          {renderStockGrid(
            stockOpportunities
          )}
        </section>

        <section className="overview-bottom-grid">
          <article className="overview-mini-panel">
            <div className="mini-panel-header">
              <div>
                <p className="eyebrow">
                  MY STOCKS
                </p>

                <h3>
                  Your portfolio
                </h3>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setActiveView("stocks")
                }
              >
                Open
              </button>
            </div>

            {userCompaniesError ? (
              <div className="compact-message error-message">
                {userCompaniesError}
              </div>
            ) : userCompanies.length ===
              0 ? (
              <div className="compact-message">
                No saved stocks yet.
              </div>
            ) : (
              <div className="portfolio-preview">
                {userCompanies.map(
                  (record) => (
                    <button
                      type="button"
                      className="portfolio-preview-row"
                      key={record._id}
                      onClick={() =>
                        setActiveView(
                          "stocks"
                        )
                      }
                    >
                      <div>
                        <strong>
                          {record.companyId
                            ?.name ||
                            "Unknown company"}
                        </strong>

                        <span>
                          {record.isInvested
                            ? "Holding"
                            : "Watchlist"}
                        </span>
                      </div>

                      <div className="portfolio-preview-value">
                        <span>
                          Target
                        </span>

                        <strong>
                          {record.userTargetPrice ??
                            "—"}
                        </strong>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </article>

          <article className="overview-mini-panel">
            <div className="mini-panel-header">
              <div>
                <p className="eyebrow">
                  LATEST EVENT
                </p>

                <h3>
                  Market activity
                </h3>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setActiveView("events")
                }
              >
                Open
              </button>
            </div>

            {loading ? (
              <div className="compact-message">
                Loading market events...
              </div>
            ) : error ? (
              <div className="compact-message error-message">
                {error}
              </div>
            ) : events.length === 0 ? (
              <div className="compact-message">
                No market events available.
              </div>
            ) : (
              <div className="latest-event-preview">
                <span className="event-type">
                  {events[0].eventType ||
                    "Market Event"}
                </span>

                <h4>
                  {events[0].headline}
                </h4>

                {events[0].summary && (
                  <p>
                    {events[0].summary}
                  </p>
                )}
              </div>
            )}
          </article>
        </section>
      </div>
    );
  }

  function renderDiscover() {
      return (
        <div className="view-content">
          <section className="page-intro">
              <div>
                <p className="eyebrow">
                  DISCOVER
                </p>

                <h2>
                  Explore the market
                </h2>

                <p>
                  Search all companies available
                  for intraday market intelligence.
                </p>
              </div>
            </section>


            <div className="discover-refresh-status">
              <div className="discover-refresh-main">
                <span
                  className={`discover-refresh-dot ${
                    discoverRefreshing
                      ? "is-refreshing"
                      : ""
                  }`}
                />

                <span>
                  {discoverRefreshing
                    ? "Refreshing latest available data..."
                    : marketSession?.active === true
                      ? "Market open · auto refresh active"
                      : marketSession?.active === false
                        ? "Market closed · showing latest preserved signals"
                        : marketSessionError
                          ? "Market session status unavailable"
                          : "Checking market session..."}
                </span>
              </div>

              {discoverLastUpdatedText && (
                <span className="discover-last-updated">
                  Last updated{" "}
                  {discoverLastUpdatedText}
                </span>
              )}

              {discoverRefreshError && (
                <span className="discover-refresh-error">
                  Refresh failed — showing previous data
                </span>
              )}
            </div>


<section className="discover-panel">
            <form
              className="discover-toolbar"
              onSubmit={handleDiscoverSearchSubmit}
            >
              <div className="discover-search">
                <input
                  type="search"
                  placeholder="Search company, symbol or ISIN"
                  value={discoverSearchInput}
                  onChange={(event) =>
                    setDiscoverSearchInput(
                      event.target.value
                    )
                  }
                  className="opportunity-search"
                />

                <button
                  type="submit"
                  className="primary-button"
                >
                  Search
                </button>

                <select
                  value={decisionFilter}
                  onChange={(event) => {
                    setDecisionFilter(event.target.value);
                    setDiscoverPage(1);
                  }}
                  className="opportunity-filter"
                  aria-label="Filter by signal"
                >
                  <option value="ALL">All signals</option>
                  <option value="BUY">Buy</option>
                  <option value="WATCH">Watch</option>
                  <option value="AVOID">Avoid</option>
                  <option value="PENDING">Pending</option>
                  <option value="NO SIGNAL">No signal</option>
                </select>

                {discoverSearch && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={clearDiscoverSearch}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="discover-result-count">
                  {discoverLoading
                    ? "Loading..."
                    : `${discoverTotal.toLocaleString()} ${
                        decisionFilter === "ALL"
                          ? "companies"
                          : `${decisionFilter.toLowerCase()} results`
                      }`}
              </div>
            </form>

            {discoverError ? (
              <div className="empty-state">
                <div className="empty-icon">
                  !
                </div>

                <h4>
                  Unable to load companies
                </h4>

                <p>{discoverError}</p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadDiscoverCompanies}
                >
                  Try again
                </button>
              </div>
            ) : discoverLoading ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ...
                </div>

                <h4>
                  Loading companies
                </h4>
              </div>
            ) : discoverCompanies.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  -
                </div>

                <h4>
                  No companies found
                </h4>

                <p>
                  Try another company name,
                  trading symbol or ISIN.
                </p>
              </div>
            ) : (
              <>
                <div className="company-universe-grid">
                  {discoverCompanies.map(
                    (company) => {
                      const signal =
                        company.intradaySignal || null;

                      const tradeSignals =
                          Array.isArray(signal?.signals)
                            ? signal.signals.filter(
                                (item) =>
                                  item?.tradePlan?.available === true
                              )
                            : [];

                      return (
                        <article
                          key={company._id}
                          className="universe-company-card"
                        >
                          <div className="universe-company-header">
                            <div>
                              <h3>
                                {company.name}
                              </h3>

                              <p className="company-isin">
                                {company.isin}
                              </p>
                            </div>

                            <span
                              className={`stock-action ${
                                  signal?.decision
                                    ? `decision-${String(signal.decision).toLowerCase()}`
                                    : "decision-no-signal"
                                }`}
                            >
                              {signal?.decision || "NO SIGNAL"}
                            </span>
                          </div>

                          <div className="company-listings">
                            {(company.listings || [])
                              .filter(
                                (listing) =>
                                  listing.isIntraday
                              )
                              .map((listing) => (
                                <span
                                  key={`${listing.exchange}-${listing.tradingSymbol}`}
                                  className="listing-chip"
                                >
                                  {listing.exchange}
                                  {" · "}
                                  {
                                    listing.tradingSymbol
                                  }
                                </span>
                              ))}
                          </div>

                          <div className="company-meta-row">
                            <span>
                              {company.sector ||
                                "Sector not available"}
                            </span>

                            <span>
                              {company.industry ||
                                "Industry not available"}
                            </span>
                          </div>

                          <div className="company-signal-summary">
                            {signal ? (
                              <>
                                <p>
                                  {signal.reason}
                                </p>


                              </>
                            ) : (
                             <p>
                              No current intraday signal
                              for this company.
                            </p>
                            )}
                          </div>

                          {tradeSignals.length > 0 && (
                              <div className="trade-plan-section">
                                {tradeSignals.map((item) => {
                                  const plan =
                                    item.tradePlan;

                                  return (
                                    <div
                                      key={`${item.exchange}-${item.tradingSymbol}`}
                                      className="trade-plan-card"
                                    >
                                      <div className="trade-plan-header">
                                        <strong>
                                          {item.exchange}
                                          {" · "}
                                          {item.tradingSymbol}
                                        </strong>

                                        <span
                                          className={`trade-plan-status trade-plan-status-${String(
                                            plan.entry?.status || "UNKNOWN"
                                          )
                                            .toLowerCase()
                                            .replaceAll("_", "-")}`}
                                        >
                                          {String(
                                            plan.entry?.status || ""
                                          ).replaceAll("_", " ")}
                                        </span>
                                      </div>

                                      <div className="trade-plan-grid">
                                        <div>
                                          <small>
                                            Current Price
                                          </small>

                                          <strong>
                                            ₹
                                            {Number(
                                              plan.currentPrice?.price
                                            ).toFixed(2)}
                                          </strong>

                                          <span
                                            className={
                                              plan.currentPrice?.fresh
                                                ? "price-fresh"
                                                : "price-stale"
                                            }
                                          >
                                            {plan.currentPrice?.fresh
                                              ? "LIVE"
                                              : "STALE"}
                                          </span>

                                          <small className="trade-plan-price-age">
                                            {Number(
                                              plan.currentPrice?.ageSeconds
                                            ).toFixed(0)}
                                            s ago
                                          </small>
                                        </div>

                                        <div>
                                          <small>
                                            Entry Zone
                                          </small>

                                          <strong>
                                            ₹
                                            {Number(
                                              plan.entry?.lower
                                            ).toFixed(2)}
                                            {" – ₹"}
                                            {Number(
                                              plan.entry?.upper
                                            ).toFixed(2)}
                                          </strong>
                                        </div>

                                        <div>
                                          <small>
                                            Stop Loss
                                          </small>

                                          <strong>
                                            ₹
                                            {Number(
                                              plan.stopLoss?.price
                                            ).toFixed(2)}
                                          </strong>
                                        </div>

                                        <div>
                                          <small>
                                            Target 1
                                          </small>

                                          <strong>
                                            ₹
                                            {Number(
                                              plan.targets?.[0]?.price
                                            ).toFixed(2)}
                                          </strong>
                                        </div>

                                        <div>
                                          <small>
                                            Target 2
                                          </small>

                                          <strong>
                                            ₹
                                            {Number(
                                              plan.targets?.[1]?.price
                                            ).toFixed(2)}
                                          </strong>
                                        </div>

                                        <div>
                                          <small>
                                            Risk
                                          </small>

                                          <strong>
                                            {item.risk?.level ||
                                              "N/A"}
                                          </strong>
                                        </div>

                                        <div>
                                          <small>
                                            Confidence
                                          </small>

                                          <strong>
                                            {item.confidence?.score ??
                                              "N/A"}
                                            %
                                          </strong>
                                        </div>

                                        <div>
                                          <small>
                                            Price Status
                                          </small>

                                          <strong>
                                            {String(
                                              plan.entry?.priceStatus || ""
                                            ).replaceAll("_", " ")}
                                          </strong>
                                        </div>

                                        <div>
                                          <small>
                                            15m Confirmation
                                          </small>

                                          <strong>
                                            {plan.confirmation?.bullish
                                              ? "BULLISH"
                                              : "NOT CONFIRMED"}
                                          </strong>
                                        </div>

                                        <div>
                                          <small>
                                            Exit By
                                          </small>

                                          <strong>
                                            {plan.exit?.hardExitTime}
                                          </strong>
                                        </div>
                                      </div>


                                    </div>
                                  );
                                })}
                              </div>
                            )}
                        </article>
                      );
                    }
                  )}
                </div>

                <div className="pagination-bar">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      discoverPage <= 1 ||
                      discoverLoading
                    }
                    onClick={() =>
                      setDiscoverPage(
                        (page) =>
                          Math.max(
                            page - 1,
                            1
                          )
                      )
                    }
                  >
                    Previous
                  </button>

                  <span>
                    Page {discoverPage} of{" "}
                    {discoverTotalPages}
                  </span>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      discoverPage >=
                        discoverTotalPages ||
                      discoverLoading
                    }
                    onClick={() =>
                      setDiscoverPage(
                        (page) => page + 1
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      );
    }

  function renderMyStocks() {
    return (
      <div className="view-content">
        <section className="page-intro">
          <div>
            <p className="eyebrow">
              MY STOCKS
            </p>

            <h2>
              Watchlist & holdings
            </h2>

            <p>
              Keep your tracked companies,
              holdings and personal target
              prices in one place.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadUserCompanies
            }
          >
            Refresh
          </button>
        </section>

        {userCompaniesError ? (
          <section className="content-panel">
            <div className="empty-state">
              <div className="empty-icon">
                !
              </div>

              <h4>
                Unable to load your stocks
              </h4>

              <p>
                {userCompaniesError}
              </p>
            </div>
          </section>
        ) : userCompanies.length ===
          0 ? (
          <section className="content-panel">
            <div className="empty-state">
              <div className="empty-icon">
                +
              </div>

              <h4>
                No saved stocks yet
              </h4>

              <p>
                Stocks you watch or invest
                in will appear here.
              </p>
            </div>
          </section>
        ) : (
          <div className="my-stocks-list">
            {userCompanies.map(
              (record) => (
                <article
                  className="my-stock-card"
                  key={record._id}
                >
                  <div className="my-stock-company">
                    <div className="stock-avatar">
                      {(record.companyId
                        ?.name ||
                        "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {record.companyId
                          ?.name ||
                          "Unknown company"}
                      </strong>

                      <div className="stock-status-tags">
                        {record.isWatchlisted && (
                          <span className="tag tag-watchlist">
                            Watchlist
                          </span>
                        )}

                        {record.isInvested && (
                          <span className="tag tag-invested">
                            Holding
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="my-stock-values">
                    <span>
                      Quantity
                      <strong>
                        {record.quantity ??
                          "—"}
                      </strong>
                    </span>

                    <span>
                      Avg. price
                      <strong>
                        {record.averagePurchasePrice ??
                          "—"}
                      </strong>
                    </span>

                    <span>
                      Target
                      <strong>
                        {record.userTargetPrice ??
                          "—"}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="edit-stock-button"
                    onClick={() =>
                      openStockEditor(
                        record
                      )
                    }
                  >
                    Edit
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </div>
    );
  }


  function renderMarketEvents() {
    return (
      <div className="view-content">
        <section className="page-intro">
          <div>
            <p className="eyebrow">
              MARKET EVENTS
            </p>

            <h2>
              What is moving the market?
            </h2>

            <p>
              Follow the events currently
              being evaluated by Neurava
              Alpha and the companies they
              may affect.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={loadEvents}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </section>

        <section className="events-feed-panel">
          {loading ? (
            <div className="empty-state">
              <div className="empty-icon">
                ...
              </div>

              <h4>
                Loading market events
              </h4>

              <p>
                Please wait a moment.
              </p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-icon">
                !
              </div>

              <h4>
                Unable to load events
              </h4>

              <p>{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                -
              </div>

              <h4>
                No market events yet
              </h4>

              <p>
                New events will appear here
                when available.
              </p>
            </div>
          ) : (
            <div className="event-list">
              {events.map(
                (event) => (
                  <article
                    className="event-card"
                    key={event._id}
                  >
                    <div className="event-card-top">
                      <div>
                        <span className="event-type">
                          {event.eventType ||
                            "Market Event"}
                        </span>

                        <h4>
                          {event.headline}
                        </h4>

                        {event.summary && (
                          <p>
                            {event.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    {(event.impacts || [])
                      .length > 0 && (
                      <div className="affected-stocks">
                        <span>
                          Affected stocks
                        </span>

                        <div className="stock-tags">
                          {(
                            event.impacts ||
                            []
                          ).map(
                            (impact) => (
                              <span
                                className="stock-tag"
                                key={
                                  impact._id
                                }
                              >
                                {impact.companyId
                                  ?.name ||
                                  impact.symbol}
                                {" · "}
                                {
                                  impact.exchange
                                }
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    );
  }


  function renderAlerts() {
    return (
      <div className="view-content">
        <section className="page-intro">
          <div>
            <p className="eyebrow">
              ALERTS
            </p>

            <h2>
              Your notifications
            </h2>

            <p>
              Target alerts and other
              Neurava Alpha notifications
              will appear here.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadNotifications
            }
          >
            Refresh
          </button>
        </section>

        <section className="alerts-panel">
          {notificationError ? (
            <div className="empty-state">
              <div className="empty-icon">
                !
              </div>

              <h4>
                Unable to load notifications
              </h4>

              <p>
                {notificationError}
              </p>
            </div>
          ) : notifications.length ===
            0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                -
              </div>

              <h4>
                No alerts yet
              </h4>

              <p>
                Neurava Alpha will notify
                you when a tracked stock
                reaches one of your alert
                conditions.
              </p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(
                (notification) => (
                  <article
                    className={`notification-card ${
                      notification.isRead
                        ? "notification-read"
                        : "notification-unread"
                    }`}
                    key={
                      notification._id
                    }
                  >
                    <div className="notification-main">
                      {!notification.isRead && (
                        <span className="unread-dot" />
                      )}

                      <div>
                        <strong>
                          {
                            notification.title
                          }
                        </strong>

                        <p>
                          {
                            notification.message
                          }
                        </p>

                        {notification.companyId
                          ?.name && (
                          <small>
                            {
                              notification
                                .companyId
                                .name
                            }
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="notification-values">
                      <span>
                        Target
                        <strong>
                          {notification.triggerPrice ??
                            "—"}
                        </strong>
                      </span>

                      <span>
                        Observed
                        <strong>
                          {notification.observedPrice ??
                            "—"}
                        </strong>
                      </span>

                      {!notification.isRead && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() =>
                            markNotificationRead(
                              notification._id
                            )
                          }
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    );
  }


  function renderActiveView() {
    switch (activeView) {
      case "discover":
        return renderDiscover();

      case "stocks":
        return renderMyStocks();

      case "events":
        return renderMarketEvents();

      case "alerts":
        return renderAlerts();

      case "overview":
      default:
        return renderOverview();
    }
  }


  return (
    <div className="app">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              N
            </div>

            <div>
              <h1>
                Neurava Alpha
              </h1>

              <p>
                Market Intelligence
              </p>
            </div>
          </div>

          <nav className="sidebar-navigation">
            <p className="sidebar-label">
              WORKSPACE
            </p>

            {navigationItems.map(
              (item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`sidebar-nav-item ${
                    activeView ===
                    item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setActiveView(
                      item.id
                    )
                  }
                >
                  <span>
                    {item.label}
                  </span>

                  {item.id ===
                    "alerts" &&
                    unreadNotificationCount >
                      0 && (
                      <span className="nav-badge">
                        {
                          unreadNotificationCount
                        }
                      </span>
                    )}
                </button>
              )
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="user-avatar">
                {(currentUser?.name ||
                  currentUser?.email ||
                  "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="sidebar-user-details">
                <strong>
                  {currentUser?.name ||
                    "Neurava User"}
                </strong>

                {currentUser?.email && (
                  <span>
                    {currentUser.email}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={
                handleLogout
              }
            >
              Sign out
            </button>
          </div>
        </aside>


        <div className="workspace">
          <header className="workspace-topbar">
            <div className="mobile-brand">
              <strong>
                Neurava Alpha
              </strong>
            </div>

            <div
              className={`workspace-status ${
                marketSession?.active === true
                  ? "market-open"
                  : marketSession?.active === false
                    ? "market-closed"
                    : "market-unknown"
              }`}
            >
              <span className="status-dot" />

              <span>
                {marketSession?.active === true
                  ? "Market Open"
                  : marketSession?.active === false
                    ? "Market Closed"
                    : "Market Status"}
              </span>
            </div>

            <span className="beta-badge">
              BETA
            </span>

            <button
              type="button"
              className="alerts-shortcut"
              onClick={() =>
                setActiveView(
                  "alerts"
                )
              }
            >
              Alerts

              {unreadNotificationCount >
                0 && (
                <span className="nav-badge">
                  {
                    unreadNotificationCount
                  }
                </span>
              )}
            </button>
          </header>

          <main className="workspace-content">
              <div
                className="beta-disclaimer"
                role="note"
              >
                <strong>
                  Beta market intelligence.
                </strong>

                <span>
                  Signals and trade plans are
                  informational and may be delayed
                  or incomplete. They are not
                  investment advice. Verify market
                  data and assess risk before making
                  any trading decision.
                </span>
              </div>

              {renderActiveView()}
            </main>
        </div>
      </div>


      {selectedStock && (
        <>
          <button
            type="button"
            className="drawer-backdrop"
            aria-label="Close stock details"
            onClick={() =>
              setSelectedStock(null)
            }
          />

          <aside className="drawer stock-drawer">
            <div className="drawer-header">
              <div>
                <p className="eyebrow">
                  STOCK ANALYSIS
                </p>

                <h2>
                  {
                    selectedStock.companyName
                  }
                </h2>

                <p className="drawer-symbol">
                  {selectedStock.symbol}
                  {" · "}
                  {
                    selectedStock.exchange
                  }
                </p>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setSelectedStock(
                    null
                  )
                }
              >
                Close
              </button>
            </div>

            <div className="drawer-decision">
              <span>
                Current view
              </span>

              <strong
                className={`decision-value decision-${(
                  selectedStock.action ||
                  "pending"
                ).toLowerCase()}`}
              >
                {selectedStock.action ||
                  "PENDING"}
              </strong>

              <p>
                {selectedStock.decisionReason ||
                  "Decision reason is not available yet."}
              </p>
            </div>

            <div className="drawer-metrics">
              <div>
                <span>
                  Risk
                </span>

                <strong>
                  {selectedStock.risk ??
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Confidence
                </span>

                <strong>
                  {selectedStock.confidence !=
                  null
                    ? `${selectedStock.confidence}%`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>
                  Technical score
                </span>

                <strong>
                  {selectedStock.technicalScore ??
                    "—"}
                </strong>
              </div>
            </div>

            <div className="drawer-section">
              <span className="drawer-section-label">
                WHY THIS MATTERS
              </span>

              <p>
                {selectedStock.reason ||
                  "No event explanation is available yet."}
              </p>
            </div>

            <div className="drawer-section">
              <span className="drawer-section-label">
                MARKET REACTION
              </span>

              {selectedStock.marketReaction ? (
                <p>
                  {selectedStock
                    .marketReaction
                    .availableCount > 0
                    ? `${selectedStock.marketReaction.availableCount} of ${selectedStock.marketReaction.totalCount} reaction checks are available using ${selectedStock.marketReaction.interval} candles.`
                    : "Market reaction data is not available yet for this event."}
                </p>
              ) : (
                <p>
                  Neurava Alpha has not
                  recorded market reaction
                  evidence for this stock yet.
                </p>
              )}
            </div>

            <div className="drawer-section">
              <span className="drawer-section-label">
                EXCHANGES
              </span>

              <div className="stock-tags">
                {selectedStock.exchanges?.map(
                  (exchange) => (
                    <span
                      className="stock-tag"
                      key={exchange}
                    >
                      {exchange}
                    </span>
                  )
                )}
              </div>
            </div>
          </aside>
        </>
      )}


      {editingRecord && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeStockEditor();
            }
          }}
        >
          <div
            className="modal-card stock-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-edit-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  MY STOCKS
                </p>

                <h3 id="stock-edit-title">
                  Edit{" "}
                  {editingRecord
                    .companyId?.name ||
                    "stock"}
                </h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeStockEditor
                }
              >
                Close
              </button>
            </div>

            <div className="modal-body">
              {editingError && (
                <div className="form-error">
                  {editingError}
                </div>
              )}

              <div className="toggle-row">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={
                      editingIsWatchlisted
                    }
                    onChange={(event) =>
                      setEditingIsWatchlisted(
                        event.target
                          .checked
                      )
                    }
                  />

                  <span>
                    Add to watchlist
                  </span>
                </label>

                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={
                      editingIsInvested
                    }
                    onChange={(event) =>
                      setEditingIsInvested(
                        event.target
                          .checked
                      )
                    }
                  />

                  <span>
                    I own this stock
                  </span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="stock-target-price">
                  Target price
                </label>

                <input
                  id="stock-target-price"
                  type="number"
                  inputMode="decimal"
                  className="form-control"
                  value={
                    editingTargetPrice
                  }
                  onChange={(event) =>
                    setEditingTargetPrice(
                      event.target.value
                    )
                  }
                  placeholder="No target set"
                />
              </div>

              <div className="modal-form-grid">
                <div className="form-group">
                  <label htmlFor="stock-quantity">
                    Quantity
                  </label>

                  <input
                    id="stock-quantity"
                    type="number"
                    inputMode="decimal"
                    className="form-control"
                    value={
                      editingQuantity
                    }
                    onChange={(event) =>
                      setEditingQuantity(
                        event.target.value
                      )
                    }
                    placeholder="—"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="stock-average-price">
                    Average purchase price
                  </label>

                  <input
                    id="stock-average-price"
                    type="number"
                    inputMode="decimal"
                    className="form-control"
                    value={
                      editingAveragePurchasePrice
                    }
                    onChange={(event) =>
                      setEditingAveragePurchasePrice(
                        event.target.value
                      )
                    }
                    placeholder="—"
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  closeStockEditor
                }
                disabled={
                  editingSaving
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  saveStockEditor
                }
                disabled={
                  editingSaving
                }
              >
                {editingSaving
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default App;
