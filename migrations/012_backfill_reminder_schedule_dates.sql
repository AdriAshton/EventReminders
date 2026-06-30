UPDATE reminders r
SET
  nextrunat = computed.next_run_at
FROM (
  SELECT
    r2.reminderid,
    (
      CASE
        WHEN make_timestamp(
               EXTRACT(YEAR FROM CURRENT_DATE)::int,
               EXTRACT(MONTH FROM c.birthdate)::int,
               EXTRACT(DAY FROM c.birthdate)::int,
               EXTRACT(HOUR FROM COALESCE(r2.sendtime, '09:00:00'::time))::int,
               EXTRACT(MINUTE FROM COALESCE(r2.sendtime, '09:00:00'::time))::int,
               EXTRACT(SECOND FROM COALESCE(r2.sendtime, '09:00:00'::time))
             ) >= NOW()
          THEN make_timestamp(
                 EXTRACT(YEAR FROM CURRENT_DATE)::int,
                 EXTRACT(MONTH FROM c.birthdate)::int,
                 EXTRACT(DAY FROM c.birthdate)::int,
                 EXTRACT(HOUR FROM COALESCE(r2.sendtime, '09:00:00'::time))::int,
                 EXTRACT(MINUTE FROM COALESCE(r2.sendtime, '09:00:00'::time))::int,
                 EXTRACT(SECOND FROM COALESCE(r2.sendtime, '09:00:00'::time))
               )
        ELSE make_timestamp(
               EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
               EXTRACT(MONTH FROM c.birthdate)::int,
               EXTRACT(DAY FROM c.birthdate)::int,
               EXTRACT(HOUR FROM COALESCE(r2.sendtime, '09:00:00'::time))::int,
               EXTRACT(MINUTE FROM COALESCE(r2.sendtime, '09:00:00'::time))::int,
               EXTRACT(SECOND FROM COALESCE(r2.sendtime, '09:00:00'::time))
             )
      END
    ) AS next_run_at
  FROM reminders r2
  JOIN clients c ON c.clientid = r2.clientid AND c.companyid = r2.companyid
  WHERE c.birthdate IS NOT NULL
    AND r2.isactive = TRUE
) AS computed
WHERE r.reminderid = computed.reminderid
  AND (
    r.nextrunat IS NULL
    OR r.nextrunat < NOW()
  );