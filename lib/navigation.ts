/** Keep an explicitly selected demo separate from the connected community. */
export function sitePath(params: Record<string, string | undefined> = {}, currentSearch = ''): string {
  const query = new URLSearchParams();
  if (new URLSearchParams(currentSearch).get('demo') === '1') query.set('demo', '1');
  for (const [name, value] of Object.entries(params)) {
    if (value) query.set(name, value);
  }
  return query.size ? `/?${query.toString()}` : '/';
}
