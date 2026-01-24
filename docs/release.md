# Release Process

## Tag-based release

1. Create a new tag:

```bash
git tag vX.Y.Z
```

2. Push tags:

```bash
git push --tags
```

This triggers the GitHub Actions workflow to build Chrome, Firefox, and Safari artifacts and attach them to a GitHub Release.

## Local packaging

```bash
npm run package:chrome
npm run package:firefox
npm run package:safari
```

## Store submissions

- Chrome Web Store: upload `lunchmoney-budget-notes-chrome-vX.Y.Z.zip`.
- Firefox AMO: upload `lunchmoney-budget-notes-firefox-vX.Y.Z.zip`.
- Safari: use `lunchmoney-budget-notes-safari-xcode-vX.Y.Z.zip` to open the Xcode project and build for App Store Connect.

## Safari signing (placeholder)

Once Apple Developer credentials are available:

1. Configure signing in Xcode for the generated project.
2. Build and archive the app.
3. Upload via Xcode Organizer or `xcrun altool`/`xcrun notarytool`.
