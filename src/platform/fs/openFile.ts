export interface OpenFileOptions {
  /** MIME or extension list, e.g. ".json,.xml" or "image/png". */
  readonly accept: string
  /** Allow multiple files. Default false. */
  readonly multiple?: boolean
}

/**
 * Pops the native file-picker by synthesising a click on an invisible
 * `<input type=file>`. Resolves with the chosen File (or null if the user
 * cancelled / closed the picker without choosing anything).
 *
 * For `multiple: true` the single-file overload is unchanged; callers that
 * want multi-file selection use `openFiles` (not shipped in Phase 7).
 */
export const openFile = ({ accept, multiple = false }: OpenFileOptions): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.display = 'none'

    input.addEventListener('change', () => {
      const file = input.files && input.files.length > 0 ? input.files[0]! : null
      resolve(file)
    }, { once: true })

    // Some browsers require the input to be in the DOM before `click` works.
    document.body.appendChild(input)
    try {
      input.click()
    } finally {
      // Defer removal so the change event has time to fire.
      queueMicrotask(() => input.remove())
    }
  })
