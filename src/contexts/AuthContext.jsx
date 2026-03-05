/**
 * 인증 Context
 * - 잠금 해제 상태, S3 인증 정보 등을 유지
 * - /export-pdf 등 다른 라우트로 이동 후 돌아와도 재잠금 해제 불필요
 */
import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const initialCreds = {
  accessKeyId: '',
  secretAccessKey: '',
  region: 'ap-northeast-2',
  bucket: '',
  endpoint: '',
};

export function AuthProvider({ children }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [s3Creds, setS3Creds] = useState(initialCreds);

  const unlock = useCallback((creds, password = '') => {
    setS3Creds(creds);
    setMasterPassword(password);
    setIsUnlocked(true);
    setShowAuthModal(false);
  }, []);

  const lock = useCallback(() => {
    setIsUnlocked(false);
    setShowAuthModal(true);
    setS3Creds(initialCreds);
    setMasterPassword('');
  }, []);

  const value = {
    isUnlocked,
    setIsUnlocked,
    showAuthModal,
    setShowAuthModal,
    showSetPasswordModal,
    setShowSetPasswordModal,
    masterPassword,
    setMasterPassword,
    s3Creds,
    setS3Creds,
    unlock,
    lock,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
