"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Divider,
  MenuItem,
  Pagination,
  Paper,
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
  FormControl,
  InputLabel,
} from "@mui/material";
import { useRouter } from "next/navigation";

import {
  addMessage,
  deleteMessage,
  getMessageTemplates,
  getMessages,
  renderMessageTemplate,
  uploadMessageImage,
  updateMessage,
  type MessageTemplate,
} from "@/services/messageService";

export default function MessagesPage() {
  const router = useRouter();
  const newPictureInputRef = useRef<HTMLInputElement | null>(null);
  const editPictureInputRef = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templatePreview, setTemplatePreview] = useState<{ subject: string; body: string; values: Record<string, string> } | null>(null);
  const [renderingTemplate, setRenderingTemplate] = useState(false);
  const [pkFilter, setPkFilter] = useState<number | string>("");
  const [fkFilter, setFkFilter] = useState<number | string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [newMessage, setNewMessage] = useState({
    reminderId: 1,
    companyId: 1,
    channel: "Email",
    subject: "",
    messageBody: "",
    attachmentUrl: "",
    attachmentFileName: "",
    attachmentMimeType: "",
    status: "Draft",
    sentAt: "",
  });
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingMode, setUploadingMode] = useState<"new" | "edit" | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    loadMessages(page);
  }, [page]);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadMessages(pageParam: number = page) {
    const data = await getMessages(pageParam, pageSize);
    if (data.error) {
      setError(data.error);
    } else {
      setMessages(data.rows || []);
      setTotal(data.total || 0);
      setError(null);
    }
  }

  async function loadTemplates() {
    const data = await getMessageTemplates();
    if ("error" in data) {
      setError(data.error);
      return;
    }

    setTemplates(data.templates || []);
    setSelectedTemplateId(data.activeTemplateId || data.template?.id || "");
  }

  async function handlePreviewTemplate() {
    if (!newMessage.reminderId) {
      setToast({ open: true, message: "Enter a reminder id first", severity: "error" });
      return;
    }

    setRenderingTemplate(true);
    const result = await renderMessageTemplate(selectedTemplateId, newMessage.reminderId);
    setRenderingTemplate(false);

    if ("error" in result) {
      setToast({ open: true, message: result.error, severity: "error" });
      return;
    }

    setTemplatePreview({
      subject: result.subject,
      body: result.body,
      values: result.values,
    });
    setNewMessage((currentMessage) => ({
      ...currentMessage,
      subject: result.subject,
      messageBody: result.body,
    }));
    setToast({ open: true, message: "Template preview applied", severity: "success" });
  }

  async function handleAdd() {
    const res = await addMessage({
      ...newMessage,
      sentAt: newMessage.sentAt || null,
    });
    if (res.error) {
      setError(res.error);
    } else {
      await loadMessages();
      setNewMessage({
        reminderId: 1,
        companyId: 1,
        channel: "Email",
        subject: "",
        messageBody: "",
        attachmentUrl: "",
        attachmentFileName: "",
        attachmentMimeType: "",
        status: "Draft",
        sentAt: "",
      });
      setToast({ open: true, message: "Message created successfully", severity: "success" });
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteMessage(id);
    if (res.error) {
      setError(res.error);
    } else {
      await loadMessages();
      setToast({ open: true, message: "Message deleted successfully", severity: "success" });
    }
  }

  async function handleUpdate() {
    if (!editingMessage) return;
    const res = await updateMessage({
      ...editingMessage,
      sentAt: editingMessage.sentAt || null,
    });
    if (res.error) {
      setError(res.error);
    } else {
      await loadMessages();
      setEditingMessage(null);
      setToast({ open: true, message: "Message updated successfully", severity: "success" });
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

  async function handlePictureSelected(event: ChangeEvent<HTMLInputElement>, mode: "new" | "edit") {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToast({ open: true, message: "Please choose an image file", severity: "error" });
      event.target.value = "";
      return;
    }

    try {
      setUploadingMode(mode);
      const result = await uploadMessageImage(file);
      if (result.error) {
        setToast({ open: true, message: result.error, severity: "error" });
        return;
      }

      const attachmentUrl = result.url;
      if (mode === "new") {
        setNewMessage((currentMessage) => ({
          ...currentMessage,
          attachmentUrl,
          attachmentFileName: result.fileName || file.name,
          attachmentMimeType: result.mimeType || file.type,
        }));
      } else {
        setEditingMessage((currentMessage: any) =>
          currentMessage
            ? {
                ...currentMessage,
                attachmentUrl,
                attachmenturl: attachmentUrl,
                attachmentFileName: result.fileName || file.name,
                attachmentfilename: result.fileName || file.name,
                attachmentMimeType: result.mimeType || file.type,
                attachmentmimetype: result.mimeType || file.type,
              }
            : currentMessage,
        );
      }
      setToast({ open: true, message: "Picture attached successfully", severity: "success" });
    } catch {
      setToast({ open: true, message: "Failed to load picture", severity: "error" });
    } finally {
      setUploadingMode(null);
    }

    event.target.value = "";
  }

  function renderImagePreview(imageUrl: string, altText: string) {
    if (!imageUrl) return null;

    return (
      <Box
        component="img"
        src={imageUrl}
        alt={altText}
        sx={{
          width: 96,
          height: 96,
          objectFit: "cover",
          borderRadius: 2,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      />
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ mb: 0.5 }}>Messages</Typography>
              <Typography variant="body2" color="text.secondary">Manage message drafts, channels, attachments, and template previews.</Typography>
            </Box>
            <Button variant="outlined" onClick={() => router.push("/dashboard")}>Back</Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: 'wrap', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="messages-rows-per-page-label">Rows</InputLabel>
          <Select
            labelId="messages-rows-per-page-label"
            value={pageSize}
            label="Rows"
            onChange={(e) => {
              const value = Number(e.target.value);
              setPageSize(value);
              setPage(1);
              loadMessages(1);
            }}
            sx={{ color: "#000", backgroundColor: "#fff" }}
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="messages-pk-filter">Primary Key</InputLabel>
            <Select labelId="messages-pk-filter" value={pkFilter} label="Primary Key" onChange={(e)=>{const v = e.target.value as unknown as string; setPkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
              <MenuItem value="">All</MenuItem>
              {messages.map(m => <MenuItem key={m.messageid} value={m.messageid}>{String(m.messageid)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="messages-fk-filter">Foreign Key (companyId)</InputLabel>
            <Select labelId="messages-fk-filter" value={fkFilter} label="Foreign Key (companyId)" onChange={(e)=>{const v = e.target.value as unknown as string; setFkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
              <MenuItem value="">All</MenuItem>
              {[...new Set(messages.map(m => m.companyid))].map(cid => <MenuItem key={cid} value={cid}>{String(cid)}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Pagination
          count={Math.max(1, Math.ceil(total / pageSize))}
          page={page}
          onChange={(_, value) => {
            setPage(value);
            loadMessages(value);
          }}
          sx={{
            "& .MuiPaginationItem-root": { color: "#000", backgroundColor: "#fff" },
            "& .Mui-selected": { backgroundColor: "#1976d2 !important", color: "#fff" },
            boxShadow: 1,
            borderRadius: 1,
          }}
          showFirstButton
          showLastButton
        />
      </Box>
        </CardContent>
      </Card>

      <Divider sx={{ my: 2 }} />

      <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reminder ID</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Message Body</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages
              .filter((m) => (pkFilter === "" ? true : m.messageid === pkFilter))
              .filter((m) => (fkFilter === "" ? true : m.companyid === fkFilter))
              .map((message) => (
              <TableRow
                key={message.messageid}
                hover
                selected={editingMessage?.messageid === message.messageid}
                onClick={() => router.push(`/messages/${message.messageid}`)}
                sx={{
                  cursor: "pointer",
                  "&.Mui-selected": {
                    backgroundColor: "#1e88e5",
                    color: "#fff",
                  },
                }}
              >
                <TableCell>{message.reminderid}</TableCell>
                <TableCell>{message.channel}</TableCell>
                <TableCell>{message.subject}</TableCell>
                <TableCell>{message.messagebody}</TableCell>
                <TableCell>{message.status}</TableCell>
                <TableCell align="right">
                  <Button
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm("Are you sure you want to delete this message?")) {
                        return;
                      }
                      handleDelete(message.messageid);
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMessage(message);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/messages/${message.messageid}`);
                    }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" gutterBottom>
        Add Message
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <TextField
          label="Reminder ID"
          type="number"
          value={newMessage.reminderId}
          onChange={(e) => {
            setTemplatePreview(null);
            setNewMessage({ ...newMessage, reminderId: Number(e.target.value) });
          }}
          {...textFieldProps}
        />
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel id="new-message-template-label">Template</InputLabel>
          <Select
            labelId="new-message-template-label"
            value={selectedTemplateId}
            label="Template"
            onChange={(e) => {
              setTemplatePreview(null);
              setSelectedTemplateId(String(e.target.value));
            }}
            sx={{ color: "#fff" }}
          >
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={handlePreviewTemplate} disabled={renderingTemplate || !selectedTemplateId}>
          {renderingTemplate ? "Previewing..." : "Preview With Client Data"}
        </Button>
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel id="new-message-channel-label">Channel</InputLabel>
          <Select
            labelId="new-message-channel-label"
            value={newMessage.channel}
            label="Channel"
            onChange={(e) => setNewMessage({ ...newMessage, channel: String(e.target.value) })}
            sx={{ color: "#fff" }}
          >
            <MenuItem value="Email">Email</MenuItem>
            <MenuItem value="WhatsApp">WhatsApp</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Subject"
          value={newMessage.subject}
          onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
          {...textFieldProps}
        />
        <TextField
          label="Message Body"
          value={newMessage.messageBody}
          onChange={(e) => setNewMessage({ ...newMessage, messageBody: e.target.value })}
          {...textFieldProps}
        />
        <TextField
          label="Attachment URL"
          value={newMessage.attachmentUrl}
          onChange={(e) => setNewMessage({ ...newMessage, attachmentUrl: e.target.value })}
          {...textFieldProps}
        />
        <TextField
          label="Attachment File Name"
          value={newMessage.attachmentFileName}
          onChange={(e) => setNewMessage({ ...newMessage, attachmentFileName: e.target.value })}
          {...textFieldProps}
        />
        <TextField
          label="Attachment Mime Type"
          value={newMessage.attachmentMimeType}
          onChange={(e) => setNewMessage({ ...newMessage, attachmentMimeType: e.target.value })}
          {...textFieldProps}
        />
        <input
          ref={newPictureInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => handlePictureSelected(event, "new")}
        />
        <Button
          variant="outlined"
          onClick={() => newPictureInputRef.current?.click()}
          disabled={uploadingMode === "new"}
        >
          {uploadingMode === "new" ? "Uploading..." : "Upload Picture"}
        </Button>
        {renderImagePreview(newMessage.attachmentUrl, newMessage.attachmentFileName || "Selected picture")}
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel id="new-message-status-label">Status</InputLabel>
          <Select
            labelId="new-message-status-label"
            value={newMessage.status}
            label="Status"
            onChange={(e) => setNewMessage({ ...newMessage, status: String(e.target.value) })}
            sx={{ color: "#fff" }}
          >
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Queued">Queued</MenuItem>
            <MenuItem value="Sent">Sent</MenuItem>
            <MenuItem value="Failed">Failed</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Sent At"
          type="datetime-local"
          value={newMessage.sentAt}
          onChange={(e) => setNewMessage({ ...newMessage, sentAt: e.target.value })}
          slotProps={{
            ...textFieldProps.slotProps,
            inputLabel: {
              shrink: true,
              sx: {
                color: "#ccc",
              },
            },
          }}
        />
        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>

      {templatePreview && (
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Template Preview
          </Typography>
          <Typography variant="subtitle2">Subject</Typography>
          <Typography sx={{ mb: 2 }}>{templatePreview.subject}</Typography>
          <Typography variant="subtitle2">Body</Typography>
          <Box sx={{ whiteSpace: "pre-wrap", mb: 2 }}>{templatePreview.body}</Box>
          <Typography variant="subtitle2">Resolved Values</Typography>
          <Typography variant="body2" color="text.secondary">
            {Object.entries(templatePreview.values)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" • ")}
          </Typography>
        </Paper>
      )}

      {editingMessage && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Edit Message
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Reminder ID"
              type="number"
              value={editingMessage.reminderid}
              onChange={(e) => setEditingMessage({ ...editingMessage, reminderId: Number(e.target.value), reminderid: Number(e.target.value) })}
              {...textFieldProps}
            />
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel id="edit-message-channel-label">Channel</InputLabel>
              <Select
                labelId="edit-message-channel-label"
                value={editingMessage.channel}
                label="Channel"
                onChange={(e) => setEditingMessage({ ...editingMessage, channel: String(e.target.value) })}
                sx={{ color: "#fff" }}
              >
                <MenuItem value="Email">Email</MenuItem>
                <MenuItem value="WhatsApp">WhatsApp</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Subject"
              value={editingMessage.subject || ""}
              onChange={(e) => setEditingMessage({ ...editingMessage, subject: e.target.value })}
              {...textFieldProps}
            />
            <TextField
              label="Message Body"
              value={editingMessage.messagebody}
              onChange={(e) => setEditingMessage({ ...editingMessage, messageBody: e.target.value, messagebody: e.target.value })}
              {...textFieldProps}
            />
            <TextField
              label="Attachment URL"
              value={editingMessage.attachmenturl || ""}
              onChange={(e) => setEditingMessage({ ...editingMessage, attachmentUrl: e.target.value, attachmenturl: e.target.value })}
              {...textFieldProps}
            />
            <TextField
              label="Attachment File Name"
              value={editingMessage.attachmentfilename || ""}
              onChange={(e) => setEditingMessage({ ...editingMessage, attachmentFileName: e.target.value, attachmentfilename: e.target.value })}
              {...textFieldProps}
            />
            <TextField
              label="Attachment Mime Type"
              value={editingMessage.attachmentmimetype || ""}
              onChange={(e) => setEditingMessage({ ...editingMessage, attachmentMimeType: e.target.value, attachmentmimetype: e.target.value })}
              {...textFieldProps}
            />
            <input
              ref={editPictureInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => handlePictureSelected(event, "edit")}
            />
            <Button
              variant="outlined"
              onClick={() => editPictureInputRef.current?.click()}
              disabled={uploadingMode === "edit"}
            >
              {uploadingMode === "edit" ? "Uploading..." : "Upload Picture"}
            </Button>
            {renderImagePreview(editingMessage.attachmenturl || editingMessage.attachmentUrl || "", editingMessage.attachmentfilename || "Selected picture")}
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel id="edit-message-status-label">Status</InputLabel>
              <Select
                labelId="edit-message-status-label"
                value={editingMessage.status}
                label="Status"
                onChange={(e) => setEditingMessage({ ...editingMessage, status: String(e.target.value) })}
                sx={{ color: "#fff" }}
              >
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Queued">Queued</MenuItem>
                <MenuItem value="Sent">Sent</MenuItem>
                <MenuItem value="Failed">Failed</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Sent At"
              type="datetime-local"
              value={editingMessage.sentat || ""}
              onChange={(e) => setEditingMessage({ ...editingMessage, sentAt: e.target.value, sentat: e.target.value })}
              slotProps={{
                ...textFieldProps.slotProps,
                inputLabel: {
                  shrink: true,
                  sx: {
                    color: "#ccc",
                  },
                },
              }}
            />
            <Button variant="contained" onClick={handleUpdate}>
              Save
            </Button>
          </Box>
        </Box>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setToast((currentToast) => ({ ...currentToast, open: false }))}
      >
        <Alert
          onClose={() => setToast((currentToast) => ({ ...currentToast, open: false }))}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
