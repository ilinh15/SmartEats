import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LoginPage = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!password.trim()) {
      setError("Password is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateInputs()) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      const errorCode = err.code;
      if (
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential"
      ) {
        setError("Email or password is incorrect. Please check your credentials and try again.");
      } else if (errorCode === "auth/invalid-email") {
        setError("Invalid email address. Please enter a valid email.");
      } else if (errorCode === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else if (typeof errorCode === "string" && errorCode.startsWith("auth/")) {
        setError("Email or password is incorrect. Please check your credentials and try again.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            SmartEats
          </h1>
          <p className="text-muted-foreground">Welcome back!</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="rounded-lg"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="rounded-lg"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg h-11 text-base font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"></div>
                  Logging in...
                </span>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border"></div>
            <span className="text-xs font-medium text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-primary hover:underline"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
