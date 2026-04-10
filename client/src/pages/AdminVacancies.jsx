import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminVacancies = () => {
    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedVacancy, setSelectedVacancy] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        location: 'Head Office',
        type: 'Full-time',
        salaryRange: '',
        expiresAt: '',
        isActive: true,
        imageUrl: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchVacancies();
    }, []);

    const fetchVacancies = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return navigate('/admin/login');

            const res = await fetch('/api/vacancies/admin/all', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setVacancies(data);
        } catch (error) {
            console.error("Failed to fetch vacancies", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (vacancy) => {
        setSelectedVacancy(vacancy);
        setFormData({
            title: vacancy.title,
            description: vacancy.description,
            requirements: vacancy.requirements,
            location: vacancy.location,
            type: vacancy.type,
            salaryRange: vacancy.salaryRange || '',
            expiresAt: vacancy.expiresAt ? vacancy.expiresAt.split('T')[0] : '',
            isActive: vacancy.isActive,
            imageUrl: vacancy.imageUrl || ''
        });
        setImagePreview(vacancy.imageUrl || null);
        setImageFile(null);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this vacancy listing?")) return;
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`/api/vacancies/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchVacancies();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            const url = isEditing
                ? `/api/vacancies/${selectedVacancy.id}`
                : '/api/vacancies';

            const method = isEditing ? 'PATCH' : 'POST';

            // Add ISO time to date if present
            const payload = { ...formData };
            if (payload.expiresAt && !payload.expiresAt.includes('T')) {
                payload.expiresAt = new Date(payload.expiresAt).toISOString();
            }

            // Upload image if present
            if (imageFile) {
                const imgFormData = new FormData();
                imgFormData.append('image', imageFile);
                const imgRes = await fetch('/api/vacancies/upload-image', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: imgFormData
                });
                if (imgRes.ok) {
                    const imgData = await imgRes.json();
                    payload.imageUrl = imgData.imageUrl;
                } else {
                    console.error('Image upload failed');
                }
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                fetchVacancies();
                // Reset form
                setFormData({
                    title: '',
                    description: '',
                    requirements: '',
                    location: 'Head Office',
                    type: 'Full-time',
                    salaryRange: '',
                    expiresAt: '',
                    isActive: true,
                    imageUrl: ''
                });
                setImageFile(null);
                setImagePreview(null);
                setIsEditing(false);
                setSelectedVacancy(null);
            }
        } catch (error) {
            console.error("Submit failed", error);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    Vacancy Management
                </h1>
                <button
                    onClick={() => {
                        setIsEditing(false);
                        setSelectedVacancy(null);
                        setFormData({
                            title: '',
                            description: '',
                            requirements: '',
                            location: 'Head Office',
                            type: 'Full-time',
                            salaryRange: '',
                            expiresAt: '',
                            isActive: true,
                            imageUrl: ''
                        });
                        setImageFile(null);
                        setImagePreview(null);
                        setShowModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg"
                >
                    + Create Manual Vacancy
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Views</th>
                            <th className="p-4">Dilamar</th>
                            <th className="p-4">Posted / Expires</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {vacancies.map(v => (
                            <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {v.imageUrl && (
                                            <img src={v.imageUrl} alt={v.title} className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                                        )}
                                        <div>
                                            <div className="font-bold text-gray-900">{v.title}</div>
                                            <div className="text-xs text-gray-500">{v.location} • {v.type}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {v.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600 font-medium">{v.viewsCount}</td>
                                <td className="p-4 text-blue-600 font-bold">{v.applicantsCount || 0} Orang</td>
                                <td className="p-4 text-sm text-gray-500">
                                    <div>P: {new Date(v.postedAt).toLocaleDateString()}</div>
                                    <div>E: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'No Expiry'}</div>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => handleEdit(v)}
                                        className="text-blue-600 hover:text-blue-800 font-semibold mr-4"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(v.id)}
                                        className="text-red-500 hover:text-red-700 font-semibold"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">{isEditing ? 'Edit Vacancy' : 'Create Vacancy'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                                <input type="text" className="w-full border rounded-lg p-2 text-gray-900 bg-white" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                    <input type="text" className="w-full border rounded-lg p-2 text-gray-900 bg-white" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                                    <select className="w-full border rounded-lg p-2 text-gray-900 bg-white" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Contract</option>
                                        <option>Internship</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                <textarea className="w-full border rounded-lg p-2 h-32 text-gray-900 bg-white" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Requirements</label>
                                <textarea className="w-full border rounded-lg p-2 h-32 text-gray-900 bg-white" value={formData.requirements} onChange={e => setFormData({ ...formData, requirements: e.target.value })}></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Expiry Date</label>
                                    <input type="date" className="w-full border rounded-lg p-2 text-gray-900 bg-white" value={formData.expiresAt} onChange={e => setFormData({ ...formData, expiresAt: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input type="checkbox" className="w-5 h-5" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                                        <span className="text-gray-900 font-medium">Active</span>
                                    </div>
                                </div>
                            </div>

                            {/* Image Upload/Preview */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Gambar Lowongan (Opsional)</label>
                                
                                {imagePreview ? (
                                    <div className="mb-3 relative group w-max">
                                        <img src={imagePreview} alt="Vacancy Preview" className="max-h-48 rounded-lg object-cover shadow-sm" />
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setImagePreview(null);
                                                setImageFile(null);
                                                setFormData({...formData, imageUrl: null});
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-md px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mb-3 text-sm text-gray-500 italic">
                                        Belum ada gambar yang dipilih. Tersedia di Career Portal jika di-upload.
                                    </div>
                                )}
                                
                                <label className="inline-block cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                                    {imagePreview ? 'Ganti Gambar' : 'Upload Gambar'}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    alert('Ukuran file maksimal 5MB');
                                                    return;
                                                }
                                                setImageFile(file);
                                                setImagePreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Vacancy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminVacancies;
