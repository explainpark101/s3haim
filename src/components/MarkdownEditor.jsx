import { MdEditor, config } from 'md-editor-rt';
// import 'md-editor-rt/lib/style.css';
import "@/styles/md-editor-rt/style.css";
import KO_KR from '@vavt/cm-extension/dist/locale/ko-KR';

config({
  editorConfig: {
    languageUserDefined: {
      'ko-KR': KO_KR,
    },
  },
});


export default function MarkdownEditor({ value, onChange, theme = 'light' }) {
  return (
    <MdEditor
      modelValue={value}
      onChange={onChange}
      className="h-full!"
      // previewTheme="github"
      theme={theme}
      language="ko-KR"
    />
  );
}

