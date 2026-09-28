import { useState } from 'react';

type Props = {
  code: string;
  onJoin: (code: string) => void;
  onClose: () => void;
};

export function SyncPanel({ code, onJoin, onClose }: Props) {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onJoin(input.trim());
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">기기 간 동기화</h2>

        <div className="form-field">
          <span>이 기기의 동기화 코드</span>
          <div className="link-editor__row">
            <input type="text" value={code} readOnly />
            <button type="button" className="icon-btn" onClick={copy}>
              {copied ? '✓' : '복사'}
            </button>
          </div>
          <p className="sync-panel__hint">
            다른 기기에서 아래 입력창에 이 코드를 붙여넣으면 같은 일정을 공유합니다.
          </p>
        </div>

        <form className="form-field" onSubmit={join}>
          <span>다른 기기의 코드 입력</span>
          <div className="link-editor__row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="동기화 코드 붙여넣기"
            />
            <button type="submit" className="add-btn">
              연결
            </button>
          </div>
        </form>

        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
