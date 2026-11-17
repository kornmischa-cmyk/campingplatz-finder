export function LockIcon({ open = false }: { open?: boolean }) {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true">
      <rect x="0.5" y="4.5" width="8" height="5" rx="0.8" fill="currentColor" />
      <path d={open ? 'M2.3 4.5V2.8a2.2 2.2 0 0 1 4.2-.9' : 'M2.3 4.5V2.8a2.2 2.2 0 0 1 4.4 0v1.7'} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Einheitliche Strich-Icons (16 px Raster, 1,6 Strich) */
function Stroke({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
export const UndoIcon = () => <Stroke d="M5.5 3.5 2.5 6.5l3 3M2.8 6.5h6.7a4 4 0 0 1 0 8H7" />;
export const RedoIcon = () => <Stroke d="m10.5 3.5 3 3-3 3M13.2 6.5H6.5a4 4 0 0 0 0 8H9" />;
export const ChevronLeft = () => <Stroke d="M10 3.5 5.5 8l4.5 4.5" />;
export const ChevronRight = () => <Stroke d="M6 3.5 10.5 8 6 12.5" />;
export const ChevronUp = () => <Stroke d="M3.5 10 8 5.5l4.5 4.5" />;
export const ChevronDown = () => <Stroke d="M3.5 6 8 10.5 12.5 6" />;
export const ArrowDown = () => <Stroke d="M8 2.5v11M3.5 9 8 13.5 12.5 9" size={13} />;
export const CloseIcon = () => <Stroke d="M4 4l8 8M12 4l-8 8" />;
