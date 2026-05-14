'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Box, Layers, ShoppingCart, FileText,
    Sparkles, CheckCircle2, FolderOpen, FileCog, ExternalLink, Zap
} from 'lucide-react';
import api from '@/lib/api';
import creoService from '@/lib/creoService';

const ITEM_TYPES = [
    {
        code: 'P',
        label: 'Designed Part',
        icon: Box,
        color: 'blue',
        ext: '.prt',
        description: 'A single, custom-designed mechanical part modelled in CAD.',
    },
    {
        code: 'A',
        label: 'Assembly',
        icon: Layers,
        color: 'purple',
        ext: '.asm',
        description: 'A group of parts and sub-assemblies joined together.',
    },
    {
        code: 'C',
        label: 'Commercial',
        icon: ShoppingCart,
        color: 'amber',
        ext: '.prt',
        description: 'An off-the-shelf purchased component (no native CAD file).',
    },
    {
        code: 'D',
        label: 'Drawing',
        icon: FileText,
        color: 'green',
        ext: '.drw',
        description: 'A 2D technical drawing linked to a part or assembly.',
    },
];

const colorMap: Record<string, string> = {
    blue:   'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300',
    amber:  'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
    green:  'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300',
};

const iconColorMap: Record<string, string> = {
    blue:   'text-blue-500',
    purple: 'text-purple-500',
    amber:  'text-amber-500',
    green:  'text-green-500',
};

interface CreatedResult {
    item: {
        id: number;
        sku: string;
        name: string;
        plmType: string;
        itemNumber: string;
        revision: string;
    };
    template: {
        name: string;
        filePath: string;
        fileExt: string;
    } | null;
    templateFileCopy: string | null; // server-side copy path ready to open in Creo
}

export default function NewPlmItemPage() {
    const router = useRouter();
    const [plmType, setPlmType] = useState('P');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState<CreatedResult | null>(null);
    const [creoAvailable, setCreoAvailable] = useState(false);
    const [creoStatus, setCreoStatus] = useState('');

    const selectedType = ITEM_TYPES.find(t => t.code === plmType)!;

    useEffect(() => {
        creoService.isCreoAvailable().then(setCreoAvailable);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Item name is required.'); return; }
        setSaving(true);
        setError('');
        try {
            const res = await api.post('/plm/items', { name: name.trim(), description: description.trim(), plmType });
            setCreated(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create item.');
        } finally {
            setSaving(false);
        }
    };

    // ─── Auto-open in Creo (called when Creo is available and a file was copied) ─
    const handleOpenInCreo = async () => {
        if (!created?.templateFileCopy) return;
        setCreoStatus('Opening file in Creo…');
        try {
            const openRes = await creoService.openInCreo(created.templateFileCopy);
            if (!openRes.success) { setCreoStatus(`Open failed: ${openRes.error}`); return; }
            setCreoStatus('Injecting parameters…');
            await creoService.syncParamsToCreo(created.templateFileCopy, {
                PART_NUMBER: created.item.sku,
                DESCRIPTION: created.item.name,
                REVISION:    created.item.revision,
            });
            setCreoStatus('File opened and parameters set in Creo ✓');
        } catch (e: unknown) {
            setCreoStatus(`Creo error: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    // ─── Post-creation confirmation screen ───────────────────────────────────
    if (created) {
        const { item, template, templateFileCopy } = created;
        const ext = ITEM_TYPES.find(t => t.code === item.plmType)?.ext || '';
        const suggestedFileName = `${item.sku.toLowerCase()}${ext}`;

        const steps = [
            {
                n: 1,
                icon: Sparkles,
                text: `Assigned part number <strong>${item.sku}</strong> from the global counter.`,
            },
            {
                n: 2,
                icon: FolderOpen,
                text: template
                    ? `Located Creo template file: <code>${template.filePath || template.name}</code>`
                    : `No Creo template is configured yet. Go to <strong>PLM → Templates</strong> to set one up.`,
            },
            {
                n: 3,
                icon: FileCog,
                text: `Rename the copied file to <code>${suggestedFileName}</code>.`,
            },
            {
                n: 4,
                icon: FileCog,
                text: `Set Creo parameters <strong>PART_NUMBER = ${item.sku}</strong> and <strong>DESCRIPTION = ${item.name}</strong> in the model properties.`,
            },
            {
                n: 5,
                icon: ExternalLink,
                text: `Open <code>${suggestedFileName}</code> in your active Creo session — ready to model.`,
            },
        ];

        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-3 p-5 bg-green-50 dark:bg-green-500/10 rounded-2xl border border-green-200 dark:border-green-500/20">
                    <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                    <div>
                        <h2 className="font-bold text-green-800 dark:text-green-300 text-lg">Item Created Successfully</h2>
                        <p className="text-green-700 dark:text-green-400 text-sm">
                            <span className="font-mono font-bold">{item.sku}</span> — {item.name}
                        </p>
                    </div>
                </div>

                {/* Template-based file creation steps */}
                <div className="bg-card-bg dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">Template-Based File Creation</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Follow these steps in your Creo session to wire the new item to its CAD file.
                        </p>
                    </div>
                    <ol className="divide-y divide-gray-100 dark:divide-gray-800">
                        {steps.map(step => {
                            const Icon = step.icon;
                            return (
                                <li key={step.n} className="flex items-start gap-4 px-6 py-4">
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">
                                        {step.n}
                                    </div>
                                    <p
                                        className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: step.text }}
                                    />
                                </li>
                            );
                        })}
                    </ol>
                </div>

                {/* Template storage note */}
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Template Storage &amp; Management</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
                        Template files (.prt, .asm, .drw) are stored on the shared network drive and managed by the admin
                        from the <strong>PLM → Templates</strong> panel. Templates can be updated at any time without code
                        changes — any valid Creo file can be set as the active template for each item type.
                    </p>
                </div>

                {/* Auto-open in Creo button — shown only when Creo is available and file was copied */}
                {creoAvailable && templateFileCopy && (
                    <div className="space-y-2">
                        <button
                            onClick={handleOpenInCreo}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                        >
                            <Zap className="w-4 h-4" />
                            Open in Creo &amp; Inject Parameters
                        </button>
                        {creoStatus && (
                            <p className="text-xs text-center text-gray-500 dark:text-gray-400">{creoStatus}</p>
                        )}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={() => router.push(`/dashboard/plm/${item.id}`)}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                    >
                        Open Item Workspace
                    </button>
                    <button
                        onClick={() => { setCreated(null); setName(''); setDescription(''); }}
                        className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Create Another
                    </button>
                </div>
            </div>
        );
    }

    // ─── Creation Form ────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Back */}
            <Link
                href="/dashboard/plm"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to PLM Dashboard
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New PLM Item</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    A unique part number will be auto-assigned from the global counter.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type selection */}
                <div className="bg-card-bg dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
                    <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Item Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {ITEM_TYPES.map(type => {
                            const Icon = type.icon;
                            const isSelected = plmType === type.code;
                            return (
                                <button
                                    key={type.code}
                                    type="button"
                                    onClick={() => setPlmType(type.code)}
                                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                                        isSelected
                                            ? colorMap[type.color]
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? iconColorMap[type.color] : 'text-gray-400'}`} />
                                    <div>
                                        <p className={`font-semibold text-sm ${isSelected ? '' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {type.label}
                                        </p>
                                        <p className={`text-xs mt-0.5 ${isSelected ? 'opacity-80' : 'text-gray-400'}`}>
                                            {type.description}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Fields */}
                <div className="bg-card-bg dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-5">
                    <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Item Details
                    </label>

                    <div className="space-y-2">
                        <label htmlFor="plm-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="plm-name"
                            type="text"
                            value={name}
                            onChange={e => { setName(e.target.value); setError(''); }}
                            placeholder={`e.g. ${selectedType.label} – Main Housing`}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="plm-desc" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Description
                        </label>
                        <textarea
                            id="plm-desc"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Optional engineering description..."
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                        />
                    </div>
                </div>

                {/* Preview of what will be generated */}
                <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Part number will be assigned automatically:&nbsp;
                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                            {plmType}XXXXX A
                        </span>
                        &nbsp;· Initial revision <strong>A</strong> · State <strong>IN WORK</strong>
                    </p>
                </div>

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 rounded-lg">
                        {error}
                    </p>
                )}

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors shadow-sm"
                    >
                        {saving ? 'Creating...' : 'Create Item'}
                    </button>
                    <Link
                        href="/dashboard/plm"
                        className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
