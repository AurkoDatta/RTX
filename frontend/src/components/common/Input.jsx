/**
 * Labeled text/number input. Numeric inputs (`type="number"`) render in the
 * mono face, matching this app's convention of using monospace exclusively
 * for numeric/telemetry data; `onChange` receives a parsed number for those,
 * and the raw string otherwise.
 */
export function Input({ label, type = 'text', value, onChange, step, min, max, ...props }) {
  function handleChange(event) {
    if (type === 'number') {
      const parsed = event.target.valueAsNumber;
      onChange(Number.isNaN(parsed) ? 0 : parsed);
    } else {
      onChange(event.target.value);
    }
  }

  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
          {label}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        step={step}
        min={min}
        max={max}
        className={`w-full rounded border border-hairline bg-surface-raised px-2 py-1.5 text-sm text-text-primary outline-none focus:border-ember ${
          type === 'number' ? 'font-mono' : ''
        }`}
        {...props}
      />
    </label>
  );
}
