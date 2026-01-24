● To publish your extension to the Chrome Web Store, you'll need the following:

  1. Chrome Web Store Developer Account

  - One-time registration fee: $5
  - Register at: https://chrome.google.com/webstore/devconsole
  - Verify your email and identity

  2. Technical Requirements ✅ (Mostly Complete)

  What you have:
  - ✅ Manifest V3 format
  - ✅ Valid manifest.json with required fields
  - ✅ Icons (16x16, 48x48, 128x128)
  - ✅ Description
  - ✅ Permissions declared

  What needs attention:
  - 📝 Version number: Currently 0.1.0 - consider 1.0.0 for initial release
  - 📝 manifest.json: The .vite folder in dist should be excluded from packaging

  3. Store Listing Assets Required

  Screenshots (Required):
  - Minimum: 1 screenshot
  - Recommended: 3-5 screenshots (1280x800 or 640x400)
  - Show key features: modal, notes, itemized breakdown, insert total

  Promotional Images (Optional but recommended):
  - Small tile: 440x280
  - Marquee: 1400x560

  Detailed Description:
  - You have a good README that can be adapted
  - Should highlight: budget enhancement, privacy (local storage), Lunch Money integration

  4. Privacy Policy (Required)

  Since you use the storage permission, you must provide a privacy policy URL. Options:
  - Host on GitHub Pages
  - Use a simple service like https://www.privacypolicies.com/
  - Host on your own site

  Your policy should state:
  - All data is stored locally using Chrome storage API
  - No data is transmitted to external servers
  - No personal information is collected
  - Data only syncs via Chrome sync if user has sync enabled

  5. Packaging Steps

  # 1. Build the extension
  npm run build

  # 2. Clean up the dist folder (remove .vite folder if present)
  rm -rf dist/.vite

  # 3. Create a ZIP file
  cd dist
  zip -r ../lunch-money-enhancer-v1.0.0.zip .
  cd ..

  Important: Only include necessary files in the ZIP:
  - manifest.json
  - icons/
  - assets/
  - src/ (the compiled content scripts)
  - settings.html
  - Any other runtime files

  Exclude:
  - .vite/ folder
  - Source maps (optional - including them helps with debugging)
  - Any development files

  6. Single Purpose Requirement

  Chrome requires extensions have a "single purpose". Your extension's purpose is clear:
  - Primary purpose: Enhance Lunch Money budget page with notes and itemized breakdowns
  - This is well-defined and focused ✅

  7. Recommended Pre-Launch Checklist

  - Test the built extension in Chrome (load unpacked from dist/)
  - Verify all features work in production build
  - Create 3-5 high-quality screenshots
  - Write a compelling store description (adapt from README)
  - Create or find a privacy policy URL
  - Update version to 1.0.0 in manifest.json
  - Test on a fresh Chrome profile
  - Create promotional tile images (optional)

  8. Publishing Process

  1. Go to Chrome Web Store Developer Dashboard
  2. Click "New Item"
  3. Upload your ZIP file
  4. Fill in store listing:
    - Name: "Lunch Money Budget Enhancer"
    - Summary (132 chars max)
    - Detailed description
    - Category: Productivity
    - Language: English
  5. Upload screenshots and icons
  6. Add privacy policy URL
  7. Set pricing (Free recommended)
  8. Submit for review

  Review time: Typically 1-3 days for initial review, though can be longer.

  9. Post-Launch

  - Monitor reviews and ratings
  - Respond to user feedback
  - Push updates as needed (incremental version bumps)

  Would you like me to help you create a build script that packages everything correctly, or help draft a privacy policy?
