# Printing name tags

The volunteer queue screen (`/queue`) shows a name tag on every open ticket: the guest's first name
and last initial, their place in line, and the language they registered in. **Print name tag**
under it sends that tag to the print station, a computer at the market with the label printer
plugged into it, which prints it with no dialog.

## The printer

Built for a **Dymo LabelWriter 450 Twin Turbo** with **Dymo 30857** name badge labels (4 × 2¼ in,
white, self-adhesive):

- It connects over **USB only**: no Wi-Fi, AirPrint, or Mopria. A phone can't print to it, so tags
  always go through the print station below. While no station is online, **Print name tag** is
  disabled and says so.
- It's a thermal printer: no ink or toner, just labels. It prints at most 56 mm (2.2 in) across, so
  the 30857's 57 mm (2¼ in) side is the one that goes through the printer, and the text runs along
  the 4 in length.
- It holds two rolls. Load 30857 badges in both, or in the one the station prints to (see below).

The label size lives in one place, `NameTag.label` in
[`src/models/name-tag.ts`](../src/models/name-tag.ts). The on-screen tag is drawn at the same
proportions, so changing labels means changing that one value.

## Setting it up

1. Install Dymo's software for the LabelWriter 450 on the station's computer (it includes the
   printer driver), and plug the printer in over USB.
2. Load 30857 labels.
3. Make the LabelWriter the computer's default printer.
4. Start the print station's browser with the command below, but leave out `--kiosk-printing`, and
   print one tag through the dialog (send one from a phone). In that dialog, choose the LabelWriter,
   pick the 30857 paper size, set the margins to none, and, if the dialog shows the printer's own
   options, choose the roll the labels are on. Chrome saves these in the station's own profile.
5. Quit the browser and start it again with the full command. From then on it prints with those
   settings and no dialog.

## Printing without a dialog: the print station

The computer the LabelWriter is plugged into prints every tag with no dialog at all. Open
`/printing-station` on it, signed in as the print-station account (see
[`roles.md`](roles.md#the-print-station)). While that page is open and checking in, **Print name
tag** on a volunteer's phone sends the tag there, and says so under the button ("Prints at the
print station"). If the station goes quiet, phones see it as offline within a few seconds and
disable the button until it's back.

The browser on that desktop has to be started for it. Quit it completely, then start it with (on a
Mac; the page shows this command too):

```bash
open -na "Google Chrome" --args --kiosk-printing --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --user-data-dir="$HOME/chrome-print-station" https://<your site>/printing-station
```

- `--kiosk-printing` prints to the default printer with no dialog, using the settings from the last
  print through the dialog in this profile — which is why step 4 above prints one tag the normal
  way first.
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

## What to check on the real printer

- The station puts the tag on a page the label's size with no margins, and print-only CSS hides
  everything else on it (`NameTagPrint`). So each print is exactly one label.
- Only tested by printing to PDF from Chromium (one 101.6 × 57.15 mm page). **Check it on the
  LabelWriter before relying on it at a market:** that the tag runs along the label rather than
  being rotated or shrunk onto it, that one tag uses one label rather than two, and that nothing is
  cut off at the label's edges.
