export const debounce = <Args extends readonly unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): ((...args: Args) => void) => {
  let handle: ReturnType<typeof setTimeout> | null = null
  return (...args) => {
    if (handle !== null) clearTimeout(handle)
    handle = setTimeout(() => {
      handle = null
      fn(...args)
    }, waitMs)
  }
}
