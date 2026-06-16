"use client";

import { useEffect, useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useRouter, useParams } from "next/navigation";
import { getClient } from "@/services/clientService";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [client, setClient] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function maskEmail(email: string | null | undefined) {
    if (!email) return "";
    const [localPart = "", domainPart = ""] = String(email).split("@");
    if (!domainPart) return "***";
    const visibleLocal = localPart.slice(0, 2);
    return `${visibleLocal}${localPart.length > 2 ? "***" : ""}@${domainPart}`;
  }

  function maskPhone(phone: string | null | undefined) {
    if (!phone) return "";
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length <= 4) return "****";
    return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  }

  useEffect(() => {
    if (!id) {
      setError("Missing id");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const data = await getClient(Number(id));
        if (data?.error) setError(data.error);
        else setClient(data);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="outlined" onClick={() => router.push('/clients')} sx={{ mb: 2 }}>Back</Button>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="outlined" onClick={() => router.push("/clients")} sx={{ mb: 2 }}>
          Back
        </Button>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!client) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="outlined" onClick={() => router.push("/clients")} sx={{ mb: 2 }}>
          Back
        </Button>
        <Typography color="error">{error || "Client not found"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button variant="outlined" onClick={() => router.push('/clients')} sx={{ mb: 2 }}>
        Back
      </Button>

      <Typography variant="h4" gutterBottom>
        Client Details
      </Typography>

      <Paper sx={{ p: 2, maxWidth: 600 }}>
        <Typography><strong>First Name:</strong> {client.firstname}</Typography>
        <Typography><strong>Last Name:</strong> {client.lastname}</Typography>
        <Typography><strong>Email:</strong> {maskEmail(client.email)}</Typography>
        <Typography><strong>Phone:</strong> {maskPhone(client.phone)}</Typography>
        <Typography><strong>Client ID:</strong> {client.clientid}</Typography>
        {/* Edit button removed as requested */}
      </Paper>
    </Box>
  );
}
