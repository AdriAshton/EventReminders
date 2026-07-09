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

import {
  getUsers,
  addUser,
  deleteUser,
  updateUser,
} from "@/services/userService";

const ROLE_OPTIONS = [
  { roleid: 1, rolename: "Administrator" },
  { roleid: 2, rolename: "Staff" },
];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [usernameFilter, setUsernameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [fkFilter, setFkFilter] = useState<number | string>("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    roleid: 2,
    email: "",
  });

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );

  useEffect(() => {
    loadUsers();
  }, []);

  function normalizeUser(user: any) {
    return {
      ...user,
      roleid: user.roleid ?? ROLE_OPTIONS.find((role) => role.rolename === user.role)?.roleid ?? ROLE_OPTIONS[1].roleid,
    };
  }

  const usernameOptions = [...new Set(users.map((user) => String(user.username || "").trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

  const emailOptions = [...new Set(users.map((user) => String(user.email || "").trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

  const filteredUsers = users.filter((user) => (usernameFilter === "" ? true : String(user.username || "") === usernameFilter))
    .filter((user) => (emailFilter === "" ? true : String(user.email || "") === emailFilter));

  const cascadedUsernameOptions = [...new Set(
    users
      .filter((user) => (emailFilter === "" ? true : String(user.email || "") === emailFilter))
      .map((user) => String(user.username || "").trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));

  const cascadedEmailOptions = [...new Set(
    users
      .filter((user) => (usernameFilter === "" ? true : String(user.username || "") === usernameFilter))
      .map((user) => String(user.email || "").trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));

  async function loadUsers() {
    const data = await getUsers();

    if (data.error) {
      setError(data.error);
    } else {
      setUsers((data || []).map(normalizeUser));
      setError(null);
    }
  }

  async function handleAdd() {
    setDialogError(null);
    const res = await addUser(newUser);

    if (res.error) {
      setDialogError(res.error);
    } else {
      await loadUsers();
      setNewUser({
        username: "",
        password: "",
        roleid: 2,
        email: "",
      });
      setAddDialogOpen(false);
      setToast({ open: true, message: "User created successfully", severity: "success" });
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteUser(id);

    if (res.error) {
      setError(res.error);
    } else {
      await loadUsers();
      setToast({ open: true, message: "User deleted successfully", severity: "success" });
    }
  }

  async function handleUpdate() {
    if (!editingUser) return;

    setDialogError(null);

    if (!String(editingUser.username || "").trim()) {
      setDialogError("Username is required");
      return;
    }

    if (!String(editingUser.email || "").trim()) {
      setDialogError("Email is required");
      return;
    }

    if (!editingUser.roleid && editingUser.roleid !== 0) {
      setDialogError("Role is required");
      return;
    }

    if (isChangingPassword) {
      if (!editingUser.password) {
        setDialogError("New password is required");
        return;
      }

      if (editingUser.password !== editingUser.confirmPassword) {
        setDialogError("Passwords do not match");
        return;
      }
    }

    const userToUpdate = {
      userid: editingUser.userid,
      username: editingUser.username,
      email: editingUser.email,
      roleid: editingUser.roleid,
      ...(isChangingPassword ? { password: editingUser.password } : {}),
    };

    const res = await updateUser(userToUpdate);

    if (res.error) {
      setDialogError(res.error);
    } else {
      await loadUsers();
      setEditingUser(null);
      setIsChangingPassword(false);
      setDialogError(null);
      setToast({ open: true, message: "User updated successfully", severity: "success" });
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
      <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
        Users
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={() => router.push("/dashboard")}>
            Back
          </Button>

          <Button variant="contained" onClick={() => setAddDialogOpen(true)}>
            Add Users
          </Button>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="users-username-filter">Username</InputLabel>
            <Select
              labelId="users-username-filter"
              value={usernameFilter}
              label="Username"
              onChange={(e) => setUsernameFilter(String(e.target.value))}
              sx={{ color: "#000", backgroundColor: "#fff" }}
            >
              <MenuItem value="">All</MenuItem>
              {cascadedUsernameOptions.map((username) => (
                <MenuItem key={username} value={username}>
                  {username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="users-email-filter">Email</InputLabel>
            <Select
              labelId="users-email-filter"
              value={emailFilter}
              label="Email"
              onChange={(e) => setEmailFilter(String(e.target.value))}
              sx={{ color: "#000", backgroundColor: "#fff" }}
            >
              <MenuItem value="">All</MenuItem>
              {cascadedEmailOptions.map((email) => (
                <MenuItem key={email} value={email}>
                  {email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
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
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow
                key={user.userid}
                hover
                selected={editingUser?.userid === user.userid}
                onDoubleClick={() => {
                  setEditingUser({ ...normalizeUser(user), password: "", confirmPassword: "" });
                  setIsChangingPassword(false);
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
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role || user.rolename}</TableCell>

                <TableCell align="right">
                  <Button
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm("Are you sure you want to delete this user?")) {
                        return;
                      }
                      handleDelete(user.userid);
                    }}
                  >
                    Delete
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingUser({ ...normalizeUser(user), password: "", confirmPassword: "" });
                      setIsChangingPassword(false);
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
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <Box sx={{ display: 'flex', gap: 2, pt: 1, flexWrap: 'wrap' }}>
            <TextField label="Username" value={newUser.username} onChange={(e) => { setDialogError(null); setNewUser({ ...newUser, username: e.target.value }); }} required {...dialogTextFieldProps} />
            <TextField label="Email" value={newUser.email} onChange={(e) => { setDialogError(null); setNewUser({ ...newUser, email: e.target.value }); }} required {...dialogTextFieldProps} />
            <FormControl required>
              <InputLabel id="new-user-role-label">Role</InputLabel>
              <Select
                labelId="new-user-role-label"
                value={newUser.roleid}
                label="Role"
                onChange={(e) => setNewUser({ ...newUser, roleid: Number(e.target.value) })}
              >
                {ROLE_OPTIONS.map((role) => (
                  <MenuItem key={role.roleid} value={role.roleid}>{role.rolename}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Password" type="password" value={newUser.password} onChange={(e) => { setDialogError(null); setNewUser({ ...newUser, password: e.target.value }); }} required {...dialogTextFieldProps} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddDialogOpen(false); setDialogError(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editingUser)} onClose={() => { setEditingUser(null); setIsChangingPassword(false); setDialogError(null); }} fullWidth maxWidth="sm" slotProps={{ paper: dialogPaperProps }}>
        <DialogTitle>View/Edit User</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          {editingUser && (
            <Box sx={{ display: 'flex', gap: 2, pt: 1, flexWrap: 'wrap' }}>
              <TextField label="Username" value={editingUser.username} onChange={(e) => { setDialogError(null); setEditingUser({ ...editingUser, username: e.target.value }); }} required {...dialogTextFieldProps} />
              <TextField label="Email" value={editingUser.email} onChange={(e) => { setDialogError(null); setEditingUser({ ...editingUser, email: e.target.value }); }} required {...dialogTextFieldProps} />
              <FormControl required>
                <InputLabel id="editing-user-role-label">Role</InputLabel>
                <Select
                  labelId="editing-user-role-label"
                  value={editingUser.roleid ?? ""}
                  label="Role"
                  onChange={(e) => setEditingUser({ ...editingUser, roleid: Number(e.target.value) })}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <MenuItem key={role.roleid} value={role.roleid}>{role.rolename}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" onClick={() => setIsChangingPassword((currentValue) => !currentValue)}>Change Password</Button>
              {isChangingPassword && (
                <>
                  <TextField label="New Password" type="password" value={editingUser.password ?? ""} onChange={(e) => { setDialogError(null); setEditingUser({ ...editingUser, password: e.target.value }); }} required {...dialogTextFieldProps} />
                  <TextField label="Confirm Password" type="password" value={editingUser.confirmPassword ?? ""} onChange={(e) => { setDialogError(null); setEditingUser({ ...editingUser, confirmPassword: e.target.value }); }} required {...dialogTextFieldProps} />
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingUser(null); setIsChangingPassword(false); setDialogError(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>Save</Button>
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
