---
name: note-with-recording
description: Architecture guide for building an audio-synchronized Markdown note app using Web Audio API, IndexedDB, FFmpeg.wasm (m4a encoding), and AWS S3.
license: MIT
---
# 오디오 동기화 마크다운 노트 앱 아키텍처

## 1. 핵심 기술 스택
* **Audio & Media:** Web Audio API, MediaRecorder
* **Encoding:** FFmpeg.wasm (브라우저 내 미디어 변환)
* **Storage:** IndexedDB (로컬 데이터 버퍼링)
* **Cloud Storage:** AWS SDK (S3 Presigned URL 기반 업로드)
* **Document:** Markdown 기반 에디터

## 2. 주요 기능 및 구현 로직

### A. 녹음 및 파형 시각화
* **MediaStream 획득:** 마이크 접근 권한 획득.
* **파형 출력:** `AudioContext`와 `AnalyserNode`를 연결해 실시간 주파수 데이터를 추출하고 `<canvas>`에 렌더링.
* **녹음 처리:** 동일 스트림을 `MediaRecorder`에 연결하여 오디오 청크(`Blob`)를 주기적으로 수집.

### B. 마크다운 - 오디오 동기화 (필기 트래킹)
* **타임스탬프 매핑:** 녹음 시작을 0초로 설정.
* **블록 단위 추적:** 사용자가 마크다운 줄(Line)이나 문단을 작성/수정할 때, 당시의 녹음 시간(`currentTime`)을 메타데이터로 매핑.
* **데이터 구조:** `[{ time: 12.5, line: 2, text: "- API 설계" }]` 형태의 JSON 배열.
* **재생 연동:** 오디오 `timeupdate` 이벤트에 맞춰 해당 시간대 마크다운 라인 하이라이팅.

### C. 로컬 데이터 저장 (IndexedDB)
* **목적:** 대용량 파일로 인한 브라우저 멈춤 방지 및 안전한 임시 저장.
* **저장 대상:** 원본 오디오 `Blob` 데이터, 마크다운 텍스트 및 동기화 JSON.

### D. 브라우저 내 M4A 인코딩 (핵심)
* **이유:** 브라우저별 기본 녹음 포맷(webm 등) 파편화 해결.
* **과정:** IndexedDB의 원본 오디오를 FFmpeg.wasm으로 불러와, 브라우저 내부에서 m4a(AAC)로 트랜스코딩.

### E. S3 업로드 파이프라인
* **보안 원칙:** 프론트엔드에 AWS Key 직접 노출 금지.
* **프로세스:** 1. 백엔드에서 S3 Presigned URL 발급.
  2. 프론트엔드에서 해당 URL로 m4a 파일을 `PUT` 요청하여 직접 업로드.