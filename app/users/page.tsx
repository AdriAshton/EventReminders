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
  const [pkFilter, setPkFilter] = useState<number | string>("");
  const [fkFilter, setFkFilter] = useState<number | string>("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    roleid: 2,
    email: "",
    companyId: 1,
  });

  const [editingUser, setEditingUser] = useState<any | null>(null);
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
    const res = await addUser(newUser);

    if (res.error) {
      setError(res.error);
    } else {
      await loadUsers();
      setNewUser({
        username: "",
        password: "",
        roleid: 2,
        email: "",
        companyId: 1,
      });
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

    if (isChangingPassword) {
      if (!editingUser.password) {
        setError("New password is required");
        return;
      }

      if (editingUser.password !== editingUser.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    const userToUpdate = {
      userid: editingUser.userid,
      username: editingUser.username,
      email: editingUser.email,
      roleid: editingUser.roleid,
      companyId: editingUser.companyId,
      ...(isChangingPassword ? { password: editingUser.password } : {}),
    };

    const res = await updateUser(userToUpdate);

    if (res.error) {
      setError(res.error);
    } else {
      await loadUsers();
      setEditingUser(null);
      setIsChangingPassword(false);
      setToast({ open: true, message: "User updated successfully", severity: "success" });
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
        Users
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="users-pk-filter">Primary Key</InputLabel>
          <Select labelId="users-pk-filter" value={pkFilter} label="Primary Key" onChange={(e)=>{const v = e.target.value as unknown as string; setPkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
            <MenuItem value="">All</MenuItem>
            {users.map(u => <MenuItem key={u.userid} value={u.userid}>{String(u.userid)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="users-fk-filter">Foreign Key (companyId)</InputLabel>
          <Select labelId="users-fk-filter" value={fkFilter} label="Foreign Key (companyId)" onChange={(e)=>{const v = e.target.value as unknown as string; setFkFilter(v===""?"":Number(v))}} sx={{ color: '#000', backgroundColor: '#fff' }}>
            <MenuItem value="">All</MenuItem>
            {[...new Set(users.map(u => u.companyid))].map(cid => <MenuItem key={cid} value={cid}>{String(cid)}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

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
            {users
              .filter((u) => (pkFilter === "" ? true : u.userid === pkFilter))
              .filter((u) => (fkFilter === "" ? true : u.companyid === fkFilter))
              .map((user) => (
              <TableRow
                key={user.userid}
                hover
                selected={editingUser?.userid === user.userid}
                onClick={() => {
                  setEditingUser({ ...normalizeUser(user), password: "", confirmPassword: "" });
                  setIsChangingPassword(false);
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
        Add User
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
          label="Username"
          value={newUser.username}
          onChange={(e) =>
            setNewUser({
              ...newUser,
              username: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <TextField
          label="Email"
          value={newUser.email}
          onChange={(e) =>
            setNewUser({
              ...newUser,
              email: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <FormControl>
          <InputLabel id="new-user-role-label">Role</InputLabel>
          <Select
            labelId="new-user-role-label"
            value={newUser.roleid}
            label="Role"
            onChange={(e) =>
              setNewUser({
                ...newUser,
                roleid: Number(e.target.value),
              })
            }
          >
            {ROLE_OPTIONS.map((role) => (
              <MenuItem key={role.roleid} value={role.roleid}>
                {role.rolename}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Password"
          type="password"
          value={newUser.password}
          onChange={(e) =>
            setNewUser({
              ...newUser,
              password: e.target.value,
            })
          }
          {...textFieldProps}
        />

        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>

      {editingUser && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Edit User
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <TextField
              label="Username"
              value={editingUser.username}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  username: e.target.value,
                })
              }
              {...textFieldProps}
            />

            <TextField
              label="Email"
              value={editingUser.email}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  email: e.target.value,
                })
              }
              {...textFieldProps}
            />

            <FormControl>
              <InputLabel id="editing-user-role-label">Role</InputLabel>
              <Select
                labelId="editing-user-role-label"
                value={editingUser.roleid ?? ""}
                label="Role"
                onChange={(e) =>
                  setEditingUser({
                    ...editingUser,
                    roleid: Number(e.target.value),
                  })
                }
              >
                {ROLE_OPTIONS.map((role) => (
                  <MenuItem key={role.roleid} value={role.roleid}>
                    {role.rolename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              onClick={() =>
                setIsChangingPassword((currentValue) => !currentValue)
              }
            >
              Change Password
            </Button>

            {isChangingPassword && (
              <>
                <TextField
                  label="New Password"
                  type="password"
                  value={editingUser.password ?? ""}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      password: e.target.value,
                    })
                  }
                  {...textFieldProps}
                />

                <TextField
                  label="Confirm Password"
                  type="password"
                  value={editingUser.confirmPassword ?? ""}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      confirmPassword: e.target.value,
                    })
                  }
                  {...textFieldProps}
                />
              </>
            )}

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
