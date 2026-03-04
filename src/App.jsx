import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router';
import { IconFile, IconMenu, IconX } from '@/components/icons';
import { encryptData, decryptData } from '@/utils/crypto';
import { buildS3Tree, getFileLastModifiedMap, findFileNodeByPath } from '@/utils/s3Tree';
import {
  createS3Client,
  listObjectsV2,
  getObjectBody,
  putObject,
  deleteObject,
  deleteObjects,
  copyObject,
  getSignedGetUrl,
} from '@/utils/s3Client';
import Sidebar from '@/components/Sidebar';
import EditorPane from '@/components/EditorPane';
import { AuthModal } from '@/components/modals/AuthModal';
import { SetPasswordModal } from '@/components/modals/SetPasswordModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { MoveFileModal } from '@/components/modals/MoveFileModal';
import { MoveFolderModal } from '@/components/modals/MoveFolderModal';
import { CreateItemModal } from '@/components/modals/CreateItemModal';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  
  // Auth & Crypto State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  
  // S3 Creds
  const [s3Creds, setS3Creds] = useState({ accessKeyId: '', secretAccessKey: '', region: 'ap-northeast-2', bucket: '', endpoint: '' });
  
  // File Systems State
  const [s3Tree, setS3Tree] = useState([]);
  const [localTree, setLocalTree] = useState([]);
  const [localRootHandle, setLocalRootHandle] = useState(null);
  
  // Editor State
  const [currentFile, setCurrentFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [lastInputAt, setLastInputAt] = useState(null);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState(null);
  const [lastAutoSyncAt, setLastAutoSyncAt] = useState(null);
  const [showHiddenFolders, setShowHiddenFolders] = useState(false);

  const fileInputRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const sidebarResizeStateRef = useRef({
    isResizing: false,
    startX: 0,
    startWidth: 260,
  });
  const [deletingFolderPath, setDeletingFolderPath] = useState(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [operationStatus, setOperationStatus] = useState('');
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveFolderTarget, setMoveFolderTarget] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalContext, setCreateModalContext] = useState(null);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const s3TreeRef = useRef([]);
  const currentFileRef = useRef(null);
  const hasRestoredLastFileRef = useRef(false);

  useEffect(() => {
    s3TreeRef.current = s3Tree;
  }, [s3Tree]);
  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  useEffect(() => {
    if (currentFile) {
      const fileName = currentFile.name
        || (typeof currentFile.id === 'string' && currentFile.id.split('/').filter(Boolean).pop())
        || 'Untitled';
      document.title = `s3Haim - ${fileName}`;
    } else {
      document.title = 's3Haim';
    }
  }, [currentFile]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleSidebarResizeMouseDown = (e) => {
    e.preventDefault();
    sidebarResizeStateRef.current = {
      isResizing: true,
      startX: e.clientX,
      startWidth: sidebarWidth,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      const state = sidebarResizeStateRef.current;
      if (!state.isResizing) return;
      const delta = e.clientX - state.startX;
      const nextWidth = Math.min(
        480,
        Math.max(200, state.startWidth + delta),
      );
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (sidebarResizeStateRef.current.isResizing) {
        sidebarResizeStateRef.current = {
          ...sidebarResizeStateRef.current,
          isResizing: false,
        };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  // 1. Init (marked & S3 client are from npm modules; no script loading)
  useEffect(() => {
    setScriptsLoaded(true);
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = () => {
    const stored = localStorage.getItem('s3NotesEncrypted');
    if (stored) {
      setShowAuthModal(true);
    } else {
      setIsUnlocked(true);
      navigate('/settings');
    }
  };

  // 2. Auth Actions
  const handleUnlock = async (password) => {
    try {
      const stored = localStorage.getItem('s3NotesEncrypted');
      if (!stored) throw new Error("저장된 데이터가 없습니다.");
      const encryptedObj = JSON.parse(stored);
      const decryptedStr = await decryptData(password, encryptedObj);
      const creds = JSON.parse(decryptedStr);
      
      setS3Creds(creds);
      setMasterPassword(password);
      setIsUnlocked(true);
      setShowAuthModal(false);
    } catch (e) {
      alert("비밀번호가 틀렸거나 데이터가 손상되었습니다.");
      console.error(e);
    }
  };

  const saveEncryptedSettings = async (creds, password) => {
    try {
      const encryptedObj = await encryptData(password, JSON.stringify(creds));
      localStorage.setItem('s3NotesEncrypted', JSON.stringify(encryptedObj));
      setS3Creds(creds);
      setMasterPassword(password);
      setShowSetPasswordModal(false);
      loadS3Files(creds);
      navigate('/');
    } catch (e) {
      alert("설정 저장 중 오류가 발생했습니다: " + e.message);
    }
  };

  const handleExportCreds = () => {
    const stored = localStorage.getItem('s3NotesEncrypted');
    if (!stored) return alert("내보낼 데이터가 없습니다.");
    const blob = new Blob([stored], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `s3-notes-credentials-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCreds = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        JSON.parse(content); // Validate JSON format
        localStorage.setItem('s3NotesEncrypted', content);
        alert("자격 증명이 성공적으로 불러와졌습니다. 비밀번호를 입력해 잠금을 해제하세요.");
        setIsUnlocked(false);
        setShowAuthModal(true);
      } catch (err) {
        alert("잘못된 파일 형식입니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  const handleSettingsClose = () => {
    if (!masterPassword && localStorage.getItem('s3NotesEncrypted')) {
      navigate('/');
    } else if (!masterPassword) {
      alert("마스터 비밀번호를 설정해야 창을 닫을 수 있습니다.");
    } else {
      navigate('/');
    }
  };

  // 3. S3 Actions (using @aws-sdk/client-s3)
  const getS3Client = useCallback((creds = s3Creds) => createS3Client(creds), [s3Creds]);

  const loadS3Files = useCallback(async (creds = s3Creds) => {
    const client = getS3Client(creds);
    if (!client || !creds.bucket) return;
    try {
      const contents = await listObjectsV2(client, creds.bucket, '');
      setS3Tree(buildS3Tree(contents));
    } catch (err) {
      console.error("S3 Load Error:", err);
    }
  }, [getS3Client, s3Creds]);

  useEffect(() => {
    if (scriptsLoaded && isUnlocked && s3Creds.bucket) loadS3Files();
  }, [scriptsLoaded, isUnlocked, s3Creds.bucket, loadS3Files]);

  // Mobile: poll S3 every 30s and refresh if S3 has newer LastModified
  useEffect(() => {
    if (!isMobile || !s3Creds.bucket || !isUnlocked) return;
    const client = getS3Client();
    if (!client) return;

    const poll = async () => {
      try {
        const contents = await listObjectsV2(client, s3Creds.bucket, '');
        const newTree = buildS3Tree(contents);
        const oldMap = getFileLastModifiedMap(s3TreeRef.current);
        const newMap = getFileLastModifiedMap(newTree);
        const changedKeys = new Set();
        for (const [path, newDate] of newMap) {
          const oldDate = oldMap.get(path);
          if (!oldDate || newDate.getTime() > oldDate.getTime()) changedKeys.add(path);
        }
        setS3Tree(newTree);

        const cur = currentFileRef.current;
        if (cur?.type !== 's3' || !changedKeys.has(cur.id)) return;
        const newNode = findFileNodeByPath(newTree, cur.id);
        const newLastMod = newNode?.lastModified ? (newNode.lastModified instanceof Date ? newNode.lastModified : new Date(newNode.lastModified)) : null;

        const { body, ContentType } = await getObjectBody(client, s3Creds.bucket, cur.id);
        const ext = (cur.name?.split('.').pop() || '').toLowerCase();
        if (cur.viewer === 'markdown' || ext === 'md' || ext === 'markdown' || ext === '') {
          const text = new TextDecoder('utf-8').decode(body);
          setCurrentFile((prev) => (prev?.id === cur.id ? { ...prev, content: text, lastModified: newLastMod } : prev));
          setEditorContent((prevContent) => (currentFileRef.current?.id === cur.id ? text : prevContent));
        } else if (cur.viewer === 'json' || ext === 'json') {
          const raw = new TextDecoder('utf-8').decode(body);
          let display = raw;
          try {
            const parsed = JSON.parse(raw);
            display = JSON.stringify(parsed, null, 2);
          } catch { /* keep raw */ }
          setCurrentFile((prev) => (prev?.id === cur.id ? { ...prev, content: display, lastModified: newLastMod } : prev));
          setEditorContent((prevContent) => (currentFileRef.current?.id === cur.id ? display : prevContent));
        } else if (cur.viewer === 'image' || cur.viewer === 'pdf' || cur.viewer === 'audio' || cur.viewer === 'video') {
          const mime = ContentType || (cur.viewer === 'pdf' ? 'application/pdf' : '');
          const blob = new Blob([body], { type: mime || undefined });
          const url = URL.createObjectURL(blob);
          setCurrentFile((prev) => {
            if (prev?.id !== cur.id) return prev;
            if (prev.objectUrl) URL.revokeObjectURL(prev.objectUrl);
            return { ...prev, objectUrl: url, lastModified: newLastMod };
          });
        }
      } catch {
        // ignore poll errors
      }
    };

    const t = setInterval(poll, 30000);
    poll();
    return () => clearInterval(t);
  }, [isMobile, s3Creds.bucket, isUnlocked, getS3Client]);

  // 4. Local Folder Load
  const readLocalDir = async (dirHandle, basePath = '', parentHandle = null) => {
    const children = [];
    for await (const entry of dirHandle.values()) {
      const path = basePath + entry.name;
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        children.push({ name: entry.name, type: 'file', path, handle: entry, parentHandle });
      } else if (entry.kind === 'directory') {
        const subChildren = await readLocalDir(entry, path + '/', dirHandle);
        children.push({ name: entry.name, type: 'folder', path: path + '/', handle: entry, parentHandle, children: subChildren });
      }
    }
    return children.sort((a, b) => (a.type === 'folder' ? -1 : 1) - (b.type === 'folder' ? -1 : 1) || a.name.localeCompare(b.name));
  };

  const openLocalFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setLocalRootHandle(dirHandle);
      const tree = await readLocalDir(dirHandle, '', dirHandle);
      setLocalTree(tree);
    } catch (e) {
      console.error("Local folder selection cancelled or failed:", e);
    }
  };

  const refreshLocalTree = async () => {
    if (localRootHandle) {
      const tree = await readLocalDir(localRootHandle, '', localRootHandle);
      setLocalTree(tree);
    }
  };

  // 5. File Read & Save
  const selectFileRaw = async (type, node) => {
    if (node.type === 'folder') return;
    const ext = (node.name.split('.').pop() || '').toLowerCase();

    if (type === 's3') {
      const client = getS3Client();
      if (!client) return;

      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

      if (imageExts.includes(ext)) {
        try {
          const { body, ContentLength } = await getObjectBody(client, s3Creds.bucket, node.path);
          const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          const blob = new Blob([body], { type: mime });
          const url = URL.createObjectURL(blob);
          setCurrentFile((prev) => {
            if (prev && (prev.viewer === 'image' || prev.viewer === 'pdf' || prev.viewer === 'audio' || prev.viewer === 'video') && prev.objectUrl) {
              URL.revokeObjectURL(prev.objectUrl);
            }
            return {
              type: 's3',
              id: node.path,
              name: node.name,
              viewer: 'image',
              objectUrl: url,
              size: typeof ContentLength === 'number' ? ContentLength : null,
              lastModified: node.lastModified,
            };
          });
          setEditorContent('');
          navigate(`/view/${node.path}`);
        } catch (err) {
          console.error('S3 Read Error:', err);
        }
        return;
      }

      if (ext === 'pdf') {
        try {
          const { body, ContentLength } = await getObjectBody(client, s3Creds.bucket, node.path);
          const blob = new Blob([body], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setCurrentFile((prev) => {
            if (prev && (prev.viewer === 'image' || prev.viewer === 'pdf' || prev.viewer === 'audio' || prev.viewer === 'video') && prev.objectUrl) {
              URL.revokeObjectURL(prev.objectUrl);
            }
            return {
              type: 's3',
              id: node.path,
              name: node.name,
              viewer: 'pdf',
              objectUrl: url,
              size: typeof ContentLength === 'number' ? ContentLength : null,
              lastModified: node.lastModified,
            };
          });
          setEditorContent('');
          navigate(`/view/${node.path}`);
        } catch (err) {
          console.error('S3 Read Error:', err);
        }
        return;
      }

      if (ext === 'md' || ext === 'markdown' || ext === '') {
        try {
          const { body, ContentLength } = await getObjectBody(client, s3Creds.bucket, node.path);
          const text = new TextDecoder('utf-8').decode(body);
          setCurrentFile({
            type: 's3',
            id: node.path,
            name: node.name,
            content: text,
            viewer: 'markdown',
            size: typeof ContentLength === 'number' ? ContentLength : null,
            lastModified: node.lastModified,
          });
          setEditorContent(text);
          navigate(`/view/${node.path}`);
        } catch (err) {
          console.error('S3 Read Error:', err);
        }
        return;
      }

      if (ext === 'json') {
        try {
          const { body, ContentLength } = await getObjectBody(client, s3Creds.bucket, node.path);
          const raw = new TextDecoder('utf-8').decode(body);
          const maxFormatLen = 100000;
          let display = raw;
          if (raw.length <= maxFormatLen) {
            try {
              const parsed = JSON.parse(raw);
              display = JSON.stringify(parsed, null, 2);
            } catch {
              display = raw;
            }
          }
          setCurrentFile({
            type: 's3',
            id: node.path,
            name: node.name,
            content: display,
            viewer: 'json',
            size: typeof ContentLength === 'number' ? ContentLength : null,
            lastModified: node.lastModified,
          });
          setEditorContent(display);
          navigate(`/view/${node.path}`);
        } catch (err) {
          console.error('S3 Read Error:', err);
        }
        return;
      }

      const audioExts = ['m4a', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'weba'];
      const videoExts = ['mp4', 'webm', 'ogv', 'mov'];
      const isAudio = audioExts.includes(ext);
      const isVideo = videoExts.includes(ext);

      if (isAudio) {
        try {
          const { body, ContentLength } = await getObjectBody(client, s3Creds.bucket, node.path);
          const mime = ext === 'm4a' || ext === 'mp4' ? 'audio/mp4' : ext === 'mp3' ? 'audio/mpeg' : ext === 'ogg' || ext === 'ogv' ? 'audio/ogg' : ext === 'weba' ? 'audio/webm' : `audio/${ext}`;
          const blob = new Blob([body], { type: mime });
          const url = URL.createObjectURL(blob);
          setCurrentFile((prev) => {
            if (prev && (prev.viewer === 'image' || prev.viewer === 'pdf' || prev.viewer === 'audio' || prev.viewer === 'video') && prev.objectUrl) {
              URL.revokeObjectURL(prev.objectUrl);
            }
            return {
              type: 's3',
              id: node.path,
              name: node.name,
              viewer: 'audio',
              objectUrl: url,
              size: typeof ContentLength === 'number' ? ContentLength : null,
              lastModified: node.lastModified,
            };
          });
          setEditorContent('');
          navigate(`/view/${node.path}`);
        } catch (err) {
          console.error('S3 Read Error:', err);
        }
        return;
      }

      if (isVideo) {
        try {
          const { body, ContentLength } = await getObjectBody(client, s3Creds.bucket, node.path);
          const mime = ext === 'mp4' || ext === 'mov' ? 'video/mp4' : ext === 'webm' ? 'video/webm' : 'video/ogg';
          const blob = new Blob([body], { type: mime });
          const url = URL.createObjectURL(blob);
          setCurrentFile((prev) => {
            if (prev && (prev.viewer === 'image' || prev.viewer === 'pdf' || prev.viewer === 'audio' || prev.viewer === 'video') && prev.objectUrl) {
              URL.revokeObjectURL(prev.objectUrl);
            }
            return {
              type: 's3',
              id: node.path,
              name: node.name,
              viewer: 'video',
              objectUrl: url,
              size: typeof ContentLength === 'number' ? ContentLength : null,
              lastModified: node.lastModified,
            };
          });
          setEditorContent('');
          navigate(`/view/${node.path}`);
        } catch (err) {
          console.error('S3 Read Error:', err);
        }
        return;
      }

      setCurrentFile({
        type: 's3',
        id: node.path,
        name: node.name,
        viewer: 'unsupported',
        size: null,
        lastModified: node.lastModified,
      });
      setEditorContent('');
      navigate(`/view/${node.path}`);
    } else if (type === 'local') {
      const file = await node.handle.getFile();
      const text = await file.text();
      setCurrentFile({
        type: 'local',
        id: node.path,
        name: node.name,
        content: text,
        handle: node.handle,
        parentHandle: node.parentHandle,
        viewer: 'markdown',
        size: typeof file.size === 'number' ? file.size : null,
      });
      setEditorContent(text);
      navigate(`/view/${node.path}`);
    }
  };

  const selectFile = useCallback(
    (type, node) => {
      if (isMobile) setSidebarOpen(false);
      selectFileRaw(type, node);
    },
    [isMobile, selectFileRaw]
  );

  // Persist last opened file (S3 or local) for restore on next load
  useEffect(() => {
    if (!isUnlocked || !currentFile) return;
    if (currentFile.type !== 's3' && currentFile.type !== 'local') return;
    try {
      localStorage.setItem('s3haim_lastFile', JSON.stringify({ type: currentFile.type, path: currentFile.id }));
    } catch (_) {}
  }, [isUnlocked, currentFile]);

  // Restore last opened file once trees are loaded
  useEffect(() => {
    if (!isUnlocked || hasRestoredLastFileRef.current) return;
    let saved;
    try {
      saved = localStorage.getItem('s3haim_lastFile');
      if (!saved) return;
      saved = JSON.parse(saved);
    } catch (_) {
      hasRestoredLastFileRef.current = true;
      return;
    }
    const { type, path } = saved;
    if (type !== 's3' && type !== 'local') {
      hasRestoredLastFileRef.current = true;
      return;
    }
    const tree = type === 's3' ? s3Tree : localTree;
    if (!tree || tree.length === 0) {
      if (type === 'local') hasRestoredLastFileRef.current = true;
      return;
    }
    const node = findFileNodeByPath(tree, path);
    if (node) selectFile(type, node);
    hasRestoredLastFileRef.current = true;
  }, [isUnlocked, s3Tree, localTree, selectFile]);

  const moveS3FileToFolder = async (file, destFolderPath) => {
    const client = getS3Client();
    if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
    const bucket = s3Creds.bucket;
    const fileName = file.name;
    const destPrefix = destFolderPath || '';
    const newKey = `${destPrefix}${fileName}`;
    const oldKey = file.id;
    if (newKey === oldKey) return file;

    await copyObject(client, bucket, oldKey, newKey);
    await deleteObject(client, bucket, oldKey);

    loadS3Files();

    return { ...file, id: newKey };
  };

  const moveLocalFileToFolder = async (file, destDirHandle, destDirPath) => {
    const sourceDir = file.parentHandle || localRootHandle;
    if (!sourceDir) throw new Error('원본 폴더를 찾을 수 없습니다.');
    if (!destDirHandle) throw new Error('대상 폴더를 찾을 수 없습니다.');

    const fileName = file.name;
    const oldPath = file.id;
    const newPath = `${destDirPath || ''}${fileName}`;
    if (newPath === oldPath) return file;

    const srcFile = await file.handle.getFile();
    const newFileHandle = await destDirHandle.getFileHandle(fileName, { create: true });
    const writable = await newFileHandle.createWritable();
    await writable.write(await srcFile.arrayBuffer());
    await writable.close();

    await sourceDir.removeEntry(fileName, { recursive: false });

    await refreshLocalTree();

    return {
      ...file,
      id: newPath,
      handle: newFileHandle,
      parentHandle: destDirHandle,
      size: typeof srcFile.size === 'number' ? srcFile.size : file.size ?? null,
    };
  };

  const moveS3FolderToFolder = async (folderNode, destPath) => {
    const client = getS3Client();
    if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
    const bucket = s3Creds.bucket;
    const prefix = folderNode.path;
    const contents = await listObjectsV2(client, bucket, prefix);
    if (contents.length === 0) return;
    const destPrefix = destPath || '';
    for (const { Key } of contents) {
      const relative = Key.slice(prefix.length);
      const newKey = destPrefix + relative;
      await copyObject(client, bucket, Key, newKey);
    }
    await deleteObjects(client, bucket, contents.map(({ Key }) => ({ Key })));
    loadS3Files();
  };

  const moveLocalFolderToFolder = async (folderNode, destDirHandle, destDirPath) => {
    const sourceDir = folderNode.parentHandle || localRootHandle;
    if (!sourceDir) throw new Error('원본 폴더를 찾을 수 없습니다.');
    if (!destDirHandle) throw new Error('대상 폴더를 찾을 수 없습니다.');
    const newFolderHandle = await destDirHandle.getDirectoryHandle(folderNode.name, { create: true });
    const copyDirRecursive = async (srcHandle, destHandle) => {
      for await (const entry of srcHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(await file.arrayBuffer());
          await writable.close();
        } else if (entry.kind === 'directory') {
          const newDirHandle = await destHandle.getDirectoryHandle(entry.name, { create: true });
          await copyDirRecursive(entry, newDirHandle);
        }
      }
    };
    await copyDirRecursive(folderNode.handle, newFolderHandle);
    await sourceDir.removeEntry(folderNode.name, { recursive: true });
    await refreshLocalTree();
  };

  const handleViewUnsupportedAsText = async () => {
    if (!currentFile || currentFile.viewer !== 'unsupported') return;
    if (currentFile.type === 's3') {
      try {
        const client = getS3Client();
        if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
        const { body, ContentLength } = await getObjectBody(client, s3Creds.bucket, currentFile.id);
        const content = new TextDecoder('utf-8').decode(body);
        setCurrentFile((prev) => ({
          ...prev,
          content,
          viewer: 'raw',
          size: typeof ContentLength === 'number' ? ContentLength : prev?.size ?? null,
        }));
        setEditorContent(content);
      } catch (e) {
        console.error('S3 파일 로드 실패:', e);
        alert('파일을 텍스트로 불러오지 못했습니다.');
      }
    }
  };

  const handleDownloadCurrentFile = async () => {
    if (!currentFile) return;
    if (currentFile.type === 's3') {
      try {
        const client = getS3Client();
        if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
        const url = await getSignedGetUrl(client, s3Creds.bucket, currentFile.id, 60);
        window.open(url, '_blank');
      } catch (e) {
        console.error('Signed URL 생성 실패:', e);
        alert('파일 다운로드 URL을 생성하지 못했습니다.');
      }
    } else if (currentFile.type === 'local' && currentFile.handle) {
      try {
        const file = await currentFile.handle.getFile();
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFile.name || file.name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('로컬 파일 다운로드 실패:', e);
        alert('다운로드에 실패했습니다.');
      }
    }
  };

  const saveFile = async () => {
    if (!currentFile) return;
    setIsSaving(true);
    try {
      if (currentFile.type === 's3') {
        const client = getS3Client();
        if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
        await putObject(client, {
          Bucket: s3Creds.bucket,
          Key: currentFile.id,
          Body: editorContent,
          ContentType: 'text/markdown',
        });
        loadS3Files();
      } else if (currentFile.type === 'local') {
        const writable = await currentFile.handle.createWritable();
        await writable.write(editorContent);
        await writable.close();
        const file = await currentFile.handle.getFile();
        setCurrentFile((prev) => ({
          ...prev,
          content: editorContent,
          size: typeof file.size === 'number' ? file.size : prev?.size ?? null,
        }));
        return;
      }
      setCurrentFile(prev => ({ ...prev, content: editorContent }));
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renameS3File = async (file, newName) => {
    const client = getS3Client();
    if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');

    const oldKey = file.id;
    const lastSlash = oldKey.lastIndexOf('/');
    const dirPrefix = lastSlash >= 0 ? oldKey.slice(0, lastSlash + 1) : '';
    const newKey = dirPrefix + newName;

    if (newKey === oldKey) return file;

    await copyObject(client, s3Creds.bucket, oldKey, newKey);
    await deleteObject(client, s3Creds.bucket, oldKey);

    loadS3Files();

    return { ...file, id: newKey, name: newName };
  };

  const renameLocalFile = async (file, newName) => {
    const pHandle = file.parentHandle || localRootHandle;
    if (!pHandle) throw new Error('루트 폴더를 먼저 열어주세요.');

    const oldPath = file.id;
    const lastSlash = oldPath.lastIndexOf('/');
    const dirPrefix = lastSlash >= 0 ? oldPath.slice(0, lastSlash + 1) : '';
    const newPath = dirPrefix + newName;

    if (newPath === oldPath) return file;

    const newFileHandle = await pHandle.getFileHandle(newName, { create: true });
    const writable = await newFileHandle.createWritable();
    await writable.write(editorContent);
    await writable.close();

    await pHandle.removeEntry(file.name, { recursive: false });

    await refreshLocalTree();

    return { ...file, id: newPath, name: newName, handle: newFileHandle };
  };

  const renameCurrentFileFullName = async (newFullName) => {
    if (!currentFile) return;
    const trimmed = newFullName.trim();
    if (!trimmed) return;

    try {
      let updated = null;
      if (currentFile.type === 's3') {
        updated = await renameS3File(currentFile, trimmed);
      } else if (currentFile.type === 'local') {
        updated = await renameLocalFile(currentFile, trimmed);
      }
      if (updated) {
        setCurrentFile(updated);
      }
    } catch (e) {
      alert("이름 변경 실패: " + e.message);
    }
  };

  const renameCurrentFileTitle = async (newTitle) => {
    if (!currentFile) return;
    const trimmedBase = newTitle.trim();
    if (!trimmedBase) return;

    const name = currentFile.name || '';
    const lastDot = name.lastIndexOf('.');
    const ext = lastDot > 0 ? name.slice(lastDot) : '';
    const newFullName = `${trimmedBase}${ext}`;

    if (newFullName === name) return;

    try {
      await renameCurrentFileFullName(newFullName);
    } catch (e) {
      alert("이름 변경 실패: " + e.message);
    }
  };

  // 6. Create & Delete
  const createItem = async (storageType, parentPath, parentDirHandle, type, nameInput) => {
    const name = (nameInput || '').trim();
    if (!name) return;

    let finalName = name;
    if (type === 'file' && !finalName.endsWith('.md')) finalName += '.md';
    const newPath = parentPath + finalName + (type === 'folder' ? '/' : '');

    try {
      if (storageType === 's3') {
        const client = getS3Client();
        if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
        if (type === 'folder') {
          await putObject(client, { Bucket: s3Creds.bucket, Key: newPath, Body: '' });
          loadS3Files();
        } else {
          await putObject(client, { Bucket: s3Creds.bucket, Key: newPath, Body: '' });
          loadS3Files();
          setCurrentFile({ type: 's3', id: newPath, name: finalName, content: '' });
          setEditorContent('');
          navigate(`/view/${newPath}`);
        }
      } else if (storageType === 'local') {
        const targetDirHandle = parentDirHandle || localRootHandle;
        if (!targetDirHandle) return alert("루트 폴더를 먼저 열어주세요.");

        if (type === 'folder') {
          await targetDirHandle.getDirectoryHandle(finalName, { create: true });
        } else {
          const newFileHandle = await targetDirHandle.getFileHandle(finalName, { create: true });
          setCurrentFile({
            type: 'local',
            id: newPath,
            name: finalName,
            content: '',
            handle: newFileHandle,
          });
          setEditorContent('');
          navigate(`/view/${newPath}`);
        }
        refreshLocalTree();
      }
    } catch (e) {
      alert("생성 실패: " + e.message);
      throw e;
    }
  };

  const requestCreateItem = (storageType, parentPath, parentDirHandle, type) => {
    setCreateModalContext({ storageType, parentPath, parentDirHandle, type });
    setCreateModalOpen(true);
  };

  const handleCreateItemSubmit = async (nameInput) => {
    if (!createModalContext) return;
    const { storageType, parentPath, parentDirHandle, type } = createModalContext;
    setIsCreateSubmitting(true);
    try {
      await createItem(storageType, parentPath, parentDirHandle, type, nameInput);
      setCreateModalOpen(false);
      setCreateModalContext(null);
    } catch (e) {
      // createItem already shows alert
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  const ensureLocalTrashDir = async () => {
    if (!localRootHandle) {
      throw new Error('루트 폴더가 열려 있지 않습니다.');
    }
    return localRootHandle.getDirectoryHandle('.trash', { create: true });
  };

  const moveLocalEntryToTrash = async (node) => {
    const trashRoot = await ensureLocalTrashDir();
    const relativePath = node.path.replace(/\/$/, ''); // remove trailing slash for folders
    const segments = relativePath.split('/'); // e.g. ['foo', 'bar.md'] or ['foo','bar']
    const name = segments.pop();

    let targetDir = trashRoot;
    for (const segment of segments) {
      if (!segment) continue;
      targetDir = await targetDir.getDirectoryHandle(segment, { create: true });
    }

    if (node.type === 'file') {
      const file = await node.handle.getFile();
      const newFileHandle = await targetDir.getFileHandle(name, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
      const pHandle = node.parentHandle || localRootHandle;
      await pHandle.removeEntry(node.name, { recursive: false });
    } else if (node.type === 'folder') {
      const sourceDir = node.handle;
      const targetDirForFolder = await targetDir.getDirectoryHandle(name, { create: true });

      const copyDirRecursive = async (srcHandle, destHandle) => {
        for await (const entry of srcHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(await file.arrayBuffer());
            await writable.close();
          } else if (entry.kind === 'directory') {
            const newDirHandle = await destHandle.getDirectoryHandle(entry.name, { create: true });
            await copyDirRecursive(entry, newDirHandle);
          }
        }
      };

      await copyDirRecursive(sourceDir, targetDirForFolder);

      const pHandle = node.parentHandle || localRootHandle;
      await pHandle.removeEntry(node.name, { recursive: true });
    }
  };

  const moveS3EntryToTrash = async (node) => {
    const client = getS3Client();
    if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');

    const bucket = s3Creds.bucket;

    await putObject(client, { Bucket: bucket, Key: '.trash/', Body: '' });

    if (node.type === 'file') {
      const srcKey = node.path;
      const destKey = `.trash/${srcKey}`;
      await copyObject(client, bucket, srcKey, destKey);
      await deleteObject(client, bucket, srcKey);
    } else if (node.type === 'folder') {
      const prefix = node.path;
      const contents = await listObjectsV2(client, bucket, prefix);

      if (contents.length > 0) {
        for (const { Key } of contents) {
          const destKey = `.trash/${Key}`;
          await copyObject(client, bucket, Key, destKey);
        }
        await deleteObjects(client, bucket, contents.map(({ Key }) => ({ Key })));
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { node, type } = deleteTarget;
    const isInTrash = node.path.startsWith('.trash/');
    const isFolder = node.type === 'folder';
    const isTrashRoot = node.path === '.trash/';

    const closeModal = () => setDeleteTarget(null);
    const closeTimer = setTimeout(closeModal, 3000);

    // 쓰레기통 루트는 실제 삭제 수행하지 않음
    if (isTrashRoot) {
      setOperationStatus('쓰레기통 비우기 요청: 실제 파일은 삭제되지 않습니다.');
      clearTimeout(closeTimer);
      closeModal();
      return;
    }

    if (isFolder) {
      if (isDeletingFolder) {
        clearTimeout(closeTimer);
        return;
      }
      setIsDeletingFolder(true);
      setDeletingFolderPath(node.path);
      setOperationStatus(`폴더 삭제 중: ${node.path}`);
    }

    try {
      if (type === 's3') {
        const client = getS3Client();
        if (!client) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');

        if (isInTrash) {
          if (node.type === 'folder') {
            const contents = await listObjectsV2(client, s3Creds.bucket, node.path);
            if (contents.length > 0) {
              await deleteObjects(client, s3Creds.bucket, contents.map(({ Key }) => ({ Key })));
            }
          } else {
            await deleteObject(client, s3Creds.bucket, node.path);
          }
        } else {
          await moveS3EntryToTrash(node);
        }
        loadS3Files();
      } else if (type === 'local') {
        if (!localRootHandle) throw new Error('루트 폴더를 먼저 열어주세요.');

        if (isInTrash) {
          const pHandle = node.parentHandle || localRootHandle;
          await pHandle.removeEntry(node.name, { recursive: true });
        } else {
          await moveLocalEntryToTrash(node);
        }
        await refreshLocalTree();
      }

      if (currentFile && currentFile.id.startsWith(node.path)) {
        setCurrentFile(null);
        setEditorContent('');
        navigate('/');
      }
    } catch (e) {
      alert("삭제 실패: " + e.message);
      if (isFolder) {
        setOperationStatus(`폴더 삭제 실패: ${e.message}`);
      }
    } finally {
      clearTimeout(closeTimer);
      closeModal();
      if (isFolder) {
        setIsDeletingFolder(false);
        setDeletingFolderPath(null);
        if (!operationStatus.startsWith('폴더 삭제 실패')) {
          setOperationStatus(`폴더 삭제 완료: ${node.path}`);
        }
      }
    }
  };

  const renameTreeItem = async (storageType, node, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    try {
      if (storageType === 's3') {
        const originalName = node.name || '';
        const lastDot = originalName.lastIndexOf('.');
        const ext = lastDot > 0 ? originalName.slice(lastDot) : '';
        const newName = `${trimmed}${ext}`;

        await renameS3File({ id: node.path, name: node.name }, newName);
        if (currentFile && currentFile.type === 's3' && currentFile.id === node.path) {
          const updated = await renameS3File(currentFile, newName);
          setCurrentFile(updated);
        }
      } else if (storageType === 'local') {
        const pHandle = node.parentHandle || localRootHandle;
        if (!pHandle) throw new Error('루트 폴더를 먼저 열어주세요.');

        const oldPath = node.path;
        const lastSlash = oldPath.lastIndexOf('/');
        const dirPrefix = lastSlash >= 0 ? oldPath.slice(0, lastSlash + 1) : '';
        const originalName = node.name || '';
        const nameLastDot = originalName.lastIndexOf('.');
        const ext = nameLastDot > 0 ? originalName.slice(nameLastDot) : '';
        const newName = `${trimmed}${ext}`;
        const newPath = dirPrefix + newName;

        if (newPath === oldPath) return;

        const file = await node.handle.getFile();
        const newFileHandle = await pHandle.getFileHandle(newName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(await file.arrayBuffer());
        await writable.close();

        await pHandle.removeEntry(node.name, { recursive: false });

        await refreshLocalTree();

        if (currentFile && currentFile.type === 'local' && currentFile.id === node.path) {
          setCurrentFile({
            ...currentFile,
            id: newPath,
            name: newName,
            handle: newFileHandle,
          });
        }
      }
    } catch (e) {
      alert("이름 변경 실패: " + e.message);
    }
  };
  const handleRequestMove = () => {
    if (!currentFile) return;
    setIsMoveModalOpen(true);
  };

  const handleRequestMoveFolder = (node, storageType) => {
    if (!node || node.type !== 'folder') return;
    setMoveFolderTarget({ node, storageType });
  };

  const handleConfirmMoveFolder = async (dest) => {
    if (!moveFolderTarget || !dest) return;
    const { node, storageType } = moveFolderTarget;
    try {
      if (storageType === 's3') {
        await moveS3FolderToFolder(node, dest.path || '');
      } else {
        const destHandle = dest.handle || localRootHandle;
        if (!destHandle) throw new Error('대상 폴더를 찾을 수 없습니다.');
        await moveLocalFolderToFolder(node, destHandle, dest.path || '');
      }
      setMoveFolderTarget(null);
      setOperationStatus(`폴더 이동 완료: ${node.name}`);
    } catch (e) {
      alert('폴더 이동 실패: ' + e.message);
      setOperationStatus(`폴더 이동 실패: ${e.message}`);
    }
  };

  const handleConfirmMove = async (dest) => {
    if (!currentFile || !dest) return;
    try {
      if (currentFile.type === 's3') {
        const updated = await moveS3FileToFolder(currentFile, dest.path || '');
        if (updated) {
          setCurrentFile((prev) =>
            prev && prev.type === 's3' ? { ...prev, id: updated.id } : prev,
          );
        }
      } else if (currentFile.type === 'local') {
        const updated = await moveLocalFileToFolder(
          currentFile,
          dest.handle,
          dest.path || '',
        );
        if (updated) {
          setCurrentFile(updated);
        }
      }
      setIsMoveModalOpen(false);
      setOperationStatus(`파일 이동 완료: ${dest.path || ''}${currentFile.name}`);
    } catch (e) {
      alert('파일 이동 실패: ' + e.message);
      setOperationStatus(`파일 이동 실패: ${e.message}`);
    }
  };

  // 7. Auto Save (S3 only, 5s debounce)
  useEffect(() => {
    if (!currentFile || currentFile.type !== 's3') return;
    if (currentFile.viewer !== 'markdown') return;
    if (!lastInputAt) return;

    const now = Date.now();
    const timeout = setTimeout(async () => {
      // 입력 이후 내용이 변경된 상태만 자동 저장
      if (currentFile.content === editorContent) return;
      if (!currentFile || currentFile.type !== 's3') return;
      try {
        await saveFile();
        setLastAutoSaveAt(now);
      } catch (e) {
        // saveFile 내부에서 alert 처리
      }
    }, 5000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInputAt, currentFile, editorContent]);

  // 8. Auto Sync (S3 only, pull when idle >= 30s, checked 주기적으로)
  useEffect(() => {
    if (!currentFile || currentFile.type !== 's3') return;
    if (currentFile.viewer !== 'markdown') return;

    const interval = setInterval(async () => {
      if (!lastInputAt) return;
      const idleMs = Date.now() - lastInputAt;
      if (idleMs < 30000) return;
      // 로컬에 미저장 내용이 있으면 덮어쓰지 않음
      if (currentFile.content !== editorContent) return;

      const client = getS3Client();
      if (!client) return;

      try {
        const { body } = await getObjectBody(client, s3Creds.bucket, currentFile.id);
        const text = new TextDecoder('utf-8').decode(body);
        setCurrentFile((prev) => {
          if (!prev || prev.type !== 's3' || prev.id !== currentFile.id) return prev;
          return { ...prev, content: text };
        });
        setEditorContent((prev) => {
          if (prev !== editorContent) return prev;
          return text;
        });
        setLastAutoSyncAt(Date.now());
      } catch (err) {
        console.error('Auto sync S3 Read Error:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile, editorContent, lastInputAt]);

  if (!scriptsLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 dark:bg-odp-bgSofter dark:text-odp-fg">
        로딩 중...
      </div>
    );
  }

  const handleEditorChange = (value) => {
    setEditorContent(value);
    setLastInputAt(Date.now());
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    const hh = `${d.getHours()}`.padStart(2, '0');
    const mm = `${d.getMinutes()}`.padStart(2, '0');
    const ss = `${d.getSeconds()}`.padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes == null || isNaN(bytes)) return '알 수 없음';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  const isS3Current = currentFile?.type === 's3';
  const hasUnsavedForS3 =
    isS3Current && currentFile && currentFile.content !== editorContent;
  const hasAutoSaved = isS3Current && !!lastAutoSaveAt;

  const autoSaveIndicatorClass = !isS3Current
    ? 'bg-gray-300'
    : hasUnsavedForS3
    ? 'bg-yellow-400 animate-pulse'
    : hasAutoSaved
    ? 'bg-green-500'
    : 'bg-gray-400';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-odp-bgSofter text-gray-800 dark:text-odp-fg font-sans relative">
      {/* Hidden file input for import */}
      <input type="file" ref={fileInputRef} onChange={handleImportCreds} accept=".json" className="hidden" />

      {/* Auth Modal (Lock Screen) */}
      <AuthModal isOpen={showAuthModal} onUnlock={handleUnlock} fileInputRef={fileInputRef} />

      {/* Main UI (Blurred if locked) */}
      <div
        className={`flex flex-1 w-full flex-col transition-all duration-300 ${
          !isUnlocked ? 'blur-md pointer-events-none select-none' : ''
        }`}
      >
        <div className="flex flex-1 min-h-0 relative">
          {/* Mobile: backdrop when sidebar open */}
          {isMobile && sidebarOpen && (
            <button
              type="button"
              aria-label="사이드바 닫기"
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar: overlay from top on mobile, in-flow on desktop */}
          <div
            className={`
              z-40 flex flex-col bg-white dark:bg-odp-bgSoft border-r border-gray-200 dark:border-odp-bgSofter
              md:relative md:h-full md:shrink-0
              fixed top-0 left-0 right-0 w-full h-dvh md:max-h-none
              transition-transform duration-300 ease-out md:transition-none
              ${isMobile && !sidebarOpen ? '-translate-y-full' : 'translate-y-0'}
            `}
            style={isMobile ? undefined : { width: `${sidebarWidth}px` }}
          >
            {isMobile && (
              <div className="flex justify-end p-2 border-b border-gray-200 dark:border-odp-bgSofter shrink-0 md:hidden">
                <button
                  type="button"
                  aria-label="사이드바 닫기"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-odp-focusBg rounded transition"
                >
                  <IconX size={22} />
                </button>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <Sidebar
                s3Tree={s3Tree}
                s3Bucket={s3Creds.bucket}
                localTree={localTree}
                localRootHandle={localRootHandle}
                currentFile={currentFile}
                onSelectFile={selectFile}
                onCreateItem={requestCreateItem}
                onRequestMoveFolder={handleRequestMoveFolder}
                onOpenLocalFolder={openLocalFolder}
                onSetDeleteTarget={setDeleteTarget}
                onOpenSettings={() => navigate('/settings')}
                theme={theme}
                onToggleTheme={() =>
                  setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
                }
                onRenameItem={renameTreeItem}
                showHiddenFolders={showHiddenFolders}
                deletingFolderPath={deletingFolderPath}
                isDeletingFolder={isDeletingFolder}
              />
            </div>
            {!isMobile && (
              <div
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-400/30 dark:hover:bg-blue-400/30"
                onMouseDown={handleSidebarResizeMouseDown}
              />
            )}
          </div>

          {/* Mobile: menu button to open sidebar (only when closed) */}
          {isMobile && !sidebarOpen && (
            <button
              type="button"
              aria-label="사이드바 열기"
              onClick={() => setSidebarOpen(true)}
              className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-white dark:bg-odp-bgSoft border border-gray-200 dark:border-odp-borderSoft text-gray-600 dark:text-odp-fg shadow-md hover:bg-gray-50 dark:hover:bg-odp-focusBg transition md:hidden"
            >
              <IconMenu size={22} />
            </button>
          )}

          {/* Main Content Routes */}
          <div className="flex-1 min-w-0 flex flex-col">
          <Routes>
            <Route
              path="/settings"
              element={
                <SettingsPage
                  s3Creds={s3Creds}
                  masterPassword={masterPassword}
                  onSaveS3Creds={(creds) => {
                    setS3Creds(creds);
                    setShowSetPasswordModal(true);
                  }}
                  onExportCreds={handleExportCreds}
                  onImportClick={() => fileInputRef.current?.click()}
                  showHiddenFolders={showHiddenFolders}
                  onToggleHiddenFolders={() =>
                    setShowHiddenFolders((prev) => !prev)
                  }
                  onClose={handleSettingsClose}
                />
              }
            />
            <Route
              path="/view/*"
              element={
                <EditorPane
                  currentFile={currentFile}
                  editorContent={editorContent}
                  onChangeEditor={handleEditorChange}
                  onSave={saveFile}
                  isSaving={isSaving}
                  onRenameTitle={renameCurrentFileTitle}
                  onRenameFullName={renameCurrentFileFullName}
                  onRequestMove={handleRequestMove}
                  onViewUnsupportedAsText={handleViewUnsupportedAsText}
                  onDownloadCurrentFile={handleDownloadCurrentFile}
                  theme={theme}
                  previewOnly={isMobile}
                  onRequestDelete={() =>
                    setDeleteTarget({
                      node: {
                        path: currentFile?.id,
                        name: currentFile?.name,
                        type: 'file',
                        handle: currentFile?.handle,
                        parentHandle: currentFile?.parentHandle,
                      },
                      type: currentFile?.type,
                    })
                  }
                />
              }
            />
            <Route
              path="/"
              element={
                <EditorPane
                  currentFile={currentFile}
                  editorContent={editorContent}
                  onChangeEditor={handleEditorChange}
                  onSave={saveFile}
                  isSaving={isSaving}
                  onRenameTitle={renameCurrentFileTitle}
                  onRenameFullName={renameCurrentFileFullName}
                  onRequestMove={handleRequestMove}
                  onViewUnsupportedAsText={handleViewUnsupportedAsText}
                  onDownloadCurrentFile={handleDownloadCurrentFile}
                  theme={theme}
                  previewOnly={isMobile}
                  onRequestDelete={() =>
                    setDeleteTarget(
                      currentFile
                        ? {
                            node: {
                              path: currentFile?.id,
                              name: currentFile?.name,
                              type: 'file',
                              handle: currentFile?.handle,
                              parentHandle: currentFile?.parentHandle,
                            },
                            type: currentFile?.type,
                          }
                        : null,
                    )
                  }
                />
              }
            />
          </Routes>
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-6 md:h-7 border-t border-gray-200 dark:border-odp-borderSoft bg-white/90 dark:bg-odp-bgSoft/95 text-[10px] md:text-[11px] px-2 md:px-3 flex items-center justify-between gap-2 md:gap-3 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden">
            <span className="truncate shrink-0 max-w-12 md:max-w-none" title={currentFile?.type === 's3' ? `S3 (${s3Creds.bucket || '-'})` : currentFile?.type === 'local' ? '로컬' : '없음'}>
              <span className="md:hidden">{currentFile?.type === 's3' ? 'S3' : currentFile?.type === 'local' ? '로컬' : '없음'}</span>
              <span className="hidden md:inline">저장소: {currentFile?.type === 's3' ? `S3 (${s3Creds.bucket || '-'})` : currentFile?.type === 'local' ? '로컬' : '없음'}</span>
            </span>
            {currentFile && (
              <>
                <span className="truncate min-w-0" title={currentFile.type === 's3' ? currentFile.id : currentFile.id || currentFile.name}>
                  {currentFile.type === 's3' ? currentFile.id : currentFile.id || currentFile.name}
                </span>
                <span className="hidden md:inline truncate text-gray-500 dark:text-odp-muted shrink-0">
                  크기: {currentFile.size != null ? formatFileSize(currentFile.size) : '알 수 없음'}
                </span>
              </>
            )}
            {operationStatus && (
              <span className="truncate text-gray-500 dark:text-odp-muted hidden md:inline">
                상태: {operationStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <span className="flex items-center gap-1 md:gap-1.5" title={currentFile?.type === 's3' ? (lastAutoSaveAt ? `저장 ${formatTime(lastAutoSaveAt)}` : '대기 중') : '대상 아님'}>
              <span
                className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0 ${autoSaveIndicatorClass}`}
                aria-hidden="true"
              />
              <span className="md:hidden">
                {currentFile?.type === 's3'
                  ? lastAutoSaveAt
                    ? formatTime(lastAutoSaveAt)
                    : '대기'
                  : '-'}
              </span>
              <span className="hidden md:inline">
                자동저장(S3):{' '}
                {currentFile?.type === 's3'
                  ? lastAutoSaveAt
                    ? `마지막 ${formatTime(lastAutoSaveAt)}`
                    : '대기 중 (입력 후 5초)'
                  : '대상 아님'}
              </span>
            </span>
            <span className="hidden md:inline" title={currentFile?.type === 's3' ? (lastAutoSyncAt ? `동기화 ${formatTime(lastAutoSyncAt)}` : '대기 중') : '대상 아님'}>
              자동동기화(S3):{' '}
              {currentFile?.type === 's3'
                ? lastAutoSyncAt
                  ? `마지막 ${formatTime(lastAutoSyncAt)}`
                  : '대기 중 (입력 후 30초)'
                : '대상 아님'}
            </span>
          </div>
        </div>
      </div>

      {/* Set Password Modal */}
      <SetPasswordModal
        isOpen={showSetPasswordModal}
        masterPassword={masterPassword}
        onCancel={() => setShowSetPasswordModal(false)}
        onSubmit={(password) => saveEncryptedSettings(s3Creds, password)}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isProcessing={isDeletingFolder && deleteTarget?.node?.type === 'folder'}
      />

      {/* Move File Modal */}
      <MoveFileModal
        isOpen={isMoveModalOpen}
        storageType={currentFile?.type}
        s3Tree={s3Tree}
        localTree={localTree}
        localRootHandle={localRootHandle}
        currentFile={currentFile}
        onClose={() => setIsMoveModalOpen(false)}
        onConfirm={handleConfirmMove}
      />

      {/* Move Folder Modal */}
      <MoveFolderModal
        isOpen={!!moveFolderTarget}
        storageType={moveFolderTarget?.storageType}
        s3Tree={s3Tree}
        localTree={localTree}
        localRootHandle={localRootHandle}
        folderNode={moveFolderTarget?.node}
        onClose={() => setMoveFolderTarget(null)}
        onConfirm={handleConfirmMoveFolder}
      />

      {/* Create File/Folder Modal */}
      <CreateItemModal
        isOpen={createModalOpen}
        type={createModalContext?.type}
        parentLabel={
          createModalContext
            ? createModalContext.storageType === 's3'
              ? createModalContext.parentPath
                ? `S3: ${createModalContext.parentPath}`
                : 'S3 루트'
              : createModalContext.parentPath
                ? `로컬: ${createModalContext.parentPath}`
                : '로컬 루트'
            : ''
        }
        onClose={() => {
          if (!isCreateSubmitting) {
            setCreateModalOpen(false);
            setCreateModalContext(null);
          }
        }}
        onSubmit={handleCreateItemSubmit}
        isSubmitting={isCreateSubmitting}
      />

    </div>
  );
}