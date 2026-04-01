# CalPal
Google Calendar automations

Quick & dirty Google Apps Script to automate work + personal calendars. Replacement of some Clockwise features:
1. Color-code events automatically
2. Create blocks in the work calendar based on personal calendar events
3. Schedule and adjust lunch blocks automatically

To setup:
1. Go to script.google.com
2. Paste the script
3. Adjust your personal email address
4. Tweak the various parameters (length of lunch, start/end time, look-ahead days, colors, etc)
5. Go to Triggers (left-side UI)
6. Create a trigger for work calendar updates to call handleCalendarUpdate
7. Create a trigger for personal calendar updates to call syncPersonalToWorkSmart
8. Make sure your personal calendar is accessible from your work account

You can debug this script through the executions tab to see what it did.