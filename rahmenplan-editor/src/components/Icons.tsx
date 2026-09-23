export function LockIcon({ open = false }: { open?: boolean }) {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true">
      <rect x="0.5" y="4.5" width="8" height="5" rx="0.8" fill="currentColor" />
      <path d={open ? 'M2.3 4.5V2.8a2.2 2.2 0 0 1 4.2-.9' : 'M2.3 4.5V2.8a2.2 2.2 0 0 1 4.4 0v1.7'} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
