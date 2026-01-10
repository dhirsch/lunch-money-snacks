interface BudgetIconProps {
  hasData: boolean;
  onClick: () => void;
}

/**
 * Icon displayed next to budget input fields
 * Shows different states based on whether there's saved data
 */
export function BudgetIcon({ hasData, onClick }: BudgetIconProps) {
  return (
    <button
      type="button"
      className={`lme-budget-icon ${hasData ? 'lme-budget-icon--has-data' : ''}`}
      onClick={onClick}
      aria-label={hasData ? 'View budget notes (has data)' : 'Add budget notes'}
      title={hasData ? 'View budget notes' : 'Add budget notes'}
    >
      {hasData ? (
        // Filled note icon when there's data
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 1C1.89543 1 1 1.89543 1 3V13C1 14.1046 1.89543 15 3 15H13C14.1046 15 15 14.1046 15 13V3C15 1.89543 14.1046 1 13 1H3ZM4 4H12V5H4V4ZM4 7H12V8H4V7ZM4 10H9V11H4V10Z" />
        </svg>
      ) : (
        // Outline note icon when empty
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="2" width="12" height="12" rx="1" />
          <line x1="4" y1="5" x2="12" y2="5" />
          <line x1="4" y1="8" x2="12" y2="8" />
          <line x1="4" y1="11" x2="9" y2="11" />
        </svg>
      )}
    </button>
  );
}
