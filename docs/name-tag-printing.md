# Printing name tags

The volunteer queue screen (`/queue`) shows a name tag on every open ticket: the guest's first name
and last initial, their place in line, and the language they registered in. **Print name tag**
under it sends that tag to a label printer through the phone's own print dialog, so any volunteer's
phone can print with no app to install and nothing to pair.

## The printer

Built for a **Brother QL-820NWB** with **DK-2205** tape (62 mm continuous, black on white):

- It prints over Wi-Fi with **AirPrint** (iPhone, iPad, Mac) and **Mopria** (Android), which is
  what lets a web page print to it from a volunteer's own phone.
- It's a thermal printer: no ink or toner, just tape.
- Continuous tape is cut to whatever length the page asks for, which is 100 mm here.

The label size lives in one place, `NameTag.label` in
[`src/models/name-tag.ts`](../src/models/name-tag.ts). The on-screen tag is drawn at the same
proportions, so changing tape means changing that one value. A different AirPrint or Mopria label
printer should work the same way once its tape size is set there.

## Setting it up

1. Connect the printer to the same Wi-Fi network the volunteers' phones use at the market.
   (Brother's setup guide covers this; it's a one-time step.)
2. Load the DK-2205 tape.
3. On a phone, open `/queue`, open any ticket, and tap **Print name tag**.
4. In the print dialog, choose the Brother printer. The first time, check the paper size: on
   iPhone it's under **Options → Paper Size**; pick the 62 mm entry if it isn't already chosen.
   The phone remembers the printer and size after that.

## Printing without a dialog: the print station

A desktop at the market, connected to the same printer, can print every tag with no dialog at all.
Open `/printing-station` on it, signed in as the print-station account (see
[`roles.md`](roles.md#the-print-station)). While that page is open and checking in, **Print name
tag** on a volunteer's phone sends the tag there instead of opening the phone's dialog, and says so
under the button ("Prints at the print station"). If the station goes quiet, phones fall back to
their own dialog within a few seconds.

The browser on that desktop has to be started for it. Quit it completely, then start it with (on a
Mac; the page shows this command too):

```bash
open -na "Google Chrome" --args --kiosk-printing --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --user-data-dir="$HOME/chrome-print-station" https://<your site>/printing-station
```

- `--kiosk-printing` prints to the default printer with no dialog. Make the Brother the computer's
  default printer, and print one tag through the normal dialog first, with the 62 mm paper size, so
  Chrome has those settings saved.
- The three `--disable-…` flags keep the page checking in while another window — the `/kiosk` room
  display, say — covers it. Without them Chrome slows a hidden page's timers to about once a minute,
  and phones would see the station as offline.
- `--user-data-dir` gives it a profile of its own, so silent printing never applies to anyone's
  everyday browsing.

How it works: a phone sends the visit (`POST /api/admin/print-jobs`); the server builds the tag
from the database and keeps it in a Netlify Blobs store for this deploy. The station collects
waiting tags every 2 seconds (`GET /api/admin/print-jobs`), which also tells phones it is online,
prints them one at a time, and removes each after printing it. A tag nobody prints within five
minutes is dropped, so a station that comes back online doesn't print a backlog for guests who have
left. One station per market: two stations would each print every tag.

## How a phone prints, and what it can't do

- The button calls `window.print()`. While a ticket is open, the page carries a hidden copy of its
  tag at the label's real size (`NameTagPrint`), and print-only CSS hides everything else and sets
  the page to the label's size with no margins. So the dialog only ever offers that one label.
- A phone's browser cannot print silently, so without a print station online the volunteer always
  confirms in the dialog. The print station above is how to skip it.
- The phone decides between the station and its own dialog before the tap, from the station status
  it refreshes every 5 seconds: an iPhone only opens a print dialog as the direct result of a tap,
  not after a network request.
- Only tested by printing to PDF from Chromium (one 100 × 62 mm page). **Check it on the real
  printer before relying on it at a market:** that the tag isn't rotated or shrunk, and that the
  tape is cut at 100 mm.
