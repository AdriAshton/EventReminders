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
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/email-provider");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load email provider");
          return;
        }
        setProvider(data.provider === "gmail" ? "gmail" : "mailtrap");
      } catch {
        setError("Failed to load email provider");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(nextProvider: EmailProvider) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/email-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: nextProvider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save email provider");
        setToast({ open: true, message: data.error || "Failed to save email provider", severity: "error" });
        return;
      }
      setProvider(data.provider);
      setToast({ open: true, message: `Email provider set to ${data.provider}`, severity: "success" });
    } catch {
      setError("Failed to save email provider");
      setToast({ open: true, message: "Failed to save email provider", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" sx={{ mb: 3, justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4">Email Provider</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose which SMTP provider the app should use when sending reset, 2FA, and provisioning emails.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => router.push("/settings")}>Back to Settings</Button>
      </Stack>

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

      <Alert severity="info" sx={{ mt: 3 }}>
        This screen only selects the provider. Credentials still come from environment variables on the server.
      </Alert>

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