/** Song selection uses the complete bundled-song manifest. */
class LandingPage {
  constructor() {
    this.search = document.getElementById('landing-search');
    this.list = document.getElementById('landing-songs');
    this.tabs = [];
    this.search.addEventListener('input', () => this.render());
    this.load();
  }

  async load() {
    try {
      const response = await fetch('./tabs/manifest.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.tabs = data.tabs;
      this.render();
    } catch (error) {
      console.error('Failed to load tabs manifest:', error);
      this.list.textContent = '曲库加载失败，请刷新重试。';
    }
  }

  title(tab) {
    if (typeof tab !== 'string' && tab.title) return tab.title;
    const id = typeof tab === 'string' ? tab : tab.id;
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  render() {
    const query = this.search.value.trim().toLowerCase();
    const tabs = this.tabs.filter(tab => {
      const id = typeof tab === 'string' ? tab : tab.id;
      return `${id} ${this.title(tab)}`.toLowerCase().includes(query);
    });
    document.getElementById('landing-count').textContent = `${tabs.length} 首`;
    this.list.replaceChildren();
    if (!tabs.length) {
      const empty = document.createElement('li');
      empty.textContent = '没有找到歌曲，试试歌手名。';
      this.list.append(empty);
    }
    tabs.forEach(tab => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tab = typeof tab === 'string' ? tab : tab.id;
      const parts = this.title(tab).split(' - ');
      const artist = parts.length > 1 ? parts.shift() : '';
      const title = document.createElement('span');
      title.textContent = parts.join(' - ');
      if (artist) {
        const artistLabel = document.createElement('small');
        artistLabel.textContent = artist;
        title.append(artistLabel);
      }
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      arrow.setAttribute('aria-hidden', 'true');
      button.append(title, arrow);
      button.addEventListener('click', () => document.dispatchEvent(new CustomEvent('tab-maker:select-tab', {
        detail: { tabId: button.dataset.tab },
      })));
      item.append(button);
      this.list.append(item);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new LandingPage());
