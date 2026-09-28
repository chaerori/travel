import type { LinkedText } from '../types';

export function LinkRow({ item }: { item: LinkedText }) {
  if (item.url) {
    return (
      <a className="link-row" href={item.url} target="_blank" rel="noreferrer">
        {item.label}
      </a>
    );
  }
  return <span className="link-row link-row--plain">{item.label}</span>;
}
