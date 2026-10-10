import { TabController } from './modules/tab-controller.js?v=pwa-9';

function tabMakerMain() {
  const controller = new TabController();
  // Check for deep-link first.
  const url = new URL(location);
  const deepLinkTab = url.searchParams.get('tab');
  if (deepLinkTab) {
    controller.openTab(deepLinkTab);
  } else {
    controller.openLocalStorageTab() || controller.openTab('test');
  }
}

export { tabMakerMain };
