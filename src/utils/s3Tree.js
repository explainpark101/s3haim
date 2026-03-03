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
          ...(isFolder ? {} : {
            lastModified: item.LastModified,
            size: item.Size,
          }),
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

/**
 * Collect path -> lastModified for all file nodes in the tree.
 * @param {Array} nodes - Tree nodes (from buildS3Tree)
 * @returns {Map<string, Date>}
 */
export const getFileLastModifiedMap = (nodes) => {
  const map = new Map();
  const walk = (list) => {
    if (!list) return;
    for (const node of list) {
      if (node.type === 'file' && node.path != null && node.lastModified != null) {
        map.set(node.path, node.lastModified instanceof Date ? node.lastModified : new Date(node.lastModified));
      }
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return map;
};

/**
 * Find a file node by path in the tree.
 * @param {Array} nodes
 * @param {string} path
 * @returns {{ lastModified?: Date, size?: number } | null}
 */
export const findFileNodeByPath = (nodes, path) => {
  const walk = (list) => {
    if (!list) return null;
    for (const node of list) {
      if (node.type === 'file' && node.path === path) return node;
      const found = node.children ? walk(node.children) : null;
      if (found) return found;
    }
    return null;
  };
  return walk(nodes);
};

