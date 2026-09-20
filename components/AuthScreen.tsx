import React, { useState } from 'react';
import { FirebaseService } from '../services/firebaseService';

interface AuthScreenProps {
  darkMode: boolean;
  highContrast: boolean;
  dyslexicFont: boolean;
  fontSize: string;
  onAuthSuccess: (user: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  darkMode,
  highContrast,
  dyslexicFont,
  fontSize,
  onAuthSuccess,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Styling based on accessibility settings
  const textClass = highContrast 
    ? 'text-yellow-300' 
    : darkMode 
      ? 'text-slate-100' 
      : 'text-slate-800';

  const subTextClass = highContrast 
    ? 'text-yellow-400/80' 
    : darkMode 
      ? 'text-slate-400' 
      : 'text-slate-500';

  const cardBgClass = highContrast
    ? 'bg-slate-950 border-2 border-yellow-400'
    : darkMode
      ? 'bg-slate-900 border border-slate-800'
      : 'bg-white shadow-xl border border-slate-100';

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${
    highContrast
      ? 'bg-slate-900 border-yellow-500 text-yellow-300 focus:border-yellow-300 placeholder-yellow-500/50'
      : darkMode
        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder-slate-500'
        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600 placeholder-slate-400'
  }`;

  const buttonClass = `w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
    highContrast
      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md hover:shadow-blue-500/20'
  } disabled:opacity-50 disabled:pointer-events-none`;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (isRegistering && password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isForgotPassword) {
        await FirebaseService.sendPasswordReset(email);
        setMessage("Password reset email sent! Please check your inbox.");
        setIsForgotPassword(false);
      } else if (isRegistering) {
        const user = await FirebaseService.registerWithEmail(email, password);
        // Save initial user profile
        await FirebaseService.saveUserProfile(user.uid, {
          email,
          displayName: displayName || email.split('@')[0],
          accessibilitySettings: {
            mode: highContrast ? 'HIGH_CONTRAST' : 'STANDARD',
            fontSize: fontSize || 'MEDIUM',
            dyslexicFont
          }
        });
        onAuthSuccess(user);
      } else {
        const user = await FirebaseService.loginWithEmail(email, password);
        onAuthSuccess(user);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = "An error occurred. Please try again.";
      if (err.code === 'auth/user-not-found') {
        errMsg = "No account found with this email.";
      } else if (err.code === 'auth/wrong-password') {
        errMsg = "Incorrect password.";
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = "This email is already registered.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "Invalid email format.";
      } else if (err.code === 'auth/weak-password') {
        errMsg = "Password should be at least 6 characters.";
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = "Email/Password sign-in is not enabled. Please enable it in the Firebase Console.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const user = await FirebaseService.loginWithGoogle();
      // Ensure profile exists in Firestore
      const existingProfile = await FirebaseService.getUserProfile(user.uid);
      if (!existingProfile) {
        await FirebaseService.saveUserProfile(user.uid, {
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          accessibilitySettings: {
            mode: highContrast ? 'HIGH_CONTRAST' : 'STANDARD',
            fontSize: fontSize || 'MEDIUM',
            dyslexicFont
          }
        });
      }
      onAuthSuccess(user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg ${
              highContrast ? 'bg-yellow-900 border-2 border-yellow-400' : 'bg-blue-600'
            }`}>
              <i className={`fas fa-brain text-3xl ${highContrast ? 'text-yellow-300' : 'text-white'}`}></i>
            </div>
          </div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${textClass}`}>
            MediMind AI
          </h1>
          <p className={`text-sm ${subTextClass}`}>
            Your private, intelligent healthcare assistant
          </p>
        </div>

        {/* Card Body */}
        <div className={`p-8 rounded-3xl ${cardBgClass} transition-all duration-300`}>
          <h2 className={`text-xl font-bold mb-6 ${textClass}`}>
            {isForgotPassword 
              ? "Reset Password" 
              : isRegistering 
                ? "Create Account" 
                : "Sign In"}
          </h2>

          {error && (
            <div className={`p-4 mb-4 rounded-xl text-xs font-semibold flex items-start gap-2 ${
              highContrast 
                ? 'bg-red-950/80 border border-red-500 text-red-300' 
                : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              <i className="fas fa-circle-exclamation mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className={`p-4 mb-4 rounded-xl text-xs font-semibold flex items-start gap-2 ${
              highContrast 
                ? 'bg-green-950/80 border border-green-500 text-green-300' 
                : 'bg-green-50 text-green-600 border border-green-100'
            }`}>
              <i className="fas fa-circle-check mt-0.5"></i>
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering && !isForgotPassword && (
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${subTextClass}`}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${subTextClass}`}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>
                    Password
                  </label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className={`text-xs font-bold ${
                        highContrast ? 'text-yellow-400 underline' : 'text-blue-500 hover:text-blue-600'
                      }`}
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            )}

            {isRegistering && !isForgotPassword && (
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${subTextClass}`}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            )}

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  <span>Please wait...</span>
                </>
              ) : (
                <span>
                  {isForgotPassword 
                    ? "Send Reset Email" 
                    : isRegistering 
                      ? "Register & Sign In" 
                      : "Sign In"}
                </span>
              )}
            </button>
          </form>

          {/* Third-Party Authentication Options */}
          {!isForgotPassword && (
            <div className="mt-6 space-y-4">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-300 dark:border-slate-800"></div>
                <span className={`flex-shrink mx-4 text-xs font-bold uppercase tracking-widest ${subTextClass}`}>
                  or continue with
                </span>
                <div className="flex-grow border-t border-slate-300 dark:border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 border transition-all active:scale-95 ${
                  highContrast
                    ? 'bg-slate-900 border-yellow-500 text-yellow-300 hover:bg-slate-800'
                    : darkMode
                      ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-sm'
                }`}
              >
                <i className="fab fa-google text-red-500"></i>
                <span>Sign In with Google</span>
              </button>
            </div>
          )}

          {/* Toggle Screen Mode Links */}
          <div className="mt-8 text-center">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className={`text-sm font-bold ${
                  highContrast ? 'text-yellow-400 underline' : 'text-blue-500 hover:text-blue-600'
                }`}
              >
                ← Back to Sign In
              </button>
            ) : (
              <p className={`text-sm ${subTextClass}`}>
                {isRegistering ? "Already have an account?" : "New to MediMind?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className={`font-bold ${
                    highContrast ? 'text-yellow-400 underline' : 'text-blue-500 hover:text-blue-600'
                  }`}
                >
                  {isRegistering ? "Sign In" : "Register"}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Walkthrough setup instruction for Email Auth in Firebase console */}
        <div className={`p-4 rounded-2xl text-xs leading-relaxed text-center opacity-80 ${
          highContrast ? 'bg-slate-950 border border-yellow-600' : darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-50 border border-slate-200'
        } ${textClass}`}>
          <p className="font-bold mb-1">
            <i className="fas fa-circle-info mr-1 text-blue-500"></i> Developer Note:
          </p>
          <p className="opacity-80">
            For Email/Password auth to work, please ensure the **Email/Password** provider is enabled in your Firebase Console under **Authentication &gt; Sign-in method**.
          </p>
        </div>

      </div>
    </div>
  );
};
