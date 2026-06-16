"use client";

import { useEffect, useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useRouter, useParams } from "next/navigation";
import { getEvent } from "@/services/eventService";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [event, setEvent] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function formatDate(value: string | Date | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
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
        const data = await getEvent(Number(id));
        if (data?.error) setError(data.error);
        else setEvent(data);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <Box sx={{ p: 3 }}>
      <Button variant="outlined" onClick={() => router.push('/events')} sx={{ mb: 2 }}>Back</Button>
      <Typography>Loading...</Typography>
    </Box>
  );

  if (error || !event) return (
    <Box sx={{ p: 3 }}>
      <Button variant="outlined" onClick={() => router.push('/events')} sx={{ mb: 2 }}>Back</Button>
      <Typography color="error">{error || 'Event not found'}</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Button variant="outlined" onClick={() => router.push('/events')} sx={{ mb: 2 }}>Back</Button>
      <Typography variant="h4" gutterBottom>Event Details</Typography>
      <Paper sx={{ p: 2, maxWidth: 600 }}>
        <Typography><strong>Type:</strong> {event.eventtype}</Typography>
        <Typography><strong>Date:</strong> {formatDate(event.eventdate)}</Typography>
        <Typography><strong>Event ID:</strong> {event.eventid}</Typography>
      </Paper>
    </Box>
  );
}
