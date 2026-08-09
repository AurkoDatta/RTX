/**
 * Shared button styling for the render-lab theme. `primary` (filled ember)
 * marks the main action in context; `secondary` (hairline outline) is for
 * supporting actions; `danger` (outline that turns error-red on hover) is
 * for destructive actions like removing an object or deleting a render.
 */
export function Button({ variant = 'secondary', className = '', ...props }) {
  const base =
    'rounded px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-ember text-void hover:bg-ember-dim',
    secondary: 'border border-hairline text-text-muted hover:border-ember hover:text-ember',
    danger: 'border border-hairline text-text-muted hover:border-error hover:text-error',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
