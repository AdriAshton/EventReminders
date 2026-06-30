"use client";

import { useEffect, useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useRouter, useParams } from "next/navigation";
import { getReminder } from "@/services/reminderServices";

export default function ReminderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [reminder, setReminder] = useState<any | null>(null);
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
        const data = await getReminder(Number(id));
        if (data?.error) setError(data.error);
        else setReminder(data);
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
      <Button variant="outlined" onClick={() => router.push('/reminders')} sx={{ mb: 2 }}>Back</Button>
      <Typography>Loading...</Typography>
    </Box>
  );

  if (error || !reminder) return (
    <Box sx={{ p: 3 }}>
      <Button variant="outlined" onClick={() => router.push('/reminders')} sx={{ mb: 2 }}>Back</Button>
      <Typography color="error">{error || 'Reminder not found'}</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Button variant="outlined" onClick={() => router.push('/reminders')} sx={{ mb: 2 }}>Back</Button>
      <Typography variant="h4" gutterBottom>Reminder Details</Typography>
      <Paper sx={{ p: 2, maxWidth: 600 }}>
        <Typography><strong>Client ID:</strong> {reminder.clientid}</Typography>
        <Typography><strong>Company ID:</strong> {reminder.companyid}</Typography>
        <Typography><strong>Time:</strong> {formatDate(reminder.reminderdatetime)}</Typography>
        <Typography><strong>Method:</strong> {reminder.remindermethod}</Typography>
        <Typography><strong>Status:</strong> {reminder.status}</Typography>
        <Typography><strong>Reminder ID:</strong> {reminder.reminderid}</Typography>
      </Paper>
    </Box>
  );
}
