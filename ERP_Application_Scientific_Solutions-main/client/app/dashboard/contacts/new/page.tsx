'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ContactForm from '@/components/forms/ContactForm';

export default function NewContactPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/contacts"
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Add New Contact
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add a person to your contacts list
                    </p>
                </div>
            </div>

            <ContactForm />
        </div>
    );
}
