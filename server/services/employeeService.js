/**
 * Employee Service - Business logic for employee module
 * Handles: auto-conversion from candidate, credential generation, status updates
 */

const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('./supabaseClient');

/**
 * Convert a hired candidate into an employee record.
 * Called when candidate status changes to 'Hired'.
 */
async function convertCandidateToEmployee(candidateId) {
    try {
        // 1. Fetch full candidate data
        const { data: candidate, error: cErr } = await supabaseAdmin
            .from('candidates')
            .select(`
                *,
                disc_results:disc_results!fk_disc_candidate (*),
                analyses:analyses!fk_analyses_candidate (*)
            `)
            .eq('id', candidateId)
            .single();

        if (cErr || !candidate) {
            console.error('[EmployeeService] Candidate not found:', cErr);
            return { success: false, error: 'Candidate not found' };
        }

        // 2. Check if already converted
        const { data: existing } = await supabaseAdmin
            .from('employees')
            .select('id')
            .eq('candidate_id', candidateId)
            .single();

        if (existing) {
            console.log('[EmployeeService] Candidate already converted to employee:', existing.id);
            return { success: true, employeeId: existing.id, alreadyExists: true };
        }

        // 3. Extract screening data
        const disc = Array.isArray(candidate.disc_results) ? candidate.disc_results[0] : candidate.disc_results;
        const analyses = Array.isArray(candidate.analyses) ? candidate.analyses : [];
        const latestAnalysis = analyses.length > 0
            ? analyses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            : null;

        // 4. Calculate probation end date (default 3 months)
        const joinDate = new Date();
        const probationMonths = 3;
        const probationEnd = new Date(joinDate);
        probationEnd.setMonth(probationEnd.getMonth() + probationMonths);

        // 5. Create employee record
        const employeePayload = {
            candidate_id: candidateId,
            full_name: candidate.full_name,
            email: candidate.email,
            phone: candidate.phone,
            nik: candidate.nik,
            dob: candidate.dob,
            religion: candidate.religion,
            blood_type: candidate.blood_type,
            address: candidate.address,
            photo_url: candidate.photo_url,
            division: null, // Will be assigned by HR
            position: candidate.position,
            join_date: joinDate.toISOString().split('T')[0],
            employment_type: 'Full-time',
            status: 'Probation',
            probation_months: probationMonths,
            probation_end_date: probationEnd.toISOString().split('T')[0],
            disc_profile: disc ? disc.profile : null,
            match_score: latestAnalysis ? latestAnalysis.match_score : null,
            cv_url: candidate.cv_url,
            custom_fields: {},
            notes: `Auto-converted from candidate #${candidateId}`
        };

        const { data: employee, error: eErr } = await supabaseAdmin
            .from('employees')
            .insert([employeePayload])
            .select()
            .single();

        if (eErr) {
            console.error('[EmployeeService] Failed to create employee:', eErr);
            return { success: false, error: eErr.message };
        }

        // 6. Log history
        await supabaseAdmin.from('employee_history').insert([{
            employee_id: employee.id,
            event_type: 'joined',
            event_date: joinDate.toISOString(),
            new_value: { position: candidate.position, status: 'Probation' },
            notes: `Hired from recruitment pipeline (Candidate #${candidateId})`,
            created_by: 'system'
        }]);

        // 7. Generate onboarding credentials
        const credentials = await generateOnboardingCredentials(employee);

        console.log(`[EmployeeService] Employee created: ${employee.full_name} (ID: ${employee.id})`);

        return {
            success: true,
            employeeId: employee.id,
            credentials
        };

    } catch (err) {
        console.error('[EmployeeService] convertCandidateToEmployee error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Generate onboarding portal username & password for a new employee
 */
async function generateOnboardingCredentials(employee) {
    try {
        // Generate username: firstname.lastname (lowercase, no spaces)
        const nameParts = employee.full_name.trim().toLowerCase().split(/\s+/);
        let baseUsername = nameParts.length >= 2
            ? `${nameParts[0]}.${nameParts[nameParts.length - 1]}`
            : nameParts[0];

        // Remove non-alphanumeric except dots
        baseUsername = baseUsername.replace(/[^a-z0-9.]/g, '');

        // Check uniqueness, append number if needed
        let username = baseUsername;
        let counter = 1;
        while (true) {
            const { data: existingUser } = await supabaseAdmin
                .from('onboarding_users')
                .select('id')
                .eq('username', username)
                .single();

            if (!existingUser) break;
            username = `${baseUsername}${counter}`;
            counter++;
        }

        // Generate temporary password (8 chars, readable)
        const tempPassword = generateReadablePassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // Create onboarding user
        const { error } = await supabaseAdmin.from('onboarding_users').insert([{
            employee_id: employee.id,
            username,
            password_hash: passwordHash,
            is_active: true
        }]);

        if (error) {
            console.error('[EmployeeService] Failed to create onboarding user:', error);
            return null;
        }

        console.log(`[EmployeeService] Onboarding credentials generated for ${employee.full_name}: ${username}`);

        return { username, tempPassword };

    } catch (err) {
        console.error('[EmployeeService] generateOnboardingCredentials error:', err);
        return null;
    }
}

/**
 * Generate a human-readable temporary password
 */
function generateReadablePassword(length = 8) {
    const consonants = 'bcdfghjkmnpqrstvwxyz';
    const vowels = 'aeiou';
    const numbers = '23456789';
    let password = '';

    for (let i = 0; i < Math.floor(length / 2); i++) {
        password += consonants[Math.floor(Math.random() * consonants.length)];
        password += vowels[Math.floor(Math.random() * vowels.length)];
    }

    // Add 2 random numbers
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    return password;
}

/**
 * Check and auto-update probation status for all employees
 * Called periodically (e.g. daily)
 */
async function checkProbationStatus() {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: employees, error } = await supabaseAdmin
            .from('employees')
            .select('id, full_name, probation_end_date')
            .eq('status', 'Probation')
            .lte('probation_end_date', today);

        if (error || !employees || employees.length === 0) return;

        console.log(`[EmployeeService] Found ${employees.length} employees to upgrade from Probation`);

        for (const emp of employees) {
            await supabaseAdmin
                .from('employees')
                .update({ status: 'Permanent', updated_at: new Date().toISOString() })
                .eq('id', emp.id);

            await supabaseAdmin.from('employee_history').insert([{
                employee_id: emp.id,
                event_type: 'status_change',
                event_date: new Date().toISOString(),
                old_value: { status: 'Probation' },
                new_value: { status: 'Permanent' },
                notes: 'Probation period completed. Auto-upgraded to Permanent.',
                created_by: 'system'
            }]);

            console.log(`[EmployeeService] ${emp.full_name} upgraded to Permanent`);
        }
    } catch (err) {
        console.error('[EmployeeService] checkProbationStatus error:', err);
    }
}

module.exports = {
    convertCandidateToEmployee,
    generateOnboardingCredentials,
    checkProbationStatus
};
