// app/dashboard/page.tsx
"use client";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import Grid from "@mui/material/Grid";

export default function Dashboard() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Company Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Clients */}
    <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Clients</Typography>
              <Typography variant="body2">Total: 42</Typography>
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
              <Typography variant="h6">Upcoming Events</Typography>
              <Typography variant="body2">Next: Meeting on June 10</Typography>
              <Button href="/events" variant="contained" sx={{ mt: 2 }}>
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Reminders */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Reminders</Typography>
              <Typography variant="body2">2 due today</Typography>
              <Button href="/reminders" variant="contained" sx={{ mt: 2 }}>
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
