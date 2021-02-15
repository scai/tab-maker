import { TabRenderer } from './modules/tab-renderer.js';

function tabMakerMain() {
  const renderer = new TabRenderer();
  // Check for deep-link first.
  const url = new URL(location);
  const deepLinkTab = url.searchParams.get('tab');
  if (deepLinkTab) {
    renderer.openTab(deepLinkTab);
  } else {
    renderer.openLocalStorageTab() || renderer.openTab('test');
  }
}

export { tabMakerMain };