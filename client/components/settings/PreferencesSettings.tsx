import { useState, useEffect } from 'react';
import { Save, Calendar, Clock, Loader2 } from 'lucide-react';

interface Props {
    settings: {
        dateFormat: string;
        timeFormat: string;
    };
    onSave: (data: any) => Promise<void>;
    saving: boolean;
}

const dateFormats = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '28/02/2026' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '02/28/2026' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-02-28' },
    { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '28-02-2026' },
    { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '28.02.2026' },
];

const timeFormats = [
    { value: 'HH:mm', label: '24-hour', example: '14:30' },
    { value: 'hh:mm A', label: '12-hour', example: '02:30 PM' },
];

export default function PreferencesSettings({ settings, onSave, saving }: Props) {
    const [form, setForm] = useState({
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
    });

    useEffect(() => {
        setForm({
            dateFormat: settings.dateFormat || 'DD/MM/YYYY',
            timeFormat: settings.timeFormat || 'HH:mm',
        });
    }, [settings]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100 dark:divide-gray-700">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Date, time, and display preferences</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Date Format */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            <Calendar className="w-4 h-4" />
                            Date Format
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dateFormats.map(df => (
                                <label
                                    key={df.value}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form.dateFormat === df.value
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="dateFormat"
                                        value={df.value}
                                        checked={form.dateFormat === df.value}
                                        onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${form.dateFormat === df.value
                                            ? 'border-blue-500'
                                            : 'border-gray-300 dark:border-gray-600'
                                        }`}>
                                        {form.dateFormat === df.value && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{df.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{df.example}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Time Format */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            <Clock className="w-4 h-4" />
                            Time Format
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {timeFormats.map(tf => (
                                <label
                                    key={tf.value}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form.timeFormat === tf.value
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="timeFormat"
                                        value={tf.value}
                                        checked={form.timeFormat === tf.value}
                                        onChange={(e) => setForm({ ...form, timeFormat: e.target.value })}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${form.timeFormat === tf.value
                                            ? 'border-blue-500'
                                            : 'border-gray-300 dark:border-gray-600'
                                        }`}>
                                        {form.timeFormat === tf.value && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{tf.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{tf.example}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="p-6 flex justify-end">
                <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </form>
    );
}
