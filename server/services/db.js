const { supabase, supabaseAdmin } = require('./supabaseClient');

const db = {
    // ... rest of db object ...
    // ... rest of db object ...
    jobVacancy: {
        create: async ({ data }) => {
            const payload = {
                manpower_request_id: data.manpowerRequestId,
                title: data.title,
                description: data.description,
                requirements: data.requirements,
                location: data.location || 'Head Office',
                type: data.type || 'Full-time',
                salary_range: data.salaryRange,
                posted_at: new Date().toISOString(),
                expires_at: data.expiresAt,
                is_active: data.isActive !== undefined ? data.isActive : true,
                image_url: data.imageUrl || null
            };

            const { data: vacancy, error } = await supabaseAdmin
                .from('job_vacancies')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            // Automatically update the related manpower request to 'In Progress' if linked
            if (data.manpowerRequestId) {
                await supabaseAdmin
                    .from('manpower_requests')
                    .update({ status: 'In Progress' })
                    .eq('id', data.manpowerRequestId);
            }

            return vacancy;
        },
        update: async ({ where, data }) => {
            const payload = {};
            if (data.title) payload.title = data.title;
            if (data.description) payload.description = data.description;
            if (data.requirements) payload.requirements = data.requirements;
            if (data.location) payload.location = data.location;
            if (data.type) payload.type = data.type;
            if (data.salaryRange) payload.salary_range = data.salaryRange;
            if (data.expiresAt) payload.expires_at = data.expiresAt;
            if (data.isActive !== undefined) payload.is_active = data.isActive;
            if (data.imageUrl !== undefined) payload.image_url = data.imageUrl;

            const { data: updated, error } = await supabaseAdmin
                .from('job_vacancies')
                .update(payload)
                .eq('id', where.id)
                .select()
                .single();

            if (error) throw error;
            return updated;
        },
        delete: async ({ where }) => {
            const { error } = await supabaseAdmin
                .from('job_vacancies')
                .delete()
                .eq('id', where.id);
            if (error) throw error;
            return { success: true };
        },
        findMany: async ({ where, useAdmin = false } = {}) => {
            // Use Admin client if requested to bypass RLS
            const client = (useAdmin || (where && where.isAdmin)) ? supabaseAdmin : supabase;

            let query = client
                .from('job_vacancies')
                .select('*')
                .order('posted_at', { ascending: false });

            // Public filter: Active only (Expiry check moved to JS to handle NULLs)
            if (where && where.public) {
                query = query.eq('is_active', true);
            }
            // Admin filter
            if (where && where.isAdmin) {
                // Return all
            }

            if (where && where.manpowerRequestId) {
                query = query.eq('manpower_request_id', where.manpowerRequestId);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase Error (List Vacancies):", error);
                return [];
            }

            // Fetch counts manually
            // 1. Assigned Candidates (by request_id)
            const mpIds = [...new Set(data.map(v => v.manpower_request_id).filter(id => id))];
            let counts = {};

            if (mpIds.length > 0) {
                const { data: cCounts, error: cErr } = await client
                    .from('candidates')
                    .select('request_id')
                    .in('request_id', mpIds);

                if (!cErr && cCounts) {
                    cCounts.forEach(c => {
                        counts[c.request_id] = (counts[c.request_id] || 0) + 1;
                    });
                }
            }

            // 2. Unassigned Candidates (by vacancy_id)
            // Note: This requires 'vacancy_id' column in candidates table.
            const vacIds = data.map(v => v.id);
            let vacCounts = {};

            if (vacIds.length > 0) {
                try {
                    const { data: vData, error: vErr } = await client
                        .from('candidates')
                        .select('vacancy_id')
                        .in('vacancy_id', vacIds)
                        .is('request_id', null); // Only count unassigned

                    if (!vErr && vData) {
                        vData.forEach(c => {
                            if (c.vacancy_id) vacCounts[c.vacancy_id] = (vacCounts[c.vacancy_id] || 0) + 1;
                        });
                    }
                } catch (e) {
                    // Ignore error if column missing in legacy DB
                    console.warn("Vacancy Count ignored (Schema mismatch?)", e.message);
                }
            }

            // Client-side filtering for Expiry to handle NULLs correctly
            let filteredData = data;
            if (where && where.public) {
                const now = new Date();
                filteredData = data.filter(v =>
                    !v.expires_at || new Date(v.expires_at) > now
                );
            }

            return filteredData.map(v => ({
                id: v.id,
                manpowerRequestId: v.manpower_request_id,
                title: v.title,
                description: v.description,
                requirements: v.requirements,
                location: v.location,
                type: v.type,
                salaryRange: v.salary_range,
                postedAt: v.posted_at,
                expiresAt: v.expires_at,
                isActive: v.is_active,
                viewsCount: v.views_count,
                imageUrl: v.image_url,
                // Sum assigned + unassigned applicants
                applicantsCount: (counts[v.manpower_request_id] || 0) + (vacCounts[v.id] || 0)
            }));
        },
        findUnique: async ({ where }) => {
            const { data, error } = await supabase
                .from('job_vacancies')
                .select('*')
                .eq('id', where.id)
                .single();

            if (error) return null;

            // Increment view count if it's a public fetch (we can optimize this later)
            if (where.incrementView) {
                await supabase.rpc('increment_vacancy_view', { row_id: where.id });
            }

            return {
                id: data.id,
                manpowerRequestId: data.manpower_request_id,
                title: data.title,
                description: data.description,
                requirements: data.requirements,
                location: data.location,
                type: data.type,
                salaryRange: data.salary_range,
                postedAt: data.posted_at,
                expiresAt: data.expires_at,
                isActive: data.is_active,
                viewsCount: data.views_count,
                imageUrl: data.image_url
            };
        },
        delete: async ({ where }) => {
            // Unlink candidates first to avoid foreign key constraint error
            await supabaseAdmin
                .from('candidates')
                .update({ vacancy_id: null })
                .eq('vacancy_id', where.id);

            const { error } = await supabaseAdmin
                .from('job_vacancies')
                .delete()
                .eq('id', where.id);

            if (error) throw new Error(error.message);
            return { success: true };
        }
    },
    candidate: {
        create: async ({ data }) => {
            // Map 'createdAt' to snake_case if necessary, or let Supabase handle default now()
            let requestId = null;
            // USER REQUEST: Disable auto-linking. Let HC team assign manually.
            /*
            if (data.vacancyId) {
                // Fetch vacancy to get manpower_request_id
                const { data: vac, error: vacErr } = await supabaseAdmin
                    .from('job_vacancies')
                    .select('manpower_request_id')
                    .eq('id', data.vacancyId)
                    .single();

                if (!vacErr && vac) {
                    requestId = vac.manpower_request_id;
                }
            }
            */

            const payload = {
                full_name: data.fullName,
                email: data.email,
                phone: data.phone,
                position: data.position,
                religion: data.religion,
                blood_type: data.bloodType,
                address: data.address,

                // NEW FIELDS
                nik: data.nik,
                sim_ownership: data.simOwnership,
                sim_number: data.simNumber,
                medical_history: data.medicalHistory,
                experience: data.experience, // Will be stored as JSONB
                education: data.education,   // Will be stored as JSONB
                dob: data.dob,
                emergency_contact: data.emergencyContact,
                other_info: data.otherInfo,
                snapshots: typeof data.snapshots === 'string' ? JSON.parse(data.snapshots) : (data.snapshots || []),

                cv_url: data.cvUrl,
                photo_url: data.photoUrl,
                status: data.status || 'New',
                strengths: data.strengths,
                weaknesses: data.weaknesses,
                biggest_achievement: data.biggestAchievement,

                request_id: requestId, // Save the link (nullable)
                vacancy_id: data.vacancyId // Save source vacancy for counters
            };

            console.log("DEBUG DB PAYLOAD:", JSON.stringify(payload)); // Check what is sent to Supabase

            const { data: newCandidate, error } = await supabaseAdmin
                .from('candidates')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error("Supabase Error (Create Candidate):", error);
                throw error;
            }

            // Map back to camelCase for app compatibility
            return {
                ...newCandidate,
                id: newCandidate.id,
                fullName: newCandidate.full_name,
                religion: newCandidate.religion,
                bloodType: newCandidate.blood_type,
                address: newCandidate.address,
                cvUrl: newCandidate.cv_url,
                photoUrl: newCandidate.photo_url,
                // Return new fields if needed immediately
                nik: newCandidate.nik,
                experience: newCandidate.experience,
                snapshots: newCandidate.snapshots || []
            };
        },
        findUnique: async ({ where, useAdmin = false }) => {
            // Use Admin client if requested (secure context)
            const client = useAdmin ? supabaseAdmin : supabase;

            let query = client
                .from('candidates')
                .select(`
                    *,
                    disc_results:disc_results!fk_disc_candidate (*),
                    analyses:analyses!fk_analyses_candidate (*),
                    aptitude_results:aptitude_results!fk_aptitude_candidate (*)
                `);

            if (where.id) {
                query = query.eq('id', where.id);
            } else if (where.email) {
                query = query.eq('email', where.email);
            } else {
                console.warn("findUnique called without id or email:", where);
                return null; // Or throw error
            }

            const { data, error } = await query.single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                console.error("Supabase Error (Find Candidate):", error);
            }

            if (!data) return null;

            // Helper to get first item or object (sort by created_at desc for latest)
            const getRelation = (rel) => Array.isArray(rel) ? rel[0] : rel;
            const getLatestRelation = (rel) => {
                if (!Array.isArray(rel) || rel.length === 0) return rel;
                return [...rel].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            };
            const disc = getRelation(data.disc_results);
            const analysis = getLatestRelation(data.analyses);

            return {
                ...data,
                id: data.id,
                fullName: data.full_name,
                religion: data.religion,
                bloodType: data.blood_type,
                address: data.address,
                cvUrl: data.cv_url,
                photoUrl: data.photo_url,
                cvText: data.cv_text,
                createdAt: data.created_at,

                // Map new fields
                nik: data.nik,
                simOwnership: data.sim_ownership,
                simNumber: data.sim_number,
                medicalHistory: data.medical_history,
                experience: data.experience,
                education: data.education,
                dob: data.dob,
                emergencyContact: data.emergency_contact,
                otherInfo: data.other_info,
                snapshots: data.snapshots || [],

                // Relationships
                discResult: disc ? {
                    profile: disc.profile,
                    dScore: disc.d_score,
                    iScore: disc.i_score,
                    sScore: disc.s_score,
                    cScore: disc.c_score,
                    fullResult: disc.full_result,
                    answers: disc.answers
                } : null,
                analysis: analysis ? {
                    matchScore: analysis.match_score,
                    verdict: analysis.verdict,
                    content: analysis.content,
                    ocrText: analysis.ocr_text,
                    // NEW: Detailed Scores
                    cvScore: analysis.cv_score,
                    discScore: analysis.disc_score,
                    aptitudeScore: analysis.aptitude_score,
                    personalDataScore: analysis.personal_data_score
                } : null,
                aptitudeResult: data.aptitude_results && data.aptitude_results.length > 0 ? {
                    score: data.aptitude_results[0].score,
                    correctCount: data.aptitude_results[0].correct_count,
                    totalCount: data.aptitude_results[0].total_count,
                    answers: data.aptitude_results[0].answers
                } : null
            };
        },
        findMany: async ({ where, useAdmin = false } = {}) => {
            const client = (useAdmin || (where && where.isAdmin)) ? supabaseAdmin : supabase;

            const { data, error } = await client
                .from('candidates')
                .select(`
                    *,
                    disc_results:disc_results!fk_disc_candidate (*),
                    analyses:analyses!fk_analyses_candidate (*),
                    aptitude_results:aptitude_results!fk_aptitude_candidate (*)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Supabase Error (List Candidates):", error);
                return [];
            }

            // Map results to match expected app structure
            return data.map(c => {
                // Helper to get first item or object (sort by created_at desc for latest)
                const getRelation = (rel) => Array.isArray(rel) ? rel[0] : rel;
                const getLatestRelation = (rel) => {
                    if (!Array.isArray(rel) || rel.length === 0) return rel;
                    return [...rel].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                };

                const disc = getRelation(c.disc_results); // Mapped via alias
                const analysis = getLatestRelation(c.analyses);

                return {
                    id: c.id,
                    fullName: c.full_name,
                    email: c.email,
                    phone: c.phone,
                    position: c.position,
                    religion: c.religion,
                    bloodType: c.blood_type,
                    address: c.address,
                    cvUrl: c.cv_url,
                    photoUrl: c.photo_url,
                    status: c.status,
                    cvText: c.cv_text,
                    createdAt: c.created_at,
                    request_id: c.request_id, // Ensure request_id is passed to frontend

                    // Map new fields
                    nik: c.nik,
                    simOwnership: c.sim_ownership,
                    simNumber: c.sim_number,
                    experience: c.experience,
                    education: c.education,
                    snapshots: c.snapshots || [],
                    screeningStatus: c.screening_status || 'pending',
                    // Flattening related data for dashboard compatibility
                    discResult: disc ? {
                        profile: disc.profile,
                        dScore: disc.d_score,
                        iScore: disc.i_score,
                        sScore: disc.s_score,
                        cScore: disc.c_score,
                        fullResult: disc.full_result,
                        answers: disc.answers
                    } : null,
                    analysis: analysis ? {
                        matchScore: analysis.match_score,
                        verdict: analysis.verdict,
                        content: analysis.content, // AI Analysis Text
                        ocrText: analysis.ocr_text, // OCR Text
                        // NEW Detailed Scores
                        cvScore: analysis.cv_score,
                        discScore: analysis.disc_score,
                        aptitudeScore: analysis.aptitude_score,
                        personalDataScore: analysis.personal_data_score
                    } : null,
                    aptitudeResult: c.aptitude_results && c.aptitude_results.length > 0 ? {
                        score: c.aptitude_results[0].score,
                        correctCount: c.aptitude_results[0].correct_count,
                        totalCount: c.aptitude_results[0].total_count,
                        answers: c.aptitude_results[0].answers
                    } : null
                };
            });
        },
        async update({ where, data }) {
            // Map data to snake_case
            const payload = {};
            if (data.cvText) payload.cv_text = data.cvText; // IMPORTANT: Map camelCase to snake_case
            if (data.status) payload.status = data.status;
            if (data.position) payload.position = data.position;
            if (data.religion) payload.religion = data.religion;
            if (data.bloodType) payload.blood_type = data.bloodType;
            if (data.address) payload.address = data.address;

            // New fields
            if (data.nik) payload.nik = data.nik;
            if (data.simOwnership) payload.sim_ownership = data.simOwnership;
            if (data.simNumber) payload.sim_number = data.simNumber;
            if (data.medicalHistory) payload.medical_history = data.medicalHistory;
            if (data.experience) payload.experience = data.experience;
            if (data.education) payload.education = data.education;
            if (data.otherInfo) payload.other_info = data.otherInfo; // IMPORTANT: Map camelCase to snake_case for logging
            if (data.snapshots) payload.snapshots = data.snapshots;

            const { data: updated, error } = await supabaseAdmin
                .from('candidates')
                .update(payload)
                .eq('id', where.id)
                .select()
                .single();

            if (error) {
                console.error("Supabase Error (Update Candidate):", error);
                throw error;
            }

            return updated;
        },
        delete: async ({ where }) => {
            // Cascade delete handled by DB constraints ideally, but we call delete on candidate
            const { error } = await supabaseAdmin
                .from('candidates')
                .delete()
                .eq('id', where.id);

            if (error) throw error;
            return { id: where.id };
        }
    },
    discResult: {
        create: async ({ data }) => {
            const payload = {
                candidate_id: data.candidateId,
                d_score: data.dScore,
                i_score: data.iScore,
                s_score: data.sScore,
                c_score: data.cScore,
                profile: data.profile,
                answers: data.answers,
                full_result: data.fullResult
            };

            const { data: result, error } = await supabaseAdmin
                .from('disc_results')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            // ... (rest of mapping)
        },
        // ...
    },
    analysis: {
        create: async ({ data }) => {
            // ... (payload construction)
            const payload = {
                candidate_id: data.candidateId,
                match_score: data.matchScore,
                verdict: data.verdict,
                content: data.content,
                ocr_text: data.ocrText,
                // NEW: Detailed Scores
                cv_score: data.cvScore || 0,
                disc_score: data.discScore || 0,
                aptitude_score: data.aptitudeScore || 0,
                personal_data_score: data.personalDataScore || 0
            };

            console.log("DEBUG ANALYSIS PAYLOAD:", JSON.stringify(payload));

            const { data: result, error } = await supabaseAdmin
                .from('analyses')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error("Supabase Analysis Create Error:", error);
                throw error;
            }
            return result;
        },
        // ...
    },
    manpowerRequest: {
        create: async ({ data }) => {
            const payload = {
                division: data.division,
                position: data.position,
                job_description: data.jobDescription,
                requirements: data.requirements,
                hire_purpose: data.hirePurpose,
                position_level: data.positionLevel,
                education_qualification: data.educationQualification,
                years_of_experience: data.yearsOfExperience,
                other_qualifications: data.otherQualifications,
                quantity: parseInt(data.quantity || 1),
                status: data.status || 'Pending',
                priority: data.priority || 'Normal',
                requester_name: data.requesterName,
                user_id: data.userId,
                image_url: data.imageUrl || null
            };

            const { data: request, error } = await supabase
                .from('manpower_requests')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error("Supabase Error (Create Manpower Request):", error);
                throw error;
            }

            return {
                id: request.id,
                division: request.division,
                position: request.position,
                jobDescription: request.job_description,
                requirements: request.requirements,
                quantity: request.quantity,
                status: request.status,
                priority: request.priority,
                requesterName: request.requester_name,
                createdAt: request.created_at,
                imageUrl: request.image_url
            };
        },
        findMany: async ({ where } = {}) => {
            // Fetch requests AND include candidates to calculate fulfillment
            // Use supabaseAdmin to ensure we can count candidates regardless of RLS
            let query = supabaseAdmin
                .from('manpower_requests')
                .select(`
                    *,
                    candidates:candidates!fk_candidates_manpower (id, status)
                `)
                .order('created_at', { ascending: false });

            if (where && where.userId) {
                query = query.eq('user_id', where.userId);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Supabase Error (List Manpower Requests):", error);
                return [];
            }


            return data.map(r => {
                // Calculate hired count
                const hiredCount = r.candidates ? r.candidates.filter(c => c.status === 'Hired').length : 0;

                // Calculate full stats
                const stats = {
                    Applied: 0,
                    Screening: 0,
                    Interview: 0,
                    Offered: 0,
                    Hired: 0,
                    Rejected: 0
                };

                if (r.candidates) {
                    r.candidates.forEach(c => {
                        // Normalize status checks if necessary
                        let status = c.status;
                        if (status === 'Offer') status = 'Offered';

                        if (stats.hasOwnProperty(status)) {
                            stats[status]++;
                        } else {
                            // Map other statuses to buckets if needed, or just ignore
                            // Assuming status matches key or default to 'Applied' if 'New'
                            if (c.status === 'New') stats.Applied++;
                        }
                    });
                }

                return {
                    id: r.id,
                    division: r.division,
                    position: r.position,
                    jobDescription: r.job_description,
                    requirements: r.requirements,
                    hirePurpose: r.hire_purpose,
                    positionLevel: r.position_level,
                    educationQualification: r.education_qualification,
                    yearsOfExperience: r.years_of_experience,
                    otherQualifications: r.other_qualifications,
                    quantity: r.quantity,
                    status: r.status,
                    priority: r.priority,
                    requesterName: r.requester_name,
                    createdAt: r.created_at,
                    approvedAt: r.approved_at,
                    finalizedAt: r.finalized_at,
                    hiredCount: hiredCount,
                    rejectionReason: r.rejection_reason,
                    candidateStats: stats, // Return aggregated stats
                    imageUrl: r.image_url,
                    // Optionally pass candidate list if needed
                    candidates: r.candidates
                };
            });
        },
        findUnique: async ({ where }) => {
            const { data, error } = await supabaseAdmin
                .from('manpower_requests')
                .select('*')
                .eq('id', where.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Supabase Error (Find Manpower Request):", error);
                return null;
            }
            if (!data) return null;

            return {
                id: data.id,
                division: data.division,
                position: data.position,
                jobDescription: data.job_description,
                requirements: data.requirements,
                hirePurpose: data.hire_purpose,
                positionLevel: data.position_level,
                educationQualification: data.education_qualification,
                yearsOfExperience: data.years_of_experience,
                otherQualifications: data.other_qualifications,
                quantity: data.quantity,
                status: data.status,
                priority: data.priority,
                requesterName: data.requester_name,
                userId: data.user_id, // Important for ownership check
                createdAt: data.created_at,
                rejectionReason: data.rejection_reason,
                imageUrl: data.image_url
            };
        },
        update: async ({ where, data }) => {
            const payload = {};
            if (data.status) {
                payload.status = data.status;
                if (data.status === 'Approved') payload.approved_at = new Date().toISOString();
                if (data.status === 'Finalized') payload.finalized_at = new Date().toISOString();
            }
            if (data.rejectionReason) payload.rejection_reason = data.rejectionReason;
            if (data.quantity) payload.quantity = data.quantity;
            if (data.imageUrl !== undefined) payload.image_url = data.imageUrl;
            // Add other fields as needed

            const { data: updated, error } = await supabaseAdmin
                .from('manpower_requests')
                .update(payload)
                .eq('id', where.id)
                .select()
                .single();

            if (error) throw error;
            return updated;
        },
        delete: async ({ where }) => {
            // Use supabaseAdmin to bypass RLS, we checked permissions in the router
            const { error } = await supabaseAdmin
                .from('manpower_requests')
                .delete()
                .eq('id', where.id);
            if (error) throw error;
            return { success: true };
        }
    },
    portalUser: {
        create: async ({ data }) => {
            const payload = {
                username: data.username,
                password_hash: data.passwordHash,
                division: data.division,
                role: data.role || 'division_lead',
                status: data.status || 'pending'
            };
            // USE supabaseAdmin to bypass RLS
            const { data: user, error } = await supabaseAdmin.from('portal_users').insert([payload]).select().single();
            if (error) throw error;
            return user;
        },
        findByUsername: async (username) => {
            // Read can be standard supabase if RLS allows reading own data or public?
            // Usually login needs to find user. 
            // Ideally RLS allows SELECT for all or authenticated. 
            // BUT for login we are not authenticated yet. So we need supabaseAdmin to find user by username to verify password.
            const { data, error } = await supabaseAdmin.from('portal_users').select('*').eq('username', username).single();
            if (error && error.code !== 'PGRST116') return null;
            if (!data) return null;
            return {
                id: data.id,
                username: data.username,
                passwordHash: data.password_hash,
                division: data.division,
                role: data.role,
                status: data.status
            };
        },
        findMany: async () => {
            // Admin only, assume safe to use Admin client or we should rely on RLS if authenticated as admin. 
            // To be safe against RLS issues reported, use Admin.
            const { data, error } = await supabaseAdmin.from('portal_users').select('*').order('created_at', { ascending: false });
            if (error) return [];
            return data.map(u => ({
                id: u.id,
                username: u.username,
                division: u.division,
                role: u.role,
                status: u.status,
                createdAt: u.created_at
            }));
        },
        update: async ({ where, data }) => {
            // Approval needs admin rights
            const { data: updated, error } = await supabaseAdmin.from('portal_users').update(data).eq('id', where.id).select().single();
            if (error) throw error;
            return updated;
        },
    },
    aptitudeResult: {
        create: async ({ data }) => {
            const payload = {
                candidate_id: data.candidateId,
                score: data.score,
                correct_count: data.correctCount,
                total_count: data.totalCount,
                answers: data.answers
            };

            const { data: result, error } = await supabaseAdmin
                .from('aptitude_results')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            return {
                ...result,
                // ...
            };
        },
        findMany: async () => {
            const { data, error } = await supabase.from('aptitude_results').select('*');
            if (error) return [];
            return data.map(r => ({
                ...r,
                id: r.id,
                candidateId: r.candidate_id,
                score: r.score,
                correctCount: r.correct_count,
                totalCount: r.total_count,
                answers: r.answers,
                createdAt: r.created_at
            }));
        }
    }
};

module.exports = { db };
