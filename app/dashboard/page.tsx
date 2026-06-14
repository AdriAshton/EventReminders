// app/dashboard/page.tsx
"use client";
import { Box, Card, CardContent, Typography, Button, List, ListItem, ListItemText, Divider, Avatar, Chip } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect, useState } from "react";
import { clearStoredToken, getTokenPayload } from "@/lib/authClient";
import { getClients } from "@/services/clientService";
import { getEvents, getEvent } from "@/services/eventService";
import { getReminders } from "@/services/reminderServices";
import { getMessages } from "@/services/messageService";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [totalClients, setTotalClients] = useState<number>(0);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [activeReminders, setActiveReminders] = useState<number>(0);
  const [isAdministrator, setIsAdministrator] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentReminders, setRecentReminders] = useState<any[]>([]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      const decoded = getTokenPayload(token);
      if (decoded) {
        setIsAdministrator(String(decoded.role || "").toLowerCase() === "administrator");
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
        setTotalClients(clients.total || (clientsRows ? clientsRows.length : 0));

        const clientsMap: Record<number, string> = {};
        (clientsRows || []).forEach((c: any) => {
          clientsMap[c.clientid || c.ClientId || c.clientId || c.ClientId] = c.firstname || c.firstName || `${c.firstname || c.firstName || ''}` || `${c.clientid}`;
        });

        const events = await getEvents(1, 5);
        setTotalEvents(events.total || (events.rows ? events.rows.length : 0));
        const evRows = events.rows || [];
        // attach clientName to events
        const upcomingWithNames = evRows.map((ev: any) => ({ ...ev, clientName: clientsMap[ev.clientid] || `Client ${ev.clientid}` }));
        setUpcomingEvents(upcomingWithNames || []);

        const reminders = await getReminders(1, 5);
        setActiveReminders(reminders.total || (reminders.rows ? reminders.rows.length : 0));
        const remRows = reminders.rows || [];
        // resolve event -> client name for each reminder
        const remsWithNames = await Promise.all(
          remRows.map(async (r: any) => {
            try {
              const ev = await getEvent(r.eventid);
              const clientId = ev?.clientid || ev?.clientId || ev?.rows?.[0]?.clientid || ev?.rows?.[0]?.ClientId;
              const clientName = clientsMap[clientId] || `Client ${clientId || r.eventid}`;
              return { ...r, clientName };
            } catch (e) {
              return { ...r, clientName: `Client ${r.eventid}` };
            }
          }),
        );
        setRecentReminders(remsWithNames || []);
        // we could show recent messages in future; not used now
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          Company Dashboard
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            avatar={
              <Avatar sx={{ bgcolor: "#1976d2", color: "#fff", fontWeight: 700 }}>
                {username ? username.charAt(0).toUpperCase() : "U"}
              </Avatar>
            }
            label={username ? `Logged in as ${username}` : "Logged in"}
            variant="filled"
            sx={{
              fontWeight: 700,
              color: "#fff",
              bgcolor: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              '& .MuiChip-label': {
                color: '#fff',
              },
            }}
          />

          <Button variant="outlined" onClick={() => router.push('/settings')}>Settings</Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Clients */}
       <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Clients</Typography>
              <Typography variant="h4">{totalClients}</Typography>
              <Button href="/clients" variant="contained" sx={{ mt: 2 }}>
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Events */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Events</Typography>
              <Typography variant="h4">{totalEvents}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button href="/events" variant="contained">View All</Button>
                  <Button href="/events/event-types" variant="outlined">Event Types</Button>
                </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Reminders */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Active Reminders</Typography>
              <Typography variant="h4">{activeReminders}</Typography>
              <Button href="/reminders" variant="contained" sx={{ mt: 2 }}>
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Messages */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Messages</Typography>
              <Typography variant="body2">Manage outbound email and WhatsApp messages</Typography>
              <Button href="/messages" variant="contained" sx={{ mt: 2 }}>
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {isAdministrator && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">Setup/Security</Typography>
                <Typography variant="body2">Company settings and user management</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  <Button href="/companies" variant="contained">
                    Companies
                  </Button>
                  <Button href="/users" variant="outlined">
                    Users
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Upcoming Events</Typography>
            <Divider sx={{ my: 1 }} />
            <List>
              {upcomingEvents.length ? (
                upcomingEvents.map((ev: any) => (
                  <ListItem key={ev.eventid}>
                    <ListItemText primary={`${ev.clientid ? `Client ${ev.clientid}` : 'Client'} – ${ev.eventtype} – ${ev.eventdate}`} />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No upcoming events" />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6">Recent Reminders</Typography>
            <Divider sx={{ my: 1 }} />
            <List>
              {recentReminders.length ? (
                recentReminders.map((r: any) => (
                  <ListItem key={r.reminderid}>
                    <ListItemText primary={r.status === 'Sent' ? `Email sent to Client ${r.eventid}` : `SMS scheduled for Client ${r.eventid}`} />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No recent reminders" />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
