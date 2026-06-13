"use client";

import { useEffect, useState } from "react";
import { Box, Button, Typography, Paper, Snackbar, Alert } from "@mui/material";
import { useRouter, useParams } from "next/navigation";
import { getMessage } from "@/services/messageService";

export default function MessageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [message, setMessage] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (!id) {
      setError("Missing id");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const data = await getMessage(Number(id));
        if (data?.error) {
          setError(data.error);
        } else {
          setMessage(data);
        }
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="outlined" onClick={() => router.push("/messages")} sx={{ mb: 2 }}>
          Back
        </Button>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (error || !message) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="outlined" onClick={() => router.push("/messages")} sx={{ mb: 2 }}>
          Back
        </Button>
        <Typography color="error">{error || "Message not found"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button variant="outlined" onClick={() => router.push("/messages")} sx={{ mb: 2 }}>
        Back
      </Button>
      <Typography variant="h4" gutterBottom>
        Message Details
      </Typography>
      <Paper sx={{ p: 2, maxWidth: 700 }}>
        <Typography><strong>Message ID:</strong> {message.messageid}</Typography>
        <Typography><strong>Reminder ID:</strong> {message.reminderid}</Typography>
        <Typography><strong>Channel:</strong> {message.channel}</Typography>
        <Typography><strong>Subject:</strong> {message.subject || "-"}</Typography>
        <Typography><strong>Message Body:</strong> {message.messagebody}</Typography>
        <Typography><strong>Attachment URL:</strong> {message.attachmenturl || "-"}</Typography>
        <Typography><strong>Attachment File Name:</strong> {message.attachmentfilename || "-"}</Typography>
        <Typography><strong>Attachment Mime Type:</strong> {message.attachmentmimetype || "-"}</Typography>
        {message.attachmenturl ? (
          <Box sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <Box component="img" src={message.attachmenturl} alt={message.attachmentfilename || "attachment"} sx={{ maxWidth: 360, maxHeight: 360, borderRadius: 1, border: "1px solid rgba(0,0,0,0.08)" }} />
            <Box>
              <Button
                onClick={() => {
                  const full = (typeof window !== "undefined" ? window.location.origin : "") + message.attachmenturl;
                  window.open(full, "_blank");
                }}
                sx={{ mr: 1 }}
              >
                Open Image
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const full = (typeof window !== "undefined" ? window.location.origin : "") + message.attachmenturl;
                    await navigator.clipboard.writeText(full);
                    setToast({ open: true, message: "Image URL copied to clipboard", severity: "success" });
                  } catch (e) {
                    setToast({ open: true, message: "Failed to copy URL", severity: "error" });
                  }
                }}
              >
                Copy URL
              </Button>
            </Box>
          </Box>
        ) : null}
        <Typography><strong>Status:</strong> {message.status}</Typography>
        <Typography><strong>Sent At:</strong> {message.sentat || "-"}</Typography>
      </Paper>
    </Box>
  );
}
