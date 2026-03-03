export const buildS3Tree = (contents) => {
  const root = { name: 'root', type: 'folder', path: '', children: [] };

  contents.forEach((item) => {
    const parts = item.Key.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFolder = i < parts.length - 1 || item.Key.endsWith('/');

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          type: isFolder ? 'folder' : 'file',
          path: parts.slice(0, i + 1).join('/') + (isFolder ? '/' : ''),
          children: isFolder ? [] : undefined,
          key: item.Key,
        };
        current.children.push(child);
      }

      current = child;
    }
  });

  const sortChildren = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        sortChildren(n.children);
      }
    });
  };

  sortChildren(root.children);

  return root.children;
};

