import React, {useEffect, useRef} from 'react'
import './editor.css'

export default function Editor({ value, onChange }){
  const ref = useRef(null)

  useEffect(()=>{ if (ref.current) ref.current.innerText = value },[value])

  const onInput = (e) => { const text = e.currentTarget.innerText; onChange(text) }

  return (
    <div className="editor-container">
      <div contentEditable ref={ref} className="editor" onInput={onInput} spellCheck={false} />
    </div>
  )
}
