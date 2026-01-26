import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Icons
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
);

// Sortable Item Component
const SortableItem = ({ id, candidate, isOverlay }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const matchScore = candidate.analysis?.matchScore || 0;
    const scoreColor = matchScore > 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
        matchScore > 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 
                cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200 transition-all group
                ${isOverlay ? 'shadow-2xl rotate-2 scale-105 border-blue-500 ring-2 ring-blue-500/20' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800 text-sm">{candidate.fullName}</h4>
                {candidate.isNew && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                <UserIcon />
                <span className="truncate max-w-[150px]">{candidate.position}</span>
            </div>

            <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-3">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${scoreColor} shadow-sm`}>
                    {matchScore}% Match
                </span>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 uppercase tracking-wide">
                    {candidate.discResult?.profile || 'N/A'}
                </span>
            </div>
        </div>
    );
};

// Column Container
const Column = ({ id, items, color }) => {
    const { setNodeRef, isOver } = useSortable({ id, data: { type: 'Column' } });

    return (
        <div ref={setNodeRef} className={`
            flex flex-col h-full min-w-[300px] w-full max-w-xs
            rounded-2xl border transition-colors duration-300
            ${isOver ? 'bg-blue-50/50 border-blue-200 ring-2 ring-blue-500/10' : 'bg-gray-50/50 border-gray-200/60'}
        `}>
            {/* Header */}
            <div className={`p-4 border-b border-gray-200/60 flex justify-between items-center rounded-t-2xl ${color}`}>
                <h3 className="font-bold text-gray-700 text-sm tracking-wide uppercase">{id}</h3>
                <span className="bg-white/80 backdrop-blur text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
                    {items.length}
                </span>
            </div>

            {/* Content */}
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
                    {items.map(candidate => (
                        <SortableItem key={candidate.id} id={candidate.id} candidate={candidate} />
                    ))}
                </SortableContext>
                {items.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-xs italic">
                        Empty
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminKanban = () => {
    const [candidates, setCandidates] = useState([]);
    const [columns, setColumns] = useState({
        'New': [],
        'Screening': [],
        'Interview': [],
        'Offered': [],
        'Hired': [],
        'Rejected': []
    });
    const [activeId, setActiveId] = useState(null);

    // For Linking to Manpower Request
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCandidateId, setSelectedCandidateId] = useState(null);
    const [manpowerRequests, setManpowerRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchData();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    const fetchData = async () => {
        try {
            const headers = getAuthHeaders();
            const [candRes, reqRes] = await Promise.all([
                fetch('/api/candidates', { headers }),
                fetch('/api/manpower', { headers })
            ]);

            if (candRes.status === 401 || reqRes.status === 401) {
                console.error("Unauthorized");
                // Handle redirect if needed
                return;
            }

            const candData = await candRes.json();
            const reqData = await reqRes.json();

            setCandidates(Array.isArray(candData) ? candData : []);

            // Safe filtering
            const validRequests = Array.isArray(reqData) ? reqData.filter(r => r.status === 'In Progress' || r.status === 'Approved') : [];
            setManpowerRequests(validRequests);

            // Distribute into columns
            const newCols = {
                'New': [], 'Screening': [], 'Interview': [], 'Offered': [], 'Hired': [], 'Rejected': []
            };

            if (Array.isArray(candData)) {
                candData.forEach(c => {
                    // Normalize status keys (case sensitive matches)
                    let status = c.status || 'New';
                    if (status === 'Offer') status = 'Offered';

                    if (newCols[status]) newCols[status].push(c);
                    else newCols['New'].push(c); // Fallback
                });
            }
            setColumns(newCols);

        } catch (error) {
            console.error("Fetch Data Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Find which column the item is currently in
        const findColumn = (id) => {
            if (id in columns) return id;
            return Object.keys(columns).find(key => columns[key].find(item => item.id === id));
        };

        const activeColumn = findColumn(activeId);
        const overColumn = findColumn(overId) || overId;

        if (!activeColumn || !overColumn || activeColumn === overColumn) return;

        // Move item in UI immediately (Optimistic Update)
        const activeItem = columns[activeColumn].find(i => i.id === activeId);

        setColumns(prev => {
            const newSource = prev[activeColumn].filter(i => i.id !== activeId);
            const newDest = [...prev[overColumn], { ...activeItem, status: overColumn }];
            return {
                ...prev,
                [activeColumn]: newSource,
                [overColumn]: newDest
            };
        });

        // Backend Update
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            };

            await fetch(`/api/candidates/${activeItem.id}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: overColumn })
            });

            // If moved to Hired, prompt to link
            if (overColumn === 'Hired' && !activeItem.requestId) {
                setSelectedCandidateId(activeItem.id);
                setIsModalOpen(true);
            }

        } catch (error) {
            console.error("Failed to update status", error);
            fetchData(); // Revert/Refresh on error
        }
    };

    const linkToRequest = async (requestId) => {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            };

            await fetch(`/api/candidates/${selectedCandidateId}/link-request`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ requestId })
            });

            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const columnColors = {
        'New': 'bg-gradient-to-r from-gray-100 to-gray-200',
        'Screening': 'bg-gradient-to-r from-blue-100 to-blue-200',
        'Interview': 'bg-gradient-to-r from-purple-100 to-purple-200',
        'Offered': 'bg-gradient-to-r from-pink-100 to-pink-200',
        'Hired': 'bg-gradient-to-r from-emerald-100 to-emerald-200',
        'Rejected': 'bg-gradient-to-r from-red-100 to-red-200',
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-hidden bg-gray-50/30">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1 text-white">
                        Recruitment Pipeline
                    </h1>
                    <p className="text-gray-400 text-sm">Drag and drop candidates to update their status</p>
                </div>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 h-full overflow-x-auto pb-4 px-2 snap-x">
                    {Object.keys(columns).map(colId => (
                        <Column
                            key={colId}
                            id={colId}
                            items={columns[colId]}
                            color={columnColors[colId]}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                    {activeId ? (
                        <SortableItem
                            id={activeId}
                            candidate={Object.values(columns).flat().find(c => c.id === activeId)}
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Modal for Linking to Manpower Request */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800">Assign to Request</h3>
                            <p className="text-gray-500 mt-1 text-sm">Select the manpower request this candidate fulfills.</p>
                        </div>

                        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                            {manpowerRequests.length > 0 ? manpowerRequests.map(req => (
                                <button
                                    key={req.id}
                                    onClick={() => linkToRequest(req.id)}
                                    className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group group-hover:shadow-md"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-800 group-hover:text-blue-700">{req.position}</span>
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{req.division}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-blue-500 h-full" style={{ width: `${(req.hiredCount / req.quantity) * 100}%` }}></div>
                                        </div>
                                        <span>{req.hiredCount}/{req.quantity} Hired</span>
                                    </div>
                                </button>
                            )) : (
                                <div className="text-center py-8 text-gray-400 italic">
                                    No active manpower requests found.
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 font-bold text-sm px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Skip / Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminKanban;
