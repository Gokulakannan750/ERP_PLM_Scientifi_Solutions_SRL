'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Download } from 'lucide-react';
import api from '@/lib/api';

interface Document {
    id: number;
    fileName: string;
    originalFileName: string;
    fileUrl: string;
    fileSize: number | null;
    mimeType: string | null;
    version: number;
    createdAt: string;
    uploadedBy: {
        id: number;
        name: string | null;
        email: string;
    };
}

interface DocumentUploadProps {
    companyId: number;
    documents: Document[];
    onDocumentAdded: (doc: Document) => void;
    onDocumentDeleted: (docId: number) => void;
}

export default function DocumentUpload({ companyId, documents, onDocumentAdded, onDocumentDeleted }: DocumentUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleUpload = async (file: File) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(`/companies/${companyId}/documents`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            onDocumentAdded(res.data);
        } catch (error) {
            console.error('Upload failed', error);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0]);
        }
    }, [companyId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleDelete = async (docId: number) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await api.delete(`/companies/${companyId}/documents/${docId}`);
            onDocumentDeleted(docId);
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete file');
        }
    };

    const formatSize = (bytes: number | null) => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                />
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                >
                    {isUploading ? (
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    ) : (
                        <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            PDF, DOCX, XLSX, PNG, JPG up to 10MB
                        </p>
                    </div>
                </label>
            </div>

            {/* Document List */}
            {documents.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Uploaded Documents</h4>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                                        <FileIcon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {doc.originalFileName}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            <span>{formatSize(doc.fileSize)}</span>
                                            <span>•</span>
                                            <span>v{doc.version}</span>
                                            <span>•</span>
                                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className="truncate">by {doc.uploadedBy?.name || doc.uploadedBy?.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <a
                                        href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '')}${doc.fileUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Delete"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
