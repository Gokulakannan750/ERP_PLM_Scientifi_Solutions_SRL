import { useState, useEffect } from 'react';
import { Save, Building2, MapPin, Phone, Mail, Loader2 } from 'lucide-react';

interface Props {
    settings: {
        companyName: string;
        companyAddress: string;
        companyPhone: string;
        companyCountryCode: string;
        companyEmail: string;
    };
    onSave: (data: any) => Promise<void>;
    saving: boolean;
}

export default function OrganizationSettings({ settings, onSave, saving }: Props) {
    const [form, setForm] = useState({
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyCountryCode: '+91',
        companyEmail: '',
    });

    useEffect(() => {
        setForm({
            companyName: settings.companyName || '',
            companyAddress: settings.companyAddress || '',
            companyPhone: settings.companyPhone || '',
            companyCountryCode: settings.companyCountryCode || '+91',
            companyEmail: settings.companyEmail || '',
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
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization Details</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Your company information used in invoices and offers</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Company Name */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Company Name
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={form.companyName}
                                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                                placeholder="Scientific Solutions Pvt. Ltd."
                                className="w-full pl-11 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Company Address */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Address
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                            <textarea
                                value={form.companyAddress}
                                onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
                                placeholder="123, Industrial Area, Chennai, Tamil Nadu, India"
                                rows={3}
                                className="w-full pl-11 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Phone Number
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={form.companyCountryCode}
                                onChange={(e) => setForm({ ...form, companyCountryCode: e.target.value })}
                                className="w-24 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            >
                                <option value="+91">+91</option>
                                <option value="+1">+1</option>
                                <option value="+44">+44</option>
                                <option value="+49">+49</option>
                                <option value="+61">+61</option>
                                <option value="+81">+81</option>
                            </select>
                            <div className="relative flex-1">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="tel"
                                    value={form.companyPhone}
                                    onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
                                    placeholder="9876543210"
                                    className="w-full pl-11 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Company Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                value={form.companyEmail}
                                onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                                placeholder="info@scientificsolutions.com"
                                className="w-full pl-11 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
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
                    {saving ? 'Saving...' : 'Save Organization'}
                </button>
            </div>
        </form>
    );
}
