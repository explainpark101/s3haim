/**
 * 활동 인디케이터 Context
 * - 파일 업로드, 녹음 처리, 필기 저장, 사진 업로드 등 진행 중인 작업을 하단바에 표시
 * - useActivityIndicator 훅으로 어디서든 add/remove/update 가능 (추후 사진 업로드 등 확장 용이)
 *
 * 사진 업로드 추가 예시:
 *   const { addIndicator, removeIndicator } = useActivityIndicator();
 *   const id = addIndicator({ type: ActivityTypes.PHOTO_UPLOAD, label: '사진 업로드 중' });
 *   try { await uploadPhoto(...); } finally { removeIndicator(id); }
 */
import { createContext, useContext, useReducer, useCallback } from 'react';

/** @type {'file-upload'|'recording'|'note-processing'|'photo-upload'} */
export const ActivityTypes = {
  FILE_UPLOAD: 'file-upload',
  RECORDING: 'recording',
  NOTE_PROCESSING: 'note-processing',
  PHOTO_UPLOAD: 'photo-upload',
};

/** @type {'pending'|'processing'|'done'|'error'} */
const Status = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
};

const initialState = [];

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const exists = state.some((i) => i.id === action.payload.id);
      if (exists) return state;
      return [...state, { ...action.payload, status: action.payload.status || Status.PROCESSING }];
    }
    case 'REMOVE':
      return state.filter((i) => i.id !== action.payload.id);
    case 'UPDATE':
      return state.map((i) =>
        i.id === action.payload.id ? { ...i, ...action.payload.updates } : i
      );
    default:
      return state;
  }
}

const ActivityIndicatorContext = createContext(null);

export function ActivityIndicatorProvider({ children }) {
  const [indicators, dispatch] = useReducer(reducer, initialState);

  const addIndicator = useCallback((payload) => {
    const id = payload.id || `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: 'ADD', payload: { ...payload, id } });
    return id;
  }, []);

  const removeIndicator = useCallback((id) => {
    dispatch({ type: 'REMOVE', payload: { id } });
  }, []);

  const updateIndicator = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE', payload: { id, updates } });
  }, []);

  const value = {
    indicators,
    addIndicator,
    removeIndicator,
    updateIndicator,
  };

  return (
    <ActivityIndicatorContext.Provider value={value}>
      {children}
    </ActivityIndicatorContext.Provider>
  );
}

export function useActivityIndicator() {
  const ctx = useContext(ActivityIndicatorContext);
  if (!ctx) {
    throw new Error('useActivityIndicator must be used within ActivityIndicatorProvider');
  }
  return ctx;
}
