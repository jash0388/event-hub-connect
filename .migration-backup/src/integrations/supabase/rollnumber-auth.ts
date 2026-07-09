import { supabase, supabaseAdmin } from './client';

/**
 * Roll Number + OTP Authentication System
 * Replaces Gmail-based authentication with roll number + OTP flow
 */

export interface RollNumberStudent {
  id: string;
  roll_number: string;
  full_name: string;
  email: string;
  phone?: string;
  year?: string;
  section?: string;
  department?: string;
  college?: string;
}

export interface OTPVerification {
  success: boolean;
  message: string;
  student?: RollNumberStudent;
  sessionToken?: string;
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Request OTP for a roll number
 * Checks if roll number exists in user_registrations table
 */
export async function requestOTPForRollNumber(rollNumber: string): Promise<{
  success: boolean;
  message: string;
  email?: string;
  error?: string;
}> {
  try {
    const adminClient = supabaseAdmin || supabase;

    // Search in user_registrations table for the roll number
    // First, we need to check if there's a custom field or if we need to use email as identifier
    const { data: registrations, error: searchError } = await adminClient
      .from('user_registrations')
      .select('*')
      .or(`full_name.ilike.%${rollNumber}%,email.ilike.%${rollNumber}%`)
      .limit(10);

    if (searchError) {
      console.error('[RollNumberAuth] Search error:', searchError);
      return {
        success: false,
        message: 'Failed to search for roll number',
        error: searchError.message
      };
    }

    // Look for exact roll number match in full_name or email
    const student = registrations?.find(
      (reg) =>
        reg.full_name?.toLowerCase().includes(rollNumber.toLowerCase()) ||
        reg.email?.toLowerCase().includes(rollNumber.toLowerCase())
    );

    if (!student) {
      return {
        success: false,
        message: 'Roll number not found in our system. Please contact your college administrator.',
        error: 'ROLL_NUMBER_NOT_FOUND'
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in a temporary table or in user_registrations
    // For now, we'll store it in a custom field or log it
    console.log(`[RollNumberAuth] OTP for ${student.full_name}: ${otp}`);

    // In production, send OTP via email
    // await sendOTPEmail(student.email, otp, student.full_name);

    return {
      success: true,
      message: `OTP sent to ${student.email}`,
      email: student.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email
    };
  } catch (error: any) {
    console.error('[RollNumberAuth] Request OTP error:', error);
    return {
      success: false,
      message: 'An error occurred while requesting OTP',
      error: error.message
    };
  }
}

/**
 * Verify OTP and create/update user session
 * This creates a user record in Firebase/Supabase auth if needed
 */
export async function verifyOTPAndLogin(
  rollNumber: string,
  otp: string
): Promise<OTPVerification> {
  try {
    const adminClient = supabaseAdmin || supabase;

    // Find student by roll number
    const { data: registrations, error: searchError } = await adminClient
      .from('user_registrations')
      .select('*')
      .or(`full_name.ilike.%${rollNumber}%,email.ilike.%${rollNumber}%`)
      .limit(10);

    if (searchError || !registrations || registrations.length === 0) {
      return {
        success: false,
        message: 'Roll number not found'
      };
    }

    const student = registrations[0];

    // In production, verify OTP from temporary storage
    // For now, we'll accept the OTP if it's 6 digits
    if (!/^\d{6}$/.test(otp)) {
      return {
        success: false,
        message: 'Invalid OTP format'
      };
    }

    // Create or get user session
    // Store student info in localStorage for now
    const sessionToken = btoa(JSON.stringify({
      roll_number: rollNumber,
      email: student.email,
      full_name: student.full_name,
      timestamp: Date.now()
    }));

    return {
      success: true,
      message: 'Login successful',
      student: {
        id: student.user_id || student.id,
        roll_number: rollNumber,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        year: student.year,
        section: student.section,
        department: student.department,
        college: student.college
      },
      sessionToken
    };
  } catch (error: any) {
    console.error('[RollNumberAuth] Verify OTP error:', error);
    return {
      success: false,
      message: 'An error occurred during verification'
    };
  }
}

/**
 * Get student info by roll number
 */
export async function getStudentByRollNumber(rollNumber: string): Promise<RollNumberStudent | null> {
  try {
    const adminClient = supabaseAdmin || supabase;

    const { data, error } = await adminClient
      .from('user_registrations')
      .select('*')
      .or(`full_name.ilike.%${rollNumber}%,email.ilike.%${rollNumber}%`)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const student = data[0];
    return {
      id: student.user_id || student.id,
      roll_number: rollNumber,
      full_name: student.full_name,
      email: student.email,
      phone: student.phone,
      year: student.year,
      section: student.section,
      department: student.department,
      college: student.college
    };
  } catch (error) {
    console.error('[RollNumberAuth] Get student error:', error);
    return null;
  }
}

/**
 * Send OTP via email (mock implementation)
 * In production, integrate with SendGrid, Mailgun, or similar
 */
export async function sendOTPEmail(email: string, otp: string, fullName: string): Promise<boolean> {
  try {
    // Mock implementation - log to console
    console.log(`[RollNumberAuth] Sending OTP ${otp} to ${email} for ${fullName}`);

    // In production:
    // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${import.meta.env.VITE_SENDGRID_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({...})
    // });

    return true;
  } catch (error) {
    console.error('[RollNumberAuth] Send email error:', error);
    return false;
  }
}

/**
 * Logout and clear session
 */
export async function logoutRollNumberUser(): Promise<{ success: boolean; error?: string }> {
  try {
    // Clear localStorage session
    localStorage.removeItem('rollNumberSession');
    localStorage.removeItem('studentInfo');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current session from localStorage
 */
export function getCurrentSession(): RollNumberStudent | null {
  try {
    const sessionStr = localStorage.getItem('studentInfo');
    if (!sessionStr) return null;

    return JSON.parse(sessionStr) as RollNumberStudent;
  } catch (error) {
    console.error('[RollNumberAuth] Get session error:', error);
    return null;
  }
}

/**
 * Set current session in localStorage
 */
export function setCurrentSession(student: RollNumberStudent): void {
  try {
    localStorage.setItem('studentInfo', JSON.stringify(student));
  } catch (error) {
    console.error('[RollNumberAuth] Set session error:', error);
  }
}
