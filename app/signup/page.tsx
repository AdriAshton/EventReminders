"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { signup, type SignupResponse } from "@/services/auth";

function SignupContent() {
  const searchParams = useSearchParams();
  const invite = searchParams?.get("invite") || "";
  const [email, setEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInviteFlow = Boolean(invite);

  useEffect(() => {
    if (isInviteFlow) {
      setMessage((current) => current || "Invite detected. Complete your account to join the company.");
      if (invite) {
        void (async () => {
          try {
            const res = await fetch(`/api/company-invites?invite=${encodeURIComponent(invite)}`);
            const data = await res.json();
            const inviteRecord = Array.isArray(data) ? data.find((entry) => String(entry?.token || "") === invite) : null;
            if (inviteRecord?.email) {
              const resolvedEmail = String(inviteRecord.email).trim();
              setInviteEmail(resolvedEmail);
              setEmail(resolvedEmail);
            }
          } catch {
            // Leave the field editable if the invite lookup fails.
          }
        })();
      }
      return;
    }
    setMessage((current) => current || "Create your company and become the first administrator.");
  }, [isInviteFlow]);

  async function handleSubmit() {
    setError("");
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    if (!isInviteFlow && !username.trim()) {
      setError("Username is required when creating a new company");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isInviteFlow) {
        const res = await fetch("/api/company-invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inviteToken: invite,
            email: email.trim(),
            password,
          }),
        });

        const data = (await res.json()) as SignupResponse;
        if (!res.ok) {
          throw new Error(data.error || "Failed to accept invite");
        }

        setMessage(data?.message || "Invite accepted successfully");
        window.location.assign("/dashboard");
        return;
      }

      const result = await signup(
        username.trim(),
        email.trim(),
        password
      );
      setMessage(result?.message || "Account created successfully");
      window.location.assign("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 6, px: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 520 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Company Onboarding
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {message}
          </Typography>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {!isInviteFlow && (
            <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth margin="normal" />
          )}
          <TextField
            label="Email"
            value={isInviteFlow ? inviteEmail : email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            slotProps={isInviteFlow ? { htmlInput: { readOnly: true } } : undefined}
          />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth margin="normal" />
          {!isInviteFlow && (
            <TextField label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} fullWidth margin="normal" />
          )}
          <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}