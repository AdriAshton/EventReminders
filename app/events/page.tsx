"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
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
} from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useRouter } from "next/navigation";

import { getEvents, addEvent, deleteEvent, updateEvent } from "@/services/eventService";
  import { getEventTypes } from '@/services/eventTypeService';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [pkFilter, setPkFilter] = useState<number | string>("");
  const [fkFilter, setFkFilter] = useState<number | string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [typesMap, setTypesMap] = useState<Record<number,string>>({});

  const [newEvent, setNewEvent] = useState({
    eventtypeid: 0,
    eventdate: "",
    notes: "",
    clientid: 1,
    companyid: 1,
  });
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<{row:number,reason:string,raw?:string}>>([]);

  useEffect(() => {
    loadEvents(page);
  }, [page]);

      (async () => {
        const t = await getEventTypes();
        if (!(t as any).error) {
          setEventTypes(t as any);
          const m: Record<number,string> = {};
          (t as any).forEach((tt: any) => { m[tt.eventtypeid] = tt.eventtypename; });
          setTypesMap(m);
        }
      })();
  async function loadEvents(pageParam: number = page) {
    const data = await getEvents(pageParam, pageSize);

    if (data.error) {
      setError(data.error);
    } else {
      setEvents(data.rows || []);
      setTotal(data.total || 0);
      setError(null);
    }
  }

  async function handleAdd() {
    const res = await addEvent(newEvent);

    if (res.error) {
      setError(res.error);
    } else {
      await loadEvents();

      setNewEvent({
        eventtypeid: 0,
        eventdate: "",
        notes: "",
        clientid: 1,
        companyid: 1,
      });
      setToast({ open: true, message: "Event created successfully", severity: "success" });
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteEvent(id);

    if (res.error) {
      setError(res.error);
    } else {
      await loadEvents();
      setToast({ open: true, message: "Event deleted successfully", severity: "success" });
    }
  }

  async function handleUpdate() {
    if (!editingEvent) return;

    const res = await updateEvent(editingEvent);

    if (res.error) {
      setError(res.error);
    } else {
      await loadEvents();
      setEditingEvent(null);
      setToast({ open: true, message: "Event updated successfully", severity: "success" });
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Button variant="outlined" onClick={() => router.push("/dashboard")}>Back</Button>

        <input
          id="events-import-input"
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
        <label htmlFor="events-import-input">
          <Button component="span" variant="contained">Import</Button>
        </label>
      </Box>

      <Typography variant="h4" gutterBottom>
        Events
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
              loadEvents(1);
            }}
            sx={{ color: '#000', backgroundColor: '#fff' }}
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="events-pk-filter">Primary Key</InputLabel>
            <Select labelId="events-pk-filter" value={pkFilter} label="Primary Key" onChange={(e)=>{const v = e.target.value as unknown as string; setPkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
              <MenuItem value="">All</MenuItem>
              {events.map(ev => <MenuItem key={ev.eventid} value={ev.eventid}>{String(ev.eventid)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="events-fk-filter">Foreign Key (companyId)</InputLabel>
            <Select labelId="events-fk-filter" value={fkFilter} label="Foreign Key (companyId)" onChange={(e)=>{const v = e.target.value as unknown as string; setFkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
              <MenuItem value="">All</MenuItem>
              {[...new Set(events.map(ev => ev.companyid))].map(cid => <MenuItem key={cid} value={cid}>{String(cid)}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Pagination
          count={Math.max(1, Math.ceil(total / pageSize))}
          page={page}
          onChange={(_, value) => {
            setPage(value);
            loadEvents(value);
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
              <TableCell>Event Type</TableCell>
              <TableCell>Event Date</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {events
              .filter((ev) => (pkFilter === "" ? true : ev.eventid === pkFilter))
              .filter((ev) => (fkFilter === "" ? true : ev.companyid === fkFilter))
              .map((eventItem) => (
              <TableRow
                key={eventItem.eventid}
                hover
                selected={editingEvent?.eventid === eventItem.eventid}
                onClick={() => router.push(`/events/${eventItem.eventid}`)}
                sx={{
                  cursor: "pointer",
                  "&.Mui-selected": {
                    backgroundColor: "#1e88e5",
                    color: "#fff",
                  },
                }}
              >
                <TableCell>{eventItem.eventtype}</TableCell>
                <TableCell>{eventItem.eventdate}</TableCell>
                <TableCell>{eventItem.notes}</TableCell>

                <TableCell align="right">
                  <Button
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm("Are you sure you want to delete this event?")) {
                        return;
                      }
                      handleDelete(eventItem.eventid);
                    }}
                  >
                    Delete
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEvent(eventItem);
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/events/${eventItem.eventid}`);
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
        Add Event
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 4,
          flexWrap: "wrap",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="event-type-select">Event Type</InputLabel>
          <Select
            labelId="event-type-select"
            value={newEvent.eventtypeid}
            label="Event Type"
            onChange={(e) => setNewEvent({ ...newEvent, eventtypeid: Number(e.target.value) })}
            sx={{ color: '#000', backgroundColor: '#fff' }}
          >
            <MenuItem value={0}><em>Select</em></MenuItem>
            {eventTypes.map(t => (
              <MenuItem key={t.eventtypeid} value={t.eventtypeid}>{t.eventtypename}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Event Date"
          type="date"
          value={newEvent.eventdate}
          onChange={(e) =>
            setNewEvent({
              ...newEvent,
              eventdate: e.target.value,
            })
          }
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

        <TextField
          label="Notes"
          value={newEvent.notes}
          onChange={(e) =>
            setNewEvent({
              ...newEvent,
              notes: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>

      {editingEvent && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Edit Event
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="edit-event-type-select">Event Type</InputLabel>
              <Select
                labelId="edit-event-type-select"
                value={editingEvent.eventtypeid || 0}
                label="Event Type"
                onChange={(e) => setEditingEvent({ ...editingEvent, eventtypeid: Number(e.target.value) })}
                sx={{ color: '#000', backgroundColor: '#fff' }}
              >
                <MenuItem value={0}><em>Select</em></MenuItem>
                {eventTypes.map(t => (
                  <MenuItem key={t.eventtypeid} value={t.eventtypeid}>{t.eventtypename}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Event Date"
              type="date"
              value={editingEvent.eventdate}
              onChange={(e) =>
                setEditingEvent({
                  ...editingEvent,
                  eventdate: e.target.value,
                })
              }
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

            <TextField
              label="Notes"
              value={editingEvent.notes}
              onChange={(e) =>
                setEditingEvent({
                  ...editingEvent,
                  notes: e.target.value,
                })
              }
              {...textFieldProps}
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
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
