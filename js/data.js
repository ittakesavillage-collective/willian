// Willian app content (copied from the Hurley app 2026-10-08, now independent). Placeholders (xxx) are filled in as real details arrive.
const VERSION = '0.4.12';

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
  {id:'fox', name:'The Fox', type:'venue', tier:'info', kind:'Gastro pub, restaurant & rooms',
    about:'Multi-award-winning gastro pub on the village green with a 2-rosette kitchen. Seasonal local food, real ales, wines and spirits.',
    facts:[['Food','Breakfast 7.30–11.30 (Sat–Sun 8–11)\nLunch 12–2.30 (Sun 12–6)\nDinner Mon–Thu 5.30–9\nFood Fri–Sat 12–9'],
           ['Stay','8 rooms, 5 of them dog-friendly garden rooms'],
           ['Garden','Heated and landscaped. Dogs welcome in the bar'],
           ['Book','Restaurant tables bookable. Bar and garden first come, first served'],
           ['Find us','The Fox Inn, Willian, Letchworth Garden City SG6 2AE'],
           ['Phone','01462 480233']],
    note:'Details from the pub’s own website, October 2026. Hours can change.', hours:'', phone:'01462 480233', web:'', map:'The Fox, Willian'},
  {id:'horseshoes', name:'Three Horseshoes', type:'venue', tier:'info', kind:'Freehouse pub',
    about:'A true freehouse since 2018, with Cask Marque, CAMRA and a 5 star hygiene rating. Their refurbished beer garden is, they say, the best in Hertfordshire.',
    facts:[['Bar','Mon 12–9.30pm\nTue–Thu 12–10.30pm\nFri–Sat 12–midnight\nSun 12–8pm'],
           ['Kitchen','Mon–Tue closed\nWed–Thu 12–2, 5.30–8.30pm\nFri 12–2, 5.30–9pm\nSat 12–3, 5.30–9pm\nSun 12–4pm'],
           ['Functions','Private dining, afternoon tea, funeral receptions, parties and meetings'],
           ['Find us','Baldock Lane, Willian, Letchworth Garden City SG6 2AE'],
           ['Phone','01462 689024']],
    note:'Details from the pub’s own website and online listings, October 2026. Hours can change.', hours:'', phone:'01462 689024', web:'', map:'Three Horseshoes, Baldock Lane, Willian'},
  {id:'shop', name:'Village Shop / Post Office', type:'venue', tier:'info', kind:'Willian Village Stores',
    about:'Willian’s own convenience shop and groceries, with a Post Office on site.',
    facts:[['Shop','Mon–Thu 8am–8pm\nFri–Sat 8am–10pm\nSun closed'],
           ['Post Office','Mon–Sat 8am–6pm, Sun closed\nEveryday banking, cash withdrawals, Royal Mail and Parcelforce'],
           ['Find us','5 Willian Road, Willian, Letchworth Garden City SG6 2AE'],
           ['Phone','01462 677586']],
    note:'Hours and phone checked, October 2026. Hours can change.', hours:'', phone:'01462 677586', web:'', map:'5 Willian Road, Willian, Letchworth Garden City SG6 2AE'},
  {id:'stay', name:'Where to stay in Willian', type:'list', intro:'Places to stay in and around Willian.',
    items:[{t:'The Little Barn'}, {t:'Black Squirrel Barn'}, {t:'The Fox at Willian'}, {t:'Letchworth Hall Hotel'}, {t:'Travelodge'}]},
  {id:'info', name:'Useful Info', type:'list', intro:'Handy numbers and dates for Willian.',
    links:[{id:'trades', t:'Trusted Tradespeople', d:'Recommended by Willian residents and owners of other accommodation'}],
    items:[{t:'Bin collections', b:'See Diary'}, {t:'Bus times', b:'Centrebus 92 and 92A, Stevenage to Baldock via Letchworth Railway Station. Mon–Fri about 6.30am–7pm, Sat about 7am–6.50pm, Sun and bank holidays a reduced service about 8.40am–7.25pm. Single fares capped at £3. Check the Centrebus timetable for exact times.'},
           {t:'Local council', b:'Willian has no parish council of its own. Local services are run by North Herts Council.'},
           {t:'All Saints\u2019 Church', b:'The Anglican parish church for Willian, Grade II* listed since 1954. Willian, Letchworth Garden City SG6 2AF. Phone 01462 637373.'},
           {t:'Emergencies', b:'999 \u00b7 non-emergency police 101 \u00b7 NHS 111'}]},
  // Properties for sale: info-only for now; a paid listing tier (agents / sellers) is the monetising plan.
  {id:'property', name:'Properties for sale', type:'list', intro:'Homes for sale in and around Willian.',
    items:[{t:'xxx property', b:'xxx short description, price and how to enquire.'},
           {t:'xxx property', b:'xxx short description, price and how to enquire.'}]},
  {id:'yourway', name:'Your App, your way', type:'yourway'},
  // Not on the home grid: reached from Useful Info
  {id:'trades', name:'Trusted Tradespeople', type:'trades', hidden:true, parent:'info'}
];
