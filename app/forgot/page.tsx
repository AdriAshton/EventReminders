"use client";
import { useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import axios from "axios";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setMsg("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg('Please enter a valid email address');
      return;
    }

    try {
      const res = await axios.post('/api/auth/forgot', { email: email.trim() }, { headers: { 'Content-Type': 'application/json' } });
      setMsg(res.data.message || 'Check your email for instructions.');
      // in dev, also show token for troubleshooting
      if (res.data.token) setMsg((prev) => prev + ` Token: ${res.data.token}`);
    } catch (e: any) {
      const serverErr = e?.response?.data?.error || e?.message || 'Error';
      setMsg(String(serverErr));
      console.error('Forgot API error', e?.response || e);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Forgot password</Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>Enter your account email to receive reset instructions.</Typography>
      <TextField
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{
          mt: 2,
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.85)' },
          '& .MuiInputBase-input': { color: 'rgba(255,255,255,0.95)' },
          '& .MuiInputBase-root': { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 1 },
        }}
        fullWidth
      />
      <Button variant="contained" sx={{ mt: 2 }} onClick={submit}>Send reset</Button>
      {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
    </Box>
  );
}
