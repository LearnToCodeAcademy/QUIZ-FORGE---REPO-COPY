import React, { useState, useEffect, useRef } from "react";
import type { User, UserFile } from "../types";
import { getMyFiles, uploadFiles, deleteFile, updateProfile } from "../api";

interface Props {
  user: User;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
  onUserUpdate: (user: User) => void;
  onCreateQuizFromFiles: (fileIds: number[]) => void;
}

export default function ProfilePage({ user, onNotify, onUserUpdate, onCreateQuizFromFiles }: Props) {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadFiles(); }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await getMyFiles();
      if (result.ok) setFiles(result.files);
    } catch {} finally { setLoading(false); }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const result = await uploadFiles(Array.from(fileList));
      if (result.ok) {
        onNotify("Files uploaded successfully!", "success");
        loadFiles();
      } else {
        onNotify(result.error || "Upload failed", "error");
      }
    } catch { onNotify("Upload failed", "error"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDeleteFile = async (id: number) => {
    try {
      await deleteFile(id);
      setFiles(files.filter((f) => f.id !== id));
      selectedFiles.delete(id);
      setSelectedFiles(new Set(selectedFiles));
      onNotify("File deleted", "info");
    } catch { onNotify("Failed to delete file", "error"); }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedFiles);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedFiles(next);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { onNotify("Image must be under 500KB", "error"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await updateProfile({ customAvatar: base64 });
        onUserUpdate({ ...user, avatarUrl: base64 });
        onNotify("Profile picture updated!", "success");
      } catch { onNotify("Failed to update avatar", "error"); }
    };
    reader.readAsDataURL(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="profile-page page-transition">
      <div className="profile-header-card">
        <div className="profile-avatar-section" onClick={() => avatarInputRef.current?.click()}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">{user.name[0]?.toUpperCase()}</div>
          )}
          <div className="avatar-overlay">📷</div>
          <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
        </div>
        <div className="profile-info">
          <h2>{user.name}</h2>
          <p className="profile-email">{user.email}</p>
          <div className="profile-stats-row">
            <span className="profile-stat"><strong>{files.length}</strong> files</span>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h3>My Files</h3>
          <div className="profile-section-actions">
            {selectedFiles.size > 0 && (
              <button className="btn-primary btn-sm btn-ripple" onClick={() => onCreateQuizFromFiles(Array.from(selectedFiles))}>
                Create Quiz ({selectedFiles.size})
              </button>
            )}
            <button className="btn-secondary btn-sm btn-ripple" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading..." : "+ Upload Files"}
            </button>
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleUploadFiles} />
          </div>
        </div>

        {loading ? (
          <div className="skeleton-list">
            {[1,2,3].map(i => <div key={i} className="skeleton skeleton-text" style={{height: 48, marginBottom: 8}}></div>)}
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <p>No files uploaded yet. Upload study materials to save them to your profile.</p>
          </div>
        ) : (
          <div className="file-list">
            {files.map((f) => (
              <div key={f.id} className={`file-item ${selectedFiles.has(f.id) ? "selected" : ""}`}>
                <label className="file-checkbox-wrap">
                  <input type="checkbox" checked={selectedFiles.has(f.id)} onChange={() => toggleSelect(f.id)} />
                </label>
                <div className="file-item-info" onClick={() => toggleSelect(f.id)}>
                  <span className="file-item-name">{f.original_name}</span>
                  <span className="file-item-meta">{formatSize(f.file_size)} &middot; {new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                <button className="file-item-delete" onClick={() => handleDeleteFile(f.id)} title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
