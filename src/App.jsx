import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router';
import { IconFile } from '@/components/icons';
import { encryptData, decryptData } from '@/utils/crypto';
import { buildS3Tree } from '@/utils/s3Tree';
import Sidebar from '@/components/Sidebar';
import EditorPane from '@/components/EditorPane';
import { AuthModal } from '@/components/modals/AuthModal';
import { SetPasswordModal } from '@/components/modals/SetPasswordModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { MoveFileModal } from '@/components/modals/MoveFileModal';
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

  // 1. Script Load & Init Auth
  useEffect(() => {
    const loadScript = (src, globalVar) => new Promise((resolve, reject) => {
      if (window[globalVar]) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    Promise.all([
      loadScript('https://sdk.amazonaws.com/js/aws-sdk-2.1408.0.min.js', 'AWS'),
      loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js', 'marked')
    ]).then(() => {
      setScriptsLoaded(true);
      checkStoredCredentials();
    }).catch(err => console.error("Script loading error:", err));
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

  // 3. S3 Actions
  const getS3Client = useCallback((creds = s3Creds) => {
    if (!window.AWS || !creds.accessKeyId || !creds.secretAccessKey) return null;
    const s3Options = { apiVersion: '2006-03-01', accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, region: creds.region };
    if (creds.endpoint) {
      s3Options.endpoint = creds.endpoint;
      s3Options.s3ForcePathStyle = true;
    }
    return new window.AWS.S3(s3Options);
  }, [s3Creds]);

  const loadS3Files = useCallback((creds = s3Creds) => {
    const s3 = getS3Client(creds);
    if (!s3 || !creds.bucket) return;

    s3.listObjectsV2({ Bucket: creds.bucket, Prefix: '' }, (err, data) => {
      if (err) return console.error("S3 Load Error:", err);
      const contents = (data.Contents || []).filter((item) => !!item.Key);
      setS3Tree(buildS3Tree(contents));
    });
  }, [getS3Client, s3Creds]);

  useEffect(() => {
    if (scriptsLoaded && isUnlocked && s3Creds.bucket) loadS3Files();
  }, [scriptsLoaded, isUnlocked, s3Creds.bucket, loadS3Files]);

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
  const selectFile = async (type, node) => {
    if (node.type === 'folder') return;
    const ext = (node.name.split('.').pop() || '').toLowerCase();

    if (type === 's3') {
      const s3 = getS3Client();
      if (!s3) return;

      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

      if (imageExts.includes(ext)) {
        s3.getObject({ Bucket: s3Creds.bucket, Key: node.path }, (err, data) => {
          if (err) return console.error('S3 Read Error:', err);
          const mime =
            ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          const blob = new Blob([data.Body], { type: mime });
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
              size: typeof data.ContentLength === 'number' ? data.ContentLength : null,
            };
          });
          setEditorContent('');
          navigate(`/view/${node.path}`);
        });
        return;
      }

      if (ext === 'pdf') {
        s3.getObject({ Bucket: s3Creds.bucket, Key: node.path }, (err, data) => {
          if (err) return console.error('S3 Read Error:', err);
          const blob = new Blob([data.Body], { type: 'application/pdf' });
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
              size: typeof data.ContentLength === 'number' ? data.ContentLength : null,
            };
          });
          setEditorContent('');
          navigate(`/view/${node.path}`);
        });
        return;
      }

      if (ext === 'md' || ext === 'markdown' || ext === '') {
        s3.getObject({ Bucket: s3Creds.bucket, Key: node.path }, (err, data) => {
          if (err) return console.error('S3 Read Error:', err);
          const text = new TextDecoder('utf-8').decode(data.Body);
          setCurrentFile({
            type: 's3',
            id: node.path,
            name: node.name,
            content: text,
            viewer: 'markdown',
            size: typeof data.ContentLength === 'number' ? data.ContentLength : null,
          });
          setEditorContent(text);
          navigate(`/view/${node.path}`);
        });
        return;
      }

      if (ext === 'json') {
        s3.getObject({ Bucket: s3Creds.bucket, Key: node.path }, (err, data) => {
          if (err) return console.error('S3 Read Error:', err);
          const raw = new TextDecoder('utf-8').decode(data.Body);
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
            size: typeof data.ContentLength === 'number' ? data.ContentLength : null,
          });
          setEditorContent(display);
          navigate(`/view/${node.path}`);
        });
        return;
      }

      const audioExts = ['m4a', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'weba'];
      const videoExts = ['mp4', 'webm', 'ogv', 'mov'];
      const isAudio = audioExts.includes(ext);
      const isVideo = videoExts.includes(ext);

      if (isAudio) {
        s3.getObject({ Bucket: s3Creds.bucket, Key: node.path }, (err, data) => {
          if (err) return console.error('S3 Read Error:', err);
          const mime = ext === 'm4a' || ext === 'mp4' ? 'audio/mp4' : ext === 'mp3' ? 'audio/mpeg' : ext === 'ogg' || ext === 'ogv' ? 'audio/ogg' : ext === 'weba' ? 'audio/webm' : `audio/${ext}`;
          const blob = new Blob([data.Body], { type: mime });
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
              size: typeof data.ContentLength === 'number' ? data.ContentLength : null,
            };
          });
          setEditorContent('');
          navigate(`/view/${node.path}`);
        });
        return;
      }

      if (isVideo) {
        s3.getObject({ Bucket: s3Creds.bucket, Key: node.path }, (err, data) => {
          if (err) return console.error('S3 Read Error:', err);
          const mime = ext === 'mp4' || ext === 'mov' ? 'video/mp4' : ext === 'webm' ? 'video/webm' : 'video/ogg';
          const blob = new Blob([data.Body], { type: mime });
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
              size: typeof data.ContentLength === 'number' ? data.ContentLength : null,
            };
          });
          setEditorContent('');
          navigate(`/view/${node.path}`);
        });
        return;
      }

      setCurrentFile({
        type: 's3',
        id: node.path,
        name: node.name,
        viewer: 'unsupported',
        size: null,
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

  const moveS3FileToFolder = async (file, destFolderPath) => {
    const s3 = getS3Client();
    if (!s3) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
    const bucket = s3Creds.bucket;
    const fileName = file.name;
    const destPrefix = destFolderPath || '';
    const newKey = `${destPrefix}${fileName}`;
    const oldKey = file.id;
    if (newKey === oldKey) return file;

    await s3
      .copyObject({
        Bucket: bucket,
        CopySource: `${bucket}/${encodeURIComponent(oldKey)}`,
        Key: newKey,
      })
      .promise();

    await s3
      .deleteObject({
        Bucket: bucket,
        Key: oldKey,
      })
      .promise();

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

  const handleViewUnsupportedAsText = async () => {
    if (!currentFile || currentFile.viewer !== 'unsupported') return;
    if (currentFile.type === 's3') {
      try {
        const s3 = getS3Client();
        if (!s3) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
        const data = await s3
          .getObject({ Bucket: s3Creds.bucket, Key: currentFile.id })
          .promise();
        const raw = data.Body
          ? new TextDecoder('utf-8').decode(
              data.Body instanceof Uint8Array ? data.Body : new Uint8Array(data.Body),
            )
          : '';
        const content = raw;
        setCurrentFile((prev) => ({
          ...prev,
          content,
          viewer: 'raw',
          size: typeof data.ContentLength === 'number' ? data.ContentLength : prev?.size ?? null,
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
        const s3 = getS3Client();
        if (!s3) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');
        const url = s3.getSignedUrl('getObject', {
          Bucket: s3Creds.bucket,
          Key: currentFile.id,
          Expires: 60,
        });
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
        await getS3Client().putObject({ Bucket: s3Creds.bucket, Key: currentFile.id, Body: editorContent, ContentType: 'text/markdown' }).promise();
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
    const s3 = getS3Client();
    if (!s3) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');

    const oldKey = file.id;
    const lastSlash = oldKey.lastIndexOf('/');
    const dirPrefix = lastSlash >= 0 ? oldKey.slice(0, lastSlash + 1) : '';
    const newKey = dirPrefix + newName;

    if (newKey === oldKey) return file;

    await s3
      .copyObject({
        Bucket: s3Creds.bucket,
        CopySource: `${s3Creds.bucket}/${encodeURIComponent(oldKey)}`,
        Key: newKey,
      })
      .promise();

    await s3
      .deleteObject({
        Bucket: s3Creds.bucket,
        Key: oldKey,
      })
      .promise();

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
  const createItem = async (storageType, parentPath, parentDirHandle, type) => {
    const name = prompt(`새 ${type === 'folder' ? '폴더' : '파일'} 이름을 입력하세요:`);
    if (!name) return;
    
    let finalName = name;
    if (type === 'file' && !finalName.endsWith('.md')) finalName += '.md';
    const newPath = parentPath + finalName + (type === 'folder' ? '/' : '');

    try {
      if (storageType === 's3') {
        const s3 = getS3Client();
        if (type === 'folder') {
          await s3.putObject({ Bucket: s3Creds.bucket, Key: newPath, Body: '' }).promise();
          loadS3Files();
        } else {
          setCurrentFile({ type: 's3', id: newPath, name: finalName, content: '' });
          setEditorContent('');
          loadS3Files();
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
    const s3 = getS3Client();
    if (!s3) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');

    const bucket = s3Creds.bucket;

    const ensureS3TrashFolder = async () => {
      await s3
        .putObject({
          Bucket: bucket,
          Key: '.trash/',
          Body: '',
        })
        .promise();
    };

    await ensureS3TrashFolder();

    if (node.type === 'file') {
      const srcKey = node.path;
      const destKey = `.trash/${srcKey}`;

      await s3
        .copyObject({
          Bucket: bucket,
          CopySource: `${bucket}/${encodeURIComponent(srcKey)}`,
          Key: destKey,
        })
        .promise();

      await s3
        .deleteObject({
          Bucket: bucket,
          Key: srcKey,
        })
        .promise();
    } else if (node.type === 'folder') {
      const prefix = node.path;
      const listedObjects = await s3
        .listObjectsV2({
          Bucket: bucket,
          Prefix: prefix,
        })
        .promise();

      if (listedObjects.Contents && listedObjects.Contents.length > 0) {
        for (const { Key } of listedObjects.Contents) {
          const destKey = `.trash/${Key}`;
          await s3
            .copyObject({
              Bucket: bucket,
              CopySource: `${bucket}/${encodeURIComponent(Key)}`,
              Key: destKey,
            })
            .promise();
        }

        const deleteParams = {
          Bucket: bucket,
          Delete: {
            Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
          },
        };
        await s3.deleteObjects(deleteParams).promise();
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
        const s3 = getS3Client();
        if (!s3) throw new Error('S3 클라이언트를 초기화하지 못했습니다.');

        if (isInTrash) {
          if (node.type === 'folder') {
            const listedObjects = await s3
              .listObjectsV2({ Bucket: s3Creds.bucket, Prefix: node.path })
              .promise();
            if (listedObjects.Contents.length > 0) {
              const deleteParams = {
                Bucket: s3Creds.bucket,
                Delete: { Objects: listedObjects.Contents.map(({ Key }) => ({ Key })) },
              };
              await s3.deleteObjects(deleteParams).promise();
            }
          } else {
            await s3.deleteObject({ Bucket: s3Creds.bucket, Key: node.path }).promise();
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

    const interval = setInterval(() => {
      if (!lastInputAt) return;
      const idleMs = Date.now() - lastInputAt;
      if (idleMs < 30000) return;
      // 로컬에 미저장 내용이 있으면 덮어쓰지 않음
      if (currentFile.content !== editorContent) return;

      const s3 = getS3Client();
      if (!s3) return;

      s3.getObject({ Bucket: s3Creds.bucket, Key: currentFile.id }, (err, data) => {
        if (err) {
          console.error('Auto sync S3 Read Error:', err);
          return;
        }
        const text = new TextDecoder('utf-8').decode(data.Body);
        setCurrentFile((prev) => {
          if (!prev || prev.type !== 's3' || prev.id !== currentFile.id) return prev;
          return { ...prev, content: text };
        });
        setEditorContent((prev) => {
          // 혹시 사이에 입력이 생겼다면 덮어쓰지 않음
          if (prev !== editorContent) return prev;
          return text;
        });
        setLastAutoSyncAt(Date.now());
      });
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
        <div className="flex flex-1 min-h-0">
          <div
            className="relative h-full shrink-0"
            style={{ width: `${sidebarWidth}px` }}
          >
            <Sidebar
              s3Tree={s3Tree}
              s3Bucket={s3Creds.bucket}
              localTree={localTree}
              localRootHandle={localRootHandle}
              currentFile={currentFile}
              onSelectFile={selectFile}
              onCreateItem={createItem}
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
            <div
              className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-400/30 dark:hover:bg-blue-400/30"
              onMouseDown={handleSidebarResizeMouseDown}
            />
          </div>

          {/* Main Content Routes */}
          <div className="flex-1 min-w-0 flex flex-col">
          <Routes>
            <Route
              path="/settings"
              element={
                <SettingsPage
                  s3Creds={s3Creds}
                  masterPassword={masterPassword}
                  onChangeCreds={(field, value) =>
                    setS3Creds((prev) => ({
                      ...prev,
                      [field]: value,
                    }))
                  }
                  onExportCreds={handleExportCreds}
                  onImportClick={() => fileInputRef.current?.click()}
                  onOpenSetPasswordModal={() => setShowSetPasswordModal(true)}
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
        <div className="h-7 border-t border-gray-200 dark:border-odp-borderSoft bg-white/90 dark:bg-odp-bgSoft/95 text-[11px] px-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="truncate">
              저장소:{' '}
              {currentFile?.type === 's3'
                ? `S3 (${s3Creds.bucket || '-'})`
                : currentFile?.type === 'local'
                ? '로컬'
                : '없음'}
            </span>
            {currentFile && (
              <>
                <span className="truncate">
                  파일:{' '}
                  {currentFile.type === 's3'
                    ? currentFile.id
                    : currentFile.id || currentFile.name}
                </span>
                <span className="truncate text-gray-500 dark:text-odp-muted">
                  크기:{' '}
                  {currentFile.size != null
                    ? formatFileSize(currentFile.size)
                    : '알 수 없음'}
                </span>
              </>
            )}
            {operationStatus && (
              <span className="truncate text-xs text-gray-500 dark:text-odp-muted">
                상태: {operationStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${autoSaveIndicatorClass}`}
                aria-hidden="true"
              />
              <span>
                자동저장(S3):{' '}
                {currentFile?.type === 's3'
                  ? lastAutoSaveAt
                    ? `마지막 ${formatTime(lastAutoSaveAt)}`
                    : '대기 중 (입력 후 5초)'
                  : '대상 아님'}
              </span>
            </span>
            <span>
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

    </div>
  );
}