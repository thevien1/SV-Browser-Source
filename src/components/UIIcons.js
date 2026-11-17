const paths = {
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
