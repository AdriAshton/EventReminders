"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/authClient";
import { createTemplateId, renderTemplate } from "@/lib/messageTemplates";
import { uploadMessageImage, type MessageTemplateResponse, type UploadMessageImageResponse } from "@/services/messageService";

type TemplateState = {
  id: string;
  name: string;
  subject: string;
  body: string;
  imageUrl?: string;
};

const sampleValues = {
  clientName: "Adrian",
  companyName: "Birthday Reminders Ltd",
  eventDate: "14 June 2026",
};

const emptyTemplate: TemplateState = {
  id: "",
  name: "",
  subject: "",
  body: "",
  imageUrl: "",
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateState[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [editor, setEditor] = useState<TemplateState>(emptyTemplate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const subjectRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const bodyRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  async function loadTemplates() {
    try {
      const res = await authenticatedFetch("/api/settings/message-template");
      const data = (await res.json()) as MessageTemplateResponse;
      if (!res.ok) {
        setError(data.error || "Failed to load templates");
        return;
      }

      setTemplates(data.templates || []);
      setActiveTemplateId(data.activeTemplateId || "");
      setEditor(data.template || emptyTemplate);
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  const preview = useMemo(() => ({
    subject: renderTemplate(editor.subject || "", sampleValues),
    body: renderTemplate(editor.body || "", sampleValues),
  }), [editor]);

  function selectTemplate(template: TemplateState) {
    setEditor(template);
    setError(null);
  }

  function insertTemplateToken(token: string) {
    const targetRef = activeField === "subject" ? subjectRef : bodyRef;
    const target = targetRef.current;

    if (!target) {
      return;
    }

    const start = target.selectionStart ?? editor[activeField].length;
    const end = target.selectionEnd ?? editor[activeField].length;
    const currentValue = editor[activeField] || "";
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;

    setEditor((current) => ({
      ...current,
      [activeField]: nextValue,
    }));

    requestAnimationFrame(() => {
      const nextCursor = start + token.length;
      target.focus();
      target.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleCreate() {
    const newTemplate: TemplateState = {
      id: createTemplateId(`template-${templates.length + 1}`),
      name: `Template ${templates.length + 1}`,
      subject: "Happy Birthday, {{clientName}}!",
      body: "Happy Birthday {{clientName}}!\n\nEveryone at {{companyName}} wishes you a wonderful day.\n\nBest wishes,",
      imageUrl: "",
    };
    setEditor(newTemplate);
    setError(null);
  }

  async function handleTemplateImageUpload(file: File) {
    const result = (await uploadMessageImage(file)) as UploadMessageImageResponse;
    if (result.error) {
      setToast({ open: true, message: result.error, severity: "error" });
      return;
    }

    setEditor((current) => ({
      ...current,
      imageUrl: result.url || result.downloadUrl || "",
    }));
    setToast({ open: true, message: "Template image uploaded", severity: "success" });
  }

  async function handleSave() {
    if (!editor.name.trim()) {
      setToast({ open: true, message: "Template name is required", severity: "error" });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const templateId = editor.id || createTemplateId(editor.name);
      const res = await authenticatedFetch("/api/settings/message-template", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editor,
          id: templateId,
          imageUrl: editor.imageUrl || "",
          setActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save template");
        setToast({ open: true, message: data.error || "Failed to save template", severity: "error" });
        return;
      }

      setTemplates(data.templates || []);
      setActiveTemplateId(data.activeTemplateId || templateId);
      setEditor(data.template || { ...editor, id: templateId });
      setToast({ open: true, message: "Template saved", severity: "success" });
    } catch {
      setError("Failed to save template");
      setToast({ open: true, message: "Failed to save template", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(templateId: string) {
    setSaving(true);
    try {
      const res = await authenticatedFetch("/api/settings/message-template", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateId, setActiveOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ open: true, message: data.error || "Failed to update default template", severity: "error" });
        return;
      }
      setTemplates(data.templates || []);
      setActiveTemplateId(data.activeTemplateId || templateId);
      const current = (data.templates || []).find((item: TemplateState) => item.id === templateId);
      if (current) {
        setEditor(current);
      }
      setToast({ open: true, message: "Default template updated", severity: "success" });
    } catch {
      setToast({ open: true, message: "Failed to update default template", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(templateId: string) {
    if (!window.confirm("Delete this template?")) {
      return;
    }

    setSaving(true);
    try {
      const res = await authenticatedFetch("/api/settings/message-template", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ open: true, message: data.error || "Failed to delete template", severity: "error" });
        return;
      }
      setTemplates(data.templates || []);
      setActiveTemplateId(data.activeTemplateId || "");
      setEditor(data.template || emptyTemplate);
      setToast({ open: true, message: "Template deleted", severity: "success" });
    } catch {
      setToast({ open: true, message: "Failed to delete template", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" sx={{ mb: 3, justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4">Message Templates</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage multiple birthday templates and choose the global default.
          </Typography>
        
        </Box>
      </Stack>

   <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
     <Button variant="outlined" onClick={() => router.push("/dashboard")}>Back</Button>
   </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <Card sx={{ width: { xs: "100%", md: 320 } }}>
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Templates</Typography>
              <Button variant="outlined" size="small" onClick={handleCreate} disabled={loading || saving}>
                New
              </Button>
            </Stack>

            <List dense>
              {templates.map((template) => (
                <ListItemButton
                  key={template.id}
                  selected={editor.id === template.id}
                  onClick={() => selectTemplate(template)}
                >
                  <ListItemText
                    slotProps={{
                      primary: { component: 'div' },
                      secondary: { component: 'div' },
                    }}
                    primary={template.name}
                    secondary={template.id === activeTemplateId ? "Default template" : template.id}
                  />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Editor</Typography>

            <Stack spacing={2}>
              <TextField
                label="Template name"
                value={editor.name}
                onChange={(e) => setEditor((current) => ({ ...current, name: e.target.value }))}
                disabled={loading || saving}
                fullWidth
              />
              <TextField
                label="Email subject"
                value={editor.subject}
                onChange={(e) => setEditor((current) => ({ ...current, subject: e.target.value }))}
                onFocus={() => setActiveField("subject")}
                disabled={loading || saving}
                fullWidth
                inputRef={subjectRef}
              />
              <TextField
                label="Message body"
                value={editor.body}
                onChange={(e) => setEditor((current) => ({ ...current, body: e.target.value }))}
                onFocus={() => setActiveField("body")}
                disabled={loading || saving}
                fullWidth
                multiline
                minRows={10}
                inputRef={bodyRef}
              />

              <Box sx={{ display: "grid", gap: 1 }}>
                <Button component="label" variant="outlined" disabled={loading || saving}>
                  Upload Template Image
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleTemplateImageUpload(file);
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                </Button>
                {editor.imageUrl && (
                  <Box
                    component="img"
                    src={editor.imageUrl}
                    alt="Template preview"
                    sx={{ width: "100%", maxWidth: 320, borderRadius: 2, border: "1px solid rgba(0,0,0,0.12)" }}
                  />
                )}
              </Box>

              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Chip label="{{clientName}}" size="small" onDoubleClick={() => insertTemplateToken("{{clientName}}")} />
                <Chip label="{{companyName}}" size="small" onDoubleClick={() => insertTemplateToken("{{companyName}}")} />
                <Chip label="{{eventDate}}" size="small" onDoubleClick={() => insertTemplateToken("{{eventDate}}")} />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={handleSave} disabled={loading || saving}>
                  {saving ? "Saving..." : "Save Template"}
                </Button>
                {editor.id && (
                  <>
                    <Button variant="outlined" onClick={() => handleSetDefault(editor.id)} disabled={loading || saving || editor.id === activeTemplateId}>
                      Set As Default
                    </Button>
                    <Button color="error" onClick={() => handleDelete(editor.id)} disabled={loading || saving}>
                      Delete
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6">Preview</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Example values are substituted live so you can see the final birthday message.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">Subject</Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>{preview.subject}</Typography>

            <Typography variant="subtitle2" color="text.secondary">Body</Typography>
            <Box
              sx={{
                whiteSpace: "pre-wrap",
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              {preview.body}
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Image</Typography>
            {editor.imageUrl ? (
              <Box
                component="img"
                src={editor.imageUrl}
                alt="Template image preview"
                sx={{ width: "100%", maxWidth: 320, borderRadius: 2, border: "1px solid rgba(0,0,0,0.08)" }}
              />
            ) : (
              <Typography variant="body2">No template image uploaded yet.</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

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
