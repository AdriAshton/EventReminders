"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Box, Typography, TextField, Button } from "@mui/material";
import axios from "axios";

export default function ResetPage() {
  const params = useParams();
  const token = params?.token;
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const submit = async () => {
    try {
      const res = await axios.post('/api/auth/reset', { token, password });
      setMsg(res.data.message || 'Password updated');
      setTimeout(() => router.push('/login'), 1500);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'Error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Reset password</Typography>
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
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.85)' },
          '& .MuiInputBase-input': { color: 'rgba(255,255,255,0.95)' },
          '& .MuiInputBase-root': { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 1 },
        }}
        fullWidth
      />

      <Button variant="contained" sx={{ mt: 2 }} onClick={submit} disabled={!token}>Set password</Button>

      {token && process.env.NODE_ENV !== 'production' && (
        <Typography variant="body2" sx={{ mt: 2 }}>Token (dev): {token}</Typography>
      )}
      {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
    </Box>
  );
}
