'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Plus, Users, Calendar, LayoutList, ListTodo, FileText, MessageSquare, Send } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import TaskForm from '@/components/forms/TaskForm';

export default function ProjectDashboard() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    // Timesheet state
    const [timesheetTaskId, setTimesheetTaskId] = useState('');
    const [timesheetHours, setTimesheetHours] = useState('');
    const [timesheetNotes, setTimesheetNotes] = useState('');
    const [timesheetDate, setTimesheetDate] = useState(new Date().toISOString().split('T')[0]);
    const [submittingTimesheet, setSubmittingTimesheet] = useState(false);

    // Comments state
    const [commentTaskId, setCommentTaskId] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchProject();
        }
    }, [params.id]);

    const fetchProject = async () => {
        try {
            const res = await api.get(`/projects/${params.id}`);
            setProject(res.data);
        } catch (error) {
            console.error('Failed to fetch project');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = () => {
        setSelectedTask(null);
        setShowTaskForm(true);
    };

    const handleEditTask = (task: any) => {
        setSelectedTask(task);
        setShowTaskForm(true);
    };

    const fetchComments = async (taskId: string) => {
        if (!taskId) { setComments([]); return; }
        setLoadingComments(true);
        try {
            const res = await api.get(`/projects/${params.id}/tasks/${taskId}/comments`);
            setComments(res.data);
        } catch { setComments([]); }
        finally { setLoadingComments(false); }
    };

    const submitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentTaskId || !commentText.trim()) return;
        setSubmittingComment(true);
        try {
            const res = await api.post(`/projects/${params.id}/tasks/${commentTaskId}/comments`, { content: commentText.trim() });
            setComments(prev => [...prev, res.data]);
            setCommentText('');
        } catch { alert('Failed to post comment'); }
        finally { setSubmittingComment(false); }
    };

    const submitTimesheet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!timesheetTaskId || !timesheetHours) return;

        setSubmittingTimesheet(true);
        try {
            await api.post(`/projects/${project.id}/tasks/${timesheetTaskId}/timesheets`, {
                date: timesheetDate,
                hours: timesheetHours,
                notes: timesheetNotes
            });
            // Reset form
            setTimesheetTaskId('');
            setTimesheetHours('');
            setTimesheetNotes('');
            // Refresh project to get updated actual hours
            fetchProject();
        } catch (error) {
            console.error('Failed to submit timesheet');
            alert('Failed to submit timesheet');
        } finally {
            setSubmittingTimesheet(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!project) {
        return <div className="text-center p-12">Project not found.</div>;
    }

    const totalEstHours = project.tasks.reduce((sum: number, t: any) => sum + parseFloat(t.estimatedHours || 0), 0);
    const totalActHours = project.tasks.reduce((sum: number, t: any) => sum + parseFloat(t.actualHours || 0), 0);
    const progressPercent = totalEstHours > 0 ? Math.min(100, (totalActHours / totalEstHours) * 100) : 0;
    const isOverBudget = totalActHours > totalEstHours && totalEstHours > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/projects"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        {project.name}
                        <span className="text-sm px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                            {project.status}
                        </span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-4">
                        <span>Client: {project.client?.name || 'Internal'}</span>
                        {project.endDate && (
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Due: {new Date(project.endDate).toLocaleDateString()}</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6">
                    {[
                        { id: 'overview', label: 'Overview', icon: LayoutList },
                        { id: 'tasks', label: 'Tasks & Gantt', icon: ListTodo },
                        { id: 'timesheets', label: 'Timesheets', icon: Clock },
                        { id: 'comments', label: 'Comments', icon: MessageSquare },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    isActive
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stats Column */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                        <Clock className="w-4 h-4" />
                                        <h3 className="text-sm font-medium">Hours Tracked</h3>
                                    </div>
                                    <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                        {totalActHours.toFixed(1)} <span className="text-sm text-gray-500">/ {totalEstHours.toFixed(1)}</span>
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <h3 className="text-sm font-medium">Tasks Completed</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {project.tasks.filter((t: any) => t.status === 'COMPLETED').length} <span className="text-sm text-gray-500">/ {project.tasks.length}</span>
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                        <FileText className="w-4 h-4" />
                                        <h3 className="text-sm font-medium">Budget vs Actual Cost</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {project.budget ? `₹${Number(project.budget).toLocaleString()}` : 'Not set'}
                                    </p>
                                    {project.linkedInvoiceTotal > 0 && (
                                        <p className={`text-sm mt-1 ${project.linkedInvoiceTotal > parseFloat(project.budget || '0') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                            Actual: ₹{project.linkedInvoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            {project.budget ? ` / ₹${Number(project.budget).toLocaleString()}` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Description</h3>
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                    {project.description || 'No description provided.'}
                                </p>
                            </div>
                        </div>

                        {/* Side Column */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Users className="w-5 h-5" /> Team
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    {project.teamMembers.map((member: any) => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white text-sm">{member.user.name || member.user.email}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {project.teamMembers.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No team members assigned.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Task Management</h2>
                            <button
                                onClick={handleCreateTask}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add Task
                            </button>
                        </div>

                        {/* Gantt Chart / Timeline Visualization */}
                        {(() => {
                            const tasksWithDates = project.tasks.filter((t: any) => t.startDate || t.dueDate);
                            const allDates = tasksWithDates.flatMap((t: any) => [
                                t.startDate ? new Date(t.startDate).getTime() : null,
                                t.dueDate   ? new Date(t.dueDate).getTime()   : null,
                            ]).filter(Boolean) as number[];
                            const minTs = allDates.length > 0 ? Math.min(...allDates) : Date.now();
                            const maxTs = allDates.length > 0 ? Math.max(...allDates) : Date.now() + 7 * 86400000;
                            const span  = maxTs - minTs || 1;
                            const pct   = (ts: number) => ((ts - minTs) / span) * 100;
                            const statusColors: Record<string, string> = {
                                OPEN: 'bg-gray-400 dark:bg-gray-500',
                                IN_PROGRESS: 'bg-blue-500',
                                COMPLETED: 'bg-green-500',
                                BLOCKED: 'bg-red-500',
                            };
                            return (
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-6">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Timeline View</h3>
                                    {project.tasks.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-8">No tasks to display on timeline.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <div className="min-w-[700px]">
                                                <div className="flex mb-2 pl-[200px]">
                                                    <div className="flex-1 flex justify-between text-xs text-gray-400">
                                                        <span>{new Date(minTs).toLocaleDateString()}</span>
                                                        <span>{new Date(maxTs).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    {project.tasks.map((task: any) => {
                                                        const start = task.startDate ? new Date(task.startDate).getTime() : (task.dueDate ? new Date(task.dueDate).getTime() - 86400000 : minTs);
                                                        const end   = task.dueDate   ? new Date(task.dueDate).getTime()   : start + 86400000;
                                                        const left  = pct(start);
                                                        const width = Math.max(1, pct(end) - left);
                                                        return (
                                                            <div key={task.id} className="flex items-center gap-2 group cursor-pointer" onClick={() => handleEditTask(task)}>
                                                                <div className="w-[200px] flex-shrink-0 truncate text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600">
                                                                    {task.title}
                                                                </div>
                                                                <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-700 rounded relative">
                                                                    <div
                                                                        className={`absolute h-5 top-1 rounded flex items-center px-2 text-[10px] text-white overflow-hidden shadow-sm transition-all ${statusColors[task.status] || 'bg-blue-500'}`}
                                                                        style={{ left: `${left}%`, width: `${width}%` }}
                                                                        title={`${task.startDate ? new Date(task.startDate).toLocaleDateString() : '?'} → ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '?'}`}
                                                                    >
                                                                        <span className="truncate">{task.owner?.name || ''}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Task List */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Task</th>
                                        <th className="px-6 py-3 font-medium">Assignee</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Hours (Act/Est)</th>
                                        <th className="px-6 py-3 font-medium">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {project.tasks.map((task: any) => (
                                        <tr key={task.id} onClick={() => handleEditTask(task)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900 dark:text-white text-sm">{task.title}</p>
                                                <p className="text-xs text-gray-500">{task.priority} Priority</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                {task.owner?.name || task.owner?.email || 'Unassigned'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={parseFloat(task.actualHours) > parseFloat(task.estimatedHours) ? 'text-red-500 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                                                    {task.actualHours || 0}
                                                </span>
                                                <span className="text-gray-400 mx-1">/</span>
                                                <span className="text-gray-600 dark:text-gray-300">{task.estimatedHours || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {project.tasks.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No tasks created yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'timesheets' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log Hours</h3>
                                <form onSubmit={submitTimesheet} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task</label>
                                        <select
                                            required
                                            value={timesheetTaskId}
                                            onChange={(e) => setTimesheetTaskId(e.target.value)}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="">Select a task...</option>
                                            {project.tasks.map((t: any) => (
                                                <option key={t.id} value={t.id}>{t.title} ({t.actualHours || 0}/{t.estimatedHours || 0}h)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={timesheetDate}
                                            onChange={(e) => setTimesheetDate(e.target.value)}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.25"
                                            min="0.25"
                                            max="24"
                                            value={timesheetHours}
                                            onChange={(e) => setTimesheetHours(e.target.value)}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="e.g. 2.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                                        <textarea
                                            value={timesheetNotes}
                                            onChange={(e) => setTimesheetNotes(e.target.value)}
                                            rows={2}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            placeholder="What did you work on?"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingTimesheet || !timesheetTaskId || !timesheetHours}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {submittingTimesheet ? 'Logging...' : 'Log Hours'}
                                    </button>
                                </form>
                            </div>
                        </div>
                        
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-blue-500" />
                                    Timesheet Rollup Notice
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                                    When you log hours here, they are automatically added to the specific Task's <code>actualHours</code> field. The total project actual hours you see on the overview are calculated directly from those tasks.
                                </p>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Total Actual Hours logged for this project: {totalActHours.toFixed(2)} hours.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: task selector + comment form */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Task</h3>
                                <select
                                    value={commentTaskId}
                                    onChange={e => { setCommentTaskId(e.target.value); fetchComments(e.target.value); }}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
                                >
                                    <option value="">Choose a task...</option>
                                    {project.tasks.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                                {commentTaskId && (
                                    <form onSubmit={submitComment} className="space-y-3">
                                        <textarea
                                            rows={3}
                                            value={commentText}
                                            onChange={e => setCommentText(e.target.value)}
                                            placeholder="Write a comment..."
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={submittingComment || !commentText.trim()}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                                        >
                                            <Send className="w-4 h-4" />
                                            {submittingComment ? 'Posting...' : 'Post Comment'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                        {/* Right: comments list */}
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm min-h-[200px]">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" /> Comments
                                    {comments.length > 0 && <span className="text-sm font-normal text-gray-400">({comments.length})</span>}
                                </h3>
                                {!commentTaskId ? (
                                    <p className="text-sm text-gray-500 text-center py-8">Select a task to view its comments.</p>
                                ) : loadingComments ? (
                                    <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
                                ) : comments.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-8">No comments yet. Be the first to add one!</p>
                                ) : (
                                    <div className="space-y-4">
                                        {comments.map((c: any) => (
                                            <div key={c.id} className="flex gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                    {(c.user?.name || c.user?.email || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{c.user?.name || c.user?.email}</span>
                                                        <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{c.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <TaskForm
                projectId={project.id}
                task={selectedTask}
                teamMembers={project.teamMembers}
                milestones={project.milestones}
                isOpen={showTaskForm}
                onClose={() => setShowTaskForm(false)}
                onSuccess={() => {
                    setShowTaskForm(false);
                    fetchProject();
                }}
            />
        </div>
    );
}
