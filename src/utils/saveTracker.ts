import { useCallback, useEffect, useRef, useState } from 'react';

/** 저장 요청이 이 시간 안에 서버 응답을 받지 못하면 "저장이 지연되고 있다"고 본다. */
export const STUCK_AFTER_MS = 5000;

export type SaveIssue = 'stuck' | 'failed' | null;

/**
 * Firestore는 서버가 쓰기를 거부하는 일부 경우(하루 한도 초과, 연결 불안정 등)에 오류를 내지 않고
 * 계속 재시도하므로 저장 요청이 끝나지 않은 채로 남는다. 이때 화면에는 저장된 것처럼 보이다가
 * 새로고침하면 사라진다. 그래서 응답이 늦는 저장을 감지해 사용자에게 알린다.
 */
export function useSaveTracker() {
  const [issue, setIssue] = useState<SaveIssue>(null);
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((failed: boolean) => {
    pending.current -= 1;
    if (failed) setIssue('failed');
    if (pending.current === 0) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (!failed) setIssue(null);
    }
  }, []);

  /** 저장 요청(Promise)을 추적한다. */
  const track = useCallback(
    (write: Promise<unknown>) => {
      pending.current += 1;
      if (!timer.current) {
        timer.current = setTimeout(() => {
          timer.current = null;
          if (pending.current > 0) setIssue((prev) => prev ?? 'stuck');
        }, STUCK_AFTER_MS);
      }
      write.then(
        () => settle(false),
        (err) => {
          console.error('Firestore 저장 실패', err);
          settle(true);
        },
      );
    },
    [settle],
  );

  // 저장이 끝나지 않은 채로 창을 닫거나 새로고침하면 변경이 사라지므로 한 번 더 확인한다.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { issue, track };
}
