"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Box, Typography, TextField, Button } from "@mui/material";
import axios from "axios";

export default function ResetPage() {
  const params = useParams();
  const token = params?.token;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const submit = async () => {
    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post('/api/auth/reset', { token, password, confirmPassword });
      setMsg(res.data.message || 'Password updated');
      setTimeout(() => router.push('/login'), 1500);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'Error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ color: '#000' }}>Reset password</Typography>
      {!token && (
        <Typography color="error" sx={{ mt: 2 }}>No reset token provided in URL.</Typography>
      )}

      <TextField
        label="New password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{
          mt: 2,
          '& .MuiInputLabel-root': { color: '#000' },
          '& .MuiInputBase-input': { color: '#000' },
          '& .MuiInputBase-root': { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 1 },
        }}
        fullWidth
      />

      <TextField
        label="Confirm password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        sx={{
          mt: 2,
          '& .MuiInputLabel-root': { color: '#000' },
          '& .MuiInputBase-input': { color: '#000' },
          '& .MuiInputBase-root': { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 1 },
        }}
        fullWidth
      />

      <Button variant="contained" sx={{ mt: 2 }} onClick={submit} disabled={!token || !password || !confirmPassword}>Set password</Button>

      {msg && <Typography sx={{ mt: 2, color: '#000' }}>{msg}</Typography>}
    </Box>
  );
}
