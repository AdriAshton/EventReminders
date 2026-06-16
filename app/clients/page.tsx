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
  Card,
  CardContent,
  Stack,
  Divider,
} from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useRouter } from "next/navigation";

import {
  getClients,
  addClient,
  deleteClient,
  deleteClients,
  updateClient,
} from "@/services/clientService";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [pkFilter, setPkFilter] = useState<number | string>("");
  const [fkFilter, setFkFilter] = useState<number | string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [newClient, setNewClient] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    companyId: 1,
  });

  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );
  const [importErrors, setImportErrors] = useState<Array<{row:number,reason:string,raw?:string}>>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);

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
    loadClients(page);
  }, [page]);

  useEffect(() => {
    // read the edit query param from the browser location (client-only)
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const edit = params.get("edit");
    if (edit && clients.length) {
      const found = clients.find((c) => String(c.clientid) === edit);
      if (found) setEditingClient(found);
    }
  }, [clients]);

  async function loadClients(pageParam: number = page) {
    const data = await getClients(pageParam, pageSize);

    if (data.error) {
      setError(data.error);
    } else {
      // data -> { rows, total }
      setClients(data.rows || []);
      setTotal(data.total || 0);
      setError(null);
    }
  }

  async function handleAdd() {
    const res = await addClient(newClient);

    if (res.error) {
      setError(res.error);
    } else {
      await loadClients();

      setNewClient({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        companyId: 1,
      });
      setToast({ open: true, message: "Client created successfully", severity: "success" });
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteClient(id);

    if (res.error) {
      setError(res.error);
    } else {
      await loadClients();
      setToast({ open: true, message: "Client deleted successfully", severity: "success" });
    }
  }

  async function handleUpdate() {
    if (!editingClient) return;

    const res = await updateClient(editingClient);

    if (res.error) {
      setError(res.error);
    } else {
      await loadClients();
      setEditingClient(null);
      setToast({ open: true, message: "Client updated successfully", severity: "success" });
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
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => router.push("/dashboard")}>Back</Button>
        <Button component="span" variant="contained" onClick={() => document.getElementById('clients-import-input')?.click()}>Import</Button>
        <input
          id="clients-import-input"
          type="file"
          accept=".csv,.txt,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const name = file.name.toLowerCase();
              let lines: string[] = [];
              if (name.endsWith('.csv') || name.endsWith('.txt')) {
                const text = await file.text();
                lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
              } else if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
                try {
                  const xlsx = await import('xlsx');
                  const arrayBuffer = await file.arrayBuffer();
                  const workbook = xlsx.read(new Uint8Array(arrayBuffer), { type: 'array' });
                  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                  const csv = xlsx.utils.sheet_to_csv(firstSheet);
                  lines = csv.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
                } catch {
                  setToast({ open: true, message: 'Excel import requires dependency "xlsx". Run: npm install xlsx', severity: 'error' });
                  (e.target as HTMLInputElement).value = '';
                  return;
                }
              } else {
                setToast({ open: true, message: 'Unsupported file type', severity: 'error' });
                (e.target as HTMLInputElement).value = '';
                return;
              }
              if (lines.length < 2) {
                setToast({ open: true, message: 'CSV has no data rows', severity: 'error' });
                (e.target as HTMLInputElement).value = '';
                return;
              }
              const header = lines[0].split(',').map(h => h.trim().toLowerCase());
              const required = ['firstname','lastname','email','phone','companyid'];
              const missing = required.filter(r => !header.includes(r));
              if (missing.length) {
                setToast({ open: true, message: `Missing columns: ${missing.join(', ')}`, severity: 'error' });
                (e.target as HTMLInputElement).value = '';
                return;
              }
              const rows = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.trim());
                const obj: any = {};
                header.forEach((h, i) => obj[h] = cols[i] ?? '');
                return obj;
              }).filter(r => r.firstname || r.lastname || r.email);
              let success = 0;
              const failures: Array<{row:number,reason:string,raw?:string}> = [];
              let rowIndex = 1;
              for (const r of rows) {
                if (!r.firstname || !r.lastname || !r.email) {
                  failures.push({ row: rowIndex, reason: 'Missing required fields', raw: JSON.stringify(r) });
                  rowIndex++;
                  continue;
                }
                try {
                  const res = await addClient({ firstname: r.firstname, lastname: r.lastname, email: r.email, phone: r.phone || '', companyId: Number(r.companyid) || 1 });
                  if ((res as any).error) failures.push({ row: rowIndex, reason: (res as any).error, raw: JSON.stringify(r) }); else success++;
                } catch (err: any) {
                  failures.push({ row: rowIndex, reason: err?.message || 'Unknown error', raw: JSON.stringify(r) });
                }
                rowIndex++;
              }
              await loadClients(1);
              if (failures.length) {
                setImportErrors(failures);
                setImportDialogOpen(true);
              }
              setToast({ open: true, message: `Import complete: ${success} added, ${failures.length} failed`, severity: failures.length ? 'error' : 'success' });
              (e.target as HTMLInputElement).value = '';
            } catch {
              setToast({ open: true, message: 'Failed to read file', severity: 'error' });
            }
          }}
        />
      </Box>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="rows-per-page-label">Rows</InputLabel>
          <Select labelId="rows-per-page-label" value={pageSize} label="Rows" onChange={(e) => { const v = Number(e.target.value); setPageSize(v); setPage(1); loadClients(1); }} sx={{ color: '#000', backgroundColor: '#fff' }}>
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button color="error" disabled={selectedIds.length === 0} onClick={() => setConfirmBulkOpen(true)}>Delete Selected ({selectedIds.length})</Button>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="pk-filter-label">Primary Key</InputLabel>
            <Select labelId="pk-filter-label" value={pkFilter} label="Primary Key" onChange={(e) => { const val = e.target.value as unknown as string; setPkFilter(val === "" ? "" : Number(val)); }} sx={{ color: '#000', backgroundColor: '#fff' }}>
              <MenuItem value="">All</MenuItem>
              {clients.map((c) => <MenuItem key={c.clientid} value={c.clientid}>{String(c.clientid)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="fk-filter-label">Foreign Key (companyId)</InputLabel>
            <Select labelId="fk-filter-label" value={fkFilter} label="Foreign Key (companyId)" onChange={(e) => { const val = e.target.value as unknown as string; setFkFilter(val === "" ? "" : Number(val)); }} sx={{ color: '#000', backgroundColor: '#fff' }}>
              <MenuItem value="">All</MenuItem>
              {[...new Set(clients.map((c) => c.companyid))].map((compId) => <MenuItem key={compId} value={compId}>{String(compId)}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Pagination count={Math.max(1, Math.ceil(total / pageSize))} page={page} onChange={(_, value) => { setPage(value); loadClients(value); }} sx={{ '& .MuiPaginationItem-root': { color: '#000', backgroundColor: '#fff' }, '& .Mui-selected': { backgroundColor: '#1976d2 !important', color: '#fff' }, boxShadow: 1, borderRadius: 1 }} showFirstButton showLastButton />
      </Box>

      <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox indeterminate={selectedIds.length > 0 && selectedIds.length < clients.length} checked={clients.length > 0 && selectedIds.length === clients.length} onChange={(e) => { if (e.target.checked) setSelectedIds(clients.map((c) => c.clientid)); else setSelectedIds([]); }} /></TableCell>
              <TableCell>First Name</TableCell>
              <TableCell>Last Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.filter((c) => (pkFilter === "" ? true : c.clientid === pkFilter)).filter((c) => (fkFilter === "" ? true : c.companyid === fkFilter)).map((c) => (
              <TableRow key={c.clientid} hover selected={editingClient?.clientid === c.clientid} onClick={() => router.push(`/clients/${c.clientid}`)} sx={{ cursor: 'pointer', '&.Mui-selected': { backgroundColor: '#1e88e5', color: '#fff' } }}>
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(c.clientid)} onChange={(e) => { const checked = e.target.checked; setSelectedIds((prev) => checked ? [...prev, c.clientid] : prev.filter(id => id !== c.clientid)); }} /></TableCell>
                <TableCell>{c.firstname}</TableCell>
                <TableCell>{c.lastname}</TableCell>
                <TableCell>{maskEmail(c.email)}</TableCell>
                <TableCell>{maskPhone(c.phone)}</TableCell>
                <TableCell align="right">
                  <Button color="error" onClick={(e) => { e.stopPropagation(); if (!window.confirm("Are you sure you want to delete this client?")) return; handleDelete(c.clientid); }}>Delete</Button>
                  <Button onClick={(e) => { e.stopPropagation(); setEditingClient(c); }}>Edit</Button>
                  <Button onClick={(e) => { e.stopPropagation(); router.push(`/clients/${c.clientid}`); }}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={confirmBulkOpen} onClose={() => setConfirmBulkOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete {selectedIds.length} selected clients? This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBulkOpen(false)}>Cancel</Button>
          <Button color="error" onClick={async () => { setConfirmBulkOpen(false); const res = await deleteClients(selectedIds); if ((res as any).error) { setError((res as any).error); } else { setToast({ open: true, message: `Deleted ${res.deleted || selectedIds.length} clients`, severity: 'success' }); setSelectedIds([]); await loadClients(1); } }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Pagination count={Math.max(1, Math.ceil(total / pageSize))} page={page} onChange={(_, value) => { setPage(value); loadClients(value); }} sx={{ '& .MuiPaginationItem-root': { color: '#fff' }, '& .MuiPaginationItem-previousNext': { color: '#fff' }, '& .MuiPaginationItem-icon': { color: '#fff' }, '& .Mui-selected': { backgroundColor: '#1976d2 !important', color: '#fff' }, '& .MuiPagination-ul': { justifyContent: 'center' }, backgroundColor: 'transparent', py: 1 }} showFirstButton showLastButton />
      </Box>

      <Typography variant="h6" gutterBottom>Add Client</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <TextField label="First Name" value={newClient.firstname} onChange={(e) => setNewClient({ ...newClient, firstname: e.target.value })} {...textFieldProps} />
        <TextField label="Last Name" value={newClient.lastname} onChange={(e) => setNewClient({ ...newClient, lastname: e.target.value })} {...textFieldProps} />
        <TextField label="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} {...textFieldProps} />
        <TextField label="Phone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} {...textFieldProps} />
        <Button variant="contained" onClick={handleAdd}>Add</Button>
      </Box>

      {editingClient && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Edit Client</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="First Name" value={editingClient.firstname} onChange={(e) => setEditingClient({ ...editingClient, firstname: e.target.value })} {...textFieldProps} />
            <TextField label="Last Name" value={editingClient.lastname} onChange={(e) => setEditingClient({ ...editingClient, lastname: e.target.value })} {...textFieldProps} />
            <TextField label="Email" value={editingClient.email} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })} {...textFieldProps} />
            <TextField label="Phone" value={editingClient.phone} onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} {...textFieldProps} />
            <Button variant="contained" onClick={handleUpdate}>Save</Button>
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
      {/* Import errors dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Import Errors</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>Some rows failed to import:</Typography>
          {importErrors.map((err) => (
            <Box key={err.row} sx={{ mb: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
              <Typography><strong>Row {err.row}:</strong> {err.reason}</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#666' }}>{err.raw}</Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}