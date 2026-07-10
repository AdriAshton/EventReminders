"use client";
import { useEffect, useState } from "react";
import { Box, Typography, Switch, FormControlLabel, Card, CardContent, Button, Stack, FormControl, InputLabel, MenuItem, Select, Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import { authenticatedFetch, getStoredToken } from "@/lib/authClient";
import { getTokenPayload } from "@/lib/authClient";

export default function SettingsPage() {
  const [themeColor, setThemeColor] = useState<string>(() => {
    if (typeof window === 'undefined') return "purple";
    return localStorage.getItem("themeColor") || localStorage.getItem("theme") || "purple";
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const router = useRouter();
  const tokenPayload = getTokenPayload();
  const currentUserId = tokenPayload?.userid ? String(tokenPayload.userid) : "";

  useEffect(() => {
    // load server-side setting if available
    (async () => {
      try {
        const token = getStoredToken();
        if (!token) return;
        const res = await authenticatedFetch("/api/users/settings");
        const data = await res.json();
        const serverTheme = data?.theme;
        if (serverTheme) {
          const resolved = serverTheme === "red" || serverTheme === "green" || serverTheme === "purple"
            ? serverTheme
            : serverTheme === "dark"
              ? "purple"
              : "purple";
          setThemeColor(resolved);
          localStorage.setItem("themeColor", resolved);
          localStorage.setItem("theme", resolved);
          window.dispatchEvent(new Event("theme-change"));
        }
        const userSettingsRes = await authenticatedFetch('/api/users/settings');
        const userSettings = await userSettingsRes.json();
        setTwoFactorEnabled(!!userSettings?.twoFactor?.enabled);
      } catch {
        // ignore
      }
    })();
  }, []);

  const updateTheme = (value: string) => {
    setThemeColor(value);
    try {
      localStorage.setItem("themeColor", value);
      localStorage.setItem("theme", value);
      // allow the app to react to theme change by reloading or emitting an event
      window.dispatchEvent(new Event("theme-change"));
    } catch (e) {
      console.error(e);
    }
  };

  async function enablePersonal2FA() {
    setSecurityMessage(null);
    try {
      if (!currentUserId) {
        setSecurityMessage('No signed-in user found');
        return;
      }
      const setupRes = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const setupData = await setupRes.json();
      if (!setupRes.ok) {
        setSecurityMessage(setupData?.error || 'Failed to start 2FA setup');
        return;
      }
      const verifyCode = window.prompt('Enter the 6-digit verification code from your authenticator app');
      if (!verifyCode) return;
      const verifyRes = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, token: verifyCode }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData?.verified) {
        setTwoFactorEnabled(true);
        setSecurityMessage('2FA enabled for your account');
      } else {
        setSecurityMessage(verifyData?.error || 'Invalid verification code');
      }
    } catch (err: any) {
      setSecurityMessage(err?.message || 'Failed to enable 2FA');
    }
  }

  async function disablePersonal2FA() {
    setSecurityMessage(null);
    try {
      if (!currentUserId) {
        setSecurityMessage('No signed-in user found');
        return;
      }
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSecurityMessage(data?.error || 'Failed to disable 2FA');
        return;
      }
      setTwoFactorEnabled(false);
      setSecurityMessage(data?.message || '2FA disabled for your account');
    } catch (err: any) {
      setSecurityMessage(err?.message || 'Failed to disable 2FA');
    }
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">Adjust appearance, security, and messaging preferences.</Typography>
      </Box>

      <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6">Appearance</Typography>
          <FormControl fullWidth sx={{ mt: 1, maxWidth: 320 }}>
            <InputLabel id="theme-color-label">Theme color</InputLabel>
            <Select
              labelId="theme-color-label"
              value={themeColor}
              label="Theme color"
              onChange={(e) => updateTheme(String(e.target.value))}
            >
              <MenuItem value="purple">Purple</MenuItem>
              <MenuItem value="red">Red</MenuItem>
              <MenuItem value="green">Green</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

        <Card>
          <CardContent>
            <Typography variant="h6">Security</Typography>
            {securityMessage && <Alert severity="info" sx={{ mb: 2 }}>{securityMessage}</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" component="div">
                Control 2FA for your own account.
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorEnabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        void enablePersonal2FA();
                      } else {
                        void disablePersonal2FA();
                      }
                    }}
                  />
                }
                label={twoFactorEnabled ? '2FA enabled for my account' : '2FA disabled for my account'}
              />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={enablePersonal2FA} disabled={twoFactorEnabled}>
                  Enable for my account
                </Button>
                <Button variant="outlined" color="error" onClick={disablePersonal2FA} disabled={!twoFactorEnabled}>
                  Disable for my account
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button variant="outlined" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </Box>
      </Stack>
    </Box>
  );
}
