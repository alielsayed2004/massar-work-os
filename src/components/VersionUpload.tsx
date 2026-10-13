'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { registerVersionFile } from '@/app/actions/deliverables'
import { MESSAGES } from '@/lib/labels'
import { s } from '@/components/ui'

/**
 * Uploads straight from the browser to the private `massar_files` bucket
 * (Storage RLS: internal staff only), then records the file on the draft
 * version. Every upload is a new file — nothing is overwritten.
 */
export default function VersionUpload({ versionId }: { versionId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setBusy(true)
    setMessage(null)
    const supabase = createClient()

    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const key = `versions/${versionId}/${crypto.randomUUID()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from('massar_files')
        .upload(key, file, { upsert: false, contentType: file.type || undefined })
      if (upErr) {
        setMessage(MESSAGES.FILE_UPLOAD_FAILED)
        setBusy(false)
        return
      }
      const res = await registerVersionFile({
        versionId,
        storageKey: key,
        name: file.name,
        type: file.type,
        size: file.size,
      })
      if (!res.ok) {
        setMessage(MESSAGES[res.code || 'FILE_UPLOAD_FAILED'])
        setBusy(false)
        return
      }
    }

    setBusy(false)
    e.target.value = ''
    router.refresh()
  }

  const inputId = `upload-${versionId}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      <label htmlFor={inputId} style={{ ...s.secondary, display: 'inline-flex', alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Uploading…' : 'Upload Files'}
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        disabled={busy}
        onChange={onChange}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
      {message && (
        <span role="alert" style={{ color: 'var(--color-text)', borderInlineStart: '4px solid var(--color-attention)', paddingInlineStart: 'var(--space-2)' }}>
          {message}
        </span>
      )}
    </div>
  )
}
