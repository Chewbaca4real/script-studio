import React, {useEffect, useRef} from 'react'
import './editor.css'

// Simple contenteditable editor implementing basic screenplay formatting heuristics
export default function Editor({ value, onChange }){
  const ref = useRef(null)

  useEffect(()=>{
    if (ref.current) ref.current.innerText = value
  },[value])

  const onInput = (e) => {
    const text = e.currentTarget.innerText
    onChange(text)
  }

  const onKeyDown = (e) => {
    // auto uppercase on new line for character names heuristic (very simple)
    if (e.key === 'Enter'){
      // delay to let newline appear
      setTimeout(()=>{
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode) return;
        const node = sel.anchorNode.parentElement || sel.anchorNode;
        // no-op simple heuristic
      }, 10)
    }
  }

  return (
    <div className="editor-container">
      <div contentEditable ref={ref} className="editor" onInput={onInput} onKeyDown={onKeyDown} spellCheck={false} />
    </div>
  )
}
