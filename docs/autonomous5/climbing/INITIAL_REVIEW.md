# Initial Griffig review (partial)

Engine/content/bot source8a3a423. Main only,1,000 paired test seeds per policy,
eight workers. Matrix still running;no tuning decisions or rounds spent.

Completed careful51.6%±3.1:playable under the hard bounds but fails T1.
Platform-only41.5%,paired−10.1±1.9;no-tests0%. Other policies are not yet judged.

Careful by viable segment:committed17.6%(318seeds),families66.2%(343),
students68.7%(339). Median opening week26/22/22 respectively;all1,000 open.
Median receiptsEUR59,254/1,050,608/1,526,006;median net wealth
−EUR6,221/+228,100/+476,944. These are observed complete-run aggregates,
not hidden evidence available to bots.

Committed enquiries use4–15people/week and90%membership share;students
150–500 and families60–200 have mostly paid day visits. Rope-first costs more
and opens later. Review first-wall/course contributions and financing before
changing demand;do not compensate for an unexamined bot error with values.

Staffing variants retain normal course-capacity coaching:overstaffing buys
full available course capacity,understaffing cuts bookings and staffed hall
hours. A higher overstaffing result is not by itself a broken variant.

Performance from this concurrent matrix is not a controlled benchmark.
Existing pre-compaction CPU profile is available,but cannot establish current
bottlenecks after hall traffic compaction. T12 remains measured rather than
relaxed. No events,wide parts or full report.


Current-source performance diagnostic:test0–2 reproduce all measured careful
RunResult fields exactly. Profile:/tmp/plan5-climbing-current.cpuprofile;
validation:current-profile-validation.json. Costs are spread across booking
allocation,option selection,leisure aggregation and views. The room reader
already maintains an incremental reservation index. No source change or
speed-gain claim follows from this small profile.


Bot correction required before values:T10's hall review-blind policy still
answers negative-snag inbox effects. The existing safeguard in tourism.ts
only checks classStaffing. Extend it to optional halls and add an actual
visible-inbox regression;measure only the corrected policy on1,000 paired
seeds and retain all unaffected matrix data. The initial516wins are
superseded for T10 after that correction,not a valid final contribution.
Do not spend numeric tuning budget on this bot mistake.
