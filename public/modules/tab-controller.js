import { ChordUtil, TRANSPOSE_MAP } from './chord-util.js';
import { TabRenderer } from './tab-renderer.js?v=pwa-11';
import { TabEditor } from './tab-editor.js?v=pwa-11';

/**
 * Coordinates songs, display controls, URL state, and editor changes.
 */
class TabController {
  constructor() {
    this.renderer = new TabRenderer();
    this.editor = new TabEditor({
      onChange: (data) => { this.tabData = data; this.renderTab(); },
      showToast: (message) => this.showToast(message),
    });
    this.keySelect = document.getElementById('key-select');
    TRANSPOSE_MAP.forEach((value, key) => {
      const option = document.createElement('option');
      option.setAttribute('value', key);
      option.textContent = ChordUtil.replaceFlatSharp(key);
      this.keySelect.appendChild(option);
    });
    this.isKeySelected = false;
    this.keySelect.addEventListener('change', () => {
      this.isKeySelected = true;
      this.renderTab();
    });

    document.addEventListener('tab-maker:select-tab', (event) => {
      this.openTab(event.detail.tabId);
    });
    this.tabSelect = document.getElementById('tab-select');
    if (this.tabSelect) {
      this.tabSelect.addEventListener('change', () => this.openTab(this.tabSelect.value));
    }

    const showPitch = new URL(location).searchParams.get('nn') === '1';
    document.body.classList.toggle('show-pitch', showPitch);
    document.getElementById('toggle-pitch').setAttribute('aria-pressed', String(showPitch));
    document.getElementById('toggle-pitch').addEventListener('click', (e) => {
      const showPitch = document.body.classList.toggle('show-pitch');
      e.currentTarget.setAttribute('aria-pressed', String(showPitch));
      this.syncUrl();
    });
    this.setupTabSizeControls();
  }

  syncUrl() {
    const url = new URL(location);
    if (this.currentTabId) url.searchParams.set('tab', this.currentTabId);
    if (this.keySelect.value) url.searchParams.set('key', this.keySelect.value);
    url.searchParams.set('nn', document.body.classList.contains('show-pitch') ? '1' : '0');
    history.replaceState(history.state, '', url);
  }

  setupTabSizeControls() {
    const tabBody = document.getElementById('tab-body');
    const decrease = document.getElementById('decrease-tab-size');
    const increase = document.getElementById('increase-tab-size');
    let size = 10;
    const updateSize = (delta) => {
      size = Math.min(20, Math.max(5, size + delta));
      tabBody.style.setProperty('--tab-text-scale', size / 10);
      decrease.disabled = size === 5;
      increase.disabled = size === 20;
    };
    decrease.addEventListener('click', () => updateSize(-1));
    increase.addEventListener('click', () => updateSize(1));
    updateSize(0);
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = setTimeout(() => {
      toast.classList.remove('visible');
    }, 1800);
  }

  async openTab(id) {
    if (this.currentTabId === id) {
      return;
    }
    this.currentTabId = id;
    try {
      const response = await fetch(`./tabs/${id}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (this.currentTabId !== id) return;
      this.tabData = data;
      this.editor.setTabData(data);
      this.renderTab();
      if (this.tabSelect) {
        if (![...this.tabSelect.options].some(option => option.value === id)) {
          const option = document.createElement('option');
          option.value = id;
          option.textContent = data.title;
          this.tabSelect.appendChild(option);
        }
        this.tabSelect.value = id;
      }
      document.dispatchEvent(new CustomEvent('tab-maker:tab-loaded', { detail: { tabId: id } }));
    } catch (error) {
      if (this.currentTabId !== id) return;
      this.currentTabId = null;
      this.showToast('failed to load ' + id);
    }
  }

  openLocalStorageTab() {
    const data = this.editor.loadSavedTab();
    if (!data) return false;
    this.tabData = data;
    this.editor.setTabData(data);
    this.renderTab();
    return true;
  }

  renderTab() {
    if (!this.tabData) return;
    // Key selected from dropdown >> deep-link key >> original key
    if (!this.isKeySelected) {
      const url = new URL(location);
      const deepLinkKey = url.searchParams.get('key');
      if (deepLinkKey && TRANSPOSE_MAP.get(deepLinkKey)) {
        this.keySelect.value = deepLinkKey;
      } else {
        this.keySelect.value = this.tabData.originalKey;
      }
    }

    this.renderer.renderTab(this.tabData, this.keySelect.value);
    const capoFret = ChordUtil.capoFret(this.tabData.originalKey, this.keySelect.value);
    document.getElementById('capo-position').textContent = capoFret === null ? ''
      : capoFret === 0 ? '变调夹：无需（0 品）' : `变调夹：第 ${capoFret} 品`;
    this.syncUrl();
  }
}

export { TabController };
