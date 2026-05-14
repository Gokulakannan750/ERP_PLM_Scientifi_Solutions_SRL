'use client';

import { X, Clock, ArrowRight } from 'lucide-react';

interface ChangeLogEntry {
    id: number;
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: string;
    user: {
        id: number;
        name: string | null;
        email: string;
    };
}

interface ChangeLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: ChangeLogEntry[];
    entityName: string;
}

export default function ChangeLogModal({ isOpen, onClose, logs, entityName }: ChangeLogModalProps) {
    if (!isOpen) return null;

    // Group logs by date and time (roughly by the same transaction)
    const groupedLogs: { [key: string]: ChangeLogEntry[] } = {};
    
    logs.forEach(log => {
        // Group by exact minute
        const dateKey = new Date(log.changedAt).toISOString().substring(0, 16);
        if (!groupedLogs[dateKey]) {
            groupedLogs[dateKey] = [];
        }
        groupedLogs[dateKey].push(log);
    });

    const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change History</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Activity log for {entityName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {logs.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">No history available for this record.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent">
                            {sortedDates.map(dateKey => {
                                const entries = groupedLogs[dateKey];
                                const firstEntry = entries[0];
                                const date = new Date(firstEntry.changedAt);

                                return (
                                    <div key={dateKey} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        {/* Marker */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-800 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        
                                        {/* Card */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                                    {firstEntry.user?.name || firstEntry.user?.email || 'System'}
                                                </div>
                                                <time className="text-xs text-gray-500 font-medium">
                                                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </time>
                                            </div>
                                            
                                            <div className="space-y-2 mt-2">
                                                {entries.map(entry => (
                                                    <div key={entry.id} className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg text-sm border border-gray-100 dark:border-gray-800">
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize font-medium">
                                                            {entry.fieldName.replace(/([A-Z])/g, ' $1').trim()}
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                            <span className="text-red-600 dark:text-red-400 line-through decoration-red-300 break-all">
                                                                {entry.oldValue || 'none'}
                                                            </span>
                                                            <ArrowRight className="w-3 h-3 text-gray-400 shrink-0 hidden sm:block" />
                                                            <span className="text-green-600 dark:text-green-400 font-medium break-all mt-1 sm:mt-0">
                                                                {entry.newValue || 'none'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
