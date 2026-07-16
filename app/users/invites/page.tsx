"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { getStoredToken, isTokenExpired, getTokenPayload } from "@/lib/authClient";
import { getCompanyInvites, sendCompanyInvite, type CompanyInviteRecord, type CompanyInviteResponse } from "@/services/companyInviteService";

const ROLE_OPTIONS = [
  { roleid: 1, rolename: "Administrator" },
  { roleid: 2, rolename: "Staff" },
];

function resolveRoleName(roleid: unknown) {
  const numericRoleId = Number(roleid);
  return ROLE_OPTIONS.find((role) => role.roleid === numericRoleId)?.rolename || `Role ${String(roleid || "")}`;
}

export default function InvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleid, setRoleid] = useState("2");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<CompanyInviteRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  const pendingCount = invites.filter((invite) => String(invite.status || "").toLowerCase() === "pending").length;
  const acceptedCount = invites.filter((invite) => String(invite.status || "").toLowerCase() === "accepted").length;

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

    const payload = getTokenPayload(token);
    const resolvedCompanyId = Number(payload?.companyid);
    if (!Number.isFinite(resolvedCompanyId) || resolvedCompanyId <= 0) {
      setError("Unable to determine your company ID from the current session");
      return;
    }

    setCompanyId(resolvedCompanyId);

    void loadInvites();
  }, [mounted, router]);

  async function loadInvites() {
    const data = (await getCompanyInvites()) as CompanyInviteResponse;
    if (data.error) {
      setError(data.error);
      return;
    }
    setInvites(data.invites || []);
  }

  async function handleSendInvite() {
    setError("");
    setStatus("");

    if (!companyId || !email.trim() || !roleid.trim()) {
      setError("Email and role are required");
      return;
    }

    const res = await sendCompanyInvite({
      companyid: companyId,
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
    <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Send Company Invite
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Invite teammates and track invite status in one place.
        </Typography>
        <Button variant="outlined" onClick={() => router.push("/dashboard")}>
          Back
        </Button>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1.4fr 0.6fr" }, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>New Invite</Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(220px, 1fr)" } }}>
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

            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleSendInvite}>
                Send Invite
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Overview</Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Total Invites</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{invites.length}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Pending</Typography>
                <Chip size="small" label={pendingCount} color="warning" variant="outlined" />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Accepted</Typography>
                <Chip size="small" label={acceptedCount} color="success" variant="outlined" />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Invites
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Latest invites for your company.
          </Typography>

          {invites.length === 0 ? (
            <Typography color="text.secondary">No invites yet.</Typography>
          ) : (
            <Stack divider={<Divider flexItem />}>
              {invites.map((invite) => {
                const statusValue = String(invite.status || "").toLowerCase();
                const chipColor = statusValue === "accepted"
                  ? "success"
                  : statusValue === "pending"
                    ? "warning"
                    : "default";

                return (
                  <Box key={invite.inviteid} sx={{ py: 1.5 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 1 }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {invite.email}
                      </Typography>
                      <Chip size="small" label={invite.status} color={chipColor} variant="outlined" />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Company: {invite.companyname || `Company ${invite.companyid}`} | Role: {resolveRoleName(invite.roleid)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                      Invite Token: {invite.token}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

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