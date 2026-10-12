import { useCallback, useEffect, useId, useRef } from 'react';
import type { PointerEvent } from 'react';

/** 이만큼(px) 이상 끌어내리면 시트를 닫는다. */
const DISMISS_DISTANCE = 100;

/**
 * 바텀시트(모달)의 공통 동작: 대화상자 접근성 속성, Esc로 닫기, 열릴 때 포커스 이동과 닫힐 때 복귀,
 * 머리글(손잡이)을 아래로 끌어서 닫기. 끌기 말고도 닫기 버튼과 Esc로 닫을 수 있다.
 */
export function useSheet(onClose: () => void) {
  const titleId = useId();
  const sheet = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const drag = useRef<{ startY: number; dy: number; id: number } | null>(null);

  const ref = useCallback((el: HTMLElement | null) => {
    sheet.current = el;
  }, []);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // 안에 이미 포커스가 간 곳(자동 포커스 입력창)이 없으면 시트 자체로 옮겨 스크린 리더가 제목을 읽게 한다.
    if (sheet.current && !sheet.current.contains(document.activeElement)) sheet.current.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);

  const dialogProps = {
    role: 'dialog' as const,
    'aria-modal': true as const,
    'aria-labelledby': titleId,
    tabIndex: -1,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  };

  const handleProps = {
    onPointerDown(e: PointerEvent) {
      // 닫기 버튼 같은 컨트롤을 누른 경우는 끌기로 보지 않는다.
      if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
      drag.current = { startY: e.clientY, dy: 0, id: e.pointerId };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (sheet.current) sheet.current.style.transition = 'none';
    },
    onPointerMove(e: PointerEvent) {
      const d = drag.current;
      if (!d || !sheet.current) return;
      d.dy = Math.max(0, e.clientY - d.startY);
      sheet.current.style.transform = `translateY(${d.dy}px)`;
    },
    onPointerUp() {
      const d = drag.current;
      drag.current = null;
      const el = sheet.current;
      if (!d || !el) return;
      if (d.dy > DISMISS_DISTANCE) {
        onCloseRef.current();
        return;
      }
      el.style.transition = 'transform 0.2s ease';
      el.style.transform = '';
    },
  };

  return { ref, titleId, dialogProps, handleProps: { ...handleProps, onPointerCancel: handleProps.onPointerUp } };
}
