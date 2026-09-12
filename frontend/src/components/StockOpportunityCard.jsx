function StockOpportunityCard({
  companyName,
  symbol,
  exchange,
  action,
  reason,
  risk,
  confidence,
  onViewDetails,
}) {
  return (
    <article className="stock-opportunity-card">
      <div className="stock-opportunity-top">
        <div>
          <h3>{companyName || symbol}</h3>

          <p className="stock-symbol">
            {symbol}
            {exchange ? ` · ${exchange}` : ""}
          </p>
        </div>

        <span className="stock-action">
          {action || "Analysis pending"}
        </span>
      </div>

      <div className="stock-reason">
        <span>Why?</span>
        <p>
          {reason ||
            "EventAlpha is still collecting enough evidence to make a decision."}
        </p>
      </div>

      <div className="stock-meta">
        <div>
          <span>Risk</span>
          <strong>{risk || "—"}</strong>
        </div>

        <div>
          <span>Confidence</span>
          <strong>
            {confidence != null
              ? `${confidence}%`
              : "—"}
          </strong>
        </div>
      </div>

      <button
        type="button"
        className="details-button"
        onClick={onViewDetails}
      >
        View details
      </button>
    </article>
  );
}

export default StockOpportunityCard;