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
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNumber }),
    });
    const data = await res.json();
    if (data.success) {
      return {
        success: true,
        message: data.message || "OTP sent successfully.",
      };
    } else {
      return {
        success: false,
        message: data.error || "Roll number not found in our system.",
        error: "ROLL_NUMBER_NOT_FOUND"
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'An error occurred while requesting OTP',
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
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNumber, otp }),
    });
    const data = await res.json();
    if (data.success) {
      const student: RollNumberStudent = {
        id: rollNumber,
        roll_number: rollNumber,
        full_name: data.user.fullName,
        email: data.user.email,
      };
      
      // Store student info in localStorage
      localStorage.setItem('studentInfo', JSON.stringify(student));
      localStorage.setItem('rollNumberSession', data.token);

      return {
        success: true,
        message: 'Login successful',
        student,
        sessionToken: data.token
      };
    } else {
      return {
        success: false,
        message: data.error || 'Incorrect OTP'
      };
    }
  } catch (error: any) {
    console.error('[RollNumberAuth] Verify OTP error:', error);
    return {
      success: false,
      message: error.message || 'An error occurred during verification'
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
