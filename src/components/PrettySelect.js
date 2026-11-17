let active = null;
let counter = 0;
const fold = value => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const arrow = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>';

export function closeSelect() { active?.close(); }
export function enhanceSelects(container) {
  for (const select of container.querySelectorAll('select.select-input')) {
    if (!select.prettySelect) select.prettySelect = new PrettySelect(select);
    else select.prettySelect.refresh();
  }
}

class PrettySelect {
  constructor(select) {
    this.select = select;
    const wrapper = document.createElement('div');
    wrapper.className = 'pretty-select';
    wrapper.dataset.selectId = select.id;
    wrapper.style.minWidth = getComputedStyle(select).minWidth;
    select.before(wrapper);
    wrapper.append(select);
    select.classList.add('pretty-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'pretty-select-trigger';
    this.button.setAttribute('role', 'combobox');
    this.button.setAttribute('aria-haspopup', 'listbox');
    this.button.setAttribute('aria-expanded', 'false');
    this.id = 'pretty-options-' + ++counter;
    this.button.setAttribute('aria-controls', this.id);
    this.button.innerHTML = '<span class="pretty-value"></span>' + arrow;
    wrapper.append(this.button);
    this.button.onclick = e => { e.stopPropagation(); this.panel ? this.close(true) : this.open(); };
    this.button.onkeydown = e => {
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); this.open(); }
    };
    select.addEventListener('change', () => this.refresh());
    this.observer = new MutationObserver(() => this.refresh());
    this.observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected', 'disabled'] });
    this.refresh();
  }
  refresh() {
    const option = this.select.selectedOptions[0] || this.select.options[0];
    const text = (option?.textContent || 'Chọn…').replace(/^-+\s*|\s*-+$/g, '');
    this.button.querySelector('.pretty-value').textContent = text;
    this.button.title = text;
    this.button.disabled = this.select.disabled;
    if (this.panel) this.renderOptions();
  }
  open() {
    if (this.select.disabled) return;
    if (active === this) return;
    closeSelect();
    document.getElementById('active-profile-context-menu')?.remove();
    active = this;
    this.refresh();
    this.panel = document.createElement('div');
    this.panel.className = 'pretty-select-panel';
    this.panel.innerHTML = '<div class="pretty-options" role="listbox"></div>';
    this.list = this.panel.querySelector('.pretty-options');
    this.list.id = this.id;
    if (this.select.options.length > 6) {
      this.search = document.createElement('input');
      this.search.type = 'search';
      this.search.className = 'pretty-search';
      this.search.placeholder = 'Tìm lựa chọn…';
      this.search.setAttribute('aria-label', 'Tìm trong danh sách');
      this.panel.prepend(this.search);
      this.search.oninput = () => this.renderOptions();
    }
    document.body.append(this.panel);
    this.button.setAttribute('aria-expanded', 'true');
    this.renderOptions();
    const rect = this.button.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 240), innerWidth - 20);
    this.panel.style.width = width + 'px';
    this.panel.style.left = Math.max(10, Math.min(rect.left, innerWidth - width - 10)) + 'px';
    const below = innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const height = Math.min(340, Math.max(below, above));
    this.panel.style.maxHeight = height + 'px';
    const panelHeight = Math.min(this.panel.getBoundingClientRect().height, height);
    this.panel.style.top = (below >= panelHeight || below >= above ? rect.bottom + 6 : Math.max(10, rect.top - panelHeight - 6)) + 'px';
    this.outside = e => { if (!this.panel?.contains(e.target) && !this.button.contains(e.target)) this.close(); };
    this.move = e => { if (e.type === 'scroll' && this.panel?.contains(e.target)) return; this.close(); };
    document.addEventListener('pointerdown', this.outside, true);
    document.addEventListener('scroll', this.move, true);
    window.addEventListener('resize', this.move);
    this.panel.onkeydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(true); }
      else if (e.key === 'Tab') this.close(true);
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        if (e.target === this.search && ['Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const options = [...this.list.querySelectorAll('button:not(:disabled)')];
        if (!options.length) return;
        const current = options.indexOf(document.activeElement);
        const index = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, current + (e.key === 'ArrowDown' ? 1 : -1)));
        options[index].focus();
      }
    };
    (this.search || this.list.querySelector('[aria-selected="true"]:not(:disabled)') || this.list.querySelector('button'))?.focus();
  }
  renderOptions() {
    const query = fold(this.search?.value || '');
    const previousValue = this.panel.contains(document.activeElement) ? document.activeElement?.dataset.value : undefined;
    this.list.replaceChildren();
    for (const option of this.select.options) {
      if (option.hidden || !fold(option.textContent).includes(query)) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pretty-option';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(option.selected));
      button.disabled = option.disabled;
      button.dataset.value = option.value;
      const label = document.createElement('span');
      label.textContent = option.textContent.replace(/^-+\s*|\s*-+$/g, '');
      button.append(label);
      if (option.selected) button.insertAdjacentHTML('beforeend', '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 10 3 3 7-7"/></svg>');
      button.onclick = () => {
        this.select.value = option.value;
        this.select.dispatchEvent(new Event('change', { bubbles: true }));
        this.refresh();
        this.close(true);
      };
      this.list.append(button);
    }
    if (!this.list.children.length) {
      const empty = document.createElement('p');
      empty.className = 'pretty-no-results'; empty.textContent = 'Không tìm thấy lựa chọn'; this.list.append(empty);
    }
    if (previousValue !== undefined) [...this.list.querySelectorAll('button')].find(b => b.dataset.value === previousValue)?.focus();
  }
  close(focus = false) {
    this.panel?.remove(); this.panel = null; this.search = null;
    document.removeEventListener('pointerdown', this.outside, true);
    document.removeEventListener('scroll', this.move, true);
    window.removeEventListener('resize', this.move);
    this.button.setAttribute('aria-expanded', 'false');
    if (focus) this.button.focus();
    if (active === this) active = null;
  }
}
