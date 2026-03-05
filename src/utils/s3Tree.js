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
 * Collect all file nodes from the tree.
 * @param {Array} nodes
 * @returns {{ path: string, lastModified?: Date }[]}
 */
const getAllFileNodes = (nodes) => {
  const result = [];
  const walk = (list) => {
    if (!list) return;
    for (const node of list) {
      if (node.type === 'file' && node.path) {
        result.push({ path: node.path, lastModified: node.lastModified });
      }
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return result;
};

/**
 * noteKey에 해당하는 녹음 파일 키 목록 (최신순)
 * 패턴: {base}-rec-{timestamp}.m4a | .webm
 * @param {Array} nodes - s3Tree
 * @param {string} noteKey - 예: notes/회의록.md
 * @returns {{ key: string, timestamp: number, lastModified?: Date }[]}
 */
export const getRecordingKeysFromTree = (nodes, noteKey) => {
  const base = !noteKey || typeof noteKey !== 'string' ? '' : noteKey.replace(/\.[^.]+$/, '') || noteKey;
  if (!base) return [];
  const prefix = base + '-rec-';
  const suffixRegex = /\.(m4a|webm)$/;
  const files = getAllFileNodes(nodes);
  const results = [];
  for (const { path, lastModified } of files) {
    if (!path.startsWith(prefix) || !suffixRegex.test(path)) continue;
    const match = path.match(/-rec-(\d+)\.(m4a|webm)$/);
    if (match) {
      results.push({
        key: path,
        timestamp: parseInt(match[1], 10),
        lastModified,
      });
    }
  }
  results.sort((a, b) => (b.timestamp - a.timestamp));
  return results;
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

/**
 * Flatten tree to array of paths in display order (depth-first).
 * @param {Array} nodes
 * @returns {string[]}
 */
export const flattenTreeToPaths = (nodes) => {
  const result = [];
  const walk = (list) => {
    if (!list) return;
    for (const node of list) {
      if (node.path) result.push(node.path);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return result;
};

/**
 * Find any node (file or folder) by path in the tree.
 * @param {Array} nodes
 * @param {string} path - e.g. "notes/foo.md" or "notes/"
 * @returns {object | null}
 */
export const findNodeByPath = (nodes, path) => {
  const walk = (list) => {
    if (!list) return null;
    for (const node of list) {
      if (node.path === path) return node;
      const found = node.children ? walk(node.children) : null;
      if (found) return found;
    }
    return null;
  };
  return walk(nodes);
};

