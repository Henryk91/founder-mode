# Ausgesperrt: initial measurement interrupted

The initial command requested **main only, 1,000 seeds per strategy, prefix `test`**,
three workers, output `ausgesperrt-main-initial.md`. It was stopped before it wrote a
report. The only completed strategy logged was `leisure_one_room` (223.7 seconds);
no outcome percentages were published. This is not a measured target result.

Code review found a bot budgeting error: each room rebuild checked the same available
cash, ignoring other rebuilds and construction completing that week. The fix subtracts
all committed costs and reduces the remaining budget after every selected rebuild.
A direct test covers three tired rooms and a simultaneous new build; all 30 leisure
bot tests pass after the fix.

The task-owned parent and its three workers received SIGTERM. The log is
`/tmp/plan5-ausgesperrt-main-initial.log`; its exit 143 is the deliberate interruption.
The next measurement uses the corrected bot. No game-value tuning round was consumed.
No event table, wide part or full report ran.
