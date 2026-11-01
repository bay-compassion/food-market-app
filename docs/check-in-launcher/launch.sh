#!/bin/zsh
# What the Check-In Launcher app runs. Starts the print station's Chrome, then opens the queue desk
# in the iMac's everyday Chrome. See docs/name-tag-printing.md.
#
# Automator gives this a minimal environment and no Terminal, hence the absolute paths.

site='https://app.thebaycompassion.org'
station_profile="$HOME/chrome-print-station"

# A station Chrome already running can't be reused. Starting it again only hands the address to the
# running instance, as another tab, and two open station pages each print every tag. It may also have
# no window left (the red button doesn't quit Chrome), or be left over from first-time setup without
# --kiosk-printing, which no later start can add. So every click starts it fresh. The main process
# is the one with no " Helper" after its name; asked to quit, it takes its helpers with it.
stop_station() {
	/usr/bin/pkill -f -- "MacOS/Google Chrome --.*--user-data-dir=$station_profile" || return 0

	for _ in {1..20}; do
		/usr/bin/pgrep -qf -- "--user-data-dir=$station_profile" || return 0
		/bin/sleep 0.5
	done

	/usr/bin/pkill -9 -f -- "--user-data-dir=$station_profile"
}

# Keep these flags in step with printStationLaunchCommand in PrintStationSetup.tsx.
start_station() {
	/usr/bin/open -na 'Google Chrome' --args \
		--kiosk-printing \
		--disable-background-timer-throttling \
		--disable-renderer-backgrounding \
		--disable-backgrounding-occluded-windows \
		--user-data-dir="$station_profile" \
		"$site/printing-station"
}

stop_station
start_station

# Give the station's Chrome a moment to come up before the queue desk's window goes over it.
/bin/sleep 2

# Not `open -a`, which hands the address to a running Chrome, and that may be the station's: the next
# click, which restarts the station, would close the queue desk with it. Without a --user-data-dir,
# this goes to the everyday profile whether or not that Chrome is already running.
/usr/bin/open -na 'Google Chrome' --args "$site/queue"
