import type { UserSettings } from '../../storage/schema';

interface FeatureSettingsProps {
  settings: UserSettings;
  onToggle: (key: keyof UserSettings) => void;
  disabled?: boolean;
}

interface FeatureToggle {
  key: keyof UserSettings;
  label: string;
  description: string;
}

const FEATURE_TOGGLES: FeatureToggle[] = [
  {
    key: 'budgetNotesEnabled',
    label: 'Budget Notes',
    description: 'Show note icons next to budget category rows',
  },
  {
    key: 'periodSummaryEnabled',
    label: 'Period Summary',
    description: 'Show the Period Summary card in the budget sidebar',
  },
];

export function FeatureSettings({ settings, onToggle, disabled }: FeatureSettingsProps) {
  return (
    <div className="feature-settings">
      {FEATURE_TOGGLES.map(({ key, label, description }) => (
        <label key={key} className="feature-toggle">
          <div className="feature-toggle__info">
            <span className="feature-toggle__label">{label}</span>
            <span className="feature-toggle__description">{description}</span>
          </div>
          <div className="feature-toggle__switch-wrapper">
            <input
              type="checkbox"
              className="feature-toggle__input"
              checked={settings[key]}
              onChange={() => onToggle(key)}
              disabled={disabled}
            />
            <span className="feature-toggle__switch" />
          </div>
        </label>
      ))}
    </div>
  );
}
