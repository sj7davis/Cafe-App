import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface Props {
  value: string;                    // current image URL
  onChange: (url: string) => void; // called with new URL after upload or URL paste
  token: string;                   // owner JWT for auth
  label?: string;
  hint?: string;
}

/**
 * ImageUploadField — replaces raw URL inputs for menu item images.
 * Supports drag-and-drop, click-to-browse, and URL paste fallback.
 * Uploads to /api/upload/image and returns the hosted URL.
 */
export function ImageUploadField({ value, onChange, token, label = 'Image', hint = 'JPG, PNG, WebP · max 5 MB' }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('file', file);
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? 'Upload failed');
      onChange(window.location.origin + json.url);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    uploadFile(files[0]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--op-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {label}
        </label>
      )}

      {/* Current image preview */}
      {value && (
        <div style={{ position: 'relative', marginBottom: 10, display: 'inline-block' }}>
          <img src={value} alt="" style={{ height: 80, width: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--op-card-border)', display: 'block' }} />
          <button
            onClick={() => onChange('')}
            style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--op-accent)' : 'var(--op-card-border)'}`,
          borderRadius: 10,
          padding: '18px 16px',
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          background: dragging ? 'rgba(94,139,139,0.06)' : 'var(--op-bg)',
          transition: 'all 0.15s',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--op-text-secondary)', fontSize: 13 }}>
            <div style={{ width: 16, height: 16, border: '2px solid var(--op-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Uploading…
          </div>
        ) : (
          <>
            <Upload size={20} style={{ color: 'var(--op-text-muted)', marginBottom: 6 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--op-text)', marginBottom: 2 }}>
              {value ? 'Replace image' : 'Drop image here'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--op-text-muted)' }}>
              or click to browse · {hint}
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && <p style={{ fontSize: 12, color: '#DC2626', margin: '6px 0 0' }}>{error}</p>}

      {/* URL fallback toggle */}
      <div style={{ marginTop: 8 }}>
        <button
          onClick={() => setShowUrlInput(v => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--op-text-muted)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
        >
          {showUrlInput ? 'Hide' : 'Or paste image URL instead'}
        </button>
        {showUrlInput && (
          <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
            <input
              type="url"
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--op-card-border)', borderRadius: 7, fontSize: 13, color: 'var(--op-text)', background: 'var(--op-bg)', outline: 'none' }}
            />
            <button
              onClick={() => { if (urlDraft) { onChange(urlDraft); setUrlDraft(''); setShowUrlInput(false); } }}
              style={{ padding: '7px 12px', background: 'var(--op-accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Use URL
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
