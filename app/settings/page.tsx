"use client";
import { useEffect, useState } from "react";
import { Box, Typography, Switch, FormControlLabel, Card, CardContent, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { authenticatedFetch, getStoredToken } from "@/lib/authClient";

export default function SettingsPage() {
  const [dark, setDark] = useState<boolean>(false);
  const [twoFactorGlobal, setTwoFactorGlobal] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const v = localStorage.getItem("theme");
    setDark(v === "dark");

    // load server-side setting if available
    (async () => {
      try {
        const token = getStoredToken();
        if (!token) return;
        const res = await authenticatedFetch("/api/users/settings");
        const data = await res.json();
        const serverTheme = data?.theme;
        if (serverTheme) {
          setDark(serverTheme === "dark");
          localStorage.setItem("theme", serverTheme);
          window.dispatchEvent(new Event("theme-change"));
        }
        // load global 2FA setting
        try {
          const globalRes = await fetch('/api/settings/global-2fa');
          const globalData = await globalRes.json();
          setTwoFactorGlobal(!!globalData?.twoFactorGlobal);
        } catch (e) { }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const toggle = (checked: boolean) => {
    setDark(checked);
    try {
      localStorage.setItem("theme", checked ? "dark" : "light");
      // allow the app to react to theme change by reloading or emitting an event
      window.dispatchEvent(new Event("theme-change"));
      // persist server-side
      (async () => {
        try {
          const token = getStoredToken();
          if (!token) return;
          await authenticatedFetch("/api/users/settings", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ theme: checked ? "dark" : "light" }),
          });
        } catch (e) {
          console.error(e);
        }
      })();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Settings</Typography>

      <Card>
        <CardContent>
          <Typography variant="h6">Appearance</Typography>
          <FormControlLabel
            control={<Switch checked={dark} onChange={(e) => toggle(e.target.checked)} />}
            label={dark ? "Dark mode" : "Light mode"}
          />
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Security</Typography>
            <FormControlLabel
              control={<Switch checked={twoFactorGlobal} onChange={async (e) => {
                const val = e.target.checked;
                try {
                  await fetch('/api/settings/global-2fa', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ twoFactorGlobal: val }),
                  });
                  setTwoFactorGlobal(val);
                } catch (err) { console.error(err); }
              }} />}
              label={twoFactorGlobal ? '2FA: Enabled for all users' : '2FA: Disabled for all users'}
            />
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Messaging</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Configure reusable birthday message templates with placeholder preview.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/settings/templates')}>
              Open Template Editor
            </Button>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </Box>
    </Box>
  );
}
