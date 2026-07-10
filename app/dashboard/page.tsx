"use client";
import { Box, Card, CardContent, Typography, Button, List, ListItem, ListItemText, Divider, Avatar, Chip, Stack, useTheme, Paper } from "@mui/material";
import { useEffect, useState } from "react";
import { clearStoredToken, getStoredToken, getTokenPayload } from "@/lib/authClient";
import { getClients } from "@/services/clientService";
import { getReminders } from "@/services/reminderServices";
import { getMessages } from "@/services/messageService";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const theme = useTheme();
  const [totalClients, setTotalClients] = useState<number>(0);
  const [totalBirthdays, setTotalBirthdays] = useState<number>(0);
  const [todayBirthdays, setTodayBirthdays] = useState<number>(0);
  const [upcomingBirthdayCount, setUpcomingBirthdayCount] = useState<number>(0);
  const [emailsSentLast7Days, setEmailsSentLast7Days] = useState<number>(0);
  const [activeReminders, setActiveReminders] = useState<number>(0);
  const [isAdministrator, setIsAdministrator] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");

  const [clientsRows, setClientsRows] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);

  function formatDate(value: string | Date | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  function getBirthdayDate(client: any) {
    const birthdate = client?.birthdate;
    if (!birthdate) return null;

    const date = new Date(birthdate);
    if (Number.isNaN(date.getTime())) return null;

    const now = new Date();
    const candidate = new Date(now.getFullYear(), date.getMonth(), date.getDate());
    if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }
    return candidate;
  }

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      const decoded = getTokenPayload(token);
      if (decoded) {
        const role = String(decoded.role || "").toLowerCase();
        setIsAdministrator(role === "administrator" || role === "owner");
        setUsername(String(decoded.username || ""));
      } else {
        setIsAdministrator(false);
        setUsername("");
      }
    }

    async function load() {
      try {
        const clients = await getClients(1, 1000);
        const clientsRows = clients.rows || clients;
        setClientsRows(clientsRows || []);
        setTotalClients(clients.total || (clientsRows ? clientsRows.length : 0));

        const clientsMap: Record<number, string> = {};
        (clientsRows || []).forEach((c: any) => {
          clientsMap[c.clientid || c.ClientId || c.clientId || c.ClientId] = c.firstname || c.firstName || `${c.firstname || c.firstName || ''}` || `${c.clientid}`;
        });

        const birthdayClients = (clientsRows || []).filter((client: any) => client.birthdate);
        setTotalBirthdays(birthdayClients.length);

        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 7);

        const upcoming = birthdayClients
          .map((client: any) => {
            const birthdayDate = getBirthdayDate(client);
            return birthdayDate ? { ...client, birthdayDate } : null;
          })
          .filter(Boolean)
          .filter((client: any) => client.birthdayDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && client.birthdayDate <= endDate)
          .sort((left: any, right: any) => left.birthdayDate.getTime() - right.birthdayDate.getTime());

        setTodayBirthdays(
          upcoming.filter((client: any) => client.birthdayDate.toDateString() === new Date().toDateString()).length,
        );
        setUpcomingBirthdayCount(upcoming.length);
        setUpcomingBirthdays(upcoming.slice(0, 5));

        const messages = await getMessages(1, 1000);
        const messageRows = messages.rows || [];
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);

        setEmailsSentLast7Days(
          messageRows.filter((message: any) => {
            const sentAt = message.sentat || message.sentAt;
            if (!sentAt) return false;
            const sentDate = new Date(sentAt);
            return !Number.isNaN(sentDate.getTime())
              && sentDate >= sevenDaysAgo
              && sentDate <= now
              && String(message.channel || '').toLowerCase() === 'email'
              && String(message.status || '').toLowerCase() === 'sent';
          }).length,
        );

        const reminders = await getReminders(1, 5);
        setActiveReminders(reminders.total || (reminders.rows ? reminders.rows.length : 0));

      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, []);

  const handleLogout = () => {
    clearStoredToken();
    router.push("/login");
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, md: 2.75 },
          borderRadius: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light || theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
          color: '#fff',
          boxShadow: '0 12px 28px rgba(31,41,55,0.16)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5 }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 0.25, color: '#fff', fontWeight: 800 }}>
              Company Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)' }}>
              Manage clients, birthdays and messaging from one place.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Chip
            avatar={
              <Avatar sx={{ bgcolor: "#1976d2", color: "#fff", fontWeight: 700 }}>
                {username ? username.charAt(0).toUpperCase() : "U"}
              </Avatar>
            }
            label={username ? `LOGGED IN AS ${username.toUpperCase()}` : "LOGGED IN"}
            variant="filled"
            sx={{
              fontWeight: 700,
              color: "#fff",
              bgcolor: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              height: 34,
              '& .MuiChip-label': {
                color: '#fff',
              },
            }}
          />

          <Button
            variant="contained"
            onClick={() => router.push('/settings')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.95)',
              color: theme.palette.primary.main,
              fontWeight: 800,
              boxShadow: '0 6px 16px rgba(15,23,42,0.18)',
              minWidth: 96,
              '&:hover': {
                bgcolor: '#fff',
                color: theme.palette.primary.dark || theme.palette.primary.main,
              },
            }}
          >
            Settings
          </Button>
          <Button
            variant="contained"
            onClick={handleLogout}
            sx={{
              bgcolor: '#111827',
              color: '#fff',
              fontWeight: 800,
              boxShadow: '0 6px 16px rgba(15,23,42,0.22)',
              minWidth: 96,
              '&:hover': {
                bgcolor: '#000',
              },
            }}
          >
            Logout
          </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 3 }}>
        {/* Clients */}
      <Box>
          <Card sx={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: theme.palette.primary.main }}>C</Avatar>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Clients</Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5, mb: 1, color: 'text.secondary' }}>
                Manage your client records
              </Typography>
              <Button href="/clients" variant="contained" sx={{ mt: 2, bgcolor: theme.palette.primary.main }}>
                View All
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Birthdays */}
        <Box>
          <Card sx={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'rgba(236,72,153,0.12)', color: theme.palette.secondary.main }}>🎂</Avatar>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Birthdays</Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5, mb: 1, color: 'text.secondary' }}>
                View upcoming birthdays and reminder records
              </Typography>
              <Button href="/reminders" variant="contained" sx={{ mt: 2, bgcolor: theme.palette.secondary.main }}>
                View Reminders
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Messages */}
        <Box>
          <Card sx={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'rgba(14,165,233,0.12)', color: '#0f766e' }}>✉</Avatar>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Messaging</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Configure reusable birthday message templates with placeholder preview.
              </Typography>
              <Button variant="outlined" onClick={() => router.push('/templates')}>
                Open Template Editor
              </Button>
            </CardContent>
          </Card>
        </Box>

        {isAdministrator && (
          <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
            <Card sx={{ height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'rgba(34,197,94,0.12)', color: '#166534' }}>⚙</Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Setup/Security</Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Company settings and user management</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  <Button variant="contained" onClick={() => router.push('/companies')}>
                    Companies
                  </Button>
                  <Button variant="outlined" onClick={() => router.push('/users')}>
                    Users
                  </Button>
                  <Button variant="outlined" onClick={() => router.push('/users/invites')}>
                    Send Invite
                  </Button>
                  <Button variant="outlined" onClick={() => router.push('/settings/email')}>
                    Email Provider
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr 0.85fr' }, gap: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'rgba(236,72,153,0.12)', color: theme.palette.secondary.main }}>🎂</Avatar>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Upcoming Birthdays</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Next 7 days
            </Typography>
            <Divider sx={{ my: 1 }} />
            <List>
              {upcomingBirthdays.length ? (
                upcomingBirthdays.map((client: any) => (
                  <ListItem key={client.clientid} sx={{ px: 0 }}>
                    <ListItemText
                      slotProps={{
                        primary: { component: 'div' },
                        secondary: { component: 'div' },
                      }}
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: 700 }}>{`${client.firstname || 'Client'} ${client.lastname || ''}`.trim()}</Typography>
                          <Chip size="small" label={client.birthdayDate.toDateString() === new Date().toDateString() ? 'Today' : 'Soon'} />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">{formatDate(client.birthdayDate)}</Typography>
                          <Typography variant="body2" color="text.secondary">{client.birthdayDate.toDateString() === new Date().toDateString() ? 'Due now' : 'Scheduled'}</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="🎉 No birthdays in the next 7 days"
                    secondary="All reminders are up to date."
                  />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'rgba(15,118,110,0.12)', color: '#0f766e' }}>📊</Avatar>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Summary</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Quick stats at a glance
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, mt: 2 }}>
              {[
                { label: "Today's Birthdays", value: todayBirthdays },
                { label: 'Upcoming (7 Days)', value: upcomingBirthdayCount },
                { label: 'Total Clients', value: totalClients },
                { label: 'Emails Sent (Last 7 Days)', value: emailsSentLast7Days },
              ].map((item) => (
                <Paper key={item.label} variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.72)' }}>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{item.value}</Typography>
                </Paper>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

    </Box>
  );
}
