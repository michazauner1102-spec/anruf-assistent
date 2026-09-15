export function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div className="progressbar" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i <= index ? "progressbar__seg is-done" : "progressbar__seg"} />
      ))}
    </div>
  );
}
