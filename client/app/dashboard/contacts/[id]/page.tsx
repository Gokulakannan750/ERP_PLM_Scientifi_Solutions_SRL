'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ContactForm from '@/components/forms/ContactForm';
import api from '@/lib/api';
import { useParams } from 'next/navigation';

interface Contact {
    id: number;
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    companyId: number;
}

export default function EditContactPage() {
    const { id } = useParams();
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContact();
    }, [id]);

    const fetchContact = async () => {
        try {
            const response = await api.get(`/contacts/${id}`);
            setContact(response.data);
        } catch (error) {
            console.error('Failed to fetch contact:', error);
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
                    href="/dashboard/contacts"
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Edit Contact
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Update contact information details
                    </p>
                </div>
            </div>

            {contact && <ContactForm initialData={contact} isEditing={true} />}
        </div>
    );
}
