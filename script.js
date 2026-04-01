function handleCalendarUpdate() {
  try{
    manageLunchBlocks();
  } catch (e) {
      console.warn(`error in managing lunch blocks`);
  }
  
  try {
    colorCodeCalendar();
  } catch (e) {
      console.warn(`error in color coding`);
  }
  
}

/**
 * Automatically color-codes Google Calendar events based on attendee count and keywords.
 */
function colorCodeCalendar() {
  console.log("Color coding events");

  // CONFIGURATION: Set your timeframe (days from today)
  const daysToLookAhead = 30;
  const startTime = new Date();
  const endTime = new Date();
  endTime.setDate(startTime.getDate() + daysToLookAhead);

  // Get your primary calendar
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startTime, endTime);

  // COLOR IDs (1-11)
  const RED = CalendarApp.EventColor.PALE_RED;
  const SOLO_COLOR = CalendarApp.EventColor.YELLOW;
  const ONE_ON_ONE_COLOR = CalendarApp.EventColor.PALE_BLUE;
  const GROUP_COLOR = CalendarApp.EventColor.BLUE;

  events.forEach(event => {

    if(event.getEventType() == CalendarApp.EventType.WORKING_LOCATION)
      return;

    if (event.getTag('isLunchBlock') === 'true') 
      return;
      
    const title = event.getTitle().toUpperCase();
    const guests = event.getGuestList();
    const currentColor = event.getColor();
    var targetColor = currentColor;
    
    // 1. Check for Keywords (Priority)
    if (title.includes("OOO") || title.includes("PTO") || title.includes("DNS")) {
      targetColor = RED;
    }
    else
    {
        // 2. Check Guest Count
        // Note: getGuestList() does not include you (the owner)
        if (guests.length === 0) {
          // Just you
          targetColor = SOLO_COLOR;
        } else if (guests.length === 1) {
          // You + 1 other person
          targetColor = ONE_ON_ONE_COLOR;
        } else {
          // You + 2 or more people
          targetColor = GROUP_COLOR;
        }
    }
    try {
      if (currentColor !== targetColor) {
        event.setColor(targetColor);
        console.log(`changed event: "${event.getTitle()}" with color "${targetColor}"`);
      }
    } catch (e) {
      console.warn(`Skipping event "${event.getTitle()}": ${e.message}`);
      // This catches the "Action not allowed" and moves to the next event
    }
    
  });

  console.log("Calendar synchronization complete.");
}


function manageLunchBlocks() {
  console.log("Managing Lunch Blocks");
  const calendar = CalendarApp.getDefaultCalendar();
  const daysToLookAhead = 16;
  const LUNCH_DURATION_MINS = 30;
  const LUNCH_TAG = 'isLunchBlock';

  const today = new Date();
  today.setHours(0,0,0,0);

  for (let i = 12; i < daysToLookAhead; i++) {
    let date = new Date(today.getTime());
    date.setDate(today.getDate() + i);
    console.log(`Booking lunch for ${date}`);
    
    // 1. Skip Weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // 2. Define the Lunch Window (12 PM - 2 PM ET)
    const windowStart = new Date(date.getTime());
    windowStart.setHours(12, 0, 0, 0);
    
    const windowEnd = new Date(date.getTime());
    windowEnd.setHours(14, 0, 0, 0);

    // 3. Find existing lunch block for this day
    const dayEvents = calendar.getEvents(windowStart, windowEnd);
    let existingLunch = dayEvents.find(e => e.getTag(LUNCH_TAG) === 'true');
    
    // 4. Get all OTHER busy events (excluding our lunch block and working locations)
    const busyEvents = dayEvents.filter(e => 
      e.getTag(LUNCH_TAG) !== 'true' && 
      e.getEventType() === CalendarApp.EventType.DEFAULT &&
      e.getMyStatus() !== CalendarApp.GuestStatus.NO &&
      !e.isAllDayEvent()
    );

    // 5. Find the first available slot
    const bestSlot = findAvailableSlot(windowStart, windowEnd, LUNCH_DURATION_MINS, busyEvents);
    console.log(`found slot: ${bestSlot}`);

    if (bestSlot) {
      if (!existingLunch) {
        // CREATE
        const lunch = calendar.createEvent("🍴 Lunch", bestSlot.start, bestSlot.end);
        lunch.setTag(LUNCH_TAG, 'true');
        lunch.setColor(CalendarApp.EventColor.MAUVE); // Purple
        lunch.setVisibility(CalendarApp.Visibility.PRIVATE);
        console.log(`Created lunch for ${date.toDateString()} at ${bestSlot.start.toLocaleTimeString()}`);
      } else {
        // MOVE (only if time changed)
        if (existingLunch.getStartTime().getTime() !== bestSlot.start.getTime()) {
          existingLunch.setTime(bestSlot.start, bestSlot.end);
          console.log(`Moved lunch for ${date.toDateString()} to ${bestSlot.start.toLocaleTimeString()}`);
        }
      }
    } else if (existingLunch) {
      // If no 30m slot exists anymore, delete the lunch block or downsize it
      existingLunch.deleteEvent();
      console.log(`No slot found for ${date.toDateString()}. Removed lunch.`);
    }
  }
}

/**
 * Helper: Finds the first gap of 'duration' minutes between start and end.
 */
function findAvailableSlot(winStart, winEnd, durationMins, busyEvents) {
  let potentialStart = new Date(winStart.getTime());
  const durationMs = durationMins * 60 * 1000;

  // Slide a window from 12:00 to 2:00 in 15-minute increments
  while (potentialStart.getTime() + durationMs <= winEnd.getTime()) {
    let potentialEnd = new Date(potentialStart.getTime() + durationMs);
    
    // Check if this slot overlaps with ANY busy event
    const isOverlap = busyEvents.some(event => {
      return (potentialStart < event.getEndTime() && potentialEnd > event.getStartTime());
    });

    if (!isOverlap) {
      return { start: potentialStart, end: potentialEnd };
    }
    
    // Move forward by 15 minutes and try again
    potentialStart.setMinutes(potentialStart.getMinutes() + 15);
  }
  return null; // No gap found
}




function syncPersonalToWorkSmart() {
  const personalCalendarId = "your-personal-email@gmail.com"; 
  const workCalendar = CalendarApp.getDefaultCalendar();
  const personalCalendar = CalendarApp.getCalendarById(personalCalendarId);
  
  const daysToLookAhead = 14;
  const startTime = new Date();
  const endTime = new Date();
  endTime.setDate(startTime.getDate() + daysToLookAhead);

  const personalEvents = personalCalendar.getEvents(startTime, endTime);
  const workEvents = workCalendar.getEvents(startTime, endTime);

  let workBlocksMap = {};
  workEvents.forEach(event => {
    const pId = event.getTag('personalId');
    if (pId)
    {
      workBlocksMap[pId] = event;
      console.log(`block found: "${event.getTitle()}"`);
    } 
  });

  let processedIds = new Set();

  personalEvents.forEach(pEvent => {
    if (pEvent.isAllDayEvent()) return;

    const title = pEvent.getTitle();

    // 0. STATUS CHECK: Skip if not confirmed (Invited, Maybe, or Declined)
    const status = pEvent.getMyStatus();
    if (status !== CalendarApp.GuestStatus.YES && status !== CalendarApp.GuestStatus.OWNER && status !== null) {
      console.log(`Skipping for status ${title}, status is ${status}`);
      return; // Skip this event
    }

    //Exclude any event marked as Free (not Busy)
    if( pEvent.getTransparency() == CalendarApp.EventTransparency.TRANSPARENT) {
      console.log(`Skipping for transparency ${title}`);
      return;
    }

    const pStart = pEvent.getStartTime();
    const dayOfWeek = pStart.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // 1. WEEKDAY CHECK: Only process Monday (1) through Friday (5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return; 
    }

    const pId = pEvent.getId();
    const pEnd = pEvent.getEndTime();

    // 2. WINDOW LOGIC (9am - 6pm)
    const winStart = new Date(pStart.getTime());
    winStart.setHours(9, 0, 0, 0); 
    const winEnd = new Date(pStart.getTime());
    winEnd.setHours(18, 0, 0, 0);

    const finalStart = new Date(Math.max(pStart.getTime(), winStart.getTime()));
    const finalEnd = new Date(Math.min(pEnd.getTime(), winEnd.getTime()));

    if (finalStart < finalEnd) {
      processedIds.add(pId);
      const existingBlock = workBlocksMap[pId];

      if (!existingBlock) {
        const newBlock = workCalendar.createEvent("Block: Personal DNS", finalStart, finalEnd);
        newBlock.setTag('personalId', pId);
        newBlock.setVisibility(CalendarApp.Visibility.PRIVATE);
        console.log(`Created weekday block: ${finalStart}`);
      } else {
        const bStart = existingBlock.getStartTime().getTime();
        const bEnd = existingBlock.getEndTime().getTime();

        if (finalStart.getTime() !== bStart || finalEnd.getTime() !== bEnd) {
          existingBlock.setTime(finalStart, finalEnd);
          console.log(`Updated weekday block: ${finalStart}`);
        }
      }
    }
  });

  // 3. CLEANUP
  // This will now also delete any work blocks if you move a personal event 
  // from a weekday to a weekend.
  Object.keys(workBlocksMap).forEach(pId => {
    if (!processedIds.has(pId)) {
      workBlocksMap[pId].deleteEvent();
      console.log(`Deleted block (Weekend/Outside Window/Deleted): ${pId}`);
    }
  });
}