'use client';

import { useState, useEffect } from 'react';
import { Save, User, Users, Building2, FileText, Calendar, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import TeamSettings from '@/components/settings/TeamSettings';
import OrganizationSettings from '@/components/settings/OrganizationSettings';
import EmailTemplateSettings from '@/components/settings/EmailTemplateSettings';
import PreferencesSettings from '@/components/settings/PreferencesSettings';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface SettingsData {
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyCountryCode: string;
    companyEmail: string;
    dateFormat: string;
    timeFormat: string;
    emailTemplates: {
        invoice?: { subject: string; body: string };
        offer?: { subject: string; body: string };
        po?: { subject: string; body: string };
    };
}

const tabs = [
    { id: 'organization', label: 'Organization', icon: Building2, adminOnly: true },
    { id: 'templates', label: 'Email Templates', icon: FileText, adminOnly: true },
    { id: 'preferences', label: 'Preferences', icon: Calendar, adminOnly: false },
    { id: 'profile', label: 'My Profile', icon: User, adminOnly: false },
    { id: 'team', label: 'Team Management', icon: Users, adminOnly: true },
];

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('organization');
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const isAdmin = user?.role === 'ADMIN';

    // Profile form state
    const [profileName, setProfileName] = useState(user?.name || '');

    useEffect(() => {
        fetchSettings();
    }, []);

    // Set default tab to 'profile' for non-admins
    useEffect(() => {
        if (!isAdmin) {
            setActiveTab('preferences');
        }
    }, [isAdmin]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            setSettings(res.data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (data: Partial<SettingsData>) => {
        setSaving(true);
        try {
            const res = await api.put('/settings', data);
            setSettings(res.data);
            showToast('success', 'Settings saved successfully');
        } catch (error: any) {
            console.error('Failed to save settings:', error);
            showToast('error', error.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Manage your organization, templates, and preferences
                </p>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${toast.type === 'success'
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    }`}>
                    {toast.type === 'success'
                        ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    }
                    <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                        }`}>{toast.message}</p>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:w-56 flex-shrink-0">
                    <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
                        {visibleTabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        {activeTab === 'organization' && isAdmin && settings && (
                            <OrganizationSettings
                                settings={settings}
                                onSave={saveSettings}
                                saving={saving}
                            />
                        )}

                        {activeTab === 'templates' && isAdmin && settings && (
                            <EmailTemplateSettings
                                settings={settings}
                                onSave={saveSettings}
                                saving={saving}
                            />
                        )}

                        {activeTab === 'preferences' && settings && (
                            <PreferencesSettings
                                settings={settings}
                                onSave={saveSettings}
                                saving={saving}
                            />
                        )}

                        {activeTab === 'profile' && (
                            <div className="p-6 space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Profile</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your personal information</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profileName}
                                            onChange={(e) => setProfileName(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            readOnly
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Role
                                        </label>
                                        <input
                                            type="text"
                                            value={user?.role || ''}
                                            readOnly
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium">
                                        <Save className="w-4 h-4" />
                                        Save Profile
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'team' && isAdmin && (
                            <div className="p-6">
                                <TeamSettings />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
