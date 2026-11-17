const paths = {
  link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  note: '<path d="M14 3H4v18h16V9zM14 3v6h6M8 13h8m-8 4h5"/>',
  tag: '<path d="m3 3 9 1 9 9-8 8-9-9z"/><circle cx="8" cy="8" r="1"/>',
  edit: '<path d="m15 4 5 5M3 21l2-7L17 2l5 5L10 19z"/>',
  clone: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  color: '<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4 2 2 0 0 1 1-4h3c5 0 1-10-7-10z"/><path d="M7 8h.01M12 6h.01M17 8h.01M6 13h.01"/>',
  cookie: '<path d="M21 12a9 9 0 1 1-9-9 5 5 0 0 0 9 9z"/><path d="M7 9h.01M12 13h.01M8 16h.01M16 17h.01"/>',
  clean: '<path d="m15 3-5 9m-4-2 10 5-4 7-10-5zM5 16l6 3"/>',
  incognito: '<path d="M3 10h18M6 10l2-7h8l2 7M10 17h4"/><circle cx="6" cy="17" r="4"/><circle cx="18" cy="17" r="4"/>',
  terminal: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m6 9 3 3-3 3m7 0h5"/>',
  up: '<path d="M12 21V7m-6 6 6-6 6 6M4 3h16"/>',
  down: '<path d="M12 3v14m-6-6 6 6 6-6M4 21h16"/>',
  profiles: '<rect x="3" y="7" width="15" height="14" rx="3"/><path d="M7 3h11a3 3 0 0 1 3 3v11M3 12h15"/><circle cx="7" cy="9.5" r=".5"/>',
  groups: '<path d="M3 8a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M7 3h7l2 2M7 13h10m-10 4h6"/>',
  extensions: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M14 17.5h7m-3.5-3.5v7"/>',
  trash: '<path d="M4 7h16M9 3h6l1 4M6 7l1 13h10l1-13M10 11v5m4-5v5"/>',
  automation: '<rect x="8" y="2" width="8" height="5" rx="2"/><rect x="2" y="17" width="7" height="5" rx="2"/><rect x="15" y="17" width="7" height="5" rx="2"/><path d="M12 7v5m-6.5 5v-5h13v5"/>',
  developer: '<path d="M4 3h11l5 5v13H4zM15 3v5h5M8 12h8m-8 4h6"/>',
  settings: '<path d="M3 6h18M3 12h18M3 18h18"/><rect x="6" y="4" width="4" height="4" rx="1"/><rect x="14" y="10" width="4" height="4" rx="1"/><rect x="8" y="16" width="4" height="4" rx="1"/>',
  log: '<path d="M4 10a8 8 0 1 1 2 8M4 4v6h6M12 7v5l3 2"/>',
  about: '<path d="m12 2 9 5v10l-9 5-9-5V7zM12 8h.01M12 11v6"/>',
};
export function uiIcon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.profiles}</svg>`;
}
