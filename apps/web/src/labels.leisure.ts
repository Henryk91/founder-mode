export const LEISURE_LABELS = {
  'leisure.productPrices': '{name}: {peak} peak, {off} off season in this slot.',
  'leisure.holdPolicy': 'Date holds',
  'leisure.hold.free': 'Grant freely',
  'leisure.hold.fee': 'Require a hold fee',
  'leisure.hold.none': 'No holds',
  'leisure.holdTerms':
    'A paid hold costs {amount}, credited against the event if it converts. Held capacity cannot be sold to another client.',
  'leisure.holdHint':
    'New hold terms apply to new enquiries. Existing holds keep their dates and expiry.',
  'leisure.holdDate': 'Week {week}, {slot}, {segment}: {status}; decision due in week {release}.',
  'leisure.holdRefund': 'Advance returned: {amount}.',
  'leisure.hold.status.held': 'held',
  'leisure.hold.status.converted': 'converted to a booking',
  'leisure.hold.status.released': 'released',
  'leisure.permitTerms':
    '{name}: {amount} of the build price is refundable if the decision is a refusal.',
  'leisure.permitRefused':
    '{name}: refused in week {week}; {amount} returned. This application cannot be restarted.',
  'leisure.buildClosure':
    '{name}: closes {areas} during the construction wait. Accepted dates in the closure are refunded.',
  'leisure.upgradeTerms':
    '{name}: adds {n} events to {slot}; {amount} per actual event beyond the original capacity.',
  'leisure.upgradePaid': 'Extra turnaround work paid so far: {amount}.',
  'leisure.extraTerms':
    '{name}, {segment}: {share}% of a {gross} package per served event, less {cost} in service costs.',
  'leisure.extraPaid': '{name}: {units} served, {revenue} received and {cost} paid so far.',
  'leisure.extraLast4': 'Last four weeks: {revenue} received, {cost} paid.',
  'leisure.noiseTitle': 'Late events and neighbours',
  'leisure.noiseCounts':
    '{events} late events served; {complaints} complaints in the current window, {total} in all.',
  'leisure.noiseWarning':
    'A warning has been issued. Review insulation, finish times and the forward calendar.',
  'leisure.noiseRestricted':
    'Late events restricted from week {from} until week {until}, exclusive. Other hall bookings remain available.',
  'leisure.noiseRefunds':
    'Restrictions released {bookings} bookings and {holds} holds; {amount} in advances returned.',
  'leisure.noiseMoney': 'Late receipts {revenue}; attributable costs {cost}; net {net}.',
  'leisure.noiseCosts':
    'Costs include service {variable}, staff {staff}, equipment {asset}, turnarounds {turnaround} and dedicated setup {setup}. Shared rent is in the company ledger.',
  'leisure.space': '{used} of {max} physical spaces reserved by rooms or meeting space.',
  'leisure.spaceFull': 'No unreserved space for this build.',
  'leisure.minimumAreas': '{name}: at least {n} rooms must be ready for the requested date.',
  'leisure.salesHint':
    'Open slots for new enquiries. Existing bookings stay reserved when you close sales.',
  'leisure.salesSlot': 'Sell {name}',
  'leisure.priceWhat': '{season} price for {segment}, {slot}',
  'leisure.price.peak': 'Peak',
  'leisure.price.off': 'Off season',
  'leisure.calendar': 'Slots and bookings',
  'leisure.beforeOpening':
    'Not open yet. Design work and construction must finish before games can run.',
  'leisure.opened': 'Opened in week {week}.',
  'leisure.buildProgress': '{name}: construction paid, {amount}; ready in week {week}.',
  'leisure.buildPrep':
    '{name}: {amount} committed. Finish the design work, then allow {weeks} weeks for construction.',
  'leisure.freshnessLine': '{word}. Local groups who have played: {groups}.',
  'leisure.freshness.new': 'New',
  'leisure.freshness.known': 'Known',
  'leisure.freshness.tired': 'Tired',
  'leisure.reopening': 'Closed for work until week {week}.',
  'leisure.refreshCost': 'Rebuild: {hours} h, {amount}, closed for {weeks} weeks.',
  'leisure.refresh': 'Rebuild this theme',
  'leisure.refreshCancel': 'Cancel this week’s rebuild',
  'leisure.setting': 'Route setting each week',
  'leisure.settingProgress': '{done} of {total} h towards the next reset.',
  'leisure.settingWhat': 'setting hours for {name}',
  'leisure.refused': '{n} requests turned away last week.',
  'leisure.slotLoad': '{name}: {visits} visits, {word}.',
  'leisure.load.quiet': 'quiet',
  'leisure.load.busy': 'busy',
  'leisure.load.packed': 'packed',
  'leisure.futureDates': 'Next twelve weeks',
  'leisure.calendarCell': 'Week {week}, {name}: {booked} booked, {held} held, {free} free.',
  'leisure.roomLife': '{name}: {word}; {served} served, {refreshes} resets.',
  'leisure.lessons': 'The life of the business',
  'leisure.slotHistory': '{name}: {packed} packed services, {quiet} quiet services.',
  'leisure.membersHistory': '{retained} contracts retained from {signed} signed.',
  'leisure.aggregatorHistory':
    '{name} paid {amount}; {cancellations} cancellations said they moved there.',
  'leisure.holdsHistory':
    '{granted} holds granted, {converted} converted, {lost} released too late.',
  'leisure.lifeHistory':
    '{name}: {served} visits, {refreshes} resets, {tired} tired weeks and {closed} weeks closed for work.',
} as const
