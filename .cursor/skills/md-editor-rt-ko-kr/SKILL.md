---
name: md-editor-rt-ko-kr
description: Configure md-editor-rt markdown editor and preview with Korean ko-KR locale and project-specific colors via src/styles in this React app. Use when working with MemoEditor/MemoViewer or adding new md-editor-rt instances.
---

# md-editor-rt ko_KR & 스타일 가이드

## 목적

- 이 스킬은 `md-editor-rt`를 **ko_KR 로케일**과 함께 사용하고,
- 라이브러리 기본 CSS 대신 **`src/styles` 기반 색상/테마**를 적용하는 패턴을 정리한다.
- `MemoEditor`, `MemoViewer`와 동일한 방식으로 새 에디터/뷰어를 만들 때 사용한다.

---

## 기본 설치

기존 프로젝트에는 이미 설치되어 있을 가능성이 높지만, 새 프로젝트라면:

```bash
npm install md-editor-rt @vavt/cm-extension
# 또는
yarn add md-editor-rt @vavt/cm-extension
```

> 이 프로젝트에서는 `md-editor-rt`의 기본 CSS(`md-editor-rt/lib/style.css`, `md-editor-rt/lib/preview.css`)를 직접 import 하지 않고,  
> `src/styles/style.css`, `src/styles/preview.css`로 테마를 완전히 덮어쓴다.

---

## ko_KR 로케일 등록 패턴

### 1. 공통 설정 (`config`) 등록

에디터/프리뷰를 사용하는 **각 번들 entry 수준(또는 컴포넌트 모듈 상단)**에서 한 번만 호출한다.

```tsx
import { MdEditor, MdPreview, config } from 'md-editor-rt';
import KO_KR from '@vavt/cm-extension/dist/locale/ko-KR';

config({
  editorConfig: {
    languageUserDefined: {
      'ko-KR': KO_KR,
    },
  },
});
```

### 2. 컴포넌트에서 ko_KR 사용

`MdEditor`, `MdPreview` 둘 다 `language="ko-KR"`을 넘긴다.

```tsx
<MdEditor
  id={editorId}
  modelValue={value}
  onChange={onChange}
  theme={resolvedTheme}   // 'light' | 'dark'
  language="ko-KR"
/>

<MdPreview
  id={editorId}
  modelValue={value}
  theme={resolvedTheme}
  language="ko-KR"
/>
```

---

## 테마 / 색상 적용 (`src/styles`)

### 1. 에디터용 스타일 (`src/styles/style.css`)

`MemoEditor`에서는 라이브러리 CSS를 사용하지 않고 다음만 import 한다.

```tsx
// import 'md-editor-rt/lib/style.css';
import '@/styles/style.css';
```

`style.css`의 핵심은 `md-editor-rt`가 사용하는 CSS 변수들을 **AppGemini 색상 변수**에 매핑하는 것이다. 예:

```css
.md-editor .md-editor-preview {
  --md-theme-color: var(--md-color);
  --md-theme-link-color: var(--color-indigo-500);
  --md-theme-link-hover-color: var(--color-green-500);
  --md-theme-border-color: var(--color-gray-200);
  --md-theme-bg-color: var(--color-white);
  /* ... */
}

.md-editor-dark .md-editor-preview,
.dark .md-editor .md-editor-preview {
  --md-theme-link-color: var(--color-indigo-400);
  --md-theme-link-hover-color: var(--color-green-400);
  --md-theme-bg-color: var(--color-gray-800);
  /* ... */
}
```

- 에디터의 텍스트/링크/테이블/코드 블록 색상은 대부분 `--md-theme-*` 변수로 제어된다.
- 새 색상을 쓰고 싶으면 **기존 Tailwind 기반 변수**(`--color-indigo-500`, `--color-green-500`, `--color-gray-800` 등)를 조합해서 `--md-theme-*`에 매핑한다.

### 2. 프리뷰 전용 스타일 (`src/styles/preview.css`)

`MemoViewer`에서는 기본 preview CSS 대신 다음만 import 한다.

```tsx
// import 'md-editor-rt/lib/preview.css';
import '@/styles/preview.css';
```

`preview.css` 역시 `.md-editor .md-editor-preview`와 `.md-editor-dark .md-editor-preview` 아래에서 같은 방식으로 변수들을 세팅한다.  
프리뷰만 사용하는 경우에도 **동일한 색상 토큰**이 유지되므로 에디터/뷰어 간 일관성이 맞춰진다.

### 3. 새로운 색상/테마를 추가하는 방법

1. 먼저 전역(또는 상위 스타일)에서 **새 색상 변수**를 정의한다. 예:
   ```css
   :root {
     --color-brand-primary: #4f46e5;
   }
   ```
2. `style.css` 또는 `preview.css`에서 해당 변수를 `--md-theme-*`에 연결한다. 예:
   ```css
   .md-editor .md-editor-preview {
     --md-theme-link-color: var(--color-brand-primary);
   }
   ```
3. 필요하다면 다크 모드용 값도 `.md-editor-dark .md-editor-preview` 블록에 따로 넣는다.

---

## 테마 결정 패턴 (`theme` prop)

이 프로젝트에서는 시스템 테마를 감지하는 훅을 사용해 `theme`를 정한다.

```tsx
function usePrefersColorScheme() {
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handle = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  return prefersDark ? 'dark' : 'light';
}
```

컴포넌트에서는 다음처럼 사용한다.

```tsx
const systemTheme = usePrefersColorScheme();
const resolvedTheme = theme ?? systemTheme;

<MdEditor
  /* ...기타 props... */
  theme={resolvedTheme}
/>
```

- `theme` prop이 명시되면 그 값을 우선 사용하고, 없으면 시스템 테마를 따라간다.
- `MdPreview`도 동일하게 `theme={resolvedTheme}`를 넘겨 일관성 있게 맞춘다.

---

## 예제: 메모 에디터 패턴 (축약본)

`MemoEditor`와 동일한 패턴으로, **ko_KR + 커스텀 스타일**을 사용하는 최소 예제:

```tsx
import React, { useState, useEffect } from 'react';
import { MdEditor, config } from 'md-editor-rt';
import KO_KR from '@vavt/cm-extension/dist/locale/ko-KR';
// import 'md-editor-rt/lib/style.css';
import '@/styles/style.css';

config({
  editorConfig: {
    languageUserDefined: {
      'ko-KR': KO_KR,
    },
  },
});

function usePrefersColorScheme() {
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handle = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);
  return prefersDark ? 'dark' : 'light';
}

export function MemoEditorExample({ value, onChange, editorId }: {
  value: string;
  onChange: (v: string) => void;
  editorId: string;
}) {
  const systemTheme = usePrefersColorScheme();

  return (
    <MdEditor
      id={editorId}
      modelValue={value}
      onChange={onChange}
      theme={systemTheme}
      language="ko-KR"
      preview={false}
      noUploadImg
    />
  );
}
```

---

## 예제: 메모 뷰어 패턴 (축약본)

`MemoViewer`와 동일한 방식으로, **프리뷰 전용 ko_KR + 커스텀 스타일**:

```tsx
import React, { useState, useEffect } from 'react';
import { MdPreview, config } from 'md-editor-rt';
import KO_KR from '@vavt/cm-extension/dist/locale/ko-KR';
// import 'md-editor-rt/lib/preview.css';
import '@/styles/preview.css';

config({
  editorConfig: {
    languageUserDefined: {
      'ko-KR': KO_KR,
    },
  },
});

function usePrefersColorScheme() {
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handle = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);
  return prefersDark ? 'dark' : 'light';
}

export function MemoViewerExample({ value, editorId }: {
  value: string;
  editorId: string;
}) {
  const systemTheme = usePrefersColorScheme();
  const isEmpty = !value || !value.trim();

  if (isEmpty) {
    return (
      <span className="text-gray-400 dark:text-gray-500 text-sm py-2 block">
        메모
      </span>
    );
  }

  return (
    <MdPreview
      id={editorId}
      modelValue={value}
      theme={systemTheme}
      language="ko-KR"
    />
  );
}
```

---

## 요약 체크리스트

새 `md-editor-rt` 사용 컴포넌트를 만들 때:

- [ ] `md-editor-rt`, `@vavt/cm-extension`이 설치되어 있는지 확인한다.
- [ ] `config({ editorConfig.languageUserDefined['ko-KR'] = KO_KR })`를 모듈 상단에서 한 번만 호출한다.
- [ ] 라이브러리 기본 CSS 대신 `@/styles/style.css` 또는 `@/styles/preview.css`를 import 한다.
- [ ] `MdEditor`/`MdPreview`에 `language="ko-KR"`을 지정한다.
- [ ] `theme`는 `usePrefersColorScheme()` 패턴을 따라 `'light' | 'dark'` 값으로 넘긴다.
- [ ] 색상을 바꾸고 싶으면 `src/styles` 안에서 `--md-theme-*` 변수를 프로젝트 색상 변수(`--color-*`)에 매핑해서 조정한다.

