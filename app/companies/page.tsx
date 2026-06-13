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
import { useRouter } from "next/navigation";

import {
  getCompanies,
  addCompany,
  deleteCompany,
  updateCompany,
} from "@/services/CompanyService";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [pkFilter, setPkFilter] = useState<number | string>("");
  const [newCompany, setNewCompany] = useState({
    companyname: "",
    contactemail: "",
    contactphone: "",
  });

  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );

  useEffect(() => {
    loadCompanies();
  }, []);

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
    const res = await addCompany(newCompany);

    if (res.error) {
      setError(res.error);
    } else {
      await loadCompanies();

      setNewCompany({
        companyname: "",
        contactemail: "",
        contactphone: "",
      });
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

    const res = await updateCompany(editingCompany);

    if (res.error) {
      setError(res.error);
    } else {
      await loadCompanies();
      setEditingCompany(null);
      setToast({ open: true, message: "Company updated successfully", severity: "success" });
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
      <Button variant="outlined" onClick={() => router.push("/dashboard")} sx={{ mb: 2 }}>
        Back
      </Button>

      <Typography variant="h4" gutterBottom>
        Companies
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="companies-pk-filter">Primary Key</InputLabel>
          <Select labelId="companies-pk-filter" value={pkFilter} label="Primary Key" onChange={(e)=>{const v = e.target.value as unknown as string; setPkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
            <MenuItem value="">All</MenuItem>
            {companies.map(c => <MenuItem key={c.companyid} value={c.companyid}>{String(c.companyid)}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

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
            {companies
              .filter((c) => (pkFilter === "" ? true : c.companyid === pkFilter))
              .map((company) => (
              <TableRow
                key={company.companyid}
                hover
                selected={editingCompany?.companyid === company.companyid}
                onClick={() => setEditingCompany(company)}
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
                    }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" gutterBottom>
        Add Company
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 4,
          flexWrap: "wrap",
        }}
      >
        <TextField
          label="Company Name"
          value={newCompany.companyname}
          onChange={(e) =>
            setNewCompany({
              ...newCompany,
              companyname: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <TextField
          label="Contact Email"
          value={newCompany.contactemail}
          onChange={(e) =>
            setNewCompany({
              ...newCompany,
              contactemail: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <TextField
          label="Contact Phone"
          value={newCompany.contactphone}
          onChange={(e) =>
            setNewCompany({
              ...newCompany,
              contactphone: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>

      {editingCompany && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Edit Company
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <TextField
              label="Company Name"
              value={editingCompany.companyname}
              onChange={(e) =>
                setEditingCompany({
                  ...editingCompany,
                  companyname: e.target.value,
                })
              }
              {...textFieldProps}
            />

            <TextField
              label="Contact Email"
              value={editingCompany.contactemail ?? ""}
              onChange={(e) =>
                setEditingCompany({
                  ...editingCompany,
                  contactemail: e.target.value,
                })
              }
              {...textFieldProps}
            />

            <TextField
              label="Contact Phone"
              value={editingCompany.contactphone ?? ""}
              onChange={(e) =>
                setEditingCompany({
                  ...editingCompany,
                  contactphone: e.target.value,
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
