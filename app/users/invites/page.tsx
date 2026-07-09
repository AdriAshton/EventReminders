"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { getStoredToken, isTokenExpired } from "@/lib/authClient";
import { getCompanyInvites, sendCompanyInvite } from "@/services/companyInviteService";

const ROLE_OPTIONS = [
  { roleid: 1, rolename: "Administrator" },
  { roleid: 2, rolename: "Staff" },
];

export default function InvitePage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("1");
  const [email, setEmail] = useState("");
  const [roleid, setRoleid] = useState("2");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      router.replace("/login");
      return;
    }

    loadInvites();
  }, [mounted, router]);

  async function loadInvites() {
    const data = await getCompanyInvites();
    if (data.error) {
      setError(data.error);
      return;
    }
    setInvites(Array.isArray(data) ? data : []);
  }

  async function handleSendInvite() {
    setError("");
    setStatus("");

    if (!companyId.trim() || !email.trim() || !roleid.trim()) {
      setError("Company, email, and role are required");
      return;
    }

    const res = await sendCompanyInvite({
      companyid: Number(companyId),
      email: email.trim(),
      roleid: Number(roleid),
    });

    if (res.error) {
      setError(res.error);
      return;
    }

    setStatus(`Invite sent to ${email.trim()}`);
    setEmail("");
    await loadInvites();
  }

  return (
    <Box sx={{ p: 3, maxWidth: 980, mx: "auto" }}>
      <Button variant="outlined" onClick={() => router.push("/users")} sx={{ mb: 2 }}>
        Back to Users
      </Button>

      <Typography variant="h4" gutterBottom>
        Send Company Invite
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            <TextField
              label="Company ID"
              type="number"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              fullWidth
            />
            <TextField
              label="Invite Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={roleid}
              onChange={(e) => setRoleid(e.target.value)}
              fullWidth
            >
              {ROLE_OPTIONS.map((role) => (
                <MenuItem key={role.roleid} value={String(role.roleid)}>
                  {role.rolename}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          <Button variant="contained" onClick={handleSendInvite} sx={{ mt: 2 }}>
            Send Invite
          </Button>
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom>
        Recent Invites
      </Typography>
      <Box sx={{ display: "grid", gap: 2 }}>
        {invites.map((invite) => (
          <Card key={invite.inviteid}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {invite.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Company ID: {invite.companyid} | Role ID: {invite.roleid} | Status: {invite.status}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Invite Token: {invite.token}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Snackbar
        open={Boolean(status)}
        autoHideDuration={3000}
        onClose={() => setStatus("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setStatus("")} sx={{ width: "100%" }}>
          {status}
        </Alert>
      </Snackbar>
    </Box>
  );
}