import { createRoot } from 'react-dom/client';
import { SettingsApp } from './SettingsApp';
import './settings.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SettingsApp />);
}
