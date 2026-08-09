export function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-hairline bg-surface-raised px-2 py-1.5 text-sm text-text-primary outline-none focus:border-ember"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
