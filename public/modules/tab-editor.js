const LOCAL_STORAGE_KEY = 'tab data';
const CHORD_QUALITIES = ['Maj7', 'Maj9', '7', '9', '11', 'dim', 'aug', 'sus2', 'sus4', 'add9'];

/** Owns editable script, persistence, export, and editor pane interactions. */
class TabEditor {
  constructor({ onChange, showToast }) {
    this.onChange = onChange;
    this.showToast = showToast;
    this.tabScript = document.getElementById('tab-script');
    this.highlight = document.getElementById('script-highlight');
    this.setupAutocomplete();
    this.tabScript.addEventListener('input', (event) => {
      this.highlightScript();
      if (!event.isComposing) this.commitScript();
      if (!event.isComposing && event.inputType === 'insertText') this.updateSuggestions();
      else this.closeSuggestions();
    });
    this.tabScript.addEventListener('compositionend', () => this.commitScript());
    this.tabScript.addEventListener('change', () => this.commitScript());
    this.tabScript.addEventListener('scroll', () => this.syncHighlightScroll());
    const splitButton = document.getElementById('split-lyrics');
    splitButton.addEventListener('mousedown', event => event.preventDefault());
    splitButton.addEventListener('click', () => this.splitLyrics());
    for (const action of ['undo', 'redo']) {
      const button = document.getElementById(`${action}-script`);
      // Keep the text selection when clicking an editor history control.
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => {
        this.tabScript.focus();
        // Native history preserves typing groups, selections, paste and IME edits.
        document.execCommand(action);
      });
    }
    document.getElementById('dump-tab-data').addEventListener('click', () => {
      if (!this.tabData) return;
      const dump = JSON.stringify(this.tabData);
      this.copyTextToClipboard(dump)
        .then(() => this.showToast('JSON已复制到剪贴板'))
        .catch(() => this.showToast('复制失败，请重试'));
    });
    document.getElementById('toggle-script').addEventListener('click', () => this.toggleEditor());
    this.setupEditorSplitter();
  }

  setupAutocomplete() {
    const source = this.tabScript;
    this.suggestions = document.createElement('div');
    this.suggestions.id = 'chord-suggestions';
    this.suggestions.className = 'chord-suggestions';
    this.suggestions.setAttribute('role', 'listbox');
    this.suggestions.setAttribute('aria-label', 'Chord qualities');
    this.suggestions.hidden = true;
    source.parentElement.append(this.suggestions);
    source.setAttribute('aria-controls', this.suggestions.id);
    source.setAttribute('aria-autocomplete', 'list');
    source.addEventListener('beforeinput', event => {
      if (event.isComposing || event.inputType !== 'insertText' || !event.cancelable) return;
      const close = { '[': ']', '(': ')' }[event.data];
      if (!close) return;
      event.preventDefault();
      const start = source.selectionStart;
      document.execCommand('insertText', false, event.data + close);
      source.setSelectionRange(start + 1, start + 1);
      this.closeSuggestions();
    });
    source.addEventListener('keydown', event => {
      if (event.isComposing || this.suggestions.hidden) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const count = this.suggestions.children.length;
        this.activeSuggestion = (this.activeSuggestion + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
        this.selectSuggestion();
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        this.acceptSuggestion();
      } else {
        this.closeSuggestions();
      }
    });
    for (const name of ['blur', 'click', 'scroll', 'compositionstart']) {
      source.addEventListener(name, () => this.closeSuggestions());
    }
    window.addEventListener('resize', () => this.closeSuggestions());
  }

  closeSuggestions() {
    this.suggestions.hidden = true;
    this.tabScript.removeAttribute('aria-activedescendant');
  }

  updateSuggestions() {
    const source = this.tabScript;
    this.closeSuggestions();
    if (source.selectionStart !== source.selectionEnd) return;
    const before = source.value.slice(0, source.selectionStart);
    const match = /(?:^|[\s\[,(|])(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)[b#]?-([A-Za-z0-9]*)$/.exec(before);
    if (!match) return;
    const qualities = CHORD_QUALITIES.filter(quality => quality.toLowerCase().startsWith(match[1].toLowerCase()));
    if (!qualities.length) return;
    this.completionStart = source.selectionStart - match[1].length;
    this.completionEnd = source.selectionStart;
    this.suggestions.replaceChildren(...qualities.map((quality, index) => {
      const option = document.createElement('div');
      option.id = `chord-quality-${index}`;
      option.setAttribute('role', 'option');
      option.textContent = quality;
      option.addEventListener('pointerdown', event => {
        event.preventDefault();
        this.activeSuggestion = index;
        this.acceptSuggestion();
      });
      return option;
    }));
    // Mirror the textarea to locate the caret, including horizontal scrolling.
    const mirror = document.createElement('div');
    const style = getComputedStyle(source);
    for (const property of ['font', 'lineHeight', 'letterSpacing', 'padding', 'border', 'boxSizing']) {
      mirror.style[property] = style[property];
    }
    Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', whiteSpace: 'pre', top: '0', left: '0' });
    mirror.textContent = before;
    const caret = document.createElement('span');
    caret.textContent = '|';
    mirror.append(caret);
    document.body.append(mirror);
    const rect = source.getBoundingClientRect();
    const x = rect.left + caret.offsetLeft - source.scrollLeft;
    const y = rect.top + caret.offsetTop - source.scrollTop + caret.offsetHeight;
    mirror.remove();
    this.suggestions.hidden = false;
    this.suggestions.style.left = `${Math.max(0, Math.min(x, innerWidth - this.suggestions.offsetWidth))}px`;
    this.suggestions.style.top = `${Math.max(0, Math.min(y, innerHeight - this.suggestions.offsetHeight))}px`;
    this.activeSuggestion = 0;
    this.selectSuggestion();
  }

  selectSuggestion() {
    Array.from(this.suggestions.children).forEach((option, index) => {
      option.setAttribute('aria-selected', String(index === this.activeSuggestion));
    });
    const option = this.suggestions.children[this.activeSuggestion];
    this.tabScript.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }

  acceptSuggestion() {
    const quality = this.suggestions.children[this.activeSuggestion].textContent;
    this.tabScript.focus();
    this.tabScript.setSelectionRange(this.completionStart, this.completionEnd);
    document.execCommand('insertText', false, quality);
    this.closeSuggestions();
  }

  commitScript() {
    if (!this.tabData) return;
    if (this.tabData.tabScript === this.tabScript.value) return;
    this.tabData = { ...this.tabData, tabScript: this.tabScript.value };
    this.onChange(this.tabData);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.tabData));
  }

  splitLyrics() {
    const start = this.tabScript.selectionStart;
    const end = this.tabScript.selectionEnd;
    if (start === end) {
      this.showToast('请先选中要拆分的歌词');
      this.tabScript.focus();
      return;
    }
    const selected = this.tabScript.value.slice(start, end);
    const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
    // Preserve whitespace and line boundaries while splitting each lyric run.
    const replacement = selected.replace(/\S+/gu, run =>
      Array.from(segmenter.segment(run), ({ segment }) => `(0)${segment}`).join(','));
    if (replacement === selected) return;
    this.tabScript.focus();
    this.tabScript.setSelectionRange(start, end);
    // Insert as a native edit so undo restores the entire selection in one step.
    document.execCommand('insertText', false, replacement);
    this.tabScript.setSelectionRange(start, start + replacement.length);
  }

  highlightScript() {
    const fragment = document.createDocumentFragment();
    const tokens = /\[[^\]\n]*\]|\([^\)\n]*\)|[\[\],|()\-]/g;
    const source = this.tabScript.value;
    let offset = 0;
    for (const match of source.matchAll(tokens)) {
      fragment.append(document.createTextNode(source.slice(offset, match.index)));
      const span = document.createElement('span');
      span.className = match[0].startsWith('[') && match[0].endsWith(']') ? 'syntax-chord'
        : match[0].startsWith('(') && match[0].endsWith(')') ? 'syntax-pitch' : 'syntax-separator';
      span.textContent = match[0];
      fragment.append(span);
      offset = match.index + match[0].length;
    }
    // A trailing space gives the final empty line the same height as the textarea.
    fragment.append(document.createTextNode(source.slice(offset) + ' '));
    this.highlight.replaceChildren(fragment);
    this.syncHighlightScroll();
  }

  syncHighlightScroll() {
    this.highlight.scrollTop = this.tabScript.scrollTop;
    this.highlight.scrollLeft = this.tabScript.scrollLeft;
  }

  setTabData(tabData) {
    this.closeSuggestions();
    this.tabData = tabData;
    this.tabScript.value = tabData.tabScript;
    this.highlightScript();
  }

  loadSavedTab() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return null;
    try {
      const data = JSON.parse(saved);
      data.title += ' (from Local Storage)';
      return data;
    } catch (error) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }
  }

  async copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!copied) {
        throw error;
      }
    }
  }

  toggleEditor() {
    const root = document.querySelector('.root');
    const isClosed = root.classList.toggle('editor-closed');
    this.tabScript.classList.toggle('hidden', isClosed);
    document.getElementById('toggle-script').setAttribute('aria-pressed', String(!isClosed));
  }

  setupEditorSplitter() {
    const root = document.querySelector('.root');
    const splitter = document.getElementById('editor-splitter');
    if (!splitter) return;

    const startResize = (event) => {
      event.preventDefault();
      document.body.classList.add('resizing-editor');
      if (event.pointerId !== undefined && splitter.setPointerCapture) {
        splitter.setPointerCapture(event.pointerId);
      }
    };

    const resize = (event) => {
      if (!document.body.classList.contains('resizing-editor')) return;
      const minPaneWidth = 280;
      const maxEditorWidth = Math.max(minPaneWidth, window.innerWidth - minPaneWidth);
      const editorWidth = Math.min(Math.max(window.innerWidth - event.clientX, minPaneWidth), maxEditorWidth);
      root.style.setProperty('--editor-width', `${editorWidth}px`);
    };

    const stopResize = (event) => {
      document.body.classList.remove('resizing-editor');
      if (event.pointerId !== undefined && splitter.hasPointerCapture && splitter.hasPointerCapture(event.pointerId)) {
        splitter.releasePointerCapture(event.pointerId);
      }
    };

    splitter.addEventListener('pointerdown', startResize);
    splitter.addEventListener('pointermove', resize);
    splitter.addEventListener('pointerup', stopResize);
    splitter.addEventListener('pointercancel', stopResize);
    splitter.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

}

export { TabEditor };
