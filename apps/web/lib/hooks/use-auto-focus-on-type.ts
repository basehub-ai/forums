import { type RefObject, useEffect } from "react"

/**
 * Auto-focuses the target input/textarea when the user starts typing or pastes,
 * but only if no other interactive element is currently focused.
 *
 * This avoids stealing focus from other inputs, textareas, selects, buttons,
 * contenteditable elements, or elements inside dialogs/menus.
 */
export function useAutoFocusOnType(
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
) {
  useEffect(() => {
    function shouldIgnore(): boolean {
      const active = document.activeElement
      if (!active || active === document.body) {
        return false
      }

      const tag = active.tagName
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      ) {
        return true
      }

      if ((active as HTMLElement).isContentEditable) {
        return true
      }

      // Don't steal focus from elements inside dialogs, menus, or popovers
      if (
        active.closest(
          '[role="dialog"], [role="menu"], [role="listbox"], [role="combobox"], [data-popup]'
        )
      ) {
        return true
      }

      return false
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Don't interfere if the target element already has focus
      if (document.activeElement === ref.current) {
        return
      }

      // Don't intercept if modifier keys are held (except Shift for uppercase)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return
      }

      // Only intercept printable single characters
      if (e.key.length !== 1) {
        return
      }

      if (shouldIgnore()) {
        return
      }

      ref.current?.focus()
      // Don't prevent default — the character will be typed into the now-focused element
    }

    function handlePaste(e: ClipboardEvent) {
      if (document.activeElement === ref.current) {
        return
      }

      if (shouldIgnore()) {
        return
      }

      const text = e.clipboardData?.getData("text")
      if (!text) {
        return
      }

      e.preventDefault()

      const el = ref.current
      if (!el) return

      el.focus()

      // Use native value setter + input event to work with React controlled components.
      // React overrides the value property on inputs, so we need to call the native
      // HTMLInputElement/HTMLTextAreaElement setter to bypass React's controlled value,
      // then dispatch an input event so React's onChange fires.
      const proto =
        el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set
      if (nativeSetter) {
        const currentValue = el.value
        nativeSetter.call(el, currentValue + text)
        el.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("paste", handlePaste)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("paste", handlePaste)
    }
  }, [ref])
}
