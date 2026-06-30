"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useRouter } from "next/navigation";

import {
  getReminders,
} from "@/services/reminderServices";
import { getMessages, getMessageTemplates, renderMessageTemplate } from "@/services/messageService";

export default function RemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [firstNameFilter, setFirstNameFilter] = useState<string>("");
  const [lastNameFilter, setLastNameFilter] = useState<string>("");
  const [themeColor, setThemeColor] = useState<"purple" | "red" | "green">("purple");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);

  function formatDate(value: string | Date | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  function formatDateInput(value: string | Date | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  function formatSendDateTime(scheduleDate: string | Date | null | undefined, sendTime?: string | null) {
    if (!scheduleDate) return "";

    const date = new Date(scheduleDate);
    if (Number.isNaN(date.getTime())) return String(scheduleDate);

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    const timeSource = typeof sendTime === "string" && /^\d{2}:\d{2}(?::\d{2})?$/.test(sendTime)
      ? sendTime.slice(0, 5)
      : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const [hoursPart, minutesPart] = timeSource.split(":");
    const hoursNumber = Number(hoursPart);
    const amPm = Number.isNaN(hoursNumber) ? "" : hoursNumber >= 12 ? "PM" : "AM";
    const displayHours = Number.isNaN(hoursNumber)
      ? hoursPart
      : String(((hoursNumber + 11) % 12) + 1).padStart(2, "0");
    const timeValue = `${displayHours}:${minutesPart} ${amPm}`.trim();

    return `${month}-${day}-${year} ${timeValue}`;
  }
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [activeTemplateName, setActiveTemplateName] = useState<string>("Default template");
  const [previewReminder, setPreviewReminder] = useState<any | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string>("");
  const [previewData, setPreviewData] = useState<{ subject: string; body: string; values: Record<string, string> } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editImageOpen, setEditImageOpen] = useState(false);
  const [editImageMessage, setEditImageMessage] = useState<any | null>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string>("");

  const paginationSelectedColor = {
    purple: "#5b5fe8",
    red: "#e11d48",
    green: "#16a34a",
  }[themeColor];

  function resolveThemeColor() {
    if (typeof window === "undefined") return "purple" as const;
    const stored = localStorage.getItem("themeColor") || localStorage.getItem("theme");
    if (stored === "red" || stored === "green" || stored === "purple") {
      return stored;
    }
    return "purple" as const;
  }

  useEffect(() => {
    const syncTheme = () => setThemeColor(resolveThemeColor());
    syncTheme();
    window.addEventListener("theme-change", syncTheme);
    return () => window.removeEventListener("theme-change", syncTheme);
  }, []);

  useEffect(() => {
    loadReminders(page);
  }, [page]);

  useEffect(() => {
    loadMessages();
    loadTemplates();
  }, []);

  async function loadReminders(pageParam: number = page) {
    const data = await getReminders(pageParam, pageSize);

    if (data.error) {
      setError(data.error);
    } else {
      setReminders(data.rows || []);
      setTotal(data.total || 0);
      setError(null);
    }
  }

  async function loadMessages() {
    const data = await getMessages(1, 200);
    if (!data.error) {
      setMessages(data.rows || []);
    }
  }

  async function loadTemplates() {
    const data = await getMessageTemplates();
    if (!("error" in data)) {
      setTemplates(data.templates || []);
      setActiveTemplateId(data.activeTemplateId || data.template?.id || "");
      setActiveTemplateName(data.template?.name || data.templates?.find((template: any) => template.id === (data.activeTemplateId || data.template?.id))?.name || "Default template");
      setPreviewTemplateId(data.activeTemplateId || data.template?.id || "");
    }
  }

  const textFieldProps = {
    slotProps: {
      input: {
        sx: {
          color: "#fff",
        },
      },
      inputLabel: {
        sx: {
          color: "#ccc",
        },
      },
    },
  };

  const dateTimeFieldProps = {
    slotProps: {
      ...textFieldProps.slotProps,
      inputLabel: {
        shrink: true,
        sx: {
          color: "#ccc",
        },
      },
    },
  };

  async function handlePreview(reminder: any) {
    setPreviewReminder({
      ...reminder,
      email: reminder.email || reminder.recipient_email || reminder.clientemail || reminder.client_email || "",
    });
    setPreviewOpen(true);
    setPreviewLoading(true);

    try {
      const templateId = previewTemplateId || activeTemplateId;
      const result = templateId ? await renderMessageTemplate(templateId, reminder.reminderid) : { error: "No message template selected" } as any;
      if ((result as any).error) {
        setToast({ open: true, message: (result as any).error, severity: "error" });
        setPreviewData(null);
        return;
      }

      setPreviewData({
        subject: result.subject,
        body: result.body,
        values: result.values,
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  function getReminderMessage(reminderId: number) {
    return messages.find((message) => message.reminderid === reminderId) || null;
  }

  function getReminderDefaultImageUrl(reminderId: number) {
    const message = getReminderMessage(reminderId);
    if (message?.attachmenturl || message?.attachmentUrl) {
      return message.attachmenturl || message.attachmentUrl;
    }

    const template = templates.find((item) => item.id === (previewTemplateId || activeTemplateId));
    return template?.imageUrl || "";
  }

  function getEditImageUrl() {
    if (editImagePreviewUrl) return editImagePreviewUrl;
    if (!editImageMessage) return "";
    return editImageMessage.imageUrl || editImageMessage.imageurl || getReminderDefaultImageUrl(editImageMessage.reminderid);
  }

  function openEditImage(reminder: any) {
    const message = getReminderMessage(reminder.reminderid);
    if (!message) {
      setToast({ open: true, message: "No message record found for this reminder", severity: "error" });
      return;
    }

    setEditImageMessage({
      ...message,
      imageUrl: message.attachmenturl || message.attachmentUrl || "",
      imageFileName: message.attachmentfilename || message.attachmentFileName || "",
      imageMimeType: message.attachmentmimetype || message.attachmentMimeType || "",
      messageBody: message.messagebody || message.messageBody || "",
    });
    setEditImagePreviewUrl(message.attachmenturl || message.attachmentUrl || getReminderDefaultImageUrl(reminder.reminderid));
    setEditImageOpen(true);
  }

  return (
    <Box sx={{ p: 3 }}>
    
      <Typography variant="h4" gutterBottom>
        Reminders
      </Typography>

      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        This screen shows the birthday reminder schedule and the associated message draft, including channel, template, and attachments.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Button variant="outlined" onClick={() => router.push("/dashboard")}>Back</Button>
      </Box>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'nowrap' }}>
        <FormControl size="small" sx={{ minWidth: 96, flexShrink: 0 }}>
          <InputLabel id="rows-per-page-label">Rows</InputLabel>
          <Select
            labelId="rows-per-page-label"
            value={pageSize}
            label="Rows"
            onChange={(e) => {
              const v = Number(e.target.value);
              setPageSize(v);
              setPage(1);
              loadReminders(1);
            }}
            sx={{ color: '#000', backgroundColor: '#fff' }}
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', flex: 1, minWidth: 0 }}>
          <FormControl size="small" sx={{ minWidth: 160, flexShrink: 0 }}>
            <InputLabel id="reminders-first-name-filter">First Name</InputLabel>
            <Select
              labelId="reminders-first-name-filter"
              value={firstNameFilter}
              label="First Name"
              onChange={(e) => setFirstNameFilter(String(e.target.value))}
              sx={{ color: '#000', backgroundColor: '#fff' }}
            >
              <MenuItem value="">All</MenuItem>
              {[...new Set(reminders.map((r) => r.firstname).filter(Boolean))].map((name) => (
                <MenuItem key={String(name)} value={String(name)}>{String(name)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160, flexShrink: 0 }}>
            <InputLabel id="reminders-last-name-filter">Last Name</InputLabel>
            <Select
              labelId="reminders-last-name-filter"
              value={lastNameFilter}
              label="Last Name"
              onChange={(e) => setLastNameFilter(String(e.target.value))}
              sx={{ color: '#000', backgroundColor: '#fff' }}
            >
              <MenuItem value="">All</MenuItem>
              {[...new Set(reminders.map((r) => r.lastname).filter(Boolean))].map((name) => (
                <MenuItem key={String(name)} value={String(name)}>{String(name)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Pagination
          count={Math.max(1, Math.ceil(total / pageSize))}
          page={page}
          onChange={(_, value) => {
            setPage(value);
            loadReminders(value);
          }}
          sx={{
            '& .MuiPagination-ul': {
              gap: 0.5,
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(17,24,39,0.12)',
              borderRadius: 999,
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
              px: 1,
              py: 0.75,
            },
            '& .MuiPaginationItem-root': {
              color: '#1f2937',
              fontWeight: 700,
            },
            '& .MuiPaginationItem-previousNext, & .MuiPaginationItem-icon': {
              color: '#1f2937',
            },
            '& .Mui-selected': {
              backgroundColor: `${paginationSelectedColor} !important`,
              color: '#fff !important',
            },
          }}
          showFirstButton
          showLastButton
        />
      </Box>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < reminders.length}
                  checked={reminders.length > 0 && selectedIds.length === reminders.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(reminders.map((r) => r.reminderid));
                    else setSelectedIds([]);
                  }}
                />
              </TableCell>
              <TableCell>Client Name</TableCell>
              <TableCell>Birthday Date</TableCell>
              <TableCell>Schedule Date</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {reminders
              .filter((r) => (firstNameFilter === "" ? true : String(r.firstname || "") === firstNameFilter))
              .filter((r) => (lastNameFilter === "" ? true : String(r.lastname || "") === lastNameFilter))
              .map((reminder) => (
              <TableRow
                key={reminder.reminderid}
                hover
                selected={editingReminder?.reminderid === reminder.reminderid}
                onDoubleClick={() => handlePreview(reminder)}
                sx={{
                  cursor: "pointer",
                  "&.Mui-selected": {
                    backgroundColor: "#1e88e5",
                    color: "#fff",
                  },
                }}
              >
                <TableCell padding="checkbox" onClick={(e)=>e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(reminder.reminderid)}
                    onChange={(e)=>{
                      const checked = e.target.checked;
                      setSelectedIds((prev)=> checked ? [...prev, reminder.reminderid] : prev.filter(id=>id!==reminder.reminderid));
                    }}
                  />
                </TableCell>
                <TableCell>{[reminder.firstname, reminder.lastname].filter(Boolean).join(" ") || `Client ${reminder.clientid}`}</TableCell>
                <TableCell>{formatDate(reminder.birthdate)}</TableCell>
                <TableCell>{formatSendDateTime(reminder.nextrunat, reminder.sendtime)}</TableCell>
                <TableCell>{getReminderMessage(reminder.reminderid)?.channel || "Email"}</TableCell>
                <TableCell>{reminder.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Message Preview</DialogTitle>
        <DialogContent>
          {previewLoading ? (
            <Typography>Loading preview...</Typography>
          ) : previewReminder ? (
            <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Reminder</Typography>
                <Typography><strong>Client ID:</strong> {previewReminder.clientid}</Typography>
                <Typography><strong>Recipient Email:</strong> {previewReminder.email || "No email on file"}</Typography>
                <Typography><strong>Birthday Date:</strong> {formatDate(previewReminder.birthdate)}</Typography>
                <Typography><strong>Schedule Date:</strong> {formatSendDateTime(previewReminder.nextrunat, previewReminder.sendtime)}</Typography>
                <Typography><strong>Channel:</strong> {getReminderMessage(previewReminder.reminderid)?.channel || "Email"}</Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Template Output</Typography>
                <Typography sx={{ mb: 1 }}><strong>Subject:</strong> {previewData?.subject || "No preview available"}</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{previewData?.body || "Select a message template to preview the message."}</Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Message Draft</Typography>
                <Typography><strong>Template:</strong> {previewTemplateId || activeTemplateId || "Default template"}</Typography>
                <Typography><strong>Template Image:</strong> {getReminderMessage(previewReminder.reminderid)?.attachmentfilename || "Default template image"}</Typography>
                <Typography><strong>Status:</strong> {getReminderMessage(previewReminder.reminderid)?.status || "Draft"}</Typography>
                <Button sx={{ mt: 1 }} variant="outlined" onClick={() => openEditImage(previewReminder)}>
                  View Image
                </Button>
              </Paper>
            </Box>
          ) : (
            <Typography>No preview available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editImageOpen} onClose={() => setEditImageOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>View Reminder Image</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            View the default template image used by this reminder.
          </Typography>
          {editImageMessage && getEditImageUrl() && (
            <Box sx={{ mb: 2 }}>
              <Box
                component="img"
                src={getEditImageUrl()}
                alt="Current reminder image"
                sx={{ width: "100%", maxWidth: 360, height: "auto", borderRadius: 2, border: "1px solid rgba(0,0,0,0.12)" }}
              />
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            {editImageMessage?.attachmentfilename || "No default image selected yet"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditImageOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Reminder Delivery</Typography>
        <Typography variant="body2" color="text.secondary">
          Birthday reminders are created automatically when a client is added. The send time and channel are global settings managed from Setup/Security via Reminder Delivery.
        </Typography>
      </Paper>
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
