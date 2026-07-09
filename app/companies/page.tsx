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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useRouter } from "next/navigation";
import { getStoredToken, isTokenExpired } from "@/lib/authClient";

import {
  getCompanies,
  addCompany,
  deleteCompany,
  updateCompany,
} from "@/services/CompanyService";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [newCompany, setNewCompany] = useState({
    companyname: "",
    contactemail: "",
    contactphone: "",
  });

  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      setError("Session expired. Please log in again.");
      router.replace("/login");
      return;
    }

    loadCompanies();
  }, [mounted, router]);

  async function loadCompanies() {
    const data = await getCompanies();

    if (data.error) {
      setError(data.error);
    } else {
      setCompanies(data);
      setError(null);
    }
  }

  async function handleAdd() {
    setDialogError(null);
    if (!newCompany.companyname.trim()) {
      setDialogError("Company name is required");
      return;
    }
    if (!newCompany.contactemail.trim()) {
      setDialogError("Contact email is required");
      return;
    }
    if (!newCompany.contactphone.trim()) {
      setDialogError("Contact phone is required");
      return;
    }
    const res = await addCompany(newCompany);

    if (res.error) {
      setDialogError(res.error);
    } else {
      await loadCompanies();

      setNewCompany({
        companyname: "",
        contactemail: "",
        contactphone: "",
      });
      setAddDialogOpen(false);
      setToast({ open: true, message: "Company created successfully", severity: "success" });
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteCompany(id);

    if (res.error) {
      setError(res.error);
    } else {
      await loadCompanies();
      setToast({ open: true, message: "Company deleted successfully", severity: "success" });
    }
  }

  async function handleUpdate() {
    if (!editingCompany) return;

    setDialogError(null);

    if (!String(editingCompany.companyname || "").trim()) {
      setDialogError("Company name is required");
      return;
    }
    if (!String(editingCompany.contactemail || "").trim()) {
      setDialogError("Contact email is required");
      return;
    }
    if (!String(editingCompany.contactphone || "").trim()) {
      setDialogError("Contact phone is required");
      return;
    }

    const res = await updateCompany(editingCompany);

    if (res.error) {
      setDialogError(res.error);
    } else {
      await loadCompanies();
      setEditingCompany(null);
      setDialogError(null);
      setToast({ open: true, message: "Company updated successfully", severity: "success" });
    }
  }

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

  const dialogPaperProps = {
    sx: {
      backgroundColor: "#fff",
      color: "#111827",
      opacity: 1,
      boxShadow: 24,
    },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Companies
      </Typography>


    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
         <Button variant="outlined" onClick={() => router.push("/dashboard")}>Back</Button>
         <Button variant="contained" onClick={() => setAddDialogOpen(true)}>Add Company</Button>
    </Box>

   

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

  

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company Name</TableCell>
              <TableCell>Contact Email</TableCell>
              <TableCell>Contact Phone</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {companies.map((company) => (
              <TableRow
                key={company.companyid}
                hover
                selected={editingCompany?.companyid === company.companyid}
                onDoubleClick={() => {
                  setEditingCompany(company);
                  setDialogError(null);
                }}
                sx={{
                  cursor: "pointer",
                  "&.Mui-selected": {
                    backgroundColor: "#1e88e5",
                    color: "#fff",
                  },
                }}
              >
                <TableCell>{company.companyname}</TableCell>
                <TableCell>{company.contactemail}</TableCell>
                <TableCell>{company.contactphone}</TableCell>

                <TableCell align="right">
                  <Button
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm("Are you sure you want to delete this company?")) {
                        return;
                      }
                      handleDelete(company.companyid);
                    }}
                  >
                    Delete
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCompany(company);
                      setDialogError(null);
                    }}
                  >
                    View/Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={addDialogOpen} onClose={() => { setAddDialogOpen(false); setDialogError(null); }} fullWidth maxWidth="sm" slotProps={{ paper: dialogPaperProps }}>
        <DialogTitle>Add Company</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Typography color="error" sx={{ mb: 2 }}>
              {dialogError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
            <TextField
              label="Company Name"
              value={newCompany.companyname}
              onChange={(e) => setNewCompany({ ...newCompany, companyname: e.target.value })}
              required
              {...dialogTextFieldProps}
            />
            <TextField
              label="Contact Email"
              value={newCompany.contactemail}
              onChange={(e) => setNewCompany({ ...newCompany, contactemail: e.target.value })}
              required
              {...dialogTextFieldProps}
            />
            <TextField
              label="Contact Phone"
              value={newCompany.contactphone}
              onChange={(e) => setNewCompany({ ...newCompany, contactphone: e.target.value })}
              required
              {...dialogTextFieldProps}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddDialogOpen(false); setDialogError(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Add Company</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editingCompany)} onClose={() => { setEditingCompany(null); setDialogError(null); }} fullWidth maxWidth="sm" slotProps={{ paper: dialogPaperProps }}>
        <DialogTitle>View/Edit Company</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Typography color="error" sx={{ mb: 2 }}>
              {dialogError}
            </Typography>
          )}
          {editingCompany && (
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
              <TextField
                label="Company Name"
                value={editingCompany.companyname}
                onChange={(e) => setEditingCompany({ ...editingCompany, companyname: e.target.value })}
                required
                {...dialogTextFieldProps}
              />
              <TextField
                label="Contact Email"
                value={editingCompany.contactemail ?? ""}
                onChange={(e) => setEditingCompany({ ...editingCompany, contactemail: e.target.value })}
                required
                {...dialogTextFieldProps}
              />
              <TextField
                label="Contact Phone"
                value={editingCompany.contactphone ?? ""}
                onChange={(e) => setEditingCompany({ ...editingCompany, contactphone: e.target.value })}
                required
                {...dialogTextFieldProps}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingCompany(null); setDialogError(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={!editingCompany}>Save</Button>
        </DialogActions>
      </Dialog>
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
