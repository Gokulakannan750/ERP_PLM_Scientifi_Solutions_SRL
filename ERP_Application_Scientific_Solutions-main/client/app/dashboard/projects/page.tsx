'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, FolderKanban, Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import ProjectForm from '@/components/forms/ProjectForm';

interface Project {
    id: number;
    name: string;
    status: string;
    priorityLevel: string;
    budget: number;
    category: string;
    startDate: string;
    endDate: string;
    client?: {
        name: string;
    };
    tasks: any[];
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (project: Project) => {
        setSelectedProject(project);
        setShowForm(true);
    };

    const handleCreate = () => {
        setSelectedProject(null);
        setShowForm(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-status-info/10 text-status-info';
            case 'COMPLETED': return 'bg-status-ok/10 text-status-ok';
            case 'ON_HOLD': return 'bg-status-warning/10 text-status-warning';
            case 'CANCELLED': return 'bg-status-error/10 text-status-error';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Manage your projects, tasks, and resources
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Project
                </button>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-background dark:bg-gray-950 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project) => {
                    const totalEstHours = project.tasks.reduce((sum, t) => sum + parseFloat(t.estimatedHours || 0), 0);
                    const totalActHours = project.tasks.reduce((sum, t) => sum + parseFloat(t.actualHours || 0), 0);
                    const isOverHours = totalActHours > totalEstHours && totalEstHours > 0;

                    return (
                        <Link href={`/dashboard/projects/${project.id}`} key={project.id} className="block group">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all h-full flex flex-col">
                                <div className="p-6 flex-grow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <FolderKanban className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {project.client?.name || 'Internal'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target End</p>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white font-medium">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Budget</p>
                                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                                                {project.budget ? `₹${project.budget}` : '-'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Hours Tracked</span>
                                            <span className={`font-medium ${isOverHours ? 'text-status-error' : 'text-gray-900 dark:text-white'}`}>
                                                {totalActHours.toFixed(1)} / {totalEstHours.toFixed(1)} hrs
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full ${isOverHours ? 'bg-status-error' : 'bg-status-info'}`}
                                                style={{ width: `${Math.min(100, totalEstHours ? (totalActHours / totalEstHours) * 100 : 0)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">View Project</span>
                                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {filteredProjects.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
                    <FolderKanban className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Get started by creating a new project.</p>
                </div>
            )}

            <ProjectForm 
                project={selectedProject}
                isOpen={showForm} 
                onClose={() => setShowForm(false)} 
                onSuccess={() => {
                    setShowForm(false);
                    fetchProjects();
                }} 
            />
        </div>
    );
}
