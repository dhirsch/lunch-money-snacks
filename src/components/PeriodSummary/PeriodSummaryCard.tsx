interface PeriodSummaryCardProps {
  expectedInflow: number;
  budgetedOutflow: number;
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function PeriodSummaryCard({ expectedInflow, budgetedOutflow }: PeriodSummaryCardProps) {
  const remainingBudget = expectedInflow - budgetedOutflow;
  const remainingColor = remainingBudget >= 0 ? 'color--green' : 'color--red';

  return (
    <div className="ui card" style={{ marginTop: '1rem' }}>
      <div className="content">
        <div className="header">Period Summary</div>
      </div>
      <div className="content">
        <div className="card-content-wrapper">
          <div className="card-content no-wrap">
            <span className="card-text ellipsis font--bold">Expected Inflow</span>
            <span className="card-number">{formatCurrency(expectedInflow)}</span>
          </div>
        </div>
        <div className="card-content-wrapper">
          <div className="card-content no-wrap">
            <span className="card-text ellipsis font--bold">Budgeted Outflow</span>
            <span className="card-number">{formatCurrency(budgetedOutflow)}</span>
          </div>
        </div>
        <p className="divider"></p>
        <div className="card-content-wrapper">
          <div className="card-content no-wrap">
            <span className="card-text ellipsis font--bold">Remaining Budget</span>
            <span className={`card-number ${remainingColor}`}>{formatCurrency(remainingBudget)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
