import React, {useState, useEffect, useRef} from 'react'
import Editor from './Editor'

export default function App(){
  const [title, setTitle] = useState('Untitled')
  const [content, setContent] = useState('INT. HOUSE - DAY\n\nJohn walks into the room.\n\nJOHN\nHello.')
  const filePathRef = useRef(null)

  useEffect(()=>{
    window.electronAPI.onFileOpen((data) => {
      filePathRef.current = data.path || null
      setContent(data.text || '')
    })
    window.electronAPI.onFileNew(()=>{
      filePathRef.current = null
      setTitle('Untitled')
      setContent('INT. LOCATION - DAY\n\n')
    })
    window.electronAPI.onSave(()=>{
      if (filePathRef.current) {
        saveAsFile(filePathRef.current)
      } else {
        saveAs()
      }
    })
    window.electronAPI.onExportPdf(()=>exportPdf())
    window.electronAPI.onExportFdx(()=>exportFdx())
  },[])

  const saveAs = async () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (title||'script') + '.fountain';
    a.click();
  }

  const saveAsFile = async (path) => { saveAs() }

  const exportPdf = async () => {
    const html = renderHtmlForPdf(title, content)
    const resp = await window.electronAPI.exportPdf(html)
    if (resp.success) alert('PDF saved: ' + resp.path)
    else alert('PDF export failed: ' + resp.error)
  }

  const exportFdx = async () => {
    const resp = await window.electronAPI.exportFdx(title, content)
    if (resp.success) alert('FDX saved: ' + resp.path)
    else alert('FDX export failed: ' + resp.error)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Script Studio</div>
        <div className="title">{title}</div>
      </header>
      <div className="container">
        <aside className="sidebar">
          <h3>Outline</h3>
          <div className="cards">
            {content.split(/\n\n+/).filter(Boolean).map((s,i)=> (
              <div className="card" key={i}>{s.split('\n')[0].slice(0,60)}</div>
            ))}
          </div>
        </aside>
        <main className="editor-area">
          <Editor value={content} onChange={setContent} />
        </main>
      </div>
    </div>
  )
}

function renderHtmlForPdf(title, content){
  const htmlContent = content.split(/\n\n+/).map(p => {
    const t = p.trim();
    if (/^(INT|EXT)\./i.test(t)) return `<h2 class=\"slug\">${escapeHtml(t)}</h2>`;
    if (t === t.toUpperCase() && t.split(' ').length <= 4) return `<p class=\"character\">${escapeHtml(t)}</p>`;
    return `<p class=\"action\">${escapeHtml(t).replace(/\n/g,'<br/>')}</p>`;
  }).join('\n');

  return `<!doctype html><html><head><meta charset=\"utf-8\"><style>
    body{font-family: Georgia, serif; padding: 36px;}
    .slug{font-weight:700;margin-top:18px}
    .character{margin-top:10px;font-weight:700;text-transform:uppercase}
    .action{margin-top:8px}
  </style></head><body><h1>${escapeHtml(title)}</h1>${htmlContent}</body></html>`
}

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
