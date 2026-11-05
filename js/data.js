// Willian app content (copied from the Hurley app 2026-10-08, now independent). Placeholders (xxx) are filled in as real details arrive.
const VERSION = '0.8.1';

// Who you are in Willian: one is required (with a name) before posting or suggesting
const ROLES = ['Resident', 'Visitor', 'Work in Village', 'Accommodation Owner'];

// 24px line icons, drawn with currentColor
const ICONS = {
  news:'<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2h-1M7 9h7M7 12.5h7M7 16h4"/>',
  board:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  fox:'<path d="M4 3.5l4.5 4h7l4.5-4V12c0 4.5-3.6 8.5-8 8.5S4 16.5 4 12zM9 12.5h.01M15 12.5h.01M10.5 16.5L12 18l1.5-1.5"/>',
  horseshoes:'<path d="M7 20.5v-9a5 5 0 0 1 10 0v9M7 20.5H4M17 20.5h3M7 16h.01M7 12.5h.01M17 16h.01M17 12.5h.01"/>',
  shop:'<path d="M4 9h16l-1.5-4h-13zM5 9v11h14V9M9.5 20v-6h5v6"/>',
  stay:'<path d="M3 19V6M3 15h18v4M21 19v-5a3 3 0 0 0-3-3h-7v4M7 12.5a1.5 1.5 0 1 0 .01 0"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  foxevents:'<path d="M4 6h16v14H4zM4 10.5h16M8 3.5v4M16 3.5v4M8 14.5h3M13 14.5h3"/>',
  diary:'<path d="M4 6h16v14H4zM4 10.5h16M8 3.5v4M16 3.5v4M8 14.5h3"/>',
  property:'<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/>',
  trades:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.3-.5-.5-2.3z"/>',
  yourway:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'
};
const svg = (k, cls) => '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') +
  ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + '</svg>';

// Home grid order: 2 columns x 4 rows, "Your App, your way" bottom-right.
// type: venue = a place with details; list = a list of entries; yourway = request/vote panel
const PLACES = [
  {id:'news', name:'News', type:'list', intro:'What\u2019s happening in Willian.',
    items:[{t:'xxx headline', d:'xxx date', b:'xxx summary of the story.'},
           {t:'xxx headline', d:'xxx date', b:'xxx summary of the story.'},
           {t:'xxx headline', d:'xxx date', b:'xxx summary of the story.'}]},
  {id:'board', name:'Message Board', type:'board', intro:'Notices, lost & found, offers of help and things for sale.'},
  {id:'diary', name:'Diary', type:'diary'},
  // Venue pages are info-only (tier:'info'). A paid upgrade later switches a venue to tier:'plus', which
  // turns on the Call / Map / Website buttons (see place.html). Facts are listed as [label, text] rows.
  {id:'fox', name:'The Fox', type:'venue', tier:'info', loyalty:true, events:'foxevents', kind:'Gastro pub, restaurant & rooms',
    about:'Award-winning gastro pub on the village green, with a 2-rosette kitchen. Local seasonal food, real ales and wines.',
    facts:[['Food','Breakfast 7.30–11.30 (Sat–Sun 8–11)\nLunch 12–2.30 (Sun 12–6)\nDinner Mon–Thu 5.30–9\nFood Fri–Sat 12–9'],
           ['Stay','8 rooms, 5 dog-friendly'],
           ['Garden','Heated. Dogs in the bar'],
           ['Book','Tables bookable. Bar: first come'],
           ['Find us','The Fox Inn, Willian, Letchworth Garden City SG6 2AE'],
           ['Phone','01462 480233']],
    note:'', hours:'', phone:'01462 480233', web:'', map:'The Fox, Willian'},
  {id:'horseshoes', name:'Three Horseshoes', type:'venue', tier:'info', kind:'Freehouse pub',
    about:'A true freehouse since 2018, with Cask Marque, CAMRA and a 5 star hygiene rating. Their refurbished beer garden is, they say, the best in Hertfordshire.',
    facts:[['Bar','Mon 12–9.30pm\nTue–Thu 12–10.30pm\nFri–Sat 12–midnight\nSun 12–8pm'],
           ['Kitchen','Mon–Tue closed\nWed–Thu 12–2, 5.30–8.30pm\nFri 12–2, 5.30–9pm\nSat 12–3, 5.30–9pm\nSun 12–4pm'],
           ['Functions','Private dining, afternoon tea, funeral receptions, parties and meetings'],
           ['Find us','Baldock Lane, Willian, Letchworth Garden City SG6 2AE'],
           ['Phone','01462 689024']],
    note:'Details from the pub’s own website and online listings, October 2026. Hours can change.', hours:'', phone:'01462 689024', web:'', map:'Three Horseshoes, Baldock Lane, Willian'},
  {id:'shop', name:'Village Shop / Post Office', type:'venue', tier:'info', photo:'images/shop.jpg', kind:'Willian Village Stores',
    about:'Willian’s own convenience shop and groceries, with a Post Office on site.',
    facts:[['Shop','Mon–Thu 8am–8pm\nFri–Sat 8am–10pm\nSun closed'],
           ['Post Office','Mon–Sat 8am–6pm, Sun closed\nEveryday banking, cash withdrawals, Royal Mail and Parcelforce'],
           ['Find us','5 Willian Road, Willian, Letchworth Garden City SG6 2AE'],
           ['Phone','01462 677586']],
    note:'Hours and phone checked, October 2026. Hours can change.', hours:'', phone:'01462 677586', web:'', map:'5 Willian Road, Willian, Letchworth Garden City SG6 2AE'},
  {id:'stay', name:'Where to stay in Willian', type:'list', intro:'Places to stay in and around Willian.',
    items:[{t:'The Little Barn'}, {t:'Black Squirrel Barn'}, {t:'The Fox at Willian'}, {t:'Letchworth Hall Hotel'}, {t:'Travelodge'}]},
  {id:'info', name:'Useful info & trusted tradespeople', type:'list', intro:'Handy numbers and dates for Willian.',
    links:[{id:'trades', t:'Trusted Tradespeople', d:'Recommended by Willian residents and owners of other accommodation'}],
    items:[{t:'Bin collections', b:'See Diary'}, {t:'Bus times', b:'Centrebus 92 and 92A, Stevenage to Baldock via Letchworth Railway Station. Mon–Fri about 6.30am–7pm, Sat about 7am–6.50pm, Sun and bank holidays a reduced service about 8.40am–7.25pm. Single fares capped at £3. Check the Centrebus timetable for exact times.'},
           {t:'Local council', b:'Willian has no parish council of its own. Local services are run by North Herts Council.'},
           {t:'All Saints\u2019 Church', b:'The Anglican parish church for Willian, Grade II* listed since 1954. Church Lane, Willian, Letchworth Garden City SG6 2AF. Phone 01462 637373.'},
           {t:'Emergencies', b:'999 \u00b7 non-emergency police 101 \u00b7 NHS 111'}]},
  // Properties for sale: info-only for now; a paid listing tier (agents / sellers) is the monetising plan.
  {id:'property', name:'Properties for sale', type:'digest', kind:'properties', intro:'Homes for sale in Willian, updated weekly.',
    empty:'No homes listed this week. Check back soon.'},
  {id:'yourway', name:'Your App, your way', type:'yourway'},
  // Not on the home grid: reached from Useful Info
  // Premium extra for a venue: an Upcoming events page (set `events:'<id>'` on the venue; the page itself is hidden from the home grid).
  {id:'foxevents', name:'Upcoming events', type:'list', hidden:true, parent:'fox', intro:'What\u2019s coming up at The Fox.',
    items:[{t:'Nations Championship rugby', d:'Shown at The Fox \u00b7 6 to 21 November \u00b7 UK kick-off times', b:'Round 1\nFri 6 Nov, 8.10pm: Ireland v Argentina\nSat 7 Nov, 11.40am: Italy v South Africa\nSat 7 Nov, 2.10pm: Scotland v New Zealand\nSat 7 Nov, 4.40pm: Wales v Japan\nSat 7 Nov, 8.10pm: France v Fiji\nSun 8 Nov, 3.10pm: England v Australia\n\nRound 2\nFri 13 Nov, 8.10pm: France v South Africa\nSat 14 Nov, 11.40am: Italy v Argentina\nSat 14 Nov, 2.10pm: Wales v New Zealand\nSat 14 Nov, 4.40pm: England v Japan\nSat 14 Nov, 8.10pm: Ireland v Fiji\nSun 15 Nov, 3.10pm: Scotland v Australia\n\nRound 3\nSat 21 Nov, 2.10pm: England v New Zealand\nSat 21 Nov, 2.10pm: Scotland v Japan\nSat 21 Nov, 4.40pm: Ireland v South Africa\nSat 21 Nov, 4.40pm: Italy v Fiji\nSat 21 Nov, 8.10pm: France v Argentina\nSat 21 Nov, 8.10pm: Wales v Australia'},
           {t:'Le Beaujolais Nouveau', d:'Thursday 19 November', b:'The new Beaujolais has arrived.'},
           {t:'Festive Menu', d:'From Monday 23 November', b:'Book now: 01462 480233 or reservations@foxatwillian.co.uk'}]},
  {id:'trades', name:'Trusted Tradespeople', type:'trades', hidden:true, parent:'info'}
];
