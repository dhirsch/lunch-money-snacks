# Lunch Money Budget Enhancer

A Chrome extension that enhances the Lunch Money budget view by allowing users to add detailed notes and itemized breakdowns to budget line items.

## Features

- **Budget Notes**: Add free-form text notes to any budget category
- **Itemized Breakdowns**: Create detailed expense/income breakdowns with running totals
- **Insert Total**: Automatically populate budget fields with calculated totals
- **Month-Aware**: Data persists per month per category
- **Category Management**: Handle renamed categories through the settings page
- **Local Storage**: All data stored locally in your browser

## Installation

### Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dinnermoney
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from the project

### Production Build

```bash
npm run build
```

The built extension will be in the `dist` folder.

## Usage

### Adding Notes and Breakdowns

1. Navigate to your Lunch Money budget view
2. Look for the small icon next to each budget input field
3. Click the icon to open the modal
4. Add notes and/or itemized breakdown items
5. Click "Save" or press `Ctrl+Enter` to save changes

### Itemized Breakdown

1. Enter a description and amount in the quick-entry form
2. Press `Enter` to add the item
3. Click on any item to edit it inline
4. Click "Insert Total" to populate the budget field with the calculated sum

### Managing Categories

1. Click the extension icon in Chrome toolbar
2. View storage usage and all categories with saved data
3. Use "Rename" to merge data when you've renamed a category in Lunch Money
4. Use "Export Data" to backup your notes

## Development

### Project Structure

```
src/
├── content/          # Content script (injected into Lunch Money)
│   ├── index.tsx     # Entry point
│   ├── BudgetEnhancer.tsx
│   └── hooks/        # React hooks for DOM detection
├── components/       # React components
│   ├── Modal/        # Budget modal components
│   ├── Icon/         # Icon components
│   └── Settings/     # Settings page components
├── storage/          # Chrome storage layer
├── settings/         # Settings page entry
├── types/            # TypeScript types
└── utils/            # Utility functions
```

### Running Tests

```bash
npm test
```

### Key Technologies

- **React 18** - UI components
- **TypeScript** - Type safety
- **Vite** - Build tooling
- **Vitest** - Testing
- **Chrome Extension Manifest V3** - Extension platform

## Data Storage

Data is stored in Chrome's local storage with the following key format:
```
{YYYY-MM}:{categoryName}
```

Each entry contains:
- `notes`: Free-form text notes
- `items`: Array of itemized breakdown items
- `lastModified`: Timestamp of last modification

## Privacy

All data is stored locally in your browser. No data is sent to any external servers.

## License

MIT
