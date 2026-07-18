"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
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
  getClientFilterValues,
  addClient,
  deleteClient,
  deleteClients,
  updateClient,
} from "@/services/clientService";

export default function ClientsPage() {
  const router = useRouter();
  const [themeColor, setThemeColor] = useState<"purple" | "red" | "green">("purple");
  const [clients, setClients] = useState<any[]>([]);
  const [firstNameFilter, setFirstNameFilter] = useState<string>("");
  const [lastNameFilter, setLastNameFilter] = useState<string>("");
  const [draftFirstNameFilter, setDraftFirstNameFilter] = useState<string>("");
  const [draftLastNameFilter, setDraftLastNameFilter] = useState<string>("");
  const [sortField, setSortField] = useState<"firstname" | "lastname" | "birthdate">("firstname");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [filterValues, setFilterValues] = useState<{ firstnames: string[]; lastnames: string[] }>({
    firstnames: [],
    lastnames: [],
  });
  const [newClient, setNewClient] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    birthdate: "",
    companyId: 1,
  });

  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );
  const [importErrors, setImportErrors] = useState<Array<{row:number,reason:string,raw?:string}>>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const paginationSelectedColor = {
    purple: "#5b5fe8",
    red: "#e11d48",
    green: "#16a34a",
  }[themeColor];

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

  function formatPhoneForEdit(phone: string | null | undefined) {
    if (!phone) return "";
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, digits.length - 4)}-${digits.slice(-4)}`;
  }

  function normalizePhone(phone: string | null | undefined) {
    return phone ? String(phone).replace(/\D/g, "") : "";
  }

  function formatBirthdateForEdit(birthdate: string | null | undefined) {
    if (!birthdate) return "";
    const raw = String(birthdate).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }

    const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) {
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${parts[3]}-${month}-${day}`;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function formatBirthdateDisplay(birthdate: string | null | undefined) {
    if (!birthdate) return "";
    const raw = String(birthdate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toISOString().slice(0, 10);
  }

  function isFutureBirthdate(birthdate: string | null | undefined) {
    if (!birthdate) return false;
    const date = new Date(String(birthdate));
    if (Number.isNaN(date.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date > today;
  }

  function handleSort(field: "firstname" | "lastname" | "birthdate") {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "birthdate" ? "asc" : "asc");
  }

  function compareValues(left: any, right: any) {
    const leftText = String(left || "").trim().toLowerCase();
    const rightText = String(right || "").trim().toLowerCase();
    return leftText.localeCompare(rightText);
  }

  function normalizeText(value: string) {
    return String(value || "").trim();
  }

  function matchesFirstName(candidate: any) {
    return firstNameFilter === "" ? true : normalizeText(candidate.firstname) === firstNameFilter;
  }

  function matchesLastName(candidate: any) {
    return lastNameFilter === "" ? true : normalizeText(candidate.lastname) === lastNameFilter;
  }

  function normalizeDistinctValues(values: unknown) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((value) => normalizeText(String(value))).filter(Boolean))].sort(compareValues);
  }

  const firstNameOptions = normalizeDistinctValues(filterValues.firstnames);
  const lastNameOptions = normalizeDistinctValues(filterValues.lastnames);

  const sortedClients = [...clients]
    .filter(matchesFirstName)
    .filter(matchesLastName)
    .sort((left, right) => {
      const firstNameCompare = compareValues(left.firstname, right.firstname);
      const lastNameCompare = compareValues(left.lastname, right.lastname);

      const birthdateCompare = (() => {
        const leftDate = left.birthdate ? new Date(left.birthdate).getTime() : 0;
        const rightDate = right.birthdate ? new Date(right.birthdate).getTime() : 0;
        return leftDate - rightDate;
      })();

      let result = 0;
      if (sortField === "firstname") {
        result = firstNameCompare || lastNameCompare || birthdateCompare;
      } else if (sortField === "lastname") {
        result = lastNameCompare || firstNameCompare || birthdateCompare;
      } else if (sortField === "birthdate") {
        result = birthdateCompare || firstNameCompare || lastNameCompare;
      }

      return sortDirection === "asc" ? result : -result;
    });

  useEffect(() => {
    loadClients(page);
  }, [page]);

  useEffect(() => {
    loadFilterValues();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveThemeColor = () => {
      const stored = localStorage.getItem("themeColor") || localStorage.getItem("theme");
      if (stored === "red" || stored === "green" || stored === "purple") {
        return stored;
      }
      return "purple";
    };

    const syncTheme = () => setThemeColor(resolveThemeColor());

    syncTheme();
    window.addEventListener("theme-change", syncTheme);
    return () => window.removeEventListener("theme-change", syncTheme);
  }, []);

  useEffect(() => {
    // read the edit query param from the browser location (client-only)
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const edit = params.get("edit");
    if (edit && clients.length) {
      const found = clients.find((c) => String(c.clientid) === edit);
      if (found) {
        setEditingClient({
          ...found,
          phone: formatPhoneForEdit(found.phone),
          birthdate: formatBirthdateForEdit(found.birthdate),
        });
      }
    }
  }, [clients]);

  async function loadClients(pageParam: number = page) {
    setLoading(true);
    const data = await getClients(pageParam, pageSize, {
      firstname: firstNameFilter,
      lastname: lastNameFilter,
    });

    if (data.error) {
      setError(data.error);
    } else {
      // data -> { rows, total }
      setClients(data.rows || []);
      setTotal(data.total || 0);
      setError(null);
    }

    setLoading(false);
  }

  async function loadFilterValues(firstName = firstNameFilter, lastName = lastNameFilter) {
    setLoading(true);
    const searchParams = new URLSearchParams({ distinct: "1" });
    if (firstName) searchParams.set("firstname", firstName);
    if (lastName) searchParams.set("lastname", lastName);

    const data = await getClientFilterValues(searchParams);

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setFilterValues({
      firstnames: Array.isArray(data.firstnames) ? data.firstnames : [],
      lastnames: Array.isArray(data.lastnames) ? data.lastnames : [],
    });

    setLoading(false);
  }

  async function loadFilteredClients(firstName: string, lastName: string) {
    await Promise.all([
      loadClients(1),
      loadFilterValues(firstName, lastName),
    ]);
    setPage(1);
  }

  async function refreshFilteredClients(nextFirstName: string, nextLastName: string) {
    await loadFilteredClients(nextFirstName, nextLastName);
  }

  async function handleAdd() {
    setDialogError(null);

    if (!String(newClient.firstname || "").trim()) {
      const message = "First name is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (!String(newClient.lastname || "").trim()) {
      const message = "Last name is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (!String(newClient.email || "").trim()) {
      const message = "Email is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (!String(newClient.phone || "").trim()) {
      const message = "Phone is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (!String(newClient.birthdate || "").trim()) {
      const message = "Birthdate is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (isFutureBirthdate(newClient.birthdate)) {
      const message = "Birthdate cannot be in the future";
      setDialogError(message);
      setError(message);
      return;
    }

    const res = await addClient(newClient);

    if (res.error) {
      setError(res.error);
      setDialogError(res.error);
    } else {
      await loadClients();
      await loadFilterValues();

      setNewClient({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        birthdate: "",
        companyId: 1,
      });
      setAddDialogOpen(false);
      setToast({ open: true, message: "Client created successfully", severity: "success" });
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteClient(id);

    if (res.error) {
      setError(res.error);
    } else {
      await loadClients();
      await loadFilterValues();
      setToast({ open: true, message: "Client deleted successfully", severity: "success" });
    }
  }

  async function handleUpdate() {
    if (!editingClient) return;

    setDialogError(null);

    if (!String(editingClient.firstname || "").trim()) {
      const message = "First name is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (!String(editingClient.lastname || "").trim()) {
      const message = "Last name is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (!String(editingClient.email || "").trim()) {
      const message = "Email is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (!String(editingClient.phone || "").trim()) {
      const message = "Phone is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (!String(editingClient.birthdate || "").trim()) {
      const message = "Birthdate is required";
      setDialogError(message);
      setError(message);
      return;
    }

    if (isFutureBirthdate(editingClient.birthdate)) {
      const message = "Birthdate cannot be in the future";
      setDialogError(message);
      setError(message);
      return;
    }

    const res = await updateClient({
      ...editingClient,
      phone: normalizePhone(editingClient.phone),
    });

    if (res.error) {
      setError(res.error);
      setDialogError(res.error);
    } else {
      await loadClients();
      await loadFilterValues();
      setEditingClient(null);
      setToast({ open: true, message: "Client updated successfully", severity: "success" });
    }
  }

  async function handleDownloadImportTemplate() {
    try {
      const xlsx = await import('xlsx');
      const rows = [
        {
          firstname: 'John',
          lastname: 'Smith',
          email: 'john.smith@example.com',
          phone: '15551234567',
          birthdate: '1990-12-04',
        },
      ];

      const worksheet = xlsx.utils.json_to_sheet(rows, {
        header: ['firstname', 'lastname', 'email', 'phone', 'birthdate'],
      });
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Clients');

      const workbookArray = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([workbookArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'client_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ open: true, message: 'Failed to generate template. Ensure "xlsx" is installed.', severity: 'error' });
    }
  }

  function applyFilters() {
    setFirstNameFilter(draftFirstNameFilter);
    setLastNameFilter(draftLastNameFilter);
    refreshFilteredClients(draftFirstNameFilter, draftLastNameFilter);
  }

  function clearFilters() {
    setDraftFirstNameFilter("");
    setDraftLastNameFilter("");
    setFirstNameFilter("");
    setLastNameFilter("");
    refreshFilteredClients("", "");
  }

  function handleFirstNameDraftChange(value: string) {
    setDraftFirstNameFilter(value);
    setFirstNameFilter(value);
    setLastNameFilter(draftLastNameFilter);
    refreshFilteredClients(value, draftLastNameFilter);
  }

  function handleLastNameDraftChange(value: string) {
    setDraftLastNameFilter(value);
    setFirstNameFilter(draftFirstNameFilter);
    setLastNameFilter(value);
    refreshFilteredClients(draftFirstNameFilter, value);
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

  const dialogTextFieldProps = {
    slotProps: {
      input: {
        sx: {
          color: "#111827",
          "& input": {
            color: "#111827",
            WebkitTextFillColor: "#111827",
          },
        },
      },
      inputLabel: {
        sx: {
          color: "#4b5563",
          fontWeight: 600,
          "&.Mui-focused": {
            color: "#111827",
          },
        },
        shrink: true,
      },
    },
  };

  const dialogDateFieldProps = {
    ...dialogTextFieldProps,
    slotProps: {
      ...dialogTextFieldProps.slotProps,
      input: {
        sx: {
          color: "#111827",
          "& input": {
            color: "#111827",
            WebkitTextFillColor: "#111827",
          },
          "& input::-webkit-datetime-edit": {
            color: "#111827",
          },
          "& input::-webkit-datetime-edit-text": {
            color: "#111827",
          },
          "& input::-webkit-datetime-edit-month-field": {
            color: "#111827",
          },
          "& input::-webkit-datetime-edit-day-field": {
            color: "#111827",
          },
          "& input::-webkit-datetime-edit-year-field": {
            color: "#111827",
          },
        },
      },
      inputLabel: {
        sx: {
          color: "#4b5563",
          fontWeight: 600,
          "&.Mui-focused": {
            color: "#111827",
          },
        },
        shrink: true,
      },
    },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Clients
      </Typography>

    
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        This screen shows the list of clients with options to add, import, filter, and bulk-manage clients.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => router.push("/dashboard")}>Back</Button>
        <Button variant="outlined" onClick={handleDownloadImportTemplate}>Download Template</Button>
        <Button variant="contained" onClick={() => setAddDialogOpen(true)}>Add Client</Button>
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
              const required = ['firstname','lastname','email','phone','birthdate'];
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
                if (!r.firstname || !r.lastname || !r.email || !r.birthdate) {
                  failures.push({ row: rowIndex, reason: 'Missing required fields', raw: JSON.stringify(r) });
                  rowIndex++;
                  continue;
                }
                try {
                  const res = await addClient({ firstname: r.firstname, lastname: r.lastname, email: r.email, phone: r.phone || '', birthdate: r.birthdate, companyId: Number(r.companyid) || 1 });
                  if ((res as any).error) failures.push({ row: rowIndex, reason: (res as any).error, raw: JSON.stringify(r) }); else success++;
                } catch (err: any) {
                  failures.push({ row: rowIndex, reason: err?.message || 'Unknown error', raw: JSON.stringify(r) });
                }
                rowIndex++;
              }
              await loadClients(1);
              await loadFilterValues();
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
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="first-name-filter-label">First Name</InputLabel>
            <Select
              labelId="first-name-filter-label"
              value={draftFirstNameFilter}
              label="First Name"
              onChange={(e) => handleFirstNameDraftChange(String(e.target.value))}
              sx={{ color: '#000', backgroundColor: '#fff' }}
            >
              <MenuItem value="">All</MenuItem>
              {firstNameOptions.map((name) => (
                <MenuItem key={String(name)} value={String(name)}>{String(name)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="last-name-filter-label">Last Name</InputLabel>
            <Select
              labelId="last-name-filter-label"
              value={draftLastNameFilter}
              label="Last Name"
              onChange={(e) => handleLastNameDraftChange(String(e.target.value))}
              sx={{ color: '#000', backgroundColor: '#fff' }}
            >
              <MenuItem value="">All</MenuItem>
              {lastNameOptions.map((name) => (
                <MenuItem key={String(name)} value={String(name)}>{String(name)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={applyFilters}>Apply Filters</Button>
          <Button variant="outlined" onClick={clearFilters}>Clear</Button>
        </Box>

        <Pagination count={Math.max(1, Math.ceil(total / pageSize))} page={page} onChange={(_, value) => { setPage(value); loadClients(value); }} sx={{ '& .MuiPaginationItem-root': { color: '#000', backgroundColor: '#fff' }, '& .Mui-selected': { backgroundColor: `${paginationSelectedColor} !important`, color: '#fff' }, boxShadow: 1, borderRadius: 1 }} showFirstButton showLastButton />
      </Box>

      <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={28} />
            <Typography sx={{ ml: 2 }} color="text.secondary">
              Loading clients...
            </Typography>
          </Box>
        )}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox indeterminate={selectedIds.length > 0 && selectedIds.length < clients.length} checked={clients.length > 0 && selectedIds.length === clients.length} onChange={(e) => { if (e.target.checked) setSelectedIds(clients.map((c) => c.clientid)); else setSelectedIds([]); }} /></TableCell>
              <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort("firstname")}>
                First Name{sortField === "firstname" ? (sortDirection === "asc" ? " ▲" : " ▼") : ""}
              </TableCell>
              <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort("lastname")}>
                Last Name{sortField === "lastname" ? (sortDirection === "asc" ? " ▲" : " ▼") : ""}
              </TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort("birthdate")}>
                Birthdate{sortField === "birthdate" ? (sortDirection === "asc" ? " ▲" : " ▼") : ""}
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No clients to display.
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((c) => (
              <TableRow
                key={c.clientid}
                hover
                selected={editingClient?.clientid === c.clientid}
                onDoubleClick={() => setEditingClient(c)}
                sx={{ cursor: 'pointer', '&.Mui-selected': { backgroundColor: '#1e88e5', color: '#fff' } }}
              >
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.includes(c.clientid)} onChange={(e) => { const checked = e.target.checked; setSelectedIds((prev) => checked ? [...prev, c.clientid] : prev.filter(id => id !== c.clientid)); }} /></TableCell>
                <TableCell>{c.firstname}</TableCell>
                <TableCell>{c.lastname}</TableCell>
                <TableCell>{maskEmail(c.email)}</TableCell>
                <TableCell>{maskPhone(c.phone)}</TableCell>
                <TableCell>{formatBirthdateDisplay(c.birthdate)}</TableCell>
                <TableCell align="right">
                  <Button color="error" onClick={(e) => { e.stopPropagation(); if (!window.confirm("Are you sure you want to delete this client?")) return; handleDelete(c.clientid); }}>Delete</Button>
                  <Button onClick={(e) => { e.stopPropagation(); setEditingClient(c); }}>View/Edit</Button>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={confirmBulkOpen}
        onClose={() => setConfirmBulkOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "#fff",
              color: "#111827",
              opacity: 1,
              boxShadow: 24,
            },
          },
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete {selectedIds.length} selected clients? This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmBulkOpen(false)}>Cancel</Button>
          <Button color="error" onClick={async () => { setConfirmBulkOpen(false); const res = await deleteClients(selectedIds); if ((res as any).error) { setError((res as any).error); } else { setToast({ open: true, message: `Deleted ${res.deleted || selectedIds.length} clients`, severity: 'success' }); setSelectedIds([]); await loadClients(1); await loadFilterValues(); } }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, px: 2 }}>
        <Pagination
          count={Math.max(1, Math.ceil(total / pageSize))}
          page={page}
          onChange={(_, value) => { setPage(value); loadClients(value); }}
          sx={{
            '& .MuiPagination-ul': {
              justifyContent: 'center',
              gap: 0.5,
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

      {editingClient && (
        <Dialog
          open={Boolean(editingClient)}
          onClose={() => {
            setEditingClient(null);
            setDialogError(null);
          }}
          fullWidth
          maxWidth="sm"
          slotProps={{
            paper: {
              sx: {
                backgroundColor: "#fff",
                color: "#111827",
                opacity: 1,
                boxShadow: 24,
              },
            },
          }}
        >
          <DialogTitle>Edit Client</DialogTitle>
          <DialogContent>
            {dialogError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {dialogError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 2, pt: 1, flexWrap: 'wrap' }}>
              <TextField label="First Name" value={editingClient.firstname} onChange={(e) => { setDialogError(null); setEditingClient({ ...editingClient, firstname: e.target.value }); }} required {...dialogTextFieldProps} />
              <TextField label="Last Name" value={editingClient.lastname} onChange={(e) => { setDialogError(null); setEditingClient({ ...editingClient, lastname: e.target.value }); }} required {...dialogTextFieldProps} />
              <TextField label="Email" value={editingClient.email} onChange={(e) => { setDialogError(null); setEditingClient({ ...editingClient, email: e.target.value }); }} helperText="Expected format: name@example.com" required {...dialogTextFieldProps} />
              <TextField
                label="Phone"
                value={formatPhoneForEdit(editingClient.phone)}
                onChange={(e) => { setDialogError(null); setEditingClient({ ...editingClient, phone: normalizePhone(e.target.value) }); }}
                required
                {...dialogTextFieldProps}
              />
              <TextField
                label="Birthdate"
                type="date"
                value={formatBirthdateForEdit(editingClient.birthdate)}
                onChange={(e) => { setDialogError(null); setEditingClient({ ...editingClient, birthdate: e.target.value }); }}
                required
                {...dialogDateFieldProps}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setEditingClient(null); setDialogError(null); }}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdate}>Save</Button>
          </DialogActions>
        </Dialog>
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
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "#fff",
              color: "#111827",
              opacity: 1,
              boxShadow: 24,
            },
          },
        }}
      >
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

      <Dialog
        open={addDialogOpen}
        onClose={() => { setAddDialogOpen(false); setDialogError(null); }}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "#fff",
              color: "#111827",
              opacity: 1,
              boxShadow: 24,
            },
          },
        }}
      >
        <DialogTitle>Add Client</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 2, pt: 1, flexWrap: 'wrap' }}>
            <TextField label="First Name" value={newClient.firstname} onChange={(e) => { setDialogError(null); setNewClient({ ...newClient, firstname: e.target.value }); }} required {...dialogTextFieldProps} />
            <TextField label="Last Name" value={newClient.lastname} onChange={(e) => { setDialogError(null); setNewClient({ ...newClient, lastname: e.target.value }); }} required {...dialogTextFieldProps} />
            <TextField label="Email" value={newClient.email} onChange={(e) => { setDialogError(null); setNewClient({ ...newClient, email: e.target.value }); }} helperText="Expected format: name@example.com" required {...dialogTextFieldProps} />
            <TextField
              label="Phone"
              value={formatPhoneForEdit(newClient.phone)}
              onChange={(e) => { setDialogError(null); setNewClient({ ...newClient, phone: normalizePhone(e.target.value) }); }}
              required
              {...dialogTextFieldProps}
            />
            <TextField label="Birthdate" type="date" value={newClient.birthdate} onChange={(e) => { setDialogError(null); setNewClient({ ...newClient, birthdate: e.target.value }); }} required {...dialogDateFieldProps} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddDialogOpen(false); setDialogError(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}