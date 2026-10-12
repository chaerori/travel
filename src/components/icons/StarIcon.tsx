/** 지도에 표시되는 가고 싶은 장소는 채운 별, 표시되지 않는 장소는 속이 빈 별. */
export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={filled ? 'bookmark-star bookmark-star--on' : 'bookmark-star bookmark-star--off'}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
    </svg>
  );
}
