"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { authenticatedFetch, getStoredToken, isTokenExpired, getTokenPayload } from "@/lib/authClient";
import { getCompanyInvites, sendCompanyInvite, type CompanyInviteRecord, type CompanyInviteResponse } from "@/services/companyInviteService";
import { getCompanies } from "@/services/CompanyService";

const ROLE_OPTIONS = [
  { roleid: 1, rolename: "Administrator" },
  { roleid: 2, rolename: "Staff" },
];

function resolveRoleName(roleid: unknown) {
  const numericRoleId = Number(roleid);
  return ROLE_OPTIONS.find((role) => role.roleid === numericRoleId)?.rolename || `Role ${String(roleid || "")}`;
}

function formatInviteDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function resolveInvitedBy(invite: CompanyInviteRecord) {
  return invite.invitedbyname || "-";
}

export default function InvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleid, setRoleid] = useState("2");
  const [companyid, setCompanyid] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<CompanyInviteRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [companyOptions, setCompanyOptions] = useState<Array<{ companyid: number; companyname: string }>>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<number | null>(null);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      setError("Your session is missing or expired. Please log in again.");
      return;
    }

    const payload = getTokenPayload(token);
    const resolvedUserId = Number(payload?.userid || 0);
    const resolvedCompanyId = Number(payload?.companyid || 0);
    const resolvedRole = String(payload?.role || "").toLowerCase();
    if (!Number.isFinite(resolvedUserId) || resolvedUserId <= 0) {
      setError("Session token is missing a valid user ID. Please log in again.");
      return;
    }

    if (!Number.isFinite(resolvedCompanyId) || resolvedCompanyId <= 0) {
      setError("Session token is missing a valid company ID. Please log in again.");
      return;
    }

    const ownerRole = resolvedRole === "owner";
    setIsOwner(ownerRole);
    setResolvedCompanyId(resolvedCompanyId);
    setCompanyid(String(resolvedCompanyId));
    setFetchState("loading");
    void loadCompanies(ownerRole, resolvedCompanyId, resolvedUserId, payload);
    void loadInvites();
  }, [mounted]);

  async function loadCompanies(
    ownerRole: boolean,
    fallbackCompanyId: number,
    userId: number,
    payload: Record<string, unknown> | null,
  ) {
    try {
      if (ownerRole) {
        const data = await getCompanies();
        if (data.error) {
          setError(data.error);
          return;
        }

        const options = Array.isArray(data) ? data : [];
        setCompanyOptions(
          options
            .map((company: any) => ({
              companyid: Number(company?.companyid),
              companyname: String(company?.companyname || "").trim(),
            }))
            .filter((company) => Number.isFinite(company.companyid) && company.companyid > 0 && company.companyname)
        );

        const selectedCompany = options.find((company: any) => Number(company?.companyid) === fallbackCompanyId);

        return;
      }

      const response = await authenticatedFetch(`/api/companies?current=1&userid=${encodeURIComponent(String(userId))}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to load current company");
        return;
      }

      const companyName = String(data?.companyname || payload?.companyname || payload?.company || "").trim();
      setCompanyOptions([{ companyid: Number(data?.companyid || fallbackCompanyId), companyname: companyName }]);
      setCompanyid(String(Number(data?.companyid || fallbackCompanyId) || fallbackCompanyId));
    } catch {
      setError("Failed to load current company");
    }
  }

  async function loadInvites() {
    const data = (await getCompanyInvites()) as CompanyInviteResponse;
    if (data.error) {
      setError(data.error);
      setFetchState("error");
      return;
    }
    setInvites(data.invites || []);
    setFetchState("loaded");
  }

  async function handleSendInvite() {
    setError("");
    setStatus("");

    const resolvedCompanyId = Number(companyid);
    if (!resolvedCompanyId || !email.trim() || !roleid.trim()) {
      setError("Company, email and role are required");
      return;
    }

    const res = await sendCompanyInvite({
      companyid: resolvedCompanyId,
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

      <Box sx={{ mb: 3 }}>
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
              <FormControl fullWidth variant="outlined">
                <InputLabel id="company-select-label">Company</InputLabel>
                <Select
                  labelId="company-select-label"
                  label="Company"
                  value={companyid}
                  disabled={!isOwner}
                  onChange={(e) => setCompanyid(String(e.target.value))}
                  sx={{
                    "& .MuiSelect-select": {
                      py: 1.7,
                      minHeight: "1.4375em",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                  renderValue={(selected) => {
                    const selectedId = Number(selected);
                    const selectedCompany = companyOptions.find((company) => company.companyid === selectedId);
                    return <span style={{ display: "block", lineHeight: 1.5 }}>{selectedCompany?.companyname || "Loading company..."}</span>;
                  }}
                >
                  {companyOptions.map((company) => (
                    <MenuItem key={company.companyid} value={String(company.companyid)}>
                      {company.companyname}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
      </Box>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Invites
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Loaded invites: {invites.length}
          </Typography>

          <TableContainer sx={{ borderRadius: 2, border: 1, borderColor: "divider" }}>
            <Table size="small" aria-label="recent invites table">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Invited At</TableCell>
                  <TableCell>Accepted At</TableCell>
                  <TableCell>Role Name</TableCell>
                  <TableCell>Invited By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ color: "text.secondary" }}>
                      No invite rows loaded for this company.
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => {
                    const statusValue = String(invite.status || "").toLowerCase();
                    const chipColor = statusValue === "accepted"
                      ? "success"
                      : statusValue === "pending"
                        ? "warning"
                        : "default";

                    return (
                      <TableRow key={invite.inviteid} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{invite.email}</TableCell>
                        <TableCell>
                          <Chip size="small" label={invite.status || "Unknown"} color={chipColor} variant="outlined" />
                        </TableCell>
                        <TableCell>{formatInviteDate(invite.invitedat)}</TableCell>
                        <TableCell>{formatInviteDate(invite.acceptedat)}</TableCell>
                        <TableCell>{invite.rolename || resolveRoleName(invite.roleid)}</TableCell>
                        <TableCell>{resolveInvitedBy(invite)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
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