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

## How it works, and what it can't do

- The button calls `window.print()`. While a ticket is open, the page carries a hidden copy of its
  tag at the label's real size (`NameTagPrint`), and print-only CSS hides everything else and sets
  the page to the label's size with no margins. So the dialog only ever offers that one label.
- A web page cannot print silently, so the volunteer always confirms in the print dialog. Skipping
  that would need a native app or a print server, and neither exists here.
- Only tested by printing to PDF from Chromium (one 100 × 62 mm page). **Check it on the real
  printer before relying on it at a market:** that the tag isn't rotated or shrunk, and that the
  tape is cut at 100 mm.
