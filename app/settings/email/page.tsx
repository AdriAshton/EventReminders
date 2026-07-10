"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { authenticatedFetch, getStoredToken, getTokenPayload, isTokenExpired } from "@/lib/authClient";

type EmailProvider = "mailtrap" | "gmail";

function ProviderCard(props: {
  value: EmailProvider;
  title: string;
  description: string;
  details: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (provider: EmailProvider) => void;
}) {
  return (
    <Card
      sx={{
        flex: 1,
        border: "1px solid",
        borderColor: props.selected ? "primary.main" : "divider",
        boxShadow: props.selected ? 6 : 1,
      }}
    >
      <CardActionArea onClick={() => props.onSelect(props.value)} disabled={props.disabled}>
        <CardContent>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6">{props.title}</Typography>
            {props.selected && <Chip color="primary" label="Selected" size="small" />}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {props.description}
          </Typography>
          <Typography variant="body2">{props.details}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function EmailSettingsPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<EmailProvider>("mailtrap");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [emailFrom, setEmailFrom] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [gmailUser, setGmailUser] = useState("");
  const [gmailPass, setGmailPass] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    (async () => {
      try {
        const token = getStoredToken();
        if (!token || isTokenExpired(token)) {
          router.replace("/login");
          return;
        }

        const payload = getTokenPayload(token);
        const resolvedCompanyName = String(payload?.companyname || payload?.companyName || "").trim();
        setCompanyName(resolvedCompanyName || null);
        setTestRecipient(String(payload?.email || "").trim());

        const res = await authenticatedFetch("/api/settings/email-provider", { method: "GET" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load email provider");
          return;
        }
        setProvider(data.provider === "gmail" ? "gmail" : "mailtrap");
        setEmailFrom(data.emailfrom || "");
        setSmtpHost(data.smtp_host || "");
        setSmtpPort(data.smtp_port ? String(data.smtp_port) : "587");
        setSmtpSecure(Boolean(data.smtp_secure));
        setSmtpUser(data.smtp_user || "");
        setSmtpPass(data.smtp_pass || "");
        setGmailUser(data.gmail_user || "");
        setGmailPass(data.gmail_pass || "");
      } catch {
        setError("Failed to load email provider");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function save(nextProvider: EmailProvider) {
    setSaving(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/settings/email-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: nextProvider,
          emailfrom: emailFrom.trim(),
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort ? Number(smtpPort) : null,
          smtp_secure: smtpSecure,
          smtp_user: smtpUser.trim(),
          smtp_pass: smtpPass,
          gmail_user: gmailUser.trim(),
          gmail_pass: gmailPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save email provider");
        setToast({ open: true, message: data.error || "Failed to save email provider", severity: "error" });
        return false;
      }
      setProvider(data.provider);
      setEmailFrom(data.emailfrom || "");
      setSmtpHost(data.smtp_host || "");
      setSmtpPort(data.smtp_port ? String(data.smtp_port) : "587");
      setSmtpSecure(Boolean(data.smtp_secure));
      setSmtpUser(data.smtp_user || "");
      setSmtpPass(data.smtp_pass || "");
      setGmailUser(data.gmail_user || "");
      setGmailPass(data.gmail_pass || "");
      setToast({ open: true, message: `Email provider set to ${data.provider}`, severity: "success" });
      return true;
    } catch {
      setError("Failed to save email provider");
      setToast({ open: true, message: "Failed to save email provider", severity: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    setTestingEmail(true);
    setError(null);
    try {
      const recipient = testRecipient.trim();
      if (!recipient) {
        setToast({ open: true, message: "Enter a recipient email for the test message", severity: "error" });
        return;
      }

      const saved = await save(provider);
      if (!saved) {
        return;
      }

      const res = await authenticatedFetch("/api/settings/email-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send test email");
        setToast({ open: true, message: data.error || "Failed to send test email", severity: "error" });
        return;
      }

      setToast({ open: true, message: `Test email sent to ${recipient}`, severity: "success" });
    } catch {
      setError("Failed to send test email");
      setToast({ open: true, message: "Failed to send test email", severity: "error" });
    } finally {
      setTestingEmail(false);
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Email Provider</Typography>
        <Typography variant="body2" color="text.secondary">
          Choose which SMTP provider the app should use when sending reset, 2FA, and provisioning emails.
        </Typography>
        {companyName && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Company: {companyName}
          </Typography>
        )}
      </Box>

      <Button variant="outlined" onClick={() => router.push("/dashboard")} sx={{ mb: 3 }}>
        Back
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <ProviderCard
          value="mailtrap"
          title="Mailtrap"
          description="Use Mailtrap SMTP credentials for safe development and inbox testing."
          details="Requires SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, and EMAIL_FROM."
          selected={provider === "mailtrap"}
          disabled={loading || saving}
          onSelect={save}
        />
        <ProviderCard
          value="gmail"
          title="Gmail"
          description="Use a Gmail account or Google Workspace mailbox to send real emails through Gmail SMTP."
          details="Requires GMAIL_USER, GMAIL_PASS, and usually EMAIL_FROM matching the Gmail account."
          selected={provider === "gmail"}
          disabled={loading || saving}
          onSelect={save}
        />
      </Stack>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Company Email Credentials</Typography>
          <Stack spacing={2}>
            <TextField label="From Email" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} fullWidth />

            {provider === "mailtrap" ? (
              <>
                <TextField label="SMTP Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} fullWidth />
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField label="SMTP Port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} fullWidth />
                  <FormControlLabel control={<Switch checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />} label="Secure" />
                </Stack>
                <TextField label="SMTP User" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} fullWidth />
                <TextField label="SMTP Password" type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} fullWidth />
              </>
            ) : (
              <>
                <TextField label="Gmail / Workspace User" value={gmailUser} onChange={(e) => setGmailUser(e.target.value)} fullWidth />
                <TextField label="Gmail Password" type="password" value={gmailPass} onChange={(e) => setGmailPass(e.target.value)} fullWidth />
              </>
            )}
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 3 }}>
            <TextField
              label="Test Recipient Email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={sendTestEmail}
              disabled={loading || saving || testingEmail}
            >
              {testingEmail ? "Sending..." : "Send Test Email"}
            </Button>
          </Stack>

          <Alert severity="info" sx={{ mt: 3 }}>
            These credentials are saved per company. The selected provider determines which values the mailer uses.
          </Alert>
        </CardContent>
      </Card>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      >
        <Alert severity={toast.severity} onClose={() => setToast((current) => ({ ...current, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}