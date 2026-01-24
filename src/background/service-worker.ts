import { extensionApi } from '../utils/extension-api';

// Register listener for extension icon click
extensionApi.action.onClicked.addListener(() => {
  extensionApi.runtime.openOptionsPage();
});
