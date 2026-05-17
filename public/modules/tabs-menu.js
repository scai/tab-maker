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
    this.currentTab = 'test';

    this.setupEventListeners();
    this.loadTabsList();
  }

  setupEventListeners() {
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
      if (e.target.tagName === 'LI') {
        const tabName = e.target.dataset.tab;
        this.selectTab(tabName);
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
    } catch (error) {
      console.error('Failed to load tabs manifest:', error);
      // Fallback if manifest fails
      this.allTabs = [];
    }
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
      const li = document.createElement('li');
      li.textContent = this.formatTabName(tab);
      li.dataset.tab = tab;
      if (tab === this.currentTab) {
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
      tab.toLowerCase().includes(searchTerm) ||
      this.formatTabName(tab).toLowerCase().includes(searchTerm)
    );
    this.renderTabs(filtered);
  }

  formatTabName(tabId) {
    // Convert tab ID to readable format
    // e.g., "samuel-no-matter-what" -> "Samuel - No Matter What"
    return tabId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  selectTab(tabName) {
    this.currentTab = tabName;
    // Trigger the tab select dropdown to load the tab
    const tabSelect = document.getElementById('tab-select');
    tabSelect.value = tabName;
    // Trigger change event
    tabSelect.dispatchEvent(new Event('change', { bubbles: true }));
    // Update active styling in menu
    this.renderTabs(this.allTabs);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TabsMenuManager();
});

export { TabsMenuManager };
