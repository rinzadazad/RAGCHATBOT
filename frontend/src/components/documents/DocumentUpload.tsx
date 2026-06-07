import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { documentService } from '@/services/documentService'
import { useToast } from '@/hooks/use-toast'
import { cn, formatBytes } from '@/lib/utils'

interface UploadFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface Props {
  onUploadComplete: () => void
}

export function DocumentUpload({ onUploadComplete }: Props) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((file) => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }))
    setUploadFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        toast({ title: `${r.file.name}: ${r.errors[0].message}`, variant: 'destructive' })
      })
    },
  })

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    const pending = uploadFiles.filter((f) => f.status === 'pending')
    if (pending.length === 0) return

    setIsUploading(true)
    setUploadFiles((prev) =>
      prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f))
    )

    try {
      await documentService.upload(
        pending.map((f) => f.file),
        (pct) => {
          setUploadFiles((prev) =>
            prev.map((f) => (f.status === 'uploading' ? { ...f, progress: pct } : f))
          )
        }
      )

      setUploadFiles((prev) =>
        prev.map((f) => (f.status === 'uploading' ? { ...f, status: 'done', progress: 100 } : f))
      )

      toast({ title: `${pending.length} file(s) uploaded and queued for processing`, variant: 'default' })
      onUploadComplete()
    } catch (err: any) {
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error', error: err.response?.data?.detail ?? 'Upload failed' }
            : f
        )
      )
      toast({ title: 'Upload failed', variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-accent/30'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all', isDragActive ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium text-sm">{isDragActive ? 'Drop files here' : 'Drag & drop files here'}</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse · PDF, DOCX, TXT · Max 50MB each</p>
          </div>
        </div>
      </div>

      {uploadFiles.length > 0 && (
        <div className="space-y-2">
          {uploadFiles.map((uf, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uf.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">{formatBytes(uf.file.size)}</p>
                  {uf.status === 'uploading' && (
                    <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uf.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                {uf.status === 'pending' && (
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {uf.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {uf.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {uf.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading || uploadFiles.every((f) => f.status !== 'pending')}
              className="flex-1 gap-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload {uploadFiles.filter((f) => f.status === 'pending').length} File(s)
            </Button>
            <Button variant="outline" onClick={() => setUploadFiles([])} disabled={isUploading}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
