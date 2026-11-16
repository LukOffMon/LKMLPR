import { useLayoutEffect, useRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'

/** Textarea que crece con su contenido (sin scroll interno). */
export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [props.value])
  return <textarea ref={ref} rows={1} {...props} style={{ overflow: 'hidden', resize: 'none', ...props.style }} />
}
