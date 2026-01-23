'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProjectForm from '@/components/forms/ProjectForm';
import api from '@/lib/api';
import { useParams } from 'next/navigation';

interface Project {
    id: number;
    name: string;
    description: string;
    budget: string;
    status: string;
    clientId: number;
    startDate: string;
    endDate: string;
}

export default function EditProjectPage() {
    const { id } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            const response = await api.get(`/projects/${id}`);
            setProject(response.data);
        } catch (error) {
            console.error('Failed to fetch project:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/projects"
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Edit Project
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Update project status and details
                    </p>
                </div>
            </div>

            {project && <ProjectForm initialData={project} isEditing={true} />}
        </div>
    );
}
