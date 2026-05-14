import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Shield, Check, X, Search, MoreVertical } from 'lucide-react';
import api from '@/lib/api';

interface Permission {
    id: number;
    name: string;
    description: string;
    category: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    permissions: Permission[];
}

export default function TeamSettings() {
    const [users, setUsers] = useState<User[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'SUB_ADMIN',
        permissionIds: [] as number[]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, permissionsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/permissions')
            ]);
            setUsers(usersRes.data);
            setPermissions(permissionsRes.data);
        } catch (error) {
            console.error('Failed to fetch team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user: User | null = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name || '',
                email: user.email,
                password: '', // Leave empty to keep unchanged
                role: user.role,
                permissionIds: user.permissions.map(p => p.id)
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'SUB_ADMIN',
                permissionIds: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                // Update User
                const { password, ...updateData } = formData;
                // Only include password if provided
                const payload = password ? { ...updateData, password } : updateData;

                await api.put(`/admin/users/${editingUser.id}`, payload);
                // Also update permissions explicitly if needed, but our backend might handle it separately or together.
                // Based on `adminController.js`, `updateUser` doesn't seem to update permissions directly in one go unless modified. 
                // Wait, `updateUser` in controller does NOT update permissions. `updateUserPermissions` does.
                // We need to call permission update separately.
                await api.put(`/admin/users/${editingUser.id}/permissions`, { permissionIds: formData.permissionIds });

            } else {
                // Create User
                await api.post('/admin/users', formData);
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Failed to save user:', error);
            console.log('Error response:', error.response?.data);

            // Try to extract detailed validation errors
            let msg = 'Failed to save user. Please check the inputs.';

            if (error.response?.data?.error) {
                msg = error.response.data.error;
            }

            if (error.response?.data?.details) {
                // If there are validation details, show them
                const details = error.response.data.details;
                if (Array.isArray(details) && details.length > 0) {
                    msg = details.map((d: any) => d.message).join('\n');
                }
            }

            alert(msg);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Failed to delete user.');
        }
    };

    const togglePermission = (id: number) => {
        setFormData(prev => {
            const ids = prev.permissionIds;
            if (ids.includes(id)) {
                return { ...prev, permissionIds: ids.filter(p => p !== id) };
            } else {
                return { ...prev, permissionIds: [...ids, id] };
            }
        });
    };

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
    }, {} as Record<string, Permission[]>);

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Loading team settings...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search team members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Member
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-4 font-medium text-sm">User</th>
                            <th className="px-6 py-4 font-medium text-sm">Role</th>
                            <th className="px-6 py-4 font-medium text-sm">Permissions</th>
                            <th className="px-6 py-4 font-medium text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="font-medium text-gray-900 dark:text-white">{user.name || 'Unnamed'}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {user.permissions.length > 0 ? (
                                            <>
                                                {user.permissions.slice(0, 3).map(p => (
                                                    <span key={p.id} className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {p.name.split('_')[1]}
                                                    </span>
                                                ))}
                                                {user.permissions.length > 3 && (
                                                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-500">
                                                        +{user.permissions.length - 3} more
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-400 italic">No specific permissions</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenModal(user)}
                                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingUser ? 'Edit Member' : 'Add New Member'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6" autoComplete="off">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Password {editingUser ? '(Leave blank to keep)' : '(Min 6 chars)'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    >
                                        <option value="SUB_ADMIN">Sub Admin</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    Permissions
                                </h3>
                                <div className="space-y-6">
                                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                                        <div key={category}>
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                {category}
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {perms.map(perm => (
                                                    <label key={perm.id} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissionIds.includes(perm.id)}
                                                            onChange={() => togglePermission(perm.id)}
                                                            className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {perm.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {perm.description}
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    {editingUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
