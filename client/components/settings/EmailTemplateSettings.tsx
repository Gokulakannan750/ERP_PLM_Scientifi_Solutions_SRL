import { useState, useEffect } from 'react';
import { Save, Mail, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface EmailTemplate {
    subject: string;
    body: string;
}

interface Props {
    settings: {
        emailTemplates: {
            invoice?: EmailTemplate;
            offer?: EmailTemplate;
            po?: EmailTemplate;
        };
    };
    onSave: (data: any) => Promise<void>;
    saving: boolean;
}

const templateTypes = [
    {
        key: 'invoice',
        label: 'Invoice Email',
        description: 'Sent when sharing invoices with clients',
        placeholders: '{{companyName}}, {{customerName}}, {{invoiceNumber}}',
    },
    {
        key: 'offer',
        label: 'Offer / Quotation Email',
        description: 'Sent when sharing offers with clients',
        placeholders: '{{companyName}}, {{customerName}}, {{offerNumber}}',
    },
    {
        key: 'po',
        label: 'Purchase Order Email',
        description: 'Sent when sending purchase orders to suppliers',
        placeholders: '{{companyName}}, {{supplierName}}, {{poNumber}}',
    },
];

export default function EmailTemplateSettings({ settings, onSave, saving }: Props) {
    const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({
        invoice: { subject: '', body: '' },
        offer: { subject: '', body: '' },
        po: { subject: '', body: '' },
    });
    const [expandedTemplate, setExpandedTemplate] = useState<string | null>('invoice');

    useEffect(() => {
        if (settings.emailTemplates) {
            setTemplates({
                invoice: settings.emailTemplates.invoice || { subject: '', body: '' },
                offer: settings.emailTemplates.offer || { subject: '', body: '' },
                po: settings.emailTemplates.po || { subject: '', body: '' },
            });
        }
    }, [settings]);

    const updateTemplate = (key: string, field: 'subject' | 'body', value: string) => {
        setTemplates(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value },
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ emailTemplates: templates });
    };

    return (
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100 dark:divide-gray-700">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Customize the emails sent with invoices, offers, and POs</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {templateTypes.map(tmpl => (
                        <div
                            key={tmpl.key}
                            className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                        >
                            {/* Header */}
                            <button
                                type="button"
                                onClick={() => setExpandedTemplate(expandedTemplate === tmpl.key ? null : tmpl.key)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{tmpl.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{tmpl.description}</p>
                                    </div>
                                </div>
                                {expandedTemplate === tmpl.key
                                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                                }
                            </button>

                            {/* Body (Expandable) */}
                            {expandedTemplate === tmpl.key && (
                                <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Subject Line
                                        </label>
                                        <input
                                            type="text"
                                            value={templates[tmpl.key]?.subject || ''}
                                            onChange={(e) => updateTemplate(tmpl.key, 'subject', e.target.value)}
                                            placeholder={`e.g. Invoice from {{companyName}}`}
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Email Body
                                        </label>
                                        <textarea
                                            value={templates[tmpl.key]?.body || ''}
                                            onChange={(e) => updateTemplate(tmpl.key, 'body', e.target.value)}
                                            rows={5}
                                            placeholder="Write your email template here..."
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none font-mono"
                                        />
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Available placeholders:</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{tmpl.placeholders}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
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
                    {saving ? 'Saving...' : 'Save Templates'}
                </button>
            </div>
        </form>
    );
}
