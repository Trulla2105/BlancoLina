"use client";

/** Selector de cantidad − n +. */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  small = false,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  small?: boolean;
}) {
  const tope = Math.max(min, max);
  return (
    <div className={small ? "qty qty-sm" : "qty"}>
      <button
        type="button"
        aria-label="Restar uno"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Cantidad"
        value={value}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value.replace(/\D/g, "")) || min);
          onChange(Math.min(tope, Math.max(min, n)));
        }}
      />
      <button
        type="button"
        aria-label="Sumar uno"
        onClick={() => onChange(Math.min(tope, value + 1))}
        disabled={value >= tope}
      >
        +
      </button>
    </div>
  );
}
