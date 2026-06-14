"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import { setStoredToken } from "@/lib/authClient";
import { login } from "@/services/auth"; // adjust path if needed
import { useRouter } from "next/navigation"; // import router

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [preAuthUserId, setPreAuthUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter(); // initialize router

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const data = await login(form.email, form.password);
      if (data.twoFactorRequired) {
        // Show TOTP input
        setSuccess('Two-factor required. Enter code below.');
        setPreAuthUserId(String(data.userid || ''));
        return;
      }
      // Save JWT token to localStorage or cookie
      setStoredToken(data.token);
      setSuccess("Login successful!");

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const [totp, setTotp] = useState('');
  async function handleVerifyTotp() {
    setError('');
    try {
      // user id stored in form.userid for the interim
      const userId = preAuthUserId || '';
      const res = await fetch('/api/auth/2fa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, token: totp }) });
      const j = await res.json();
      if (j.verified && j.token) {
        setStoredToken(j.token);
        router.push('/dashboard');
      } else {
        setError('Invalid 2FA code');
      }
    } catch (e: any) { setError(e.message || 'error'); }
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
      <Card sx={{ width: 400 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Log In
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
            {success && (
              <Typography color="primary" variant="body2" sx={{ mt: 1 }}>
                {success}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
            >
              Log In
            </Button>

            {/* TOTP input shown after password step when 2FA is required */}
            {preAuthUserId && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="2FA code"
                  name="totp"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  fullWidth
                  margin="normal"
                  {...({ inputProps: { inputMode: 'numeric', pattern: '[0-9]*' } } as any)}
                />
                <Button variant="outlined" fullWidth onClick={handleVerifyTotp} sx={{ mt: 1 }}>
                  Verify 2FA Code
                </Button>
              </Box>
            )}
          </form>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Don’t have an account? <a href="/signup">Sign up</a>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <a href="/forgot">Forgot password?</a>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
