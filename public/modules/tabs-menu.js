/**
 * Tabs Menu Manager
 * Handles the collapsible dropdown menu for selecting tabs
 */
class TabsMenuManager {
  constructor() {
    this.toggleBtn = document.getElementById('tabs-menu-toggle');
    this.dropdown = document.getElementById('tabs-menu-dropdown');
    this.tabsList = document.getElementById('tabs-menu-list');
    this.searchInput = document.getElementById('tabs-menu-search');
    this.allTabs = [];
    const url = new URL(location);
    this.currentTab = url.searchParams.get('tab');
    this.landingSearch = document.getElementById('landing-search');
    this.landingSongs = document.getElementById('landing-songs');

    this.setupEventListeners();
    this.loadTabsList();
  }

  setupEventListeners() {
    this.landingSearch.addEventListener('input', () => this.renderLanding());
    document.addEventListener('tab-maker:tab-loaded', (event) => {
      this.currentTab = event.detail.tabId;
      this.filterTabs(this.searchInput.value.toLowerCase());
    });
    // Toggle dropdown on button click
    this.toggleBtn.addEventListener('click', () => {
      this.dropdown.classList.toggle('active');
      if (this.dropdown.classList.contains('active')) {
        this.searchInput.focus();
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tabs-menu-header')) {
        this.dropdown.classList.remove('active');
      }
    });

    // Search/filter functionality
    this.searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      this.filterTabs(searchTerm);
    });

    // Close dropdown when a tab is selected
    this.tabsList.addEventListener('click', (e) => {
      if (e.target.tagName === 'LI' && e.target.dataset.tab) {
        const tabId = e.target.dataset.tab;
        this.selectTab(tabId);
        this.dropdown.classList.remove('active');
      }
    });
  }

  async loadTabsList() {
    try {
      const response = await fetch('./tabs/manifest.json');
      const data = await response.json();
      this.allTabs = data.tabs;
      this.renderTabs(this.allTabs);
      this.renderLanding();
    } catch (error) {
      console.error('Failed to load tabs manifest:', error);
      // Fallback if manifest fails
      this.allTabs = [];
      this.landingSongs.textContent = '曲库加载失败，请刷新重试。';
    }
  }

  renderLanding() {
    const query = this.landingSearch.value.trim().toLowerCase();
    const tabs = this.allTabs.filter(tab =>
      `${this.getTabId(tab)} ${this.getTabTitle(tab)}`.toLowerCase().includes(query));
    document.getElementById('landing-count').textContent = `${tabs.length} 首`;
    this.landingSongs.replaceChildren();
    if (!tabs.length) {
      const empty = document.createElement('li');
      empty.textContent = '没有找到歌曲，试试歌手名。';
      this.landingSongs.append(empty);
    }
    tabs.forEach(tab => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      const parts = this.getTabTitle(tab).split(' - ');
      const artist = parts.length > 1 ? parts.shift() : '';
      const title = document.createElement('span');
      title.textContent = parts.join(' - ');
      const artistLabel = document.createElement('small');
      artistLabel.textContent = artist;
      if (artist) title.append(artistLabel);
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      arrow.setAttribute('aria-hidden', 'true');
      button.append(title, arrow);
      button.addEventListener('click', () => {
        this.selectTab(this.getTabId(tab));
      });
      item.append(button);
      this.landingSongs.append(item);
    });
  }

  renderTabs(tabs) {
    this.tabsList.innerHTML = '';
    if (tabs.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No tabs found';
      li.style.padding = '10px 15px';
      li.style.color = '#999';
      li.style.cursor = 'default';
      this.tabsList.appendChild(li);
      return;
    }

    tabs.forEach((tab) => {
      const tabId = this.getTabId(tab);
      const li = document.createElement('li');
      li.textContent = this.getTabTitle(tab);
      li.dataset.tab = tabId;
      if (tabId === this.currentTab) {
        li.classList.add('active');
      }
      this.tabsList.appendChild(li);
    });
  }

  filterTabs(searchTerm) {
    if (!searchTerm) {
      this.renderTabs(this.allTabs);
      return;
    }

    const filtered = this.allTabs.filter((tab) =>
      this.getTabId(tab).toLowerCase().includes(searchTerm) ||
      this.getTabTitle(tab).toLowerCase().includes(searchTerm)
    );
    this.renderTabs(filtered);
  }

  getTabId(tab) {
    return typeof tab === 'string' ? tab : tab.id;
  }

  getTabTitle(tab) {
    if (typeof tab !== 'string') {
      return tab.title || this.formatTabId(tab.id);
    }
    return this.formatTabId(tab);
  }

  formatTabId(tabId) {
    return tabId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  selectTab(tabId) {
    this.currentTab = tabId;
    const tabSelect = document.getElementById('tab-select');
    if (tabSelect) {
      if (![...tabSelect.options].some((option) => option.value === tabId)) {
        const option = document.createElement('option');
        option.value = tabId;
        option.textContent = this.getTabTitle(this.allTabs.find((tab) => this.getTabId(tab) === tabId) || tabId);
        tabSelect.appendChild(option);
      }
      tabSelect.value = tabId;
    }
    document.dispatchEvent(new CustomEvent('tab-maker:select-tab', {
      detail: { tabId },
    }));
    // Update active styling in menu
    this.renderTabs(this.allTabs);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TabsMenuManager();
});

export { TabsMenuManager };
