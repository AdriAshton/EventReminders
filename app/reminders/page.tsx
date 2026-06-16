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
  addReminder,
  deleteReminder,
  deleteReminders,
  updateReminder,
} from "@/services/reminderServices";

export default function RemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [pkFilter, setPkFilter] = useState<number | string>("");
  const [fkFilter, setFkFilter] = useState<number | string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [newReminder, setNewReminder] = useState({
    eventid: 1,
    companyid: 1,
    reminderdatetime: "",
    remindermethod: "",
    status: "Pending",
    timingtype: "Before",
    timingvalue: 1,
    timingunit: "Days",
    sendtime: "09:00",
    isactive: true,
  });

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
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{row:number,reason:string,raw?:string}>>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);

  useEffect(() => {
    loadReminders(page);
  }, [page]);

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

  async function handleDelete(id: number) {
    const res = await deleteReminder(id);

    if (res.error) {
      setError(res.error);
    } else {
      await loadReminders();
      setToast({ open: true, message: "Reminder deleted successfully", severity: "success" });
    }
  }

  async function handleAdd() {
    const res = await addReminder({
      ...newReminder,
      reminderdatetime: new Date(newReminder.reminderdatetime),
    });

    if (res.error) {
      setError(res.error);
    } else {
      await loadReminders();

      setNewReminder({
        eventid: 1,
        companyid: 1,
        reminderdatetime: "",
        remindermethod: "",
        status: "Pending",
        timingtype: "Before",
        timingvalue: 1,
        timingunit: "Days",
        sendtime: "09:00",
        isactive: true,
      });
      setToast({ open: true, message: "Reminder created successfully", severity: "success" });
    }
  }

  async function handleUpdate() {
    if (!editingReminder) return;

    const res = await updateReminder({
      ...editingReminder,
      reminderdatetime: new Date(editingReminder.reminderdatetime),
    });

    if (res.error) {
      setError(res.error);
    } else {
      await loadReminders();
      setEditingReminder(null);
      setToast({ open: true, message: "Reminder updated successfully", severity: "success" });
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Button variant="outlined" onClick={() => router.push("/dashboard")}>Back</Button>

        <input
          id="reminders-import-input"
          type="file"
          accept=".csv,.txt,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const text = await file.text();
              const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
              setToast({ open: true, message: `Import received: ${lines.length-1} rows`, severity: 'success' });
              (e.target as HTMLInputElement).value = '';
            } catch (err:any) {
              setToast({ open: true, message: 'Failed to read file', severity: 'error' });
            }
          }}
        />
        <label htmlFor="reminders-import-input">
          <Button component="span" variant="contained">Import</Button>
        </label>
      </Box>

      <Typography variant="h4" gutterBottom>
        Reminders
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
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

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button color="error" disabled={selectedIds.length===0} onClick={()=>setConfirmBulkOpen(true)}>
            Delete Selected ({selectedIds.length})
          </Button>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="reminders-pk-filter">Primary Key</InputLabel>
            <Select labelId="reminders-pk-filter" value={pkFilter} label="Primary Key" onChange={(e)=>{const v = e.target.value as unknown as string; setPkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
              <MenuItem value="">All</MenuItem>
              {reminders.map(r => <MenuItem key={r.reminderid} value={r.reminderid}>{String(r.reminderid)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="reminders-fk-filter">Foreign Key (companyId)</InputLabel>
            <Select labelId="reminders-fk-filter" value={fkFilter} label="Foreign Key (companyId)" onChange={(e)=>{const v = e.target.value as unknown as string; setFkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
              <MenuItem value="">All</MenuItem>
              {[...new Set(reminders.map(r => r.companyid))].map(cid => <MenuItem key={cid} value={cid}>{String(cid)}</MenuItem>)}
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
            '& .MuiPaginationItem-root': { color: '#000', backgroundColor: '#fff' },
            '& .Mui-selected': { backgroundColor: '#1976d2 !important', color: '#fff' },
            boxShadow: 1,
            borderRadius: 1,
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
              <TableCell>Event ID</TableCell>
              <TableCell>Company ID</TableCell>
              <TableCell>Reminder Time</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {reminders
              .filter((r) => (pkFilter === "" ? true : r.reminderid === pkFilter))
              .filter((r) => (fkFilter === "" ? true : r.companyid === fkFilter))
              .map((reminder) => (
              <TableRow
                key={reminder.reminderid}
                hover
                selected={editingReminder?.reminderid === reminder.reminderid}
                onClick={() => router.push(`/reminders/${reminder.reminderid}`)}
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
                <TableCell>{reminder.eventid}</TableCell>
                <TableCell>{reminder.companyid}</TableCell>
                <TableCell>{formatDate(reminder.reminderdatetime)}</TableCell>
                <TableCell>{reminder.remindermethod}</TableCell>
                <TableCell>{reminder.status}</TableCell>

                <TableCell align="right">
                  <Button
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm("Are you sure you want to delete this reminder?")) {
                        return;
                      }
                      handleDelete(reminder.reminderid);
                    }}
                  >
                    Delete
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingReminder(reminder);
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/reminders/${reminder.reminderid}`);
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

      <Dialog open={confirmBulkOpen} onClose={() => setConfirmBulkOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete {selectedIds.length} selected reminders? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBulkOpen(false)}>Cancel</Button>
          <Button color="error" onClick={async ()=>{
            setConfirmBulkOpen(false);
            const res = await deleteReminders(selectedIds);
            if ((res as any).error) {
              setError((res as any).error);
            } else {
              setToast({ open: true, message: `Deleted ${res.deleted || selectedIds.length} reminders`, severity: 'success' });
              setSelectedIds([]);
              await loadReminders(1);
            }
          }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Typography variant="h6" gutterBottom>
        Add Reminder
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(260px, 1fr))' },
          gap: 2,
          mb: 4,
        }}
      >
        <TextField
          label="Event ID"
          type="number"
          value={newReminder.eventid}
          onChange={(e) =>
            setNewReminder({
              ...newReminder,
              eventid: Number(e.target.value),
            })
          }
          {...textFieldProps}
        />

        <TextField
          label="Company ID"
          type="number"
          value={newReminder.companyid}
          onChange={(e) =>
            setNewReminder({
              ...newReminder,
              companyid: Number(e.target.value),
            })
          }
          {...textFieldProps}
        />

        <TextField
          label="Reminder Time"
          type="datetime-local"
          value={newReminder.reminderdatetime}
          onChange={(e) =>
            setNewReminder({
              ...newReminder,
              reminderdatetime: e.target.value,
            })
          }
          {...dateTimeFieldProps}
        />

        <TextField
          label="Reminder Method"
          value={newReminder.remindermethod}
          onChange={(e) =>
            setNewReminder({
              ...newReminder,
              remindermethod: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <TextField
          label="Status"
          value={newReminder.status}
          onChange={(e) =>
            setNewReminder({
              ...newReminder,
              status: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <Box
          sx={{
            gridColumn: { xs: '1 / -1', md: '1 / -1' },
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 2,
            p: 2,
            mt: 1,
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
            Scheduling Controls
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(150px, 1fr))' },
              gap: 2,
              alignItems: 'center',
            }}
          >
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="new-reminder-timingtype-label">Timing Type</InputLabel>
              <Select
                labelId="new-reminder-timingtype-label"
                value={newReminder.timingtype}
                label="Timing Type"
                onChange={(e) =>
                  setNewReminder({
                    ...newReminder,
                    timingtype: e.target.value,
                  })
                }
                sx={{ color: '#000', backgroundColor: '#fff' }}
              >
                <MenuItem value="Before">Before</MenuItem>
                <MenuItem value="OnDay">On Day</MenuItem>
                <MenuItem value="After">After</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Timing Value"
              type="number"
              value={newReminder.timingvalue}
              onChange={(e) =>
                setNewReminder({
                  ...newReminder,
                  timingvalue: Number(e.target.value),
                })
              }
              {...textFieldProps}
            />

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="new-reminder-timingunit-label">Timing Unit</InputLabel>
              <Select
                labelId="new-reminder-timingunit-label"
                value={newReminder.timingunit}
                label="Timing Unit"
                onChange={(e) =>
                  setNewReminder({
                    ...newReminder,
                    timingunit: e.target.value,
                  })
                }
                sx={{ color: '#000', backgroundColor: '#fff' }}
              >
                <MenuItem value="Days">Days</MenuItem>
                <MenuItem value="Hours">Hours</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Send Time"
              type="time"
              value={newReminder.sendtime}
              onChange={(e) =>
                setNewReminder({
                  ...newReminder,
                  sendtime: e.target.value,
                })
              }
              {...dateTimeFieldProps}
            />

            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Switch
                  checked={newReminder.isactive}
                  onChange={(e) =>
                    setNewReminder({
                      ...newReminder,
                      isactive: e.target.checked,
                    })
                  }
                />
              }
              label="Active"
            />
          </Box>
        </Box>

        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>

      {editingReminder && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Edit Reminder
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(260px, 1fr))' },
              gap: 2,
            }}
          >
            <TextField
              label="Event ID"
              type="number"
              value={editingReminder.eventid}
              onChange={(e) =>
                setEditingReminder({
                  ...editingReminder,
                  eventid: Number(e.target.value),
                })
              }
              {...textFieldProps}
            />

            <TextField
              label="Company ID"
              type="number"
              value={editingReminder.companyid}
              onChange={(e) =>
                setEditingReminder({
                  ...editingReminder,
                  companyid: Number(e.target.value),
                })
              }
              {...textFieldProps}
            />

            <TextField
              label="Reminder Time"
              type="datetime-local"
              value={editingReminder.reminderdatetime}
              onChange={(e) =>
                setEditingReminder({
                  ...editingReminder,
                  reminderdatetime: e.target.value,
                })
              }
              {...dateTimeFieldProps}
            />

            <TextField
              label="Reminder Method"
              value={editingReminder.remindermethod}
              onChange={(e) =>
                setEditingReminder({
                  ...editingReminder,
                  remindermethod: e.target.value,
                })
              }
              {...textFieldProps}
            />

            <TextField
              label="Status"
              value={editingReminder.status}
              onChange={(e) =>
                setEditingReminder({
                  ...editingReminder,
                  status: e.target.value,
                })
              }
              {...textFieldProps}
            />

            <Box
              sx={{
                gridColumn: { xs: '1 / -1', md: '1 / -1' },
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 2,
                p: 2,
                mt: 1,
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                Scheduling Controls
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(150px, 1fr))' },
                  gap: 2,
                  alignItems: 'center',
                }}
              >
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="editing-reminder-timingtype-label">Timing Type</InputLabel>
                  <Select
                    labelId="editing-reminder-timingtype-label"
                    value={editingReminder.timingtype ?? "Before"}
                    label="Timing Type"
                    onChange={(e) =>
                      setEditingReminder({
                        ...editingReminder,
                        timingtype: e.target.value,
                      })
                    }
                    sx={{ color: '#000', backgroundColor: '#fff' }}
                  >
                    <MenuItem value="Before">Before</MenuItem>
                    <MenuItem value="OnDay">On Day</MenuItem>
                    <MenuItem value="After">After</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Timing Value"
                  type="number"
                  value={editingReminder.timingvalue ?? 1}
                  onChange={(e) =>
                    setEditingReminder({
                      ...editingReminder,
                      timingvalue: Number(e.target.value),
                    })
                  }
                  {...textFieldProps}
                />

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="editing-reminder-timingunit-label">Timing Unit</InputLabel>
                  <Select
                    labelId="editing-reminder-timingunit-label"
                    value={editingReminder.timingunit ?? "Days"}
                    label="Timing Unit"
                    onChange={(e) =>
                      setEditingReminder({
                        ...editingReminder,
                        timingunit: e.target.value,
                      })
                    }
                    sx={{ color: '#000', backgroundColor: '#fff' }}
                  >
                    <MenuItem value="Days">Days</MenuItem>
                    <MenuItem value="Hours">Hours</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Send Time"
                  type="time"
                  value={editingReminder.sendtime ?? "09:00"}
                  onChange={(e) =>
                    setEditingReminder({
                      ...editingReminder,
                      sendtime: e.target.value,
                    })
                  }
                  {...dateTimeFieldProps}
                />

                <FormControlLabel
                  sx={{ m: 0 }}
                  control={
                    <Switch
                      checked={Boolean(editingReminder.isactive ?? true)}
                      onChange={(e) =>
                        setEditingReminder({
                          ...editingReminder,
                          isactive: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Active"
                />
              </Box>
            </Box>

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
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
